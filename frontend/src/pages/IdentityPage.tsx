import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { api } from '../api/client';
import { Case, IdentityRequest, UserRole } from '../types';

interface IdentityPageProps {
  currentRole: UserRole;
  onRoleSwitch: (role: UserRole) => void;
}

export const IdentityPage: React.FC<IdentityPageProps> = ({ currentRole, onRoleSwitch }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [requests, setRequests] = useState<IdentityRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<IdentityRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [allowedFields, setAllowedFields] = useState<string[]>([
    'real_name',
    'phone',
    'real_account_number',
  ]);
  const [processing, setProcessing] = useState(false);

  // New Request Form
  const [newPseudoId, setNewPseudoId] = useState('');
  const [newJustification, setNewJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const caseList = await api.getCases();
      setCases(caseList);
      const reqList = await api.getIdentityRequests();
      setRequests(reqList);
    } catch (err) {
      console.error('Failed to load identity requests', err);
    }
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!newPseudoId || !newJustification || cases.length === 0) return;
    setSubmitting(true);
    try {
      await api.submitIdentityRequest({
        case_id: cases[0].id,
        account_pseudo_id: newPseudoId,
        requested_by: 'lead_investigator',
        justification: newJustification,
      });
      setNewPseudoId('');
      setNewJustification('');
      await loadRequests();
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExecuteReview() {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await api.reviewIdentityRequest(selectedRequest.id, {
        status: reviewAction,
        reviewed_by: 'compliance_officer_apex',
        review_notes: reviewNotes || (reviewAction === 'APPROVED' ? 'Statutory justification verified.' : 'Insufficient legal basis.'),
        disclosed_fields: reviewAction === 'APPROVED' ? allowedFields : [],
      });
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      setReviewNotes('');
      await loadRequests();
    } catch (err: any) {
      alert(`Review error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  const toggleField = (field: string) => {
    setAllowedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">
                Authorized Identity Resolution & De-Anonymisation
              </h1>
              <p className="text-xs text-slate-400">
                Bank-controlled, purpose-bound synthetic identity disclosure with reviewer authorization and audit trail
              </p>
            </div>
          </div>

          {/* Current Role Indicator & Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Current Role:</span>
            <span
              className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[10px] ${
                currentRole === 'reviewer'
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                  : 'bg-blue-950 text-blue-300 border border-blue-700'
              }`}
            >
              {currentRole}
            </span>
            <button
              onClick={() => onRoleSwitch(currentRole === 'investigator' ? 'reviewer' : 'investigator')}
              className="ml-2 text-blue-400 hover:text-blue-300 text-[11px] underline font-medium"
            >
              Switch Role
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Submit New Request (Investigator) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Submit Disclosure Request</span>
          </h2>

          <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Target Account Pseudonym</label>
              <input
                type="text"
                placeholder="e.g. PSEUDO-MULE-01"
                value={newPseudoId}
                onChange={(e) => setNewPseudoId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Investigation Purpose & Justification</label>
              <textarea
                rows={4}
                placeholder="State the statutory mandate, complaint number, or court order..."
                value={newJustification}
                onChange={(e) => setNewJustification(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                required
              />
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p>• <strong>Least-Privilege:</strong> Discloses only approved fields.</p>
              <p>• <strong>Tamper-Evident:</strong> Logged in immutable audit records.</p>
            </div>

            <button
              type="submit"
              disabled={submitting || !newPseudoId || !newJustification}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <span>{submitting ? 'Submitting...' : 'Submit to Bank Reviewer'}</span>
            </button>
          </form>
        </div>

        {/* Right: Requests List & Details */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100">
              Identity Disclosure Requests ({requests.length})
            </h2>
            <button
              onClick={loadRequests}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Refresh List
            </button>
          </div>

          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No identity resolution requests submitted yet. Use the form on the left or click 'Request Authorized De-anonymisation' from any graph node.
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-xs space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-400 text-sm">
                        {req.account_pseudo_id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(req.requested_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    <span className="text-slate-500 block mb-0.5">Justification:</span>
                    <p className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 font-sans leading-relaxed">
                      {req.justification}
                    </p>
                  </div>

                  {/* If Approved: Display Disclosed Synthetic Identity Card */}
                  {req.status === 'APPROVED' && req.disclosed_data && (
                    <div className="bg-emerald-950/20 border border-emerald-800/60 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-emerald-800/40 pb-1.5">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Authorized Synthetic Identity Disclosure</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Reviewer: {req.reviewed_by}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                        {req.disclosed_data.real_name && (
                          <div>
                            <span className="text-slate-500 block text-[10px]">Real Account Holder</span>
                            <span className="font-semibold text-slate-100">{req.disclosed_data.real_name}</span>
                          </div>
                        )}
                        {req.disclosed_data.real_account_number && (
                          <div>
                            <span className="text-slate-500 block text-[10px]">Real Account Number</span>
                            <span className="font-mono font-semibold text-slate-100">{req.disclosed_data.real_account_number}</span>
                          </div>
                        )}
                        {req.disclosed_data.phone && (
                          <div>
                            <span className="text-slate-500 block text-[10px]">Phone Number</span>
                            <span className="font-mono text-slate-200">{req.disclosed_data.phone}</span>
                          </div>
                        )}
                        {req.disclosed_data.bank_branch && (
                          <div>
                            <span className="text-slate-500 block text-[10px]">Bank Branch</span>
                            <span className="text-slate-200">{req.disclosed_data.bank_branch}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions for Reviewer Role */}
                  {req.status === 'PENDING' && (
                    <div className="pt-1 flex items-center justify-end gap-2">
                      {currentRole === 'reviewer' ? (
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsReviewModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Review & Approve / Reject</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-amber-400 italic">
                          Pending Compliance Reviewer action. Switch role to approve.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reviewer Action Modal */}
      {isReviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Compliance Review Decision</h3>
                <p className="text-xs text-slate-400">
                  Target Account: <span className="font-mono text-blue-400">{selectedRequest.account_pseudo_id}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Decision</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APPROVED')}
                    className={`flex-1 py-2 rounded-xl font-bold border transition ${
                      reviewAction === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Approve Disclosure
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('REJECTED')}
                    className={`flex-1 py-2 rounded-xl font-bold border transition ${
                      reviewAction === 'REJECTED'
                        ? 'bg-rose-950 text-rose-300 border-rose-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Reject Request
                  </button>
                </div>
              </div>

              {reviewAction === 'APPROVED' && (
                <div>
                  <label className="text-slate-400 block mb-1">
                    Permitted Fields (Least-Privilege Authorization):
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    {[
                      { id: 'real_name', label: 'Real Name' },
                      { id: 'phone', label: 'Phone Number' },
                      { id: 'real_account_number', label: 'Real Account No.' },
                      { id: 'bank_branch', label: 'Bank Branch' },
                      { id: 'email', label: 'Email Address' },
                      { id: 'address', label: 'Physical Address' },
                    ].map((f) => (
                      <label key={f.id} className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={allowedFields.includes(f.id)}
                          onChange={() => toggleField(f.id)}
                          className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span>{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Review Notes & Order Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Authorized by Compliance Order #2026/MM/991"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReview}
                disabled={processing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
