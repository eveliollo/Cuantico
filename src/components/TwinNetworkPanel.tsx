import React, { useState } from 'react';
import { SistemaGemelos, EstadoConsenso } from '../core/socximaEngine';
import { Network, RefreshCw, Link2, CheckCircle2, XCircle, ShieldCheck, Cpu, Key } from 'lucide-react';

interface TwinNetworkPanelProps {
  twinSystem: SistemaGemelos;
  currentCycle: number;
  currentQuantumHash: string;
  onUpdate: () => void;
}

export const TwinNetworkPanel: React.FC<TwinNetworkPanelProps> = ({
  twinSystem,
  currentCycle,
  currentQuantumHash,
  onUpdate,
}) => {
  const [pairA, setPairA] = useState<number>(1);
  const [pairB, setPairB] = useState<number>(2);
  const [pairError, setPairError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  const consensusList: EstadoConsenso[] = twinSystem.consenso();

  const handleSyncAll = () => {
    twinSystem.sincronizar_todos(currentCycle, currentQuantumHash);
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2000);
    onUpdate();
  };

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    setPairError(null);
    const res = twinSystem.emparejar(Number(pairA), Number(pairB));
    if (!res.success) {
      setPairError(res.error || 'Error al emparejar');
    } else {
      onUpdate();
    }
  };

  const handleResize = (qty: number) => {
    twinSystem.nodos = SistemaGemelos.nuevo(qty).nodos;
    if (currentCycle > 0) {
      twinSystem.sincronizar_todos(currentCycle, currentQuantumHash);
    }
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                <Network className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-base font-semibold text-white">
                SistemaGemelos • Quantum Twin Node Consensus Network
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {twinSystem.nodos.length} Nodes Active
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Each quantum node (<code className="text-cyan-400 font-mono">NodoCuantico</code>) pairs with a twin node to verify state consistency. Consensus (<code className="text-indigo-400 font-mono">EstadoConsenso</code>) requires matching cycle clocks and quantum state hashes, computing a bilateral cryptographic signature (<code className="text-amber-400 font-mono">firma_par</code>).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            {/* Node Count selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[4, 6, 8, 12].map(qty => (
                <button
                  key={qty}
                  onClick={() => handleResize(qty)}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    twinSystem.nodos.length === qty
                      ? 'bg-indigo-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {qty} Nodes
                </button>
              ))}
            </div>

            {/* Sync All button */}
            <button
              id="btn-sync-twins"
              onClick={handleSyncAll}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors font-semibold shadow-md ${
                syncSuccess
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncSuccess ? 'animate-spin' : ''}`} />
              <span>{syncSuccess ? 'Synchronized!' : 'Sync All with Engine'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Quantum Node Topology (NodoCuantico)</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Engine State: Ciclo #{currentCycle} • Hash: {currentQuantumHash.slice(0, 10)}...
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {twinSystem.nodos.map(nodo => {
            const isPaired = nodo.tiene_pareja();
            const isSynced =
              currentCycle > 0 &&
              nodo.ciclo_local === currentCycle &&
              nodo.quantum_hash === currentQuantumHash;
            const localSig = nodo.firma_local();

            return (
              <div
                key={nodo.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow space-y-3 font-mono text-xs transition-colors"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>Node #{nodo.id}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      isPaired
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPaired ? `Twin: #${nodo.gemelo_id}` : 'Unpaired'}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Local Cycle:</span>
                    <span className="font-semibold text-white">#{nodo.ciclo_local}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Engine Sync:</span>
                    <span className={isSynced ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                      {isSynced ? 'Aligned' : 'Out of sync'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-slate-400 text-[10px]">Local Signature (SHA-256):</div>
                    <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-[10px] text-indigo-300 break-all select-all">
                      {localSig ? `${localSig.slice(0, 16)}...${localSig.slice(-8)}` : 'Empty'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consensus Verification & Custom Pairing Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consensus Verification Table */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Bilateral Twin Consensus Verification (EstadoConsenso)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {consensusList.length} Verified Pairs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3">Pair (A ↔ B)</th>
                  <th className="py-2 px-3">Cycle Match</th>
                  <th className="py-2 px-3">Quantum Hash Match</th>
                  <th className="py-2 px-3">Bilateral Pair Signature (firma_par)</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {consensusList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No paired nodes currently active.
                    </td>
                  </tr>
                ) : (
                  consensusList.map((c, i) => {
                    const isFullyAgreed = c.ciclos_coinciden && c.hash_cuantico_coincide;
                    return (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          N_{c.id_a} ↔ N_{c.id_b}
                        </td>
                        <td className="py-2.5 px-3">
                          {c.ciclos_coinciden ? (
                            <span className="flex items-center space-x-1 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Match</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-rose-400">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Diff</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {c.hash_cuantico_coincide ? (
                            <span className="flex items-center space-x-1 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Match</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-amber-400">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-indigo-300 select-all">
                            {c.firma_par.slice(0, 14)}...{c.firma_par.slice(-6)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isFullyAgreed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isFullyAgreed ? 'Consensus OK' : 'Desynced'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom Node Pairing Control */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2">
            <Link2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Custom Node Pairing (emparejar)
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            Reassign or link two distinct nodes in the network topology. This swaps their existing twin associations.
          </p>

          <form onSubmit={handlePair} className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Node A ID</label>
                <select
                  value={pairA}
                  onChange={e => setPairA(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  {twinSystem.nodos.map(n => (
                    <option key={n.id} value={n.id}>
                      Node #{n.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Node B ID</label>
                <select
                  value={pairB}
                  onChange={e => setPairB(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  {twinSystem.nodos.map(n => (
                    <option key={n.id} value={n.id}>
                      Node #{n.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {pairError && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px]">
                {pairError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shadow-md flex items-center justify-center space-x-2"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Execute emparejar(A, B)</span>
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed font-mono">
            <strong>Consensus Logic:</strong> When two nodes are paired, their SHA-256 local signatures are combined into <code className="text-slate-300">firma_par = SHA256(min_id || max_id || sig_a || sig_b)</code>.
          </div>
        </div>
      </div>
    </div>
  );
};
