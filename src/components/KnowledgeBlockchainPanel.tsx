import React, { useState } from 'react';
import {
  BloqueConocimiento,
  TipoTarea,
  Tarea,
  ResultadoTarea,
  AUTOR_ID,
  sello_genesis,
  generar_tarea,
  procesar_tarea,
  calcular_hash_bloque,
  QuantumRegister
} from '../core/socximaEngine';
import { Blocks, Award, Sparkles, CheckCircle2, ChevronRight, Copy, Check, Hash, Cpu, ArrowRight } from 'lucide-react';

interface KnowledgeBlockchainPanelProps {
  quantumRegister: QuantumRegister;
  currentCycle: number;
  agentPublicKey: string;
}

export const KnowledgeBlockchainPanel: React.FC<KnowledgeBlockchainPanelProps> = ({
  quantumRegister,
  currentCycle,
  agentPublicKey,
}) => {
  const genesisStamp = sello_genesis();

  // Initial genesis block in chain
  const [blocks, setBlocks] = useState<BloqueConocimiento[]>([
    {
      id: 0,
      previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      hash: genesisStamp,
      ciclo: 0,
      tarea: 'Genesis Block Authorization',
      resultado: `Autor Master ID: ${AUTOR_ID}`,
      verificacion: 'Sello Genesis Cryptographically Verified',
      agente: 'GENESIS_CORE',
      quantum_hash: quantumRegister.hash(),
      validado: true,
      timestamp: Date.now() - 120000,
    }
  ]);

  const [activeTask, setActiveTask] = useState<Tarea>(() => generar_tarea(1));
  const [taskResult, setTaskResult] = useState<ResultadoTarea | null>(null);
  const [copiedStamp, setCopiedStamp] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<TipoTarea>('AlgebraCompleja');

  const handleGenerateTask = () => {
    const nextId = blocks.length;
    const t = generar_tarea(nextId);
    setActiveTask(t);
    setTaskResult(null);
  };

  const handleSetCustomType = (type: TipoTarea) => {
    setSelectedType(type);
    const nextId = blocks.length;
    const t: Tarea = {
      id: nextId,
      tipo: type,
      descripcion:
        type === 'AlgebraCompleja'
          ? 'Multiplicacion de dos numeros complejos'
          : type === 'ProductoVectorial'
          ? 'Producto punto de dos vectores 3D'
          : type === 'MultiplicacionMatrices'
          ? 'Multiplicacion de matrices 2x2'
          : 'Calculo de probabilidades Born del estado actual',
    };
    setActiveTask(t);
    setTaskResult(null);
  };

  const handleProcessTask = () => {
    const res = procesar_tarea(activeTask, quantumRegister);
    setTaskResult(res);
  };

  const handleMineBlock = () => {
    if (!taskResult) return;

    const previousBlock = blocks[blocks.length - 1];
    const blockId = blocks.length;
    const qHash = quantumRegister.hash();

    const blockHash = calcular_hash_bloque(
      blockId,
      previousBlock.hash,
      currentCycle,
      activeTask.descripcion,
      taskResult.resultado,
      agentPublicKey || AUTOR_ID,
      qHash
    );

    const newBlock: BloqueConocimiento = {
      id: blockId,
      previous_hash: previousBlock.hash,
      hash: blockHash,
      ciclo: currentCycle,
      tarea: activeTask.descripcion,
      resultado: taskResult.resultado,
      verificacion: taskResult.verificacion,
      agente: agentPublicKey ? agentPublicKey.slice(0, 16) + '...' : AUTOR_ID,
      quantum_hash: qHash,
      validado: taskResult.valido,
      timestamp: Date.now(),
    };

    setBlocks(prev => [...prev, newBlock]);
    // Prepare next task
    handleGenerateTask();
  };

  const copyGenesisStamp = () => {
    navigator.clipboard.writeText(genesisStamp);
    setCopiedStamp(true);
    setTimeout(() => setCopiedStamp(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Genesis Card & Author Identity */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-base font-semibold text-white">
                Genesis Block Identity & Author Stamp (AUTOR_ID)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Verified Authority
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono">
              Master Autor ID: <code className="text-amber-300 font-bold select-all">{AUTOR_ID}</code>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copyGenesisStamp}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-mono transition-colors"
            >
              {copiedStamp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedStamp ? 'Copied Stamp' : 'Copy Sello Genesis'}</span>
            </button>
          </div>
        </div>

        {/* Sello Genesis Hex Preview */}
        <div className="mt-4 pt-3 border-t border-amber-500/20 font-mono text-xs">
          <div className="text-slate-400 text-[11px] mb-1">
            SHA256(b"SOCXIMA-AUTOR:" + AUTOR_ID) =
          </div>
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-amber-300 select-all break-all">
            {genesisStamp}
          </div>
        </div>
      </div>

      {/* Task Execution Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Generator & Solver */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Knowledge Task Generator (TipoTarea)
              </h3>
            </div>
            <button
              onClick={handleGenerateTask}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Randomize Task ↻
            </button>
          </div>

          {/* Task Type Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'AlgebraCompleja' as TipoTarea, label: 'Complex Algebra' },
              { type: 'ProductoVectorial' as TipoTarea, label: '3D Dot Product' },
              { type: 'MultiplicacionMatrices' as TipoTarea, label: '2x2 Matrix Mult' },
              { type: 'ProbabilidadMedicion' as TipoTarea, label: 'Born Probability' },
            ].map(t => (
              <button
                key={t.type}
                onClick={() => handleSetCustomType(t.type)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors border ${
                  activeTask.tipo === t.type
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-semibold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Current Task Description */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Task ID: #{activeTask.id}</span>
              <span className="text-cyan-400 font-semibold">{activeTask.tipo}</span>
            </div>
            <div className="text-white font-medium">{activeTask.descripcion}</div>
          </div>

          {/* Process Task Button */}
          <div className="flex space-x-2">
            <button
              id="btn-process-task"
              onClick={handleProcessTask}
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs font-mono transition-colors shadow-md flex items-center justify-center space-x-2"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Procesar Tarea (procesar_tarea)</span>
            </button>
          </div>

          {/* Task Result & Verification */}
          {taskResult && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 text-[11px]">Computed Outcome</span>
                <span
                  className={`flex items-center space-x-1 font-bold ${
                    taskResult.valido ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{taskResult.valido ? 'Proof Validated' : 'Validation Failed'}</span>
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400 text-[10px]">Result:</div>
                <div className="text-amber-300 font-semibold break-all">{taskResult.resultado}</div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400 text-[10px]">Independent Verification:</div>
                <div className="text-cyan-300 text-[11px] break-all">{taskResult.verificacion}</div>
              </div>

              {/* Mine Block Button */}
              <button
                id="btn-mine-block"
                onClick={handleMineBlock}
                className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md flex items-center justify-center space-x-2"
              >
                <Blocks className="w-3.5 h-3.5" />
                <span>Minar Bloque de Conocimiento (BloqueConocimiento)</span>
              </button>
            </div>
          )}
        </div>

        {/* Current Quantum State Integration info */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Blocks className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Quantum State Binding & Block Mining Architecture
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Every mined <code className="text-emerald-400 font-bold">BloqueConocimiento</code> cryptographically seals the quantum register state at cycle <code className="text-cyan-400">#{currentCycle}</code>.
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
              <div className="text-slate-400 text-[11px]">Active Quantum State Hash:</div>
              <div className="text-amber-300 select-all break-all text-[11px]">
                {quantumRegister.hash()}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px]">
                <span className="text-slate-400">Current Cycle:</span>
                <span className="text-white font-semibold">#{currentCycle}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Signer Agent Key:</span>
                <span className="text-indigo-300 select-all">
                  {agentPublicKey ? agentPublicKey.slice(0, 16) + '...' : AUTOR_ID}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
            <strong>Chained Hashing Formula:</strong>
            <br />
            <code className="text-slate-400">
              SHA256(id + prev_hash + ciclo + tarea + resultado + agente + quantum_hash)
            </code>
          </div>
        </div>
      </div>

      {/* Mined Knowledge Blockchain Explorer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Blocks className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Knowledge Blockchain Ledger ({blocks.length} Blocks Mined)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Immutable Verifiable Ledger
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {[...blocks].reverse().map(block => (
            <div
              key={block.id}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center space-x-2 font-bold text-white">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Block #{block.id}
                  </span>
                  <span className="text-slate-400 font-normal">Ciclo #{block.ciclo}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    VERIFIED PROOF
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {new Date(block.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1">
                  <div className="text-slate-500 text-[10px]">Block Hash:</div>
                  <div className="text-emerald-400 select-all break-all">{block.hash}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-500 text-[10px]">Previous Hash:</div>
                  <div className="text-slate-400 select-all break-all">{block.previous_hash}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500">Task: </span>
                  <span className="text-slate-300">{block.tarea}</span>
                </div>
                <div>
                  <span className="text-slate-500">Outcome: </span>
                  <span className="text-amber-300">{block.resultado}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Quantum Hash: {block.quantum_hash.slice(0, 16)}...</span>
                <span>Signer: {block.agente}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
