import React, { useEffect, useState } from 'react';

import { api } from '../api/client';

import { Case, IdentityRequest, UserRole } from '../types';

import { Head, btn, ghost, field } from '../components/ui/Page';

const FIELDS: [string, string][] = [['real_name', 'Name'], ['phone', 'Phone'], ['real_account_number', 'Account number'], ['bank_branch', 'Branch'], ['email', 'Email'], ['address', 'Address']];

const color: Record<string, string> = { APPROVED: '#2F7A52', REJECTED: '#D9402B', PENDING: '#B8720E' };

export const IdentityPage: React.FC<{ currentRole: UserRole; onRoleSwitch: (r: UserRole) => void }> = ({ currentRole, onRoleSwitch }) => {

  const [cases, setCases] = useState<Case[]>([]);

  const [reqs, setReqs] = useState<IdentityRequest[]>([]);

  const [pseudo, setPseudo] = useState('');

  const [why, setWhy] = useState('');

  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState<string | null>(null);

  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

  const [notes, setNotes] = useState('');

  const [fields, setFields] = useState(['real_name', 'phone', 'real_account_number']);

  async function load() { try { setCases(await api.getCases()); setReqs(await api.getIdentityRequests()); } catch (e) { console.error(e); } }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {

    e.preventDefault();

    if (!cases.length) return;

    setBusy(true);

    try { await api.submitIdentityRequest({ case_id: cases[0].id, account_pseudo_id: pseudo, requested_by: 'lead_investigator', justification: why }); setPseudo(''); setWhy(''); await load(); }

    catch (err: any) { alert(`Couldn't send the request. ${err.message}`); } finally { setBusy(false); }

  }

  async function review(r: IdentityRequest) {

    setBusy(true);

    try {

      await api.reviewIdentityRequest(r.id, { status: decision, reviewed_by: 'compliance_officer_apex', review_notes: notes || (decision === 'APPROVED' ? 'Legal basis verified.' : 'Insufficient legal basis.'), disclosed_fields: decision === 'APPROVED' ? fields : [] });

      setOpen(null); setNotes(''); await load();

    } catch (err: any) { alert(`Couldn't save the decision. ${err.message}`); } finally { setBusy(false); }

  }

  return (

    <div>

      <Head title="Identity requests" sub="Accounts stay pseudonymous. A compliance reviewer must approve each disclosure, and only the approved fields are shown. Every step is logged."

        right={<button className={ghost} onClick={() => onRoleSwitch(currentRole === 'investigator' ? 'reviewer' : 'investigator')}>Acting as {currentRole}. Switch</button>} />

      <div className="grid lg:grid-cols-3 gap-10">

        <form onSubmit={submit} className="space-y-3">

          <h2 className="text-lg">New request</h2>

          <label className="block text-xs text-slate-400">Account<input className={`${field} mt-1`} placeholder="PSEUDO-MULE-01" value={pseudo} onChange={(e) => setPseudo(e.target.value)} required /></label>

          <label className="block text-xs text-slate-400">Legal basis and purpose<textarea rows={5} className={`${field} mt-1`} placeholder="Complaint number, statute or court order" value={why} onChange={(e) => setWhy(e.target.value)} required /></label>

          <button className={btn} disabled={busy || !pseudo || !why}>Send to reviewer</button>

        </form>

        <div className="lg:col-span-2">

          <h2 className="text-lg mb-2">Requests ({reqs.length})</h2>

          {!reqs.length && <p className="text-sm text-slate-400">No requests yet. Send one here or from an account's statement.</p>}

          {reqs.map((r) => (

            <div key={r.id} className="py-4 border-b border-slate-800 text-[13px]">

              <div className="flex justify-between gap-4"><span className="font-medium">{r.account_pseudo_id}</span><span><span style={{ color: color[r.status] }}>{r.status.toLowerCase()}</span> <span className="text-slate-400">· {new Date(r.requested_at).toLocaleString()}</span></span></div>

              <p className="text-slate-300 mt-1">{r.justification}</p>

              {r.status === 'APPROVED' && r.disclosed_data && (

                <dl className="mt-3 grid grid-cols-2 gap-2 bg-slate-900 border border-slate-800 rounded-lg p-3">

                  {Object.entries(r.disclosed_data).map(([k, v]) => <div key={k}><dt className="text-xs text-slate-400">{k.replace(/_/g, ' ')}</dt><dd>{v}</dd></div>)}

                </dl>)}

              {r.status === 'PENDING' && (currentRole === 'reviewer'

                ? (open === r.id

                  ? <div className="mt-3 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">

                      <div className="flex gap-2">{(['APPROVED', 'REJECTED'] as const).map((d) => <button key={d} onClick={() => setDecision(d)} className={`${ghost} ${decision === d ? 'bg-slate-800 font-medium' : ''}`}>{d === 'APPROVED' ? 'Approve' : 'Reject'}</button>)}</div>

                      {decision === 'APPROVED' && <div className="flex flex-wrap gap-x-5 gap-y-1">{FIELDS.map(([id, l]) => <label key={id} className="flex items-center gap-1.5"><input type="checkbox" checked={fields.includes(id)} onChange={() => setFields((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id])} />{l}</label>)}</div>}

                      <input className={field} placeholder="Order reference or notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

                      <div className="flex gap-2"><button className={btn} disabled={busy} onClick={() => review(r)}>Confirm decision</button><button className={ghost} onClick={() => setOpen(null)}>Cancel</button></div>

                    </div>

                  : <button className={`${ghost} mt-3`} onClick={() => setOpen(r.id)}>Review request</button>)

                : <p className="mt-2 text-xs text-amber-300">Waiting for a reviewer. Switch role to decide.</p>)}

            </div>))}

        </div>

      </div>

    </div>

  );

};
