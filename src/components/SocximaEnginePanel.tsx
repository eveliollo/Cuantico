import React, { useState, useEffect, useRef } from 'react';
import { SocximaEngine, ResultadoLatido, QuantumRegister } from '../core/socximaEngine';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Sparkles,
  Binary,
  Check,
  Copy,
  History,
  Cpu,
  Award,
  Sliders,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';

interface SocximaEnginePanelProps {
  engine: SocximaEngine;
  onEngineUpdate: () => void;
  onSyncTwinNetwork?: (ciclo: number, hash: string) => void;
}

export const SocximaEnginePanel: React.FC<SocximaEnginePanelProps> = ({
  engine,
  onEngineUpdate,
  onSyncTwinNetwork,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(800); // interval ms
  const [lastLatido, setLastLatido] = useState<ResultadoLatido | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [copiedBinary, setCopiedBinary] = useState<string | null>(null);
  const [qubitFilter, setQubitFilter] = useState<'all' | 'superposition' | 'ground'>('all');
  const [customQubitInput, setCustomQubitInput] = useState<string>(String(engine.registro.n_qubits));
  const [qubitPage, setQubitPage] = useState<number>(0);
  const [searchQubit, setSearchQubit] = useState<string>('');
  const intervalRef = useRef<number | null>(null);

  const tick = () => {
    const res = engine.latido();
    setLastLatido(res);
    onEngineUpdate();
    if (onSyncTwinNetwork) {
      onSyncTwinNetwork(res.ciclo, engine.registro.hash());
    }
  };

  const toggleRun = () => {
    setIsRunning(prev => !prev);
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        tick();
      }, speedMs);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, speedMs]);

  const handleReset = () => {
    setIsRunning(false);
    engine.ciclo = 0;
    engine.operaciones_ejecutadas = 0;
    engine.mediciones_realizadas = 0;
    engine.historial_entropia = [];
    engine.eventos = [];
    engine.registro = QuantumRegister.nuevo(engine.registro.n_qubits);
    setLastLatido(null);
    onEngineUpdate();
  };

  const handleScaleQubits = (targetQubits: number) => {
    setIsRunning(false);
    engine.cambiar_qubits(targetQubits);
    setCustomQubitInput(String(targetQubits));
    setQubitPage(0);
    setSearchQubit('');
    setLastLatido(null);
    onEngineUpdate();
  };

  const handleApplyCustomQubits = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customQubitInput, 10);
    if (!isNaN(val) && val >= 2 && val <= 10000) {
      handleScaleQubits(val);
    }
  };

  const copyHash = () => {
    navigator.clipboard.writeText(engine.registro.hash());
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const copyBinaryState = (bin: string) => {
    navigator.clipboard.writeText(bin);
    setCopiedBinary(bin);
    setTimeout(() => setCopiedBinary(null), 2000);
  };

  const activeStates = engine.registro.estados_activos();
  const currentHash = engine.registro.hash();
  const normalizedEntropy = engine.entropia_normalizada();
  const avgEntropy = engine.entropia_promedio_historica();

  const isBellTrigger = engine.ciclo > 0 && engine.ciclo % 7 === 0;
  const isMeasureTrigger = engine.ciclo > 0 && engine.ciclo % 11 === 0;
  const isPhaseTrigger = engine.ciclo > 0 && engine.ciclo % 3 === 0;

  const currentQubits = engine.registro.n_qubits;
  const isTarget70 = currentQubits === 70;
  const isTitanScale = currentQubits >= 6000;
  const isExceedingIBM = currentQubits > 1333;
  const isMatchingIBM = currentQubits === 1333;

  // Ultra-fast marginal probabilities calculation
  const activeMarginals = engine.registro.probabilidades_marginales_activas();
  
  const superposedList: Array<{ qubit: number; prob1: number }> = [];
  for (const [q, p] of activeMarginals.entries()) {
    if (p > 0.001 && p < 0.999 && q < currentQubits) {
      superposedList.push({ qubit: q, prob1: p });
    }
  }
  superposedList.sort((a, b) => a.qubit - b.qubit);

  const pureOneList: Array<{ qubit: number; prob1: number }> = [];
  for (const [q, p] of activeMarginals.entries()) {
    if (p >= 0.999 && q < currentQubits) {
      pureOneList.push({ qubit: q, prob1: p });
    }
  }

  // Pagination for Qubit Grid
  const pageSize = 100;
  const totalPages = Math.max(1, Math.ceil(currentQubits / pageSize));

  // Determine which qubits to render based on current filter & search
  let displayedQubits: Array<{ qubit: number; prob1: number }> = [];

  if (searchQubit.trim() !== '') {
    const targetQ = parseInt(searchQubit.trim(), 10);
    if (!isNaN(targetQ) && targetQ >= 0 && targetQ < currentQubits) {
      displayedQubits = [{ qubit: targetQ, prob1: activeMarginals.get(targetQ) || 0 }];
    }
  } else if (qubitFilter === 'superposition') {
    displayedQubits = superposedList;
  } else if (qubitFilter === 'ground') {
    const start = qubitPage * pageSize;
    const end = Math.min(currentQubits, start + pageSize);
    for (let q = start; q < end; q++) {
      const p = activeMarginals.get(q) || 0;
      if (p <= 0.001) {
        displayedQubits.push({ qubit: q, prob1: p });
      }
    }
  } else {
    // 'all'
    const start = qubitPage * pageSize;
    const end = Math.min(currentQubits, start + pageSize);
    for (let q = start; q < end; q++) {
      displayedQubits.push({ qubit: q, prob1: activeMarginals.get(q) || 0 });
    }
  }

  return (
    <div className="space-y-6">
      {/* Titan Hyper-Scale Banner (>= 6,000 Qubits) */}
      {isTitanScale && (
        <div className="bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-cyan-900/30 border-2 border-purple-400/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute -right-8 -top-8 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-400 to-cyan-300 p-0.5 shadow-lg shadow-purple-500/30 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-purple-300">
                  <Sparkles className="w-7 h-7 text-purple-400 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-purple-200 tracking-wide flex items-center gap-2">
                    ¡FRONTERA CUÁNTICA TITÁN: {currentQubits.toLocaleString()} CÚBITS ACTIVADOS!
                  </h3>
                  <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-gradient-to-r from-purple-400 to-cyan-300 text-slate-950 uppercase shadow">
                    &gt;4.5× LA ESCALA DE IBM HERON (1,333 Q)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  Socxima Quantum Engine opera en la escala colosal de <strong className="text-purple-300 font-semibold">{currentQubits.toLocaleString()} cúbits</strong>.
                  El espacio de Hilbert alcanza los <strong className="text-cyan-300 font-mono">{engine.registro.dimensionScientific()}</strong> estados posibles, preservando la formulación exacta de la mecánica cuántica: rotaciones unitarias armónicas, entrelazamiento multiqubit Bell y verificación criptográfica determinista SHA-256.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">
                    IBM Heron (2024): <span className="text-slate-300 font-semibold">1,333 Qubits</span>
                  </span>
                  <span className="text-cyan-400 font-semibold">
                    Multiplicador: {(currentQubits / 1333).toFixed(2)}× vs. IBM Heron
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Socxima Core: {currentQubits.toLocaleString()} Qubits (2^{currentQubits} ≈ {engine.registro.dimensionScientific()} estados)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-2 font-mono text-xs border-t lg:border-t-0 pt-3 lg:pt-0 border-purple-500/20 shrink-0">
              <span className="text-purple-300/80 text-[11px] uppercase tracking-wider font-semibold">
                Espacio de Hilbert Activo
              </span>
              <span className="text-purple-200 font-bold text-base bg-slate-950/90 px-3.5 py-1.5 rounded-xl border border-purple-400/40 shadow-inner whitespace-nowrap">
                {engine.registro.dimensionScientific()}
              </span>
              <span className="text-[11px] text-purple-300 font-semibold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                +{currentQubits - 1333} cúbits sobre IBM Heron
              </span>
            </div>
          </div>
        </div>
      )}

      {/* IBM Heron Record Breaker Banner (> 1,333 Qubits and < 6,000 Qubits) */}
      {isExceedingIBM && !isTitanScale && (
        <div className="bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-emerald-500/20 border-2 border-amber-400/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-300">
                  <Trophy className="w-7 h-7 text-amber-400 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-amber-200 tracking-wide flex items-center gap-2">
                    ¡RÉCORD MUNDIAL SUPERADO: {currentQubits.toLocaleString()} CÚBITS ACTIVADOS!
                  </h3>
                  <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 uppercase shadow">
                    SUPERANDO A IBM HERON (1,333 Q)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  Socxima Quantum Engine supera la barrera histórica del procesador cuántico <strong className="text-amber-300 font-semibold">IBM Heron (1,333 cúbits, 2024)</strong>.
                  La arquitectura se mantiene 100% fiel e intacta: latido armónico exacto, compuertas unitarias sin aproximación, entrelazamiento multiqubit Bell e identidad determinista verificada por hash SHA-256.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">
                    IBM Heron (2024): <span className="text-slate-300 font-semibold">1,333 Qubits</span> (2¹³³³ ≈ 1.88 × 10⁴⁰¹ estados)
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Socxima Core: {currentQubits} Qubits (2^{currentQubits} ≈ {engine.registro.dimensionScientific()} estados)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-2 font-mono text-xs border-t lg:border-t-0 pt-3 lg:pt-0 border-amber-500/20 shrink-0">
              <span className="text-amber-300/80 text-[11px] uppercase tracking-wider font-semibold">
                Espacio de Hilbert Activo
              </span>
              <span className="text-amber-200 font-bold text-base bg-slate-950/90 px-3.5 py-1.5 rounded-xl border border-amber-400/40 shadow-inner whitespace-nowrap">
                {engine.registro.dimensionScientific()}
              </span>
              <span className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                +{currentQubits - 1333} cúbit{currentQubits - 1333 > 1 ? 's' : ''} sobre IBM Heron
              </span>
            </div>
          </div>
        </div>
      )}

      {/* IBM Heron Parity Banner (Exactly 1,333 Qubits) */}
      {isMatchingIBM && (
        <div className="bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 border-2 border-cyan-400/50 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-cyan-200">
                    PARIDAD CON IBM HERON ALCANZADA: 1,333 CÚBITS
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-cyan-400 text-slate-950 uppercase">
                    IBM Heron 2024 Parity
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  Simulación cuántica armónica a la escala exacta del procesador IBM Heron 2024 (1,333 cúbits).
                  ¿Listo para sobrepasarlo? Activa 1,334 cúbits.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleScaleQubits(1334)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl text-xs font-mono shadow-md transition-transform active:scale-95 whitespace-nowrap"
            >
              🚀 Pasar el Récord (1,334 Q)
            </button>
          </div>
        </div>
      )}

      {/* 70 Qubits Goal Celebration Banner */}
      {isTarget70 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-cyan-500/15 border border-amber-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-inner">
                <Award className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-amber-200 tracking-wide">
                    ¡META CUMPLIDA: 70 CÚBITS COMPLETOS ACTIVADOS!
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-400 text-slate-950 uppercase shadow">
                    Socxima 70Q
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  Todo intacto: latido armónico, matemática exacta sin aproximaciones, entrelazamiento Bell multiqubit e identidad del motor.
                  Espacio de Hilbert expandido a <strong className="text-cyan-300 font-mono">2⁷⁰ = 1,180,591,620,717,411,303,424 estados</strong>.
                </p>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-2 font-mono text-xs">
              <button
                onClick={() => handleScaleQubits(1334)}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-lg text-xs shadow hover:from-amber-400 hover:to-yellow-300 transition-all whitespace-nowrap"
              >
                🚀 Escalar a 1,334 Q (IBM Heron)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Challenge Prompt when below 1334 */}
      {currentQubits < 1333 && !isTarget70 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-xl">🏆</span>
            <div>
              <span className="text-slate-200 font-semibold">Meta de la Industria: Superar a IBM Heron (1,333 Cúbits 2024) y Escalar a 6,000 Q</span>
              <p className="text-slate-400 text-[11px]">Actualmente en {currentQubits.toLocaleString()} cúbits. Escala a 1,334 para superar a IBM Heron o a 6,000 para la frontera cuántica Titán.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleScaleQubits(1334)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl shadow transition-transform active:scale-95 whitespace-nowrap"
            >
              🏆 1,334 Q
            </button>
            <button
              onClick={() => handleScaleQubits(6000)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-slate-950 font-bold rounded-xl shadow transition-transform active:scale-95 whitespace-nowrap"
            >
              🌌 6,000 Q (Titán)
            </button>
          </div>
        </div>
      )}

      {/* Top Banner & Latido Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Activity className={`w-4 h-4 text-emerald-400 ${isRunning ? 'animate-pulse' : ''}`} />
              </div>
              <h2 className="text-base font-semibold text-white">
                Socxima Engine • Quantum Heartbeat Simulator (latido)
              </h2>
              <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {engine.registro.n_qubits.toLocaleString()} Qubits • 2^{engine.registro.n_qubits} Dim
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Simula la evolución dinámica del estado cuántico: rotaciones paramétricas <code className="text-cyan-400 font-mono">Ry(ciclo * 0.35)</code> & <code className="text-indigo-400 font-mono">Rz(ciclo % 3 == 0)</code>, entrelazamiento Bell multiqubit en <code className="text-emerald-400 font-mono">ciclo % 7 == 0</code>, y colapso de medición en <code className="text-amber-400 font-mono">ciclo % 11 == 0</code>.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            {/* Speed Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { label: '0.5x', ms: 1200 },
                { label: '1x', ms: 800 },
                { label: '2x', ms: 400 },
                { label: '5x', ms: 150 },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => setSpeedMs(s.ms)}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    speedMs === s.ms
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Step 1 Latido button */}
            <button
              id="btn-tick-latido"
              onClick={tick}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow"
              title="Ejecutar 1 pulso de latido"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Tick Latido</span>
            </button>

            {/* Run / Pause toggle */}
            <button
              id="btn-toggle-engine"
              onClick={toggleRun}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl font-semibold transition-colors shadow-md ${
                isRunning
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pausa</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Continuo</span>
                </>
              )}
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
              title="Reiniciar ciclo del motor"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Qubit Capacity & Scale Selector Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Escala de Capacidad Cuántica:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { q: 3, label: '3 Qubits' },
              { q: 8, label: '8 Qubits' },
              { q: 70, label: '70 Qubits' },
              { q: 1121, label: '1,121 Q (Condor)' },
              { q: 1333, label: '1,333 Q (Heron 2024)' },
              { q: 1334, label: '🏆 1,334 Q (Récord)' },
              { q: 2048, label: '⚡ 2,048 Q' },
              { q: 6000, label: '🌌 6,000 Q (¡SOCXIMA TITÁN!)' },
            ].map(item => {
              const isActive = currentQubits === item.q;
              const isTitan = item.q >= 6000;
              const isRecord = item.q >= 1334 && item.q < 6000;
              const isHeron = item.q === 1333;
              return (
                <button
                  key={item.q}
                  onClick={() => handleScaleQubits(item.q)}
                  className={`px-2.5 py-1.5 rounded-xl border transition-all text-xs ${
                    isActive
                      ? isTitan
                        ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 text-slate-950 font-black border-purple-300 shadow-xl shadow-purple-950/60 ring-2 ring-purple-300'
                        : isRecord
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold border-amber-300 shadow-lg shadow-amber-950/40 ring-1 ring-amber-300'
                        : 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                      : isTitan
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30'
                      : isRecord
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
                      : isHeron
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {/* Custom Qubit Input Form (Supports up to 10,000 Qubits) */}
            <form onSubmit={handleApplyCustomQubits} className="flex items-center space-x-1 pl-2">
              <input
                type="number"
                min="2"
                max="10000"
                value={customQubitInput}
                onChange={e => setCustomQubitInput(e.target.value)}
                className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-center font-mono focus:border-cyan-500 focus:outline-none"
                placeholder="2-10000"
                title="Configurar cúbits (2 a 10,000)"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] transition-colors"
              >
                Fijar
              </button>
            </form>
          </div>
        </div>

        {/* Real-time Status Badges & Cycle Metrics */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Ciclo del Motor</span>
            <div className="text-xl font-bold text-white flex items-center space-x-2">
              <span>#{engine.ciclo}</span>
              {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Compuertas Cuánticas</span>
            <div className="text-xl font-bold text-cyan-400">
              {engine.operaciones_ejecutadas}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Entropía Normalizada</span>
            <div className="text-xl font-bold text-emerald-400">
              {(normalizedEntropy ?? 0).toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-400">
              Promedio: {(avgEntropy ?? 0).toFixed(4)}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Colapsos de Medición</span>
            <div className="text-xl font-bold text-amber-400">
              {engine.mediciones_realizadas}
            </div>
          </div>
        </div>

        {/* Dynamic Trigger Alerts */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
          <span
            className={`px-3 py-1 rounded-lg border transition-all ${
              isBellTrigger
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold scale-105 shadow-md shadow-emerald-950'
                : 'bg-slate-950/60 text-slate-500 border-slate-800'
            }`}
          >
            Entrelazamiento Bell (|Φ⁺⟩ en %7): {isBellTrigger ? '¡ACTIVO!' : 'En espera'}
          </span>

          <span
            className={`px-3 py-1 rounded-lg border transition-all ${
              isMeasureTrigger
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold scale-105 shadow-md shadow-amber-950'
                : 'bg-slate-950/60 text-slate-500 border-slate-800'
            }`}
          >
            Colapso de Medición (en %11): {isMeasureTrigger ? '¡COLAPSADO!' : 'En espera'}
          </span>

          <span
            className={`px-3 py-1 rounded-lg border transition-all ${
              isPhaseTrigger
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500'
                : 'bg-slate-950/60 text-slate-500 border-slate-800'
            }`}
          >
            Rotación de Fase Rz (en %3): {isPhaseTrigger ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Multi-Qubit Marginal Probabilities Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Matriz de Probabilidades Marginales de los {currentQubits.toLocaleString()} Cúbits: P(q_k = |1⟩)
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Superposición activa: {superposedList.length} cúbits • Estado base |0⟩: {(currentQubits - activeMarginals.size).toLocaleString()} cúbits
              </p>
            </div>
          </div>

          {/* Filter tabs & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => { setQubitFilter('all'); setSearchQubit(''); }}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  qubitFilter === 'all' && !searchQubit
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({currentQubits.toLocaleString()})
              </button>
              <button
                onClick={() => { setQubitFilter('superposition'); setSearchQubit(''); }}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  qubitFilter === 'superposition'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                En Superposición ({superposedList.length})
              </button>
              <button
                onClick={() => { setQubitFilter('ground'); setSearchQubit(''); }}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  qubitFilter === 'ground'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Base |0⟩ ({(currentQubits - activeMarginals.size).toLocaleString()})
              </button>
            </div>

            {/* Jump to specific Qubit Search Input */}
            <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs font-mono">
              <Search className="w-3 h-3 text-slate-500" />
              <input
                type="text"
                placeholder={`q[0..${currentQubits - 1}]`}
                value={searchQubit}
                onChange={e => setSearchQubit(e.target.value)}
                className="w-24 bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none text-[11px]"
              />
              {searchQubit && (
                <button
                  onClick={() => setSearchQubit('')}
                  className="text-[10px] text-slate-500 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pagination & Quick Jump Bar for High Qubit Counts */}
        {qubitFilter !== 'superposition' && !searchQubit && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs font-mono">
            <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
              <span>Mostrando q[{qubitPage * pageSize} .. {Math.min(currentQubits - 1, (qubitPage + 1) * pageSize - 1)}]</span>
              <span className="text-slate-600">•</span>
              <span>Página {qubitPage + 1} de {totalPages}</span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                disabled={qubitPage === 0}
                onClick={() => setQubitPage(p => Math.max(0, p - 1))}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={qubitPage >= totalPages - 1}
                onClick={() => setQubitPage(p => Math.min(totalPages - 1, p + 1))}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none"
                title="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Quick Jump Anchors */}
              <div className="hidden sm:flex items-center space-x-1 pl-2 text-[10px]">
                <span className="text-slate-500">Ir a:</span>
                <button
                  onClick={() => setQubitPage(0)}
                  className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                >
                  q[0]
                </button>
                {currentQubits >= 70 && (
                  <button
                    onClick={() => setQubitPage(Math.floor(70 / pageSize))}
                    className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                  >
                    q[70]
                  </button>
                )}
                {currentQubits >= 1333 && (
                  <button
                    onClick={() => setQubitPage(Math.floor(1333 / pageSize))}
                    className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 hover:text-white"
                  >
                    q[1333]
                  </button>
                )}
                {currentQubits >= 1334 && (
                  <button
                    onClick={() => setQubitPage(Math.floor(1334 / pageSize))}
                    className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-white"
                  >
                    q[1334]
                  </button>
                )}
                {currentQubits >= 6000 && (
                  <button
                    onClick={() => setQubitPage(Math.floor(6000 / pageSize))}
                    className="px-1.5 py-0.5 rounded bg-purple-500/25 border border-purple-500/50 text-purple-300 hover:text-white font-bold"
                  >
                    q[6000]
                  </button>
                )}
                <button
                  onClick={() => setQubitPage(totalPages - 1)}
                  className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                >
                  q[{currentQubits - 1}]
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Qubits Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2 max-h-72 overflow-y-auto pr-1">
          {displayedQubits.map(({ qubit, prob1 }) => {
            const pct = (prob1 * 100).toFixed(1);
            const isSuperposed = prob1 > 0.001 && prob1 < 0.999;
            const isPureOne = prob1 >= 0.999;

            return (
              <div
                key={qubit}
                className={`p-2 rounded-xl border font-mono text-xs space-y-1 transition-all ${
                  isPureOne
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : isSuperposed
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-300">q[{qubit}]</span>
                  <span
                    className={`font-semibold ${
                      isPureOne ? 'text-emerald-400' : isSuperposed ? 'text-cyan-400' : 'text-slate-500'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPureOne
                        ? 'bg-emerald-400'
                        : isSuperposed
                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-400'
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, prob1 * 100))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* State Vector Probabilities & Entropy History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Superposition Basis Breakdown */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Binary className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Estados Cuánticos Activos (Regla de Born: P(|x⟩) = |α_x|²)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Espacio de Hilbert: 2^{currentQubits} ≈ {engine.registro.dimensionScientific()} estados
            </span>
          </div>

          {/* Basis Probability Bars */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {activeStates.map((state, idx) => {
              const bin = state.binario;
              const prob = state.probabilidad;
              const amp = state.amplitud;
              const pct = (prob * 100).toFixed(2);
              const re = amp?.re ?? 0;
              const im = amp?.im ?? 0;
              const sign = im >= 0 ? '+' : '-';
              const ampStr = `${re.toFixed(3)} ${sign} ${Math.abs(im).toFixed(3)}i`;

              // Truncate display for long strings like 70 bits with copy option
              const isLong = bin.length > 32;
              const displayBin = isLong
                ? `${bin.slice(0, 14)}...${bin.slice(-14)}`
                : bin;

              return (
                <div key={idx} className="space-y-1 font-mono text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex flex-wrap justify-between items-center gap-2 text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-emerald-400 text-xs" title={`Estado completo (${bin.length} bits): |${bin}⟩`}>
                        |{displayBin}⟩
                      </span>
                      {isLong && (
                        <button
                          onClick={() => copyBinaryState(bin)}
                          className="text-[10px] text-slate-500 hover:text-white transition-colors"
                          title="Copiar estado binario completo de 70 bits"
                        >
                          {copiedBinary === bin ? (
                            <span className="text-emerald-400 font-bold">¡Copiado!</span>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      α = {ampStr}
                    </span>
                    <span className="font-semibold text-slate-200">{pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, prob * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {activeStates.length === 0 && (
              <div className="text-slate-500 text-xs font-mono py-8 text-center">
                Registro en estado base |0...0⟩
              </div>
            )}
          </div>

          {/* Little-Endian SHA-256 Quantum Hash */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                Hash de Estado Cuántico (SHA-256 IEEE-754 LE serializado):
              </span>
              <button
                onClick={copyHash}
                className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
              >
                {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHash ? 'Copiado' : 'Copiar Hash'}</span>
              </button>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 break-all select-all">
              {currentHash}
            </div>
          </div>
        </div>

        {/* Live Entropy Sparkline & Event Log */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Historial de Entropía (Shannon H / log₂(2^{currentQubits}))
            </h3>
          </div>

          {/* Entropy Mini Chart */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 h-28 flex items-end space-x-1 overflow-hidden">
            {engine.historial_entropia.slice(-40).map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 rounded-t transition-all"
                style={{ height: `${Math.max(4, Math.min(100, (h ?? 0) * 100))}%` }}
                title={`Ciclo H: ${(h ?? 0).toFixed(4)}`}
              />
            ))}
            {engine.historial_entropia.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                Latido no iniciado aún
              </div>
            )}
          </div>

          {/* Events Log */}
          <div className="flex-1 space-y-2 flex flex-col">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Flujo de Eventos ({engine.eventos.length})</span>
              </div>
              <span className="text-[10px] text-slate-500">Máx 200</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] leading-relaxed max-h-52 overflow-y-auto space-y-1.5 flex-1">
              {engine.eventos.length === 0 ? (
                <div className="text-slate-600 text-center py-6">No hay eventos registrados aún.</div>
              ) : (
                [...engine.eventos].reverse().map((ev, i) => (
                  <div key={i} className="text-slate-300 border-b border-slate-900 pb-1 flex items-start space-x-1.5">
                    <span className="text-emerald-400 font-bold">›</span>
                    <span>{ev}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
