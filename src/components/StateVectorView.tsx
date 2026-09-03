import React from 'react';
import { SimulationResult } from '../types/quantum';
import { ComplexMath } from '../core/complex';
import { BlochSphere } from './BlochSphere';
import { Copy, Check, BarChart2, Radio, Info } from 'lucide-react';

interface StateVectorViewProps {
  result: SimulationResult;
}

export const StateVectorView: React.FC<StateVectorViewProps> = ({ result }) => {
  const [copiedHash, setCopiedHash] = React.useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(result.stateHashSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Dirac Notation Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">Quantum State Vector |ψ⟩</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Dimension: {result.stateVector.length}
            </span>
          </div>
          <div className="flex items-center space-x-2 font-mono text-xs text-slate-400">
            <span>SHA-256 Digest:</span>
            <span className="text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px]">
              {result.stateHashSha256.substring(0, 16)}...
            </span>
            <button
              onClick={copyHash}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Copy full SHA-256 state hash"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Mathematical representation */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 font-mono text-sm text-emerald-300 overflow-x-auto">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">|ψ⟩ =</span>
            <span className="tracking-wide">{result.diracNotation}</span>
          </div>
        </div>
      </div>

      {/* Grid: Amplitudes & Probabilities Table + Measurement Shots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exact Complex Amplitudes Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h4 className="text-sm font-semibold text-slate-200">Basis States & Complex Amplitudes</h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">num-complex (f64)</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 pb-2">
                  <th className="py-2 px-2">Basis</th>
                  <th className="py-2 px-2">Amplitude (α + βi)</th>
                  <th className="py-2 px-2">Probability</th>
                  <th className="py-2 px-2">Phase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {result.stateVector.map((item) => {
                  const probPercent = ((item?.probability ?? 0) * 100).toFixed(1);
                  const isSignificant = (item?.probability ?? 0) > 0.005;

                  return (
                    <tr
                      key={item.basisBinary}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isSignificant ? 'text-slate-100 font-medium' : 'text-slate-500'
                      }`}
                    >
                      <td className="py-2.5 px-2 font-bold text-emerald-400">
                        |{item.basisBinary}⟩
                      </td>
                      <td className="py-2.5 px-2">
                        {ComplexMath.format(item.amplitude, 4)}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                              style={{ width: `${probPercent}%` }}
                            />
                          </div>
                          <span>{probPercent}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-400">
                        {(item?.probability ?? 0) > 0.001 ? `${(item?.phaseDegrees ?? 0).toFixed(1)}°` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monte Carlo Measurement Histogram */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-slate-200">
                Monte Carlo Measurement Sampling
              </h4>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {result.shots} Shots (rand)
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {result.stateVector.map((item) => {
              const count = result.counts[item.basisBinary] || 0;
              const measuredFreq = result.shots > 0 ? (count / result.shots) * 100 : 0;
              const theoreticalProb = (item.probability * 100);

              if (item.probability < 0.005 && count === 0) return null;

              return (
                <div key={item.basisBinary} className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold text-emerald-400">|{item.basisBinary}⟩</span>
                    <span className="text-slate-400">
                      {count} counts ({((measuredFreq ?? 0)).toFixed(1)}%) • Theory: {((theoreticalProb ?? 0)).toFixed(1)}%
                    </span>
                  </div>
                  {/* Visual Bar */}
                  <div className="w-full bg-slate-950 h-3 rounded overflow-hidden border border-slate-800 flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${measuredFreq}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">Execution time: {result.executionTimeMs} ms</span>
            <span className="font-mono text-slate-500">rand_core / getrandom</span>
          </div>
        </div>
      </div>

      {/* Single-Qubit Bloch Spheres */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Individual Qubit Bloch Spheres
            </h4>
            <p className="text-xs text-slate-400">
              Reduced density matrix expectation values (⟨X⟩, ⟨Y⟩, ⟨Z⟩) projected in 3D
            </p>
          </div>
          <div className="flex items-center space-x-1 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5" />
            <span>Pure states lie on sphere surface (r=1)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {result.blochCoords.map((coords, idx) => (
            <BlochSphere key={idx} qubitIndex={idx} coords={coords} size={180} />
          ))}
        </div>
      </div>
    </div>
  );
};
