import React, { useState, useEffect } from 'react';

import { OverviewPage } from './pages/OverviewPage';

import { WorkspacePage } from './pages/WorkspacePage';

import { LineagePage } from './pages/LineagePage';

import { ScreeningPage } from './pages/ScreeningPage';

import { TimelinePage } from './pages/TimelinePage';

import { EndpointsPage } from './pages/EndpointsPage';

import { AssessmentPage } from './pages/AssessmentPage';

import { IdentityPage } from './pages/IdentityPage';

import { SimulatorPage } from './pages/SimulatorPage';

import { ReportsPage } from './pages/ReportsPage';

import { UserRole } from './types';

import { api } from './api/client';

const GROUPS: { id: string; label: string; pages: [string, string][] }[] = [

  { id: 'trail', label: 'Trail', pages: [['overview', 'Overview'], ['workspace', 'Money trail'], ['timeline', 'Timeline'], ['lineage', 'Lineage']] },

  { id: 'evidence', label: 'Evidence', pages: [['endpoints', 'Where money exited']] },

  { id: 'accounts', label: 'Accounts', pages: [['assessments', 'Risk'], ['screening', 'Flagged'], ['simulator', 'Simulator']] },

  { id: 'identity', label: 'Identity', pages: [['identity', 'Requests']] },

  { id: 'report', label: 'Report', pages: [['reports', 'Case report']] },

];

export function App() {

  const [page, setPage] = useState('overview');

  const [role, setRole] = useState<UserRole>('investigator');

  const [pending, setPending] = useState(0);

  const [resetting, setResetting] = useState(false);

  const group = GROUPS.find((g) => g.pages.some(([id]) => id === page)) || GROUPS[0];

  async function loadPending() {

    try { setPending((await api.getIdentityRequests()).filter((r) => r.status === 'PENDING').length); } catch {}

  }

  useEffect(() => { loadPending(); const t = setInterval(loadPending, 10000); return () => clearInterval(t); }, []);

  async function reset() {

    if (!confirm('Reset the simulation to the standard demo case?')) return;

    setResetting(true);

    try { await api.resetSimulator(); window.location.reload(); }

    catch (e: any) { alert(`Reset failed: ${e.message}`); } finally { setResetting(false); }

  }

  return (

    <div className="min-h-screen bg-slate-950 text-slate-100">

      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800">

        <div className="max-w-6xl mx-auto px-8 h-12 flex items-center justify-between">

          <span className="font-serif italic text-xl">Mule Matrix</span>

          <nav className="flex h-12 gap-7">

            {GROUPS.map((g) => (

              <button key={g.id} onClick={() => setPage(g.pages[0][0])}

                className={`relative text-[13px] border-b-2 ${g.id === group.id ? 'border-rose-500 text-slate-100 font-medium' : 'border-transparent text-slate-400 hover:text-slate-100'}`}>

                {g.label}

                {g.id === 'identity' && pending > 0 && <span className="ml-1.5 text-[10px] bg-rose-600 text-white rounded-full px-1.5">{pending}</span>}

              </button>

            ))}

          </nav>

          <div className="flex items-center gap-4 text-xs text-slate-400">

            <button onClick={reset} disabled={resetting} className="hover:text-slate-100 disabled:opacity-50">Reset demo</button>

            <div className="flex p-0.5 bg-slate-800 rounded-lg">

              {(['investigator', 'reviewer'] as UserRole[]).map((r) => (

                <button key={r} onClick={() => setRole(r)} className={`px-3 py-1 rounded-md capitalize ${role === r ? 'bg-slate-900 text-slate-100' : ''}`}>{r}</button>

              ))}

            </div>

          </div>

        </div>

        {group.pages.length > 1 && (

          <div className="max-w-6xl mx-auto px-8 h-9 flex items-center gap-5 text-[13px] border-t border-slate-800">

            {group.pages.map(([id, label]) => (

              <button key={id} onClick={() => setPage(id)} className={page === id ? 'text-slate-100 font-medium' : 'text-slate-400 hover:text-slate-100'}>{label}</button>

            ))}

          </div>

        )}

      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">

        {page === 'overview' && <OverviewPage onNavigateToWorkspace={() => setPage('workspace')} onNavigateToScreening={() => setPage('screening')} />}

        {page === 'workspace' && <WorkspacePage onNavigateToIdentity={() => setPage('identity')} onRequestSubmittedNotification={loadPending} />}

        {page === 'lineage' && <LineagePage />}

        {page === 'screening' && <ScreeningPage onSelectCandidate={() => setPage('workspace')} />}

        {page === 'timeline' && <TimelinePage />}

        {page === 'endpoints' && <EndpointsPage />}

        {page === 'assessments' && <AssessmentPage />}

        {page === 'identity' && <IdentityPage currentRole={role} onRoleSwitch={setRole} />}

        {page === 'simulator' && <SimulatorPage />}

        {page === 'reports' && <ReportsPage />}

      </main>

    </div>

  );

}

export default App;
