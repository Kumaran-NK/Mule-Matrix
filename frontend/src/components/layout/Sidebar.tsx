import React from 'react';
import {
  LayoutDashboard,
  Network,
  GitFork,
  SearchCode,
  History,
  ArrowDownToLine,
  ShieldAlert,
  KeyRound,
  Banknote,
  FileSpreadsheet,
} from 'lucide-react';

export type TabKey =
  | 'overview'
  | 'workspace'
  | 'lineage'
  | 'screening'
  | 'timeline'
  | 'endpoints'
  | 'assessments'
  | 'identity'
  | 'simulator'
  | 'reports';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  pendingRequestsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingRequestsCount = 0,
}) => {
  const menuItems: { id: TabKey; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'workspace', label: 'Investigation Workspace', icon: Network },
    { id: 'lineage', label: 'Fund Lineage & Provenance', icon: GitFork },
    { id: 'screening', label: '5-Pattern Screening', icon: SearchCode },
    { id: 'timeline', label: 'Temporal Timeline', icon: History },
    { id: 'endpoints', label: 'Off-Ramp Endpoints', icon: ArrowDownToLine },
    { id: 'assessments', label: 'Account Assessments', icon: ShieldAlert },
    { id: 'identity', label: 'Identity Resolution', icon: KeyRound, badge: pendingRequestsCount },
    { id: 'simulator', label: 'Bank Simulator', icon: Banknote },
    { id: 'reports', label: 'Case Dossier & Audit', icon: FileSpreadsheet },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Investigation Suite
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white text-blue-600' : 'bg-rose-600 text-white animate-pulse'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-300">CBDC Architecture</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">v2.0</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Synthetic banking data. Never exposes clear customer PII without compliance approval.
        </p>
      </div>
    </aside>
  );
};
