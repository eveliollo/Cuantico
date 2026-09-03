import React from 'react';
import { Cpu, Key, Database, Sparkles, Code2, ShieldCheck, Zap, Activity, Network, Blocks, BookOpen } from 'lucide-react';

export type ActiveTab =
  | 'engine'
  | 'soxcima_ai'
  | 'simulator'
  | 'gemelos'
  | 'conocimiento'
  | 'crypto'
  | 'qrng'
  | 'rusqlite'
  | 'rust_crate';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  qubitCount: number;
  engineCycle?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  qubitCount,
  engineCycle = 0,
}) => {
  const tabs = [
    { id: 'engine' as ActiveTab, label: 'Socxima Engine', icon: Activity, badge: `Ciclo #${engineCycle}` },
    { id: 'soxcima_ai' as ActiveTab, label: 'SOXCIMA IA & Notas', icon: Sparkles, badge: 'Proyectos & IA' },
    { id: 'simulator' as ActiveTab, label: 'Circuit Composer', icon: Cpu, badge: `${qubitCount} Qubits` },
    { id: 'gemelos' as ActiveTab, label: 'Twin Consensus', icon: Network, badge: 'SistemaGemelos' },
    { id: 'conocimiento' as ActiveTab, label: 'Knowledge Chain', icon: Blocks, badge: 'AUTOR_ID' },
    { id: 'crypto' as ActiveTab, label: 'Ed25519 & SHA-256', icon: Key, badge: 'dalek v2' },
    { id: 'qrng' as ActiveTab, label: 'QRNG Entropy', icon: Sparkles, badge: 'rand_core' },
    { id: 'rusqlite' as ActiveTab, label: 'Rusqlite Ledger', icon: Database, badge: 'SQLite v0.31' },
    { id: 'rust_crate' as ActiveTab, label: 'Rust Source Code', icon: Code2, badge: 'Cargo.toml' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Crate metadata */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-semibold tracking-tight text-white font-mono">
                  socxima_quantum_core
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v0.1.0
                </span>
                <span className="hidden sm:inline-flex text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  opt-level = 3
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Quantum Simulation • Twin Consensus • Verifiable Knowledge Chain • Ed25519
              </p>
            </div>
          </div>

          {/* Quick crate dependency pill indicators */}
          <div className="hidden xl:flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>num-complex 0.4</span>
            </span>
            <span className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>ed25519-dalek 2.0</span>
            </span>
            <span className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>rusqlite 0.31</span>
            </span>
            <span className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-900 border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>sha2 0.10</span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
