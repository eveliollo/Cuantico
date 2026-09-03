import React, { useState } from 'react';
import { GatePlacement, GateType } from '../types/quantum';
import { Play, RotateCcw, ShieldCheck, Sparkles, Plus, Trash2, FileCode2, Share2 } from 'lucide-react';
import { QuantumAssemblyModal } from './QuantumAssemblyModal';

interface CircuitComposerProps {
  qubitCount: number;
  onQubitCountChange: (count: number) => void;
  gates: GatePlacement[];
  onGatesChange: (gates: GatePlacement[]) => void;
  onRunSimulation: (shots: number) => void;
  onSignAndCommit: () => void;
  isSimulating: boolean;
  onSaveAssemblyToLedger?: (assemblyJson: string, assemblyHash: string, circuitName: string) => Promise<void> | void;
}

const SINGLE_GATES: { type: GateType; label: string; desc: string; color: string }[] = [
  { type: 'H', label: 'H', desc: 'Hadamard (Superposition)', color: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/50' },
  { type: 'X', label: 'X', desc: 'Pauli-X (Bit Flip / NOT)', color: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/50' },
  { type: 'Y', label: 'Y', desc: 'Pauli-Y (Bit & Phase)', color: 'bg-teal-600/30 text-teal-300 border-teal-500/40 hover:bg-teal-600/50' },
  { type: 'Z', label: 'Z', desc: 'Pauli-Z (Phase Flip)', color: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/40 hover:bg-cyan-600/50' },
  { type: 'S', label: 'S', desc: 'Phase S (π/2)', color: 'bg-blue-600/30 text-blue-300 border-blue-500/40 hover:bg-blue-600/50' },
  { type: 'T', label: 'T', desc: 'Phase T (π/4)', color: 'bg-purple-600/30 text-purple-300 border-purple-500/40 hover:bg-purple-600/50' },
  { type: 'RX', label: 'Rx', desc: 'Rotation X (π/2)', color: 'bg-rose-600/30 text-rose-300 border-rose-500/40 hover:bg-rose-600/50' },
  { type: 'RY', label: 'Ry', desc: 'Rotation Y (π/2)', color: 'bg-amber-600/30 text-amber-300 border-amber-500/40 hover:bg-amber-600/50' },
  { type: 'RZ', label: 'Rz', desc: 'Rotation Z (π/2)', color: 'bg-violet-600/30 text-violet-300 border-violet-500/40 hover:bg-violet-600/50' },
];

const MULTI_GATES: { type: GateType; label: string; desc: string; color: string }[] = [
  { type: 'CNOT', label: 'CNOT', desc: 'Controlled-NOT (Entangler)', color: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50 hover:bg-emerald-500/50' },
  { type: 'CZ', label: 'CZ', desc: 'Controlled-Phase', color: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50 hover:bg-cyan-500/50' },
  { type: 'SWAP', label: 'SWAP', desc: 'Swap 2 Qubits', color: 'bg-amber-500/30 text-amber-200 border-amber-400/50 hover:bg-amber-500/50' },
];

const MAX_STEPS = 8;

export const CircuitComposer: React.FC<CircuitComposerProps> = ({
  qubitCount,
  onQubitCountChange,
  gates,
  onGatesChange,
  onRunSimulation,
  onSignAndCommit,
  isSimulating,
  onSaveAssemblyToLedger,
}) => {
  const [selectedGateType, setSelectedGateType] = useState<GateType>('H');
  const [controlQubit, setControlQubit] = useState<number>(0);
  const [shots, setShots] = useState<number>(1024);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Load Presets
  const applyPreset = (presetName: string) => {
    let newGates: GatePlacement[] = [];
    let count = qubitCount;

    if (presetName === 'bell') {
      count = 2;
      newGates = [
        { id: 'g0', type: 'H', targetQubit: 0, step: 0 },
        { id: 'g1', type: 'CNOT', controlQubit: 0, targetQubit: 1, step: 1 },
      ];
    } else if (presetName === 'ghz') {
      count = 3;
      newGates = [
        { id: 'g0', type: 'H', targetQubit: 0, step: 0 },
        { id: 'g1', type: 'CNOT', controlQubit: 0, targetQubit: 1, step: 1 },
        { id: 'g2', type: 'CNOT', controlQubit: 1, targetQubit: 2, step: 2 },
      ];
    } else if (presetName === 'qrng') {
      count = 4;
      newGates = [
        { id: 'g0', type: 'H', targetQubit: 0, step: 0 },
        { id: 'g1', type: 'H', targetQubit: 1, step: 0 },
        { id: 'g2', type: 'H', targetQubit: 2, step: 0 },
        { id: 'g3', type: 'H', targetQubit: 3, step: 0 },
      ];
    } else if (presetName === 'grover') {
      count = 2;
      // Grover search on 2 qubits marked |11>
      newGates = [
        // Equal superposition
        { id: 'g0', type: 'H', targetQubit: 0, step: 0 },
        { id: 'g1', type: 'H', targetQubit: 1, step: 0 },
        // Oracle for |11>: CZ
        { id: 'g2', type: 'CZ', controlQubit: 0, targetQubit: 1, step: 1 },
        // Diffusion operator
        { id: 'g3', type: 'H', targetQubit: 0, step: 2 },
        { id: 'g4', type: 'H', targetQubit: 1, step: 2 },
        { id: 'g5', type: 'X', targetQubit: 0, step: 3 },
        { id: 'g6', type: 'X', targetQubit: 1, step: 3 },
        { id: 'g7', type: 'CZ', controlQubit: 0, targetQubit: 1, step: 4 },
        { id: 'g8', type: 'X', targetQubit: 0, step: 5 },
        { id: 'g9', type: 'X', targetQubit: 1, step: 5 },
        { id: 'g10', type: 'H', targetQubit: 0, step: 6 },
        { id: 'g11', type: 'H', targetQubit: 1, step: 6 },
      ];
    } else if (presetName === 'teleportation') {
      count = 3;
      newGates = [
        // Initial state on q0: H
        { id: 'g0', type: 'H', targetQubit: 0, step: 0 },
        // Bell pair on q1, q2
        { id: 'g1', type: 'H', targetQubit: 1, step: 0 },
        { id: 'g2', type: 'CNOT', controlQubit: 1, targetQubit: 2, step: 1 },
        // Bell measurement on q0, q1
        { id: 'g3', type: 'CNOT', controlQubit: 0, targetQubit: 1, step: 2 },
        { id: 'g4', type: 'H', targetQubit: 0, step: 3 },
        // Corrections on q2
        { id: 'g5', type: 'CNOT', controlQubit: 1, targetQubit: 2, step: 4 },
        { id: 'g6', type: 'CZ', controlQubit: 0, targetQubit: 2, step: 5 },
      ];
    }

    if (count !== qubitCount) {
      onQubitCountChange(count);
    }
    onGatesChange(newGates);
  };

  // Place gate at (targetQubit, step)
  const handleCellClick = (targetQubit: number, step: number) => {
    // Check if gate exists at this location
    const existing = gates.find(g => g.targetQubit === targetQubit && g.step === step);
    if (existing) {
      // Remove it
      onGatesChange(gates.filter(g => g.id !== existing.id));
      return;
    }

    const isMulti = ['CNOT', 'CZ', 'SWAP'].includes(selectedGateType);
    let ctrl = controlQubit;
    if (isMulti && ctrl === targetQubit) {
      ctrl = (targetQubit + 1) % qubitCount;
    }

    const newGate: GatePlacement = {
      id: `gate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: selectedGateType,
      targetQubit,
      step,
      controlQubit: isMulti ? ctrl : undefined,
      params: ['RX', 'RY', 'RZ'].includes(selectedGateType) ? { theta: Math.PI / 2 } : undefined,
    };

    onGatesChange([...gates, newGate]);
  };

  const clearCircuit = () => {
    onGatesChange([]);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-mono text-slate-400">Qubits:</label>
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                id={`qubit-count-${n}`}
                onClick={() => {
                  onQubitCountChange(n);
                  onGatesChange(gates.filter(g => g.targetQubit < n && (g.controlQubit === undefined || g.controlQubit < n)));
                }}
                className={`px-2.5 py-1 text-xs font-mono rounded ${
                  qubitCount === n
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {n} Q
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Presets */}
          <span className="text-xs font-mono text-slate-400">Presets:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              id="preset-bell"
              onClick={() => applyPreset('bell')}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 transition-colors"
            >
              Bell |Φ+⟩
            </button>
            <button
              id="preset-ghz"
              onClick={() => applyPreset('ghz')}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition-colors"
            >
              GHZ State
            </button>
            <button
              id="preset-grover"
              onClick={() => applyPreset('grover')}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30 transition-colors"
            >
              Grover Oracle
            </button>
            <button
              id="preset-qrng"
              onClick={() => applyPreset('qrng')}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 transition-colors"
            >
              H⊗n Superposition
            </button>
            <button
              id="preset-teleport"
              onClick={() => applyPreset('teleportation')}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-950 hover:bg-slate-800 text-purple-300 border border-purple-500/30 transition-colors"
            >
              Teleportation
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {/* Shots */}
          <div className="flex items-center space-x-1 text-xs font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-500">Shots:</span>
            <select
              id="shots-select"
              value={shots}
              onChange={(e) => setShots(Number(e.target.value))}
              className="bg-transparent text-emerald-400 font-mono outline-none cursor-pointer"
            >
              <option value={100} className="bg-slate-900">100</option>
              <option value={1024} className="bg-slate-900">1,024</option>
              <option value={4096} className="bg-slate-900">4,096</option>
              <option value={10000} className="bg-slate-900">10,000</option>
            </select>
          </div>

          <button
            id="btn-run-sim"
            onClick={() => onRunSimulation(shots)}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/50 transition-colors font-mono font-semibold"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulating ? 'Simulating...' : 'Simulate'}</span>
          </button>

          <button
            id="btn-export-qasm"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-slate-700 shadow-md transition-colors font-mono"
            title="Export circuit configuration as JSON-formatted quantum assembly string"
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export QASM JSON</span>
          </button>

          <button
            id="btn-sign-commit"
            onClick={onSignAndCommit}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/50 transition-colors font-mono"
            title="Sign state hash with Ed25519 and insert into Rusqlite ledger"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sign & Commit to Rusqlite</span>
          </button>

          <button
            id="btn-clear-circuit"
            onClick={clearCircuit}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Clear all gates"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gate Selector Bar */}
      <div className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-mono text-[11px]">Selected Gate:</span>
          <div className="flex flex-wrap gap-1">
            {SINGLE_GATES.map(g => (
              <button
                key={g.type}
                id={`gate-sel-${g.type}`}
                onClick={() => setSelectedGateType(g.type)}
                className={`px-2 py-1 rounded text-xs font-mono font-semibold border transition-all ${
                  selectedGateType === g.type
                    ? 'ring-2 ring-emerald-400 scale-105 ' + g.color
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
                title={g.desc}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-mono text-[11px]">Entangling Gates:</span>
          <div className="flex gap-1">
            {MULTI_GATES.map(g => (
              <button
                key={g.type}
                id={`gate-sel-${g.type}`}
                onClick={() => setSelectedGateType(g.type)}
                className={`px-2 py-1 rounded text-xs font-mono font-semibold border transition-all ${
                  selectedGateType === g.type
                    ? 'ring-2 ring-emerald-400 scale-105 ' + g.color
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
                title={g.desc}
              >
                {g.label}
              </button>
            ))}
          </div>

          {['CNOT', 'CZ', 'SWAP'].includes(selectedGateType) && (
            <div className="flex items-center space-x-1 pl-2 font-mono text-[11px] text-slate-400">
              <span>Control Q:</span>
              <select
                id="control-qubit-select"
                value={controlQubit}
                onChange={(e) => setControlQubit(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-emerald-400 outline-none"
              >
                {Array.from({ length: qubitCount }).map((_, i) => (
                  <option key={i} value={i}>q[{i}]</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Circuit Grid Wireframe */}
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="min-w-[640px] select-none">
          {/* Step header */}
          <div className="grid grid-cols-[80px_repeat(8,1fr)] gap-2 mb-2 text-[10px] font-mono text-slate-500 text-center">
            <div className="text-left pl-2">Wire</div>
            {Array.from({ length: MAX_STEPS }).map((_, step) => (
              <div key={step} className="bg-slate-950/40 py-0.5 rounded">
                Step {step + 1}
              </div>
            ))}
          </div>

          {/* Qubit wires */}
          {Array.from({ length: qubitCount }).map((_, qIndex) => (
            <div
              key={qIndex}
              className="grid grid-cols-[80px_repeat(8,1fr)] gap-2 items-center py-2.5 group relative"
            >
              {/* Qubit Label */}
              <div className="flex items-center space-x-2 pl-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs font-bold text-slate-200">
                  q[{qIndex}]
                </span>
                <span className="text-[10px] font-mono text-slate-500">|0⟩</span>
              </div>

              {/* Wire slots */}
              {Array.from({ length: MAX_STEPS }).map((_, step) => {
                const gate = gates.find(g => g.targetQubit === qIndex && g.step === step);
                const isControlForGate = gates.find(
                  g => g.controlQubit === qIndex && g.step === step
                );

                return (
                  <div
                    key={step}
                    onClick={() => handleCellClick(qIndex, step)}
                    className="relative h-12 flex items-center justify-center cursor-pointer group/cell"
                  >
                    {/* Horizontal wire line */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-slate-700/80 group-hover/cell:bg-emerald-500/50 transition-colors" />

                    {/* Vertical connector line if multi-qubit gate */}
                    {gate && gate.controlQubit !== undefined && (
                      <div
                        className="absolute w-[2px] bg-emerald-400 z-10"
                        style={{
                          top: gate.controlQubit < qIndex ? '-100%' : '50%',
                          bottom: gate.controlQubit > qIndex ? '-100%' : '50%',
                          height: `${Math.abs(gate.controlQubit - qIndex) * 100 + 50}%`,
                          transform: gate.controlQubit < qIndex ? `translateY(-${(qIndex - gate.controlQubit) * 48}px)` : 'none'
                        }}
                      />
                    )}

                    {/* Control Dot if this qubit is controlling a multi-qubit gate on this step */}
                    {isControlForGate && (
                      <div className="relative z-20 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md" />
                    )}

                    {/* Gate Item */}
                    {gate && (
                      <div
                        className={`relative z-20 w-10 h-10 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-xs border shadow-lg transition-transform hover:scale-110 ${
                          gate.type === 'H' ? 'bg-indigo-600/80 text-white border-indigo-400' :
                          gate.type === 'CNOT' ? 'bg-emerald-600/80 text-white border-emerald-400' :
                          gate.type === 'X' ? 'bg-emerald-700/80 text-white border-emerald-400' :
                          gate.type === 'CZ' ? 'bg-cyan-600/80 text-white border-cyan-400' :
                          gate.type === 'SWAP' ? 'bg-amber-600/80 text-white border-amber-400' :
                          'bg-slate-800 text-emerald-300 border-slate-600'
                        }`}
                      >
                        <span>{gate.type}</span>
                        {gate.controlQubit !== undefined && (
                          <span className="text-[8px] text-slate-300 font-normal">c:{gate.controlQubit}</span>
                        )}
                      </div>
                    )}

                    {/* Ghost gate hover preview */}
                    {!gate && !isControlForGate && (
                      <div className="w-8 h-8 rounded border border-dashed border-slate-700/40 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity z-10 bg-slate-900/60">
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
        <span className="font-mono">
          Total Gates: <strong className="text-emerald-400 font-semibold">{gates.length}</strong> | Click a cell to place or remove a gate.
        </span>
        <span className="font-mono text-[11px] text-slate-400">
          Engine: <span className="text-cyan-400">num-complex</span> state-vector unitary evolution
        </span>
      </div>

      {/* Export / Import Quantum Assembly Modal */}
      <QuantumAssemblyModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        qubitCount={qubitCount}
        gates={gates}
        onImportCircuit={(count, newGates) => {
          onQubitCountChange(count);
          onGatesChange(newGates);
        }}
        onSaveToLedger={onSaveAssemblyToLedger}
      />
    </div>
  );
};
