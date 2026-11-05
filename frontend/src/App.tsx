import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabKey } from './components/layout/Sidebar';
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
import { UserRole, IdentityRequest } from './types';
import { api } from './api/client';

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [currentRole, setCurrentRole] = useState<UserRole>('investigator');
  const [pendingRequests, setPendingRequests] = useState<IdentityRequest[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadPendingRequests();
    const timer = setInterval(loadPendingRequests, 10000);
    return () => clearInterval(timer);
  }, []);

  async function loadPendingRequests() {
    try {
      const allReqs = await api.getIdentityRequests();
      setPendingRequests(allReqs.filter((r) => r.status === 'PENDING'));
    } catch (err) {
      // backend may not be up yet
    }
  }

  async function handleResetData() {
    if (!confirm('Reset the simulation to the standard synthetic demo state?')) return;
    setIsResetting(true);
    try {
      await api.resetSimulator();
      await loadPendingRequests();
      alert('Demo state reset.');
      window.location.reload();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="app-shell flex h-screen bg-paper text-ink">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} pendingRequestsCount={pendingRequests.length} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          onResetData={handleResetData}
          isResetting={isResetting}
        />

        <main className="app-main flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-[1320px] mx-auto">
            {activeTab === 'overview' && (
              <OverviewPage
                onNavigateToWorkspace={() => setActiveTab('workspace')}
                onNavigateToScreening={() => setActiveTab('screening')}
              />
            )}
            {activeTab === 'workspace' && (
              <WorkspacePage
                onNavigateToIdentity={() => setActiveTab('identity')}
                onRequestSubmittedNotification={loadPendingRequests}
              />
            )}
            {activeTab === 'lineage' && <LineagePage />}
            {activeTab === 'screening' && <ScreeningPage onSelectCandidate={() => setActiveTab('workspace')} />}
            {activeTab === 'timeline' && <TimelinePage />}
            {activeTab === 'endpoints' && <EndpointsPage />}
            {activeTab === 'assessments' && <AssessmentPage />}
            {activeTab === 'identity' && <IdentityPage currentRole={currentRole} onRoleSwitch={setCurrentRole} />}
            {activeTab === 'simulator' && <SimulatorPage />}
            {activeTab === 'reports' && <ReportsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;