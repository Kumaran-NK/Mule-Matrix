import React from 'react';
import { RefreshCw } from 'lucide-react';
import { UserRole } from '../../types';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onResetData: () => void;
  isResetting?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onRoleChange, onResetData, isResetting = false }) => {
  const seg = (active: boolean) =>
    `px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
      active ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
    }`;

  return (
    <header className="no-print h-16 shrink-0 bg-white border-b border-line px-8 flex items-center justify-between">
      <div className="flex items-center gap-2.5 text-[15px]">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-flame-500 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-flame-500" />
        </span>
        <span className="font-medium">6 banks connected</span>
        <span className="text-mute">synthetic data</span>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onResetData} disabled={isResetting} className="btn-ghost !py-2">
          <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          Reset demo
        </button>

        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg" role="group" aria-label="Role">
          <button onClick={() => onRoleChange('investigator')} className={seg(currentRole === 'investigator')}>
            Investigator
          </button>
          <button onClick={() => onRoleChange('reviewer')} className={seg(currentRole === 'reviewer')}>
            Compliance reviewer
          </button>
        </div>
      </div>
    </header>
  );
};