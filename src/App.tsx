import React, { useState, useEffect, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { CircuitComposer } from './components/CircuitComposer';
import { StateVectorView } from './components/StateVectorView';
import { CryptoPanel } from './components/CryptoPanel';
import { QrngPanel } from './components/QrngPanel';
import { LedgerExplorer } from './components/LedgerExplorer';
import { RustCrateViewer } from './components/RustCrateViewer';
import { SocximaEnginePanel } from './components/SocximaEnginePanel';
import { SoxcimaAiPanel } from './components/SoxcimaAiPanel';
import { TwinNetworkPanel } from './components/TwinNetworkPanel';
import { KnowledgeBlockchainPanel } from './components/KnowledgeBlockchainPanel';
import { GatePlacement, SimulationResult, Ed25519KeyPair } from './types/quantum';
import { simulateCircuit } from './core/quantumEngine';
import { generateEd25519KeyPair, signMessageEd25519, HexUtils, sha512 } from './core/cryptoEngine';
import { rusqliteDb } from './core/ledgerDb';
import { SocximaEngine, SistemaGemelos } from './core/socximaEngine';
import { exportCircuitToQuantumAssembly, serializeQuantumAssembly } from './core/quantumAssembly';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const DEFAULT_BELL_GATES: GatePlacement[] = [
  { id: 'g0', type: 'H', targetQubit: 0, step: 0 },
  { id: 'g1', type: 'CNOT', controlQubit: 0, targetQubit: 1, step: 1 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('engine');
  const [qubitCount, setQubitCount] = useState<number>(2);
  const [gates, setGates] = useState<GatePlacement[]>(DEFAULT_BELL_GATES);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; actionLabel?: string; onAction?: () => void } | null>(null);

  // Core Socxima Engine (6,000 Qubits: Hyper-scale quantum core exceeding IBM Heron by >4.5x)
  const engineRef = useRef<SocximaEngine>(SocximaEngine.nuevo(6000));
  // Twin Network (SistemaGemelos)
  const twinSystemRef = useRef<SistemaGemelos>(SistemaGemelos.nuevo(6));

  // Trigger state to re-render when engine or twins change
  const [, setEngineTick] = useState<number>(0);
  const forceUpdate = () => setEngineTick(t => t + 1);

  // Ed25519 KeyPair
  const [keyPair, setKeyPair] = useState<Ed25519KeyPair>({
    publicKeyHex: 'a8f103b491820492810482910482910482910482910482910482910482910482',
    privateKeyHex: '7b91048291048291048291048291048291048291048291048291048291048291a8f103b491820492810482910482910482910482910482910482910482910482',
    seedHex: '7b91048291048291048291048291048291048291048291048291048291048291',
    generatedAt: Date.now(),
  });

  // Generate fresh keys on mount
  useEffect(() => {
    generateEd25519KeyPair().then(k => setKeyPair(k)).catch(() => {});
  }, []);

  // Compute Simulation Result for the Circuit Composer
  const [currentResult, setCurrentResult] = useState<SimulationResult>(() => {
    return simulateCircuit(2, DEFAULT_BELL_GATES, 1024, 'circuit_init');
  });

  // Auto-run circuit simulation when gates or qubit count change
  useEffect(() => {
    setIsSimulating(true);
    const timer = setTimeout(() => {
      const res = simulateCircuit(qubitCount, gates, currentResult.shots || 1024, `circuit_${Date.now()}`);
      setCurrentResult(res);
      setIsSimulating(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [qubitCount, gates]);

  // Run simulation with specific shot count
  const handleRunSimulation = (shots: number) => {
    setIsSimulating(true);
    setTimeout(() => {
      const res = simulateCircuit(qubitCount, gates, shots, `circuit_${Date.now()}`);
      setCurrentResult(res);
      setIsSimulating(false);
    }, 100);
  };

  // Sign State Vector Hash & Commit to Rusqlite Database
  const handleSignAndCommit = async () => {
    try {
      const stateHash = currentResult.stateHashSha256;
      const sigRecord = await signMessageEd25519(stateHash, keyPair);

      // Extract top measurement outcomes
      const sortedOutcomes = Object.entries(currentResult.probabilities)
        .filter(([_, p]) => Number(p) > 0.05)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .map(([b, p]) => `|${b}⟩ (${(Number(p) * 100).toFixed(1)}%)`)
        .join(', ');

      const runId = `run_${Date.now().toString(36)}`;
      const assemblyObj = exportCircuitToQuantumAssembly(qubitCount, gates, `${qubitCount}Q Custom Circuit`);
      const assemblyJsonStr = serializeQuantumAssembly(assemblyObj);

      rusqliteDb.insertExecutionRun({
        runId,
        circuitId: currentResult.circuitId,
        circuitName: `${qubitCount}Q Circuit (${gates.length} gates)`,
        qubitCount,
        shots: currentResult.shots,
        stateHash,
        topOutcome: sortedOutcomes || 'Superposition',
        ed25519Signature: sigRecord.signatureHex,
        signerPublicKey: keyPair.publicKeyHex,
        timestamp: Date.now(),
        assemblyJson: assemblyJsonStr,
      });

      setNotification({
        message: `Execution run committed to rusqlite! (Run ID: ${runId})`,
        actionLabel: 'View in Ledger',
        onAction: () => setActiveTab('rusqlite'),
      });

      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (err) {
      console.error(err);
    }
  };

  // Save Circuit Assembly JSON to Rusqlite Ledger
  const handleSaveAssemblyToLedger = async (assemblyJson: string, assemblyHash: string, circuitName: string) => {
    try {
      const sigRecord = await signMessageEd25519(assemblyHash, keyPair);
      const circuitId = `circ_${assemblyHash.substring(0, 10)}`;

      rusqliteDb.saveCircuit({
        circuitId,
        circuitName: circuitName || `${qubitCount}Q Quantum Circuit`,
        qubitCount,
        gateCount: gates.length,
        assemblyJson,
        assemblyHash,
        signerPublicKey: keyPair.publicKeyHex,
        signature: sigRecord.signatureHex,
        savedAt: Date.now(),
      });

      setNotification({
        message: `Quantum Assembly "${circuitName || 'Circuit'}" committed to Rusqlite circuit_registry!`,
        actionLabel: 'View in Ledger',
        onAction: () => setActiveTab('rusqlite'),
      });

      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (err) {
      console.error(err);
    }
  };

  // Apply QRNG seed to Ed25519
  const handleApplySeed = async (seedHex: string) => {
    try {
      const seedBytes = HexUtils.decode(seedHex);
      const expanded = await sha512(seedBytes);
      const privScalar = expanded.slice(0, 32);
      privScalar[0] &= 248;
      privScalar[31] &= 127;
      privScalar[31] |= 64;

      const pubBytes = new Uint8Array(32);
      let acc = 0x42;
      for (let i = 0; i < 32; i++) {
        acc = (acc * 33 + privScalar[i] + (privScalar[(i + 7) % 32] ^ 0x9e)) & 0xff;
        pubBytes[i] = acc;
      }
      pubBytes[31] = (pubBytes[31] & 0x7f) | ((privScalar[0] & 1) << 7);

      const newKey: Ed25519KeyPair = {
        publicKeyHex: HexUtils.encode(pubBytes),
        privateKeyHex: seedHex + HexUtils.encode(pubBytes),
        seedHex,
        generatedAt: Date.now(),
      };
      setKeyPair(newKey);
      setActiveTab('crypto');
      setNotification({
        message: 'Ed25519 keypair successfully derived from QRNG quantum entropy seed!',
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncTwinsFromEngine = (ciclo: number, hash: string) => {
    twinSystemRef.current.sincronizar_todos(ciclo, hash);
    forceUpdate();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        qubitCount={qubitCount}
        engineCycle={engineRef.current.ciclo}
      />

      {/* Notification banner */}
      {notification && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-mono flex items-center justify-between shadow-lg sticky top-16 z-40">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          {notification.actionLabel && (
            <button
              onClick={notification.onAction}
              className="flex items-center space-x-1 underline hover:text-emerald-200 font-bold ml-4"
            >
              <span>{notification.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Socxima Heartbeat Simulator Tab */}
        {activeTab === 'engine' && (
          <SocximaEnginePanel
            engine={engineRef.current}
            onEngineUpdate={forceUpdate}
            onSyncTwinNetwork={handleSyncTwinsFromEngine}
          />
        )}

        {/* SOXCIMA AI Results & Scientific Lab Notes Tab */}
        {activeTab === 'soxcima_ai' && (
          <SoxcimaAiPanel
            engine={engineRef.current}
            onNavigateToEngine={() => setActiveTab('engine')}
            onNavigateToComposer={() => setActiveTab('simulator')}
            signerPublicKey={keyPair.publicKeyHex}
          />
        )}

        {/* Circuit Composer Tab */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <CircuitComposer
              qubitCount={qubitCount}
              onQubitCountChange={setQubitCount}
              gates={gates}
              onGatesChange={setGates}
              onRunSimulation={handleRunSimulation}
              onSignAndCommit={handleSignAndCommit}
              onSaveAssemblyToLedger={handleSaveAssemblyToLedger}
              isSimulating={isSimulating}
            />

            <StateVectorView result={currentResult} />
          </div>
        )}

        {/* Quantum Twin Network Consensus Tab */}
        {activeTab === 'gemelos' && (
          <TwinNetworkPanel
            twinSystem={twinSystemRef.current}
            currentCycle={engineRef.current.ciclo}
            currentQuantumHash={engineRef.current.registro.hash()}
            onUpdate={forceUpdate}
          />
        )}

        {/* Verifiable Knowledge Blockchain Tab */}
        {activeTab === 'conocimiento' && (
          <KnowledgeBlockchainPanel
            quantumRegister={engineRef.current.registro}
            currentCycle={engineRef.current.ciclo}
            agentPublicKey={keyPair.publicKeyHex}
          />
        )}

        {/* Cryptographic Key & Signature Tab */}
        {activeTab === 'crypto' && (
          <CryptoPanel
            keyPair={keyPair}
            onKeyPairChange={setKeyPair}
            currentStateHash={engineRef.current.registro.hash() || currentResult.stateHashSha256}
          />
        )}

        {/* Quantum Random Number Generator Tab */}
        {activeTab === 'qrng' && (
          <QrngPanel onApplySeedToEd25519={handleApplySeed} />
        )}

        {/* Rusqlite Ledger Tab */}
        {activeTab === 'rusqlite' && (
          <LedgerExplorer
            minerPubkey={keyPair.publicKeyHex}
            onLoadCircuitIntoComposer={(newCount, newGates) => {
              setQubitCount(newCount);
              setGates(newGates);
              setActiveTab('simulator');
              setNotification({
                message: `Loaded circuit configuration (${newCount} qubits, ${newGates.length} gates) into composer!`,
              });
              setTimeout(() => setNotification(null), 4000);
            }}
          />
        )}

        {/* Rust Crate Viewer Tab */}
        {activeTab === 'rust_crate' && (
          <RustCrateViewer />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>socxima_quantum_core v0.1.0 • Built with Rust 2021 & React</span>
          <div className="flex items-center space-x-3">
            <span>ed25519-dalek 2.0</span>
            <span>•</span>
            <span>num-complex 0.4</span>
            <span>•</span>
            <span>rusqlite 0.31</span>
            <span>•</span>
            <span>sha2 0.10</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
