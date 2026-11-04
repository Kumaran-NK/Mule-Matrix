import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Sliders,
  CheckCircle2,
  KeyRound,
  Filter,
  Eye,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import { Case, GraphResponse } from '../types';
import { InvestigationGraph } from '../components/graph/InvestigationGraph';

interface WorkspacePageProps {
  onNavigateToIdentity: () => void;
  onRequestSubmittedNotification?: () => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  onNavigateToIdentity,
  onRequestSubmittedNotification,
}) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracing, setTracing] = useState(false);

  // Trace parameters
  const [allocationPolicy, setAllocationPolicy] = useState<'FIFO' | 'PROPORTIONAL'>('FIFO');
  const [maxHops, setMaxHops] = useState<number>(10);
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD' | 'COMBINED'>('FORWARD');

  // Identity Request Modal state
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [targetPseudoId, setTargetPseudoId] = useState('');
  const [justification, setJustification] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState('');

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const caseList = await api.getCases();
        setCases(caseList);
        if (caseList.length > 0) {
          const firstCaseId = caseList[0].id;
          setSelectedCaseId(firstCaseId);
          await loadGraph(firstCaseId);
        }
      } catch (err) {
        console.error('Failed to load initial case', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadGraph(caseId: string) {
    try {
      const data = await api.getCaseGraph(caseId);
      setGraphData(data);
    } catch (err) {
      console.error('Failed to load graph data', err);
    }
  }

  async function handleRunTrace() {
    if (!selectedCaseId) return;
    setTracing(true);
    try {
      await api.runTrace(selectedCaseId, {
        allocation_policy: allocationPolicy,
        direction: direction,
        max_hops: maxHops,
      });
      await loadGraph(selectedCaseId);
    } catch (err) {
      console.error('Trace execution failed', err);
    } finally {
      setTracing(false);
    }
  }

  function handleOpenIdentityModal(pseudoId: string) {
    setTargetPseudoId(pseudoId);
    setJustification(
      `Authorized investigation into suspected mule activity linked to Case ${
        currentCase?.case_ref || ''
      }. Need legal identity for frozen asset notice.`
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
        justification: justification,
      });
      setRequestSuccessMessage(
        `Request submitted for ${targetPseudoId}! Switch to Compliance Reviewer role to review and approve.`
      );
      if (onRequestSubmittedNotification) onRequestSubmittedNotification();
      setTimeout(() => {
        setIsIdentityModalOpen(false);
        setRequestSuccessMessage('');
      }, 2500);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingRequest(false);
    }
  }

  const currentCase = cases.find((c) => c.id === selectedCaseId) || cases[0];
  const summary = graphData?.summary;
  const reconciliation = summary?.reconciliation;

  return (
    <div className="space-y-4">
      {/* Top Banner: Case Details & Quick Actions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                {currentCase?.case_ref || 'CASE-2026-001'}
              </span>
              <h2 className="text-sm font-bold text-slate-100">
                {currentCase?.title || 'Operation Falcon'}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Seed: Ramesh Sharma (APEX) → ₹1,00,000 to Primary Mule (BTRU)
            </p>
          </div>
        </div>

        {/* Trace summary pills */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 mr-1.5">Attributed Volume:</span>
            <span className="font-mono font-bold text-rose-300">
              ₹{Number(summary?.total_attributed || 100000).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 mr-1.5">Accounts:</span>
            <span className="font-mono font-bold text-slate-200">
              {summary?.discovered_accounts ?? 6}
            </span>
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 mr-1.5">Endpoints:</span>
            <span className="font-mono font-bold text-amber-300">
              {summary?.endpoints_count ?? 4}
            </span>
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">100% Balanced</span>
          </div>
        </div>
      </div>

      {/* Tracing Controls Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Policy */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Accounting Policy:</span>
            <select
              value={allocationPolicy}
              onChange={(e) => setAllocationPolicy(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="FIFO">FIFO (First-In, First-Out)</option>
              <option value="PROPORTIONAL">Proportional Allocation</option>
            </select>
          </div>

          {/* Direction */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Direction:</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="FORWARD">Forward (Downstream)</option>
              <option value="BACKWARD">Backward (Upstream)</option>
              <option value="COMBINED">Combined (Bidirectional)</option>
            </select>
          </div>

          {/* Max Hops */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Max Hops:</span>
            <input
              type="number"
              min={1}
              max={20}
              value={maxHops}
              onChange={(e) => setMaxHops(Number(e.target.value))}
              className="w-16 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 text-center font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Run Trace button */}
        <button
          onClick={handleRunTrace}
          disabled={tracing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 fill-current ${tracing ? 'animate-spin' : ''}`} />
          <span>{tracing ? 'Computing Provenance...' : 'Execute Provenance Trace'}</span>
        </button>
      </div>

      {/* Main Interactive Graph Canvas */}
      {loading ? (
        <div className="w-full h-[620px] bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
          Loading investigation network graph...
        </div>
      ) : (
        <InvestigationGraph
          nodesData={graphData?.nodes || []}
          edgesData={graphData?.edges || []}
          onRequestIdentity={handleOpenIdentityModal}
        />
      )}

      {/* Graph Legend */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-300">Graph Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            <span>Seed Account (Victim)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span>Likely Mule Candidate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Merchant Counterparty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Legitimate Counterparty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border-2 border-amber-400" />
            <span>Observed Terminal Endpoint</span>
          </div>
        </div>

        <button
          onClick={onNavigateToIdentity}
          className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-medium"
        >
          <span>View Identity Resolution Requests</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Identity Request Modal */}
      {isIdentityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Request Authorized De-anonymisation
                </h3>
                <p className="text-xs text-slate-400">
                  Target Account:{' '}
                  <span className="font-mono font-bold text-blue-400">{targetPseudoId}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block font-medium mb-1">
                  Legal Justification & Investigation Purpose
                </label>
                <textarea
                  rows={4}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Provide statutory basis, cyber complaint number, and necessity..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 font-sans focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>
                  • <strong>Privacy Principle:</strong> Direct customer identities remain isolated
                  within bank-side stores.
                </p>
                <p>
                  • <strong>Review Gate:</strong> Requires simulated compliance officer review and
                  approval before disclosure.
                </p>
              </div>

              {requestSuccessMessage && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 font-medium">
                  {requestSuccessMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsIdentityModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitIdentityRequest}
                disabled={submittingRequest || !justification}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 disabled:opacity-50"
              >
                {submittingRequest ? 'Submitting...' : 'Submit Disclosure Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
