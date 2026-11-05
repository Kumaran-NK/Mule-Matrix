import React, { useState, useEffect } from 'react';
import { Play, KeyRound, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { Case, GraphResponse } from '../types';
import { InvestigationGraph } from '../components/graph/InvestigationGraph';
import { Modal, Pill, inr } from '../components/ui';

interface WorkspacePageProps {
  onNavigateToIdentity: () => void;
  onRequestSubmittedNotification?: () => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ onNavigateToIdentity, onRequestSubmittedNotification }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracing, setTracing] = useState(false);

  const [allocationPolicy, setAllocationPolicy] = useState<'FIFO' | 'PROPORTIONAL'>('FIFO');
  const [maxHops, setMaxHops] = useState<number>(10);
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD' | 'COMBINED'>('FORWARD');

  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [targetPseudoId, setTargetPseudoId] = useState('');
  const [justification, setJustification] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const caseList = await api.getCases();
        setCases(caseList);
        if (caseList.length > 0) {
          setSelectedCaseId(caseList[0].id);
          await loadGraph(caseList[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial case', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadGraph(caseId: string) {
    try {
      setGraphData(await api.getCaseGraph(caseId));
    } catch (err) {
      console.error('Failed to load graph data', err);
    }
  }

  async function handleRunTrace() {
    if (!selectedCaseId) return;
    setTracing(true);
    try {
      await api.runTrace(selectedCaseId, { allocation_policy: allocationPolicy, direction, max_hops: maxHops });
      await loadGraph(selectedCaseId);
    } catch (err) {
      console.error('Trace execution failed', err);
    } finally {
      setTracing(false);
    }
  }

  const currentCase = cases.find((c) => c.id === selectedCaseId) || cases[0];
  const summary = graphData?.summary;
  const balanced = summary?.reconciliation ? Number(summary.reconciliation.discrepancy) === 0 : true;

  function handleOpenIdentityModal(pseudoId: string) {
    setTargetPseudoId(pseudoId);
    setJustification(
      `Authorised investigation into suspected mule activity linked to ${currentCase?.case_ref || 'this case'}. Legal identity needed for a freeze notice.`
    );
    setRequestSuccessMessage('');
    setIsIdentityModalOpen(true);
  }

  async function handleSubmitIdentityRequest() {
    if (!selectedCaseId || !targetPseudoId || !justification) return;
    setSubmittingRequest(true);
    try {
      await api.submitIdentityRequest({
        case_id: selectedCaseId,
        account_pseudo_id: targetPseudoId,
        requested_by: 'lead_investigator',
        justification,
      });
      setRequestSuccessMessage(`Request sent for ${targetPseudoId}. Switch to Compliance reviewer to approve it.`);
      onRequestSubmittedNotification?.();
      setTimeout(() => {
        setIsIdentityModalOpen(false);
        setRequestSuccessMessage('');
      }, 2500);
    } catch (err: any) {
      alert(`Request failed: ${err.message}`);
    } finally {
      setSubmittingRequest(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Case header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[30px] font-bold leading-tight">{currentCase?.title || 'Operation Falcon'}</h1>
            <span className="id bg-black text-white px-2.5 py-1 rounded-md">{currentCase?.case_ref || 'CASE-2026-001'}</span>
          </div>
          <p className="text-mute mt-1.5 text-[16px]">
            Seed: PSEUDO-VIC-01 (APEX) sent {inr(summary?.total_attributed ?? 100000, 0)} to PSEUDO-MULE-01 (BTRU)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone="neutral">{summary?.discovered_accounts ?? 6} accounts</Pill>
          <Pill tone="neutral">{summary?.endpoints_count ?? 4} off-ramps</Pill>
          <Pill tone={balanced ? 'green' : 'red'}>{balanced ? 'Balanced' : 'Discrepancy'}</Pill>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Accounting policy</label>
            <select value={allocationPolicy} onChange={(e) => setAllocationPolicy(e.target.value as any)} className="field !w-60">
              <option value="FIFO">FIFO (first in, first out)</option>
              <option value="PROPORTIONAL">Proportional</option>
            </select>
          </div>
          <div>
            <label className="label">Direction</label>
            <select value={direction} onChange={(e) => setDirection(e.target.value as any)} className="field !w-52">
              <option value="FORWARD">Forward (downstream)</option>
              <option value="BACKWARD">Backward (upstream)</option>
              <option value="COMBINED">Both directions</option>
            </select>
          </div>
          <div>
            <label className="label">Max hops</label>
            <input type="number" min={1} max={20} value={maxHops} onChange={(e) => setMaxHops(Number(e.target.value))} className="field !w-24 num" />
          </div>
        </div>
        <button onClick={handleRunTrace} disabled={tracing} className="btn-primary !px-6">
          <Play className="w-4 h-4 fill-current" />
          {tracing ? 'Tracing…' : 'Run provenance trace'}
        </button>
      </div>

      {loading ? (
        <div className="h-[640px] card flex items-center justify-center text-mute">Loading the investigation graph…</div>
      ) : (
        <InvestigationGraph nodesData={graphData?.nodes || []} edgesData={graphData?.edges || []} onRequestIdentity={handleOpenIdentityModal} />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-[15px]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-black" />Seed (victim)</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-flame-500 border border-black" />Likely mule</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-white border border-dashed border-black" />Merchant</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-white border border-neutral-300" />Other counterparty</span>
        </div>
        <button onClick={onNavigateToIdentity} className="font-semibold inline-flex items-center gap-1.5 hover:text-flame-600">
          View identity requests <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {isIdentityModalOpen && (
        <Modal>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-flame-500 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Request identity disclosure</h3>
              <p className="text-mute">
                Account <span className="id text-black">{targetPseudoId}</span>
              </p>
            </div>
          </div>

          <label className="label">Legal basis and purpose</label>
          <textarea rows={4} value={justification} onChange={(e) => setJustification(e.target.value)} className="field" placeholder="Cite the statute, complaint number or court order." />

          <p className="text-mute mt-3">
            Identities are held by the bank. A compliance reviewer must approve before any field is shown.
          </p>

          {requestSuccessMessage && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-medium">{requestSuccessMessage}</div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setIsIdentityModalOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleSubmitIdentityRequest} disabled={submittingRequest || !justification} className="btn-primary">
              {submittingRequest ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};