import React, { useState } from 'react';
import { RUST_CRATE_FILES, RustSourceFile } from '../core/rustCrateCode';
import { Code2, Copy, Check, Download, FileCode, Cpu, ShieldCheck } from 'lucide-react';

export const RustCrateViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<RustSourceFile>(RUST_CRATE_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const copyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Code2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">
                socxima_quantum_core • Idiomatic Rust Crate Source
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Complete, production-ready Rust crate codebase implementing the exact specifications in your <code className="text-emerald-400 font-mono">Cargo.toml</code>. Designed for <code className="text-cyan-400 font-mono">opt-level = 3</code> maximum SIMD throughput and memory safety.
            </p>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400">
              edition = "2021"
            </span>
            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              opt-level = 3
            </span>
          </div>
        </div>

        {/* Release Profile Highlights */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-emerald-400 font-semibold flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>SIMD Vectorization</span>
            </div>
            <p className="text-[11px] text-slate-400">
              opt-level 3 auto-vectorizes complex inner products and Hadamard unitary gate tensor loops via AVX2/NEON.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-cyan-400 font-semibold flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-Cost Safety</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Compile-time memory safety for quantum state buffers and Ed25519 key memory sanitization with no GC pauses.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-amber-400 font-semibold flex items-center space-x-1.5">
              <FileCode className="w-3.5 h-3.5" />
              <span>Bundled SQLite Engine</span>
            </div>
            <p className="text-[11px] text-slate-400">
              rusqlite bundled feature embeds C SQLite library into a single zero-dependency native binary.
            </p>
          </div>
        </div>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File Tree Sidebar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider px-2">
            Crate Files ({RUST_CRATE_FILES.length})
          </div>

          <div className="space-y-1">
            {RUST_CRATE_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center space-x-2 ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="lg:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono font-bold text-emerald-400">{selectedFile.path}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                  {selectedFile.language}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={copyCode}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={downloadFile}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Download this file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Syntax Highlighted Code Box */}
          <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs leading-relaxed overflow-x-auto max-h-[560px]">
            <pre className="text-slate-300">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
