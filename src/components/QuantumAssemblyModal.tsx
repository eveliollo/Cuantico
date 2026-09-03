import React, { useState, useMemo } from 'react';
import { GatePlacement } from '../types/quantum';
import {
  exportCircuitToQuantumAssembly,
  serializeQuantumAssembly,
  parseQuantumAssembly
} from '../core/quantumAssembly';
import {
  X,
  Copy,
  Check,
  Download,
  Database,
  FileCode2,
  Share2,
  UploadCloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface QuantumAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  qubitCount: number;
  gates: GatePlacement[];
  onImportCircuit?: (qubitCount: number, gates: GatePlacement[], circuitName?: string) => void;
  onSaveToLedger?: (assemblyJson: string, assemblyHash: string, circuitName: string) => Promise<void> | void;
  minerPubkey?: string;
}

export const QuantumAssemblyModal: React.FC<QuantumAssemblyModalProps> = ({
  isOpen,
  onClose,
  qubitCount,
  gates,
  onImportCircuit,
  onSaveToLedger,
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'qasm' | 'import'>('json');
  const [circuitName, setCircuitName] = useState<string>('Socxima Circuit');
  const [copied, setCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Import state
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Memoize the generated assembly based on current circuit and name
  const assemblyObj = useMemo(() => {
    return exportCircuitToQuantumAssembly(qubitCount, gates, circuitName || 'Socxima Circuit');
  }, [qubitCount, gates, circuitName]);

  const assemblyJson = useMemo(() => {
    return serializeQuantumAssembly(assemblyObj);
  }, [assemblyObj]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = activeTab === 'qasm' ? (assemblyObj.qasm_str || '') : assemblyJson;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const isQasm = activeTab === 'qasm';
    const content = isQasm ? (assemblyObj.qasm_str || '') : assemblyJson;
    const filename = `${assemblyObj.circuit_id || 'circuit'}.${isQasm ? 'qasm' : 'json'}`;
    const blob = new Blob([content], { type: isQasm ? 'text/plain' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToLedger = async () => {
    if (!onSaveToLedger) return;
    setIsSaving(true);
    try {
      await onSaveToLedger(assemblyJson, assemblyObj.circuit_hash_sha256, circuitName);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportSubmit = () => {
    setImportError(null);
    setImportSuccessMsg(null);

    if (!importJsonText.trim()) {
      setImportError('Please enter or paste a JSON quantum assembly string.');
      return;
    }

    const result = parseQuantumAssembly(importJsonText);
    if (!result.success || !result.qubitCount || !result.gates) {
      setImportError(result.error || 'Failed to parse JSON quantum assembly.');
      return;
    }

    if (onImportCircuit) {
      onImportCircuit(result.qubitCount, result.gates, result.circuitName);
      setImportSuccessMsg(`Successfully imported ${result.qubitCount} qubits with ${result.gates.length} gates!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <FileCode2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <span>Quantum Assembly JSON</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.0.0
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Shareable JSON-formatted quantum assembly with SHA-256 hash & Rusqlite ledger persistence
              </p>
            </div>
          </div>
          <button
            id="close-assembly-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Toolbar & Tabs */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-mono text-slate-400">Name:</label>
            <input
              id="circuit-name-input"
              type="text"
              value={circuitName}
              onChange={(e) => setCircuitName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-emerald-300 outline-none focus:border-emerald-500 w-44"
              placeholder="Circuit title"
            />
          </div>

          <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              id="tab-view-json"
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'json'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              JSON Assembly
            </button>
            <button
              id="tab-view-qasm"
              onClick={() => setActiveTab('qasm')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'qasm'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              OpenQASM 2.0
            </button>
            <button
              id="tab-view-import"
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'import'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Import JSON
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab !== 'import' && (
            <>
              {/* Circuit Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-slate-500 text-[10px] block">Circuit ID</span>
                  <span className="text-emerald-400 font-bold truncate block">{assemblyObj.circuit_id}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-slate-500 text-[10px] block">Qubits</span>
                  <span className="text-white font-bold block">{assemblyObj.qubit_count} Qubits</span>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-slate-500 text-[10px] block">Total Gates</span>
                  <span className="text-white font-bold block">{assemblyObj.gate_count} Gates</span>
                </div>
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-slate-500 text-[10px] block">SHA-256 Hash</span>
                  <span className="text-cyan-400 font-mono text-[10px] truncate block" title={assemblyObj.circuit_hash_sha256}>
                    {assemblyObj.circuit_hash_sha256.substring(0, 16)}...
                  </span>
                </div>
              </div>

              {/* Code Box */}
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono text-slate-400">
                  <span>{activeTab === 'json' ? 'quantum_assembly.json' : 'circuit.qasm'}</span>
                  <span className="text-slate-500">UTF-8 • {activeTab === 'json' ? 'JSON' : 'QASM'}</span>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-80 leading-relaxed scrollbar-thin">
                  {activeTab === 'json' ? assemblyJson : assemblyObj.qasm_str}
                </pre>
              </div>
            </>
          )}

          {/* Import JSON Tab */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Paste a JSON-formatted quantum assembly string exported from Socxima or a compatible quantum assembly compiler:
              </div>
              <textarea
                id="import-assembly-textarea"
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{\n  "qubit_count": 2,\n  "instructions": [\n    { "gate": "H", "target": 0, "step": 0 },\n    { "gate": "CNOT", "target": 1, "control": 0, "step": 1 }\n  ]\n}'
                className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300 outline-none focus:border-emerald-500 resize-none leading-relaxed"
              />

              {importError && (
                <div className="flex items-center space-x-2 text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccessMsg && (
                <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              <button
                id="btn-confirm-import"
                onClick={handleImportSubmit}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl font-mono text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-950/40"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Validate & Reconstruct Circuit</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        {activeTab !== 'import' && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                id="btn-copy-assembly-json"
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied String!' : 'Copy Assembly'}</span>
              </button>

              <button
                id="btn-download-assembly-json"
                onClick={handleDownload}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="btn-save-assembly-ledger"
                onClick={handleSaveToLedger}
                disabled={isSaving}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all shadow-md ${
                  saveSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-900/50'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Committed to Ledger!</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>{isSaving ? 'Signing & Saving...' : 'Save to Rusqlite Ledger'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
