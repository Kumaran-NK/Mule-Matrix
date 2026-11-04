import React from 'react';
import { ShieldCheck, UserCheck, RefreshCw, Activity, Layers } from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onResetData: () => void;
  isResetting?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onResetData,
  isResetting = false,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-rose-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-wider text-slate-100">
              MULE<span className="text-blue-500">MATRIX</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800/80 px-2 py-0.5 rounded-full">
              CBDC Provenance MVP
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Cross-Bank Fund Lineage & Temporal Mule Network Investigation
          </p>
        </div>
      </div>

      {/* Right Controls: Status, Role Switcher, Reseed Button */}
      <div className="flex items-center gap-4">
        {/* Network Status indicator */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-400 font-medium">Network:</span>
          <span className="font-semibold text-emerald-400">6 Banks Active</span>
        </div>

        {/* Reseed Simulation Button */}
        <button
          onClick={onResetData}
          disabled={isResetting}
          className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-xs px-3 py-1.5 rounded-xl transition shadow-sm disabled:opacity-50"
          title="Reset database to initial synthetic demo state"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>

        {/* Role Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => onRoleChange('investigator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              currentRole === 'investigator'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Investigator</span>
          </button>
          <button
            onClick={() => onRoleChange('reviewer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              currentRole === 'reviewer'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Compliance Reviewer</span>
          </button>
        </div>
      </div>
    </header>
  );
};
