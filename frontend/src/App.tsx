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
    // Poll requests periodically or when role switches
    const timer = setInterval(loadPendingRequests, 10000);
    return () => clearInterval(timer);
  }, []);

  async function loadPendingRequests() {
    try {
      const allReqs = await api.getIdentityRequests();
      const pending = allReqs.filter((r) => r.status === 'PENDING');
      setPendingRequests(pending);
    } catch (err) {
      // Ignore initial connection err
    }
  }

  async function handleResetData() {
    if (!confirm('Reset simulation database to standard synthetic demo state?')) return;
    setIsResetting(true);
    try {
      await api.resetSimulator();
      await loadPendingRequests();
      alert('Mule Matrix demonstration state reset successfully!');
      window.location.reload();
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onResetData={handleResetData}
        isResetting={isResetting}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingRequestsCount={pendingRequests.length}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/90">
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

          {activeTab === 'screening' && (
            <ScreeningPage
              onSelectCandidate={(pseudoId) => {
                setActiveTab('workspace');
              }}
            />
          )}

          {activeTab === 'timeline' && <TimelinePage />}

          {activeTab === 'endpoints' && <EndpointsPage />}

          {activeTab === 'assessments' && <AssessmentPage />}

          {activeTab === 'identity' && (
            <IdentityPage
              currentRole={currentRole}
              onRoleSwitch={setCurrentRole}
            />
          )}

          {activeTab === 'simulator' && <SimulatorPage />}

          {activeTab === 'reports' && <ReportsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
