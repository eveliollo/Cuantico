import React, { useState } from 'react';
import { rusqliteDb } from '../core/ledgerDb';
import { RusqliteExecutionRecord, RusqliteBlockRecord, QrngEntropyRecord, SavedCircuitRecord, GatePlacement } from '../types/quantum';
import { Database, Terminal, Play, RotateCcw, Plus, Box, ListFilter, Check, Copy, FileCode2, Eye, Download, UploadCloud, Trash2, X } from 'lucide-react';
import { parseQuantumAssembly } from '../core/quantumAssembly';

interface LedgerExplorerProps {
  minerPubkey: string;
  onLoadCircuitIntoComposer?: (qubitCount: number, gates: GatePlacement[]) => void;
}

export const LedgerExplorer: React.FC<LedgerExplorerProps> = ({ minerPubkey, onLoadCircuitIntoComposer }) => {
  const [activeSubTab, setActiveSubTab] = useState<'runs' | 'circuits' | 'blocks' | 'entropy' | 'sql'>('circuits');
  const [runs, setRuns] = useState<RusqliteExecutionRecord[]>(rusqliteDb.getRuns());
  const [circuits, setCircuits] = useState<SavedCircuitRecord[]>(rusqliteDb.getSavedCircuits());
  const [blocks, setBlocks] = useState<RusqliteBlockRecord[]>(rusqliteDb.getBlocks());
  const [entropyLogs, setEntropyLogs] = useState<QrngEntropyRecord[]>(rusqliteDb.getEntropyLogs());
  const [viewingAssemblyRecord, setViewingAssemblyRecord] = useState<SavedCircuitRecord | null>(null);

  // SQL Console
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT * FROM circuit_registry ORDER BY savedAt DESC'
  );
  const [queryResult, setQueryResult] = useState<{
    columns: string[];
    rows: any[][];
    message?: string;
    error?: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshData = () => {
    setRuns(rusqliteDb.getRuns());
    setCircuits(rusqliteDb.getSavedCircuits());
    setBlocks(rusqliteDb.getBlocks());
    setEntropyLogs(rusqliteDb.getEntropyLogs());
  };

  const handleMintBlock = () => {
    rusqliteDb.commitNewBlock(minerPubkey);
    refreshData();
  };

  const handleExecuteSql = () => {
    const res = rusqliteDb.executeQuery(sqlQuery);
    setQueryResult(res);
  };

  const handleResetDb = () => {
    rusqliteDb.clearAll();
    refreshData();
    setQueryResult(null);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">
                rusqlite Embedded Quantum Ledger (SQLite v0.31)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              ACID transactional storage mirroring Rust <code className="text-emerald-400 font-mono">rusqlite (bundled)</code>. Records cryptographic circuit execution proofs, Ed25519 signatures, Merkle state roots, and blockchain blocks.
            </p>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              id="btn-mint-block"
              onClick={handleMintBlock}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Mint Ledger Block</span>
            </button>
            <button
              id="btn-reset-db"
              onClick={handleResetDb}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
              title="Reset Rusqlite DB to initial state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="mt-5 flex space-x-2 border-b border-slate-800/80 pb-2 text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('circuits')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'circuits'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>circuit_registry ({circuits.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('runs')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'runs'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>execution_runs ({runs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('blocks')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'blocks'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>quantum_ledger_blocks ({blocks.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('entropy')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'entropy'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>qrng_entropy_log ({entropyLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sql')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeSubTab === 'sql'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>SQL Query Terminal</span>
          </button>
        </div>
      </div>

      {/* SQL Console Tab */}
      {activeSubTab === 'sql' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Interactive SQL Console</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">rusqlite virtual engine</span>
          </div>

          <div className="flex gap-2">
            <input
              id="sql-input"
              type="text"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-300 outline-none focus:border-cyan-500"
              placeholder="e.g. SELECT * FROM execution_runs LIMIT 5"
            />
            <button
              id="btn-run-sql"
              onClick={handleExecuteSql}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute</span>
            </button>
          </div>

          {/* Quick preset queries */}
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            <span className="text-slate-500">Quick queries:</span>
            <button
              onClick={() => setSqlQuery('SELECT * FROM circuit_registry ORDER BY savedAt DESC')}
              className="text-emerald-400 hover:underline"
            >
              SELECT * FROM circuit_registry
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setSqlQuery('SELECT * FROM execution_runs ORDER BY timestamp DESC LIMIT 5')}
              className="text-cyan-400 hover:underline"
            >
              SELECT * FROM execution_runs
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setSqlQuery('SELECT * FROM quantum_ledger_blocks ORDER BY blockHeight DESC')}
              className="text-cyan-400 hover:underline"
            >
              SELECT * FROM quantum_ledger_blocks
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setSqlQuery('SELECT * FROM qrng_entropy_log ORDER BY timestamp DESC')}
              className="text-cyan-400 hover:underline"
            >
              SELECT * FROM qrng_entropy_log
            </button>
          </div>

          {/* Results Display */}
          {queryResult && (
            <div className="mt-4 space-y-2">
              {queryResult.message && (
                <div className="text-xs font-mono text-emerald-400">
                  {queryResult.message}
                </div>
              )}
              {queryResult.error && (
                <div className="text-xs font-mono text-rose-400">
                  {queryResult.error}
                </div>
              )}
              <div className="overflow-x-auto max-h-80 bg-slate-950 rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      {queryResult.columns.map((c, i) => (
                        <th key={i} className="py-2.5 px-3 whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/40 text-slate-300">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 whitespace-nowrap max-w-xs truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Circuit Registry Table */}
      {activeSubTab === 'circuits' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                <span>circuit_registry Table ({circuits.length} quantum assemblies)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifiable JSON-formatted quantum assembly records persisted with cryptographic digests
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">Primary Key: circuit_id</span>
          </div>

          {circuits.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              No circuits saved to the ledger yet. Compose a circuit in the Circuit Composer and click "Export QASM JSON" -&gt; "Save to Rusqlite Ledger".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-2">Circuit Name / ID</th>
                    <th className="py-2.5 px-2">Config</th>
                    <th className="py-2.5 px-2">Assembly SHA-256</th>
                    <th className="py-2.5 px-2">Saved At</th>
                    <th className="py-2.5 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {circuits.map((c) => (
                    <tr key={c.circuitId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-2">
                        <div className="font-bold text-emerald-400">{c.circuitName}</div>
                        <div className="text-[11px] text-slate-500">{c.circuitId}</div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 mr-1.5">
                          {c.qubitCount}Q
                        </span>
                        <span className="text-slate-400">{c.gateCount} gates</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center space-x-1 text-cyan-300">
                          <span className="truncate max-w-[140px]">{c.assemblyHash}</span>
                          <button
                            onClick={() => copyText(c.assemblyHash, c.circuitId + '_hash')}
                            className="text-slate-500 hover:text-white"
                            title="Copy SHA-256 hash"
                          >
                            {copiedId === c.circuitId + '_hash' ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-500">
                        {new Date(c.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`btn-view-qasm-${c.circuitId}`}
                            onClick={() => setViewingAssemblyRecord(c)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors flex items-center space-x-1"
                            title="View JSON Quantum Assembly"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View QASM</span>
                          </button>

                          <button
                            onClick={() => copyText(c.assemblyJson, c.circuitId + '_json')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Copy JSON Assembly String"
                          >
                            {copiedId === c.circuitId + '_json' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {onLoadCircuitIntoComposer && (
                            <button
                              id={`btn-load-circuit-${c.circuitId}`}
                              onClick={() => {
                                const parsed = parseQuantumAssembly(c.assemblyJson);
                                if (parsed.success && parsed.qubitCount && parsed.gates) {
                                  onLoadCircuitIntoComposer(parsed.qubitCount, parsed.gates);
                                }
                              }}
                              className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center space-x-1"
                              title="Load this circuit into active composer"
                            >
                              <UploadCloud className="w-3 h-3" />
                              <span>Load</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              rusqliteDb.deleteCircuit(c.circuitId);
                              refreshData();
                            }}
                            className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete circuit record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Execution Runs Table */}
      {activeSubTab === 'runs' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              execution_runs Table ({runs.length} rows)
            </h3>
            <span className="text-xs font-mono text-slate-400">Primary Key: run_id</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 px-2">Run ID</th>
                  <th className="py-2.5 px-2">Circuit / Qubits</th>
                  <th className="py-2.5 px-2">Shots</th>
                  <th className="py-2.5 px-2">SHA-256 State Hash</th>
                  <th className="py-2.5 px-2">Ed25519 Signature</th>
                  <th className="py-2.5 px-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {runs.map((r) => (
                  <tr key={r.runId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-2 font-bold text-emerald-400">
                      {r.runId}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300">
                      {r.circuitName} ({r.qubitCount}Q)
                    </td>
                    <td className="py-2.5 px-2 text-slate-400">
                      {r.shots}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center space-x-1 text-slate-300">
                        <span className="truncate max-w-[140px]">{r.stateHash}</span>
                        <button
                          onClick={() => copyText(r.stateHash, r.runId + '_hash')}
                          className="text-slate-500 hover:text-white"
                        >
                          {copiedId === r.runId + '_hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center space-x-1 text-indigo-300">
                        <span className="truncate max-w-[120px]">{r.ed25519Signature}</span>
                        <button
                          onClick={() => copyText(r.ed25519Signature, r.runId + '_sig')}
                          className="text-slate-500 hover:text-white"
                        >
                          {copiedId === r.runId + '_sig' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quantum Blocks Table */}
      {activeSubTab === 'blocks' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              quantum_ledger_blocks Table ({blocks.length} blocks)
            </h3>
            <span className="text-xs font-mono text-slate-400">Height: #{blocks.length - 1}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 px-2">Height</th>
                  <th className="py-2.5 px-2">Block Hash</th>
                  <th className="py-2.5 px-2">Prev Hash</th>
                  <th className="py-2.5 px-2">Merkle State Root</th>
                  <th className="py-2.5 px-2">Tx Count</th>
                  <th className="py-2.5 px-2">Miner Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {blocks.map((b) => (
                  <tr key={b.blockHeight} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-2 font-bold text-amber-400">
                      #{b.blockHeight}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-emerald-400 truncate max-w-[140px]">
                      {b.blockHash}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-500 truncate max-w-[120px]">
                      {b.prevHash}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-cyan-300 truncate max-w-[140px]">
                      {b.stateRoot}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300">
                      {b.txCount} txs
                    </td>
                    <td className="py-2.5 px-2 text-slate-400 truncate max-w-[120px]">
                      {b.minerPubkey.substring(0, 16)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QRNG Entropy Log Table */}
      {activeSubTab === 'entropy' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              qrng_entropy_log Table ({entropyLogs.length} logs)
            </h3>
            <span className="text-xs font-mono text-slate-400">rand_core / getrandom</span>
          </div>

          {entropyLogs.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              No QRNG entropy logged yet. Navigate to the "QRNG Entropy" tab to sample quantum bits and commit them to this ledger.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-2">Log ID</th>
                    <th className="py-2.5 px-2">Bits</th>
                    <th className="py-2.5 px-2">Hex Digest</th>
                    <th className="py-2.5 px-2">Monobit Ratio</th>
                    <th className="py-2.5 px-2">Entropy H</th>
                    <th className="py-2.5 px-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {entropyLogs.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-2 text-emerald-400 font-bold">{e.id}</td>
                      <td className="py-2.5 px-2 text-slate-300">{e.bitsCount}b</td>
                      <td className="py-2.5 px-2 text-amber-300 font-mono truncate max-w-[160px]">{e.bitsHex}</td>
                      <td className="py-2.5 px-2 text-slate-400">
                        {e.monobitRatio != null ? `${(e.monobitRatio * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-cyan-400">{e.entropyEstimate}</td>
                      <td className="py-2.5 px-2 text-slate-400">{e.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assembly JSON Inspection Modal */}
      {viewingAssemblyRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <FileCode2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {viewingAssemblyRecord.circuitName}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    ID: {viewingAssemblyRecord.circuitId} • {viewingAssemblyRecord.qubitCount} Qubits • {viewingAssemblyRecord.gateCount} Gates
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingAssemblyRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono">
                <span className="text-slate-500 block text-[10px]">SHA-256 Digest</span>
                <span className="text-cyan-400 break-all">{viewingAssemblyRecord.assemblyHash}</span>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono text-slate-400">
                  <span>quantum_assembly.json</span>
                  <span>UTF-8</span>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-80 leading-relaxed scrollbar-thin">
                  {viewingAssemblyRecord.assemblyJson}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => copyText(viewingAssemblyRecord.assemblyJson, 'modal_json')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  {copiedId === 'modal_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'modal_json' ? 'Copied' : 'Copy JSON'}</span>
                </button>

                <button
                  onClick={() => {
                    const blob = new Blob([viewingAssemblyRecord.assemblyJson], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${viewingAssemblyRecord.circuitId}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
              </div>

              {onLoadCircuitIntoComposer && (
                <button
                  onClick={() => {
                    const parsed = parseQuantumAssembly(viewingAssemblyRecord.assemblyJson);
                    if (parsed.success && parsed.qubitCount && parsed.gates) {
                      onLoadCircuitIntoComposer(parsed.qubitCount, parsed.gates);
                      setViewingAssemblyRecord(null);
                    }
                  }}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-950/50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Load into Circuit Composer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
