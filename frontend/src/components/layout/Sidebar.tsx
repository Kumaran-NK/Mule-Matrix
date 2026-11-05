import React from 'react';
import logoImg from '../../assets/logo.jpg';
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

type Item = { id: TabKey; label: string; icon: React.ElementType; badge?: number };

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, pendingRequestsCount = 0 }) => {
  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Investigate',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'screening', label: 'Pattern screening', icon: SearchCode },
        { id: 'workspace', label: 'Investigation workspace', icon: Network },
      ],
    },
    {
      title: 'Trace results',
      items: [
        { id: 'lineage', label: 'Fund lineage', icon: GitFork },
        { id: 'timeline', label: 'Timeline', icon: History },
        { id: 'endpoints', label: 'Off-ramps', icon: ArrowDownToLine },
        { id: 'assessments', label: 'Account assessments', icon: ShieldAlert },
      ],
    },
    {
      title: 'Governance',
      items: [
        { id: 'identity', label: 'Identity resolution', icon: KeyRound, badge: pendingRequestsCount },
        { id: 'reports', label: 'Case dossier', icon: FileSpreadsheet },
        { id: 'simulator', label: 'Bank simulator', icon: Banknote },
      ],
    },
  ];

  return (
    <aside className="no-print w-72 shrink-0 bg-black text-white flex flex-col overflow-y-auto">
      <div className="h-16 px-5 flex items-center border-b border-white/10 shrink-0">
        <img
          src={logoImg}
          alt="Mule Matrix - CBDC Fund Provenance & Mule Detection"
          className="h-14 w-auto object-contain object-left"
        />
      </div>

      <nav className="flex-1 px-3 py-5 space-y-6">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-3 pb-2 text-sm text-neutral-500">{g.title}</div>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative w-full flex items-center justify-between gap-3 pl-4 pr-3 py-2.5 rounded-lg text-[15px] transition-colors text-left ${
                      active ? 'bg-white/10 text-white font-semibold' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-flame-500" />}
                    <span className="flex items-center gap-3">
                      <Icon className={`w-[18px] h-[18px] ${active ? 'text-flame-500' : ''}`} />
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span className="min-w-[22px] text-center text-[13px] font-bold px-1.5 py-0.5 rounded-full bg-flame-500 text-black">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="m-3 p-4 rounded-xl border border-white/10 text-sm text-neutral-400 leading-relaxed">
        Identities stay masked until a compliance reviewer approves a request.
      </div>
    </aside>
  );
};
