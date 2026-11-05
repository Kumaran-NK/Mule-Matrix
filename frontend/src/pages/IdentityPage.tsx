import React, { useEffect, useState } from 'react';
import { UserCheck, Clock, Lock } from 'lucide-react';
import { api } from '../api/client';
import { Case, IdentityRequest, UserRole } from '../types';
import { Modal, PageHeader, Pill } from '../components/ui';

interface IdentityPageProps {
  currentRole: UserRole;
  onRoleSwitch: (role: UserRole) => void;
}

const FIELDS = [
  { id: 'real_name', label: 'Real name' },
  { id: 'phone', label: 'Phone number' },
  { id: 'real_account_number', label: 'Real account number' },
  { id: 'bank_branch', label: 'Bank branch' },
  { id: 'email', label: 'Email address' },
  { id: 'address', label: 'Physical address' },
];

export const IdentityPage: React.FC<IdentityPageProps> = ({ currentRole, onRoleSwitch }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [requests, setRequests] = useState<IdentityRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<IdentityRequest | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [allowedFields, setAllowedFields] = useState<string[]>(['real_name', 'phone', 'real_account_number']);
  const [processing, setProcessing] = useState(false);

  const [newPseudoId, setNewPseudoId] = useState('');
  const [newJustification, setNewJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setCases(await api.getCases());
      setRequests(await api.getIdentityRequests());
    } catch (err) {
      console.error('Failed to load identity requests', err);
    }
  }

  async function handleCreate(e: React.FormEvent) {
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
      alert(`Request failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview() {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await api.reviewIdentityRequest(selectedRequest.id, {
        status: reviewAction,
        reviewed_by: 'compliance_officer_apex',
        review_notes: reviewNotes || (reviewAction === 'APPROVED' ? 'Statutory justification verified.' : 'Insufficient legal basis.'),
        disclosed_fields: reviewAction === 'APPROVED' ? allowedFields : [],
      });
      setIsReviewOpen(false);
      setSelectedRequest(null);
      setReviewNotes('');
      await loadRequests();
    } catch (err: any) {
      alert(`Review failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  const toggleField = (f: string) =>
    setAllowedFields((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  const statusTone = (s: string) => (s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'pending');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity resolution"
        subtitle="Investigators work with pseudonyms. Real identities are held by the bank and released only field by field, after a compliance reviewer approves."
        actions={
          <div className="flex items-center gap-3 card !rounded-xl px-4 py-2.5">
            <span className="text-mute">Acting as</span>
            <span className="font-semibold">{currentRole === 'reviewer' ? 'Compliance reviewer' : 'Investigator'}</span>
            <button onClick={() => onRoleSwitch(currentRole === 'investigator' ? 'reviewer' : 'investigator')} className="font-semibold text-flame-700 underline underline-offset-4">
              Switch
            </button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <section className="card card-pad">
          <h2 className="text-xl font-bold mb-4">New disclosure request</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Account pseudonym</label>
              <input value={newPseudoId} onChange={(e) => setNewPseudoId(e.target.value)} placeholder="PSEUDO-MULE-01" className="field id" required />
            </div>
            <div>
              <label className="label">Legal basis and purpose</label>
              <textarea rows={4} value={newJustification} onChange={(e) => setNewJustification(e.target.value)} placeholder="Cite the statute, complaint number or court order." className="field" required />
            </div>
            <button type="submit" disabled={submitting || !newPseudoId || !newJustification} className="btn-primary w-full">
              {submitting ? 'Sending…' : 'Send to reviewer'}
            </button>
            <p className="text-mute">Only the fields the reviewer approves are disclosed. Every step is logged.</p>
          </form>
        </section>

        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Requests ({requests.length})</h2>
            <button onClick={loadRequests} className="font-semibold hover:text-flame-600">Refresh</button>
          </div>

          {requests.length === 0 && (
            <div className="card p-10 text-center text-mute">
              No requests yet. Use the form, or choose “Request identity disclosure” on any node in the workspace.
            </div>
          )}

          {requests.map((req) => (
            <article key={req.id} className="card card-pad space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="id text-lg">{req.account_pseudo_id}</span>
                  <Pill tone={statusTone(req.status) as any}>{req.status[0] + req.status.slice(1).toLowerCase()}</Pill>
                </div>
                <span className="flex items-center gap-1.5 text-mute">
                  <Clock className="w-4 h-4" />
                  {new Date(req.requested_at).toLocaleString()}
                </span>
              </div>

              <p className="rounded-lg bg-neutral-100 p-3.5">{req.justification}</p>

              {req.status === 'APPROVED' && req.disclosed_data && (
                <div className="rounded-xl border-2 border-black p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold">Disclosed identity (synthetic)</span>
                    <span className="text-sm text-mute">Approved by {req.reviewed_by}</span>
                  </div>
                  <dl className="grid sm:grid-cols-2 gap-4">
                    {[
                      ['real_name', 'Account holder'],
                      ['real_account_number', 'Account number'],
                      ['phone', 'Phone'],
                      ['bank_branch', 'Branch'],
                    ].map(([k, label]) => {
                      const v = req.disclosed_data?.[k];
                      return (
                        <div key={k}>
                          <dt className="text-sm text-mute">{label}</dt>
                          {v ? (
                            <dd className="font-semibold">{v}</dd>
                          ) : (
                            <dd className="flex items-center gap-1.5 text-mute"><Lock className="w-3.5 h-3.5" />Masked</dd>
                          )}
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}

              {req.status === 'PENDING' && (
                <div className="flex justify-end">
                  {currentRole === 'reviewer' ? (
                    <button
                      onClick={() => {
                        setSelectedRequest(req);
                        setIsReviewOpen(true);
                      }}
                      className="btn-primary"
                    >
                      <UserCheck className="w-4 h-4" />
                      Review request
                    </button>
                  ) : (
                    <span className="text-flame-700 font-medium">Waiting for a compliance reviewer. Switch role to decide.</span>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      </div>

      {isReviewOpen && selectedRequest && (
        <Modal>
          <h3 className="text-xl font-bold">Review disclosure request</h3>
          <p className="text-mute mb-5">
            Account <span className="id text-black">{selectedRequest.account_pseudo_id}</span>
          </p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {(['APPROVED', 'REJECTED'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setReviewAction(a)}
                className={`py-3 rounded-lg font-semibold border-2 transition-colors ${
                  reviewAction === a ? (a === 'APPROVED' ? 'bg-black text-white border-black' : 'bg-flame-500 text-black border-flame-500') : 'bg-white border-line hover:border-black'
                }`}
              >
                {a === 'APPROVED' ? 'Approve' : 'Reject'}
              </button>
            ))}
          </div>

          {reviewAction === 'APPROVED' && (
            <div className="mb-5">
              <div className="label">Fields to disclose (least privilege)</div>
              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-line p-4">
                {FIELDS.map((f) => (
                  <label key={f.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={allowedFields.includes(f.id)} onChange={() => toggleField(f.id)} className="w-4 h-4 accent-[#FF6A13]" />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="label">Decision notes and order reference</label>
          <input value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Authorised under Compliance Order #2026/MM/991" className="field" />

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setIsReviewOpen(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleReview} disabled={processing} className="btn-primary">
              {processing ? 'Saving…' : 'Confirm decision'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};