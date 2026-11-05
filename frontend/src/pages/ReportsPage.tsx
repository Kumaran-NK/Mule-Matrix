import React, { useEffect, useState } from 'react';
import { Printer, Check } from 'lucide-react';
import { api } from '../api/client';
import { Case, AccountAssessment, ReconciliationSummary, AuditEvent } from '../types';
import { Pill, categoryLabel, categoryTone, inr } from '../components/ui';

export const ReportsPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [assessments, setAssessments] = useState<AccountAssessment[]>([]);
  const [recon, setRecon] = useState<ReconciliationSummary | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.getCases();
        setCases(list);
        if (list.length > 0) {
          const [a, r, ev] = await Promise.all([
            api.getCaseAssessments(list[0].id),
            api.getCaseReconciliation(list[0].id),
            api.getAuditEvents(),
          ]);
          setAssessments(a);
          setRecon(r);
          setAudit(ev);
        }
      } catch (err) {
        console.error('Failed to load report data', err);
      }
    })();
  }, []);

  const c = cases[0];
  const retained = recon?.retained_balance ?? recon?.total_retained ?? 0;
  const offramps = recon?.terminal_offramps ?? Number(recon?.total_endpoints ?? 0) - Number(retained);
  const balanced = recon ? Number(recon.discrepancy) === 0 : false;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-[1.1] font-bold">Case dossier</h1>
          <p className="text-[16px] text-mute mt-2">A printable summary with reconciliation, account findings and the audit trail.</p>
        </div>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer className="w-4 h-4" />
          Print or save as PDF
        </button>
      </div>

      <section className="card overflow-hidden">
        <div className="bg-black text-white px-8 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-neutral-400">Case reference</div>
            <div className="font-display text-3xl font-bold text-flame-500">{c?.case_ref || 'CASE-2026-001'}</div>
          </div>
          <Pill tone="orange">Confidential investigation record</Pill>
        </div>
        <div className="p-8">
          <h2 className="text-2xl font-bold">{c?.title}</h2>
          <dl className="grid sm:grid-cols-3 gap-6 mt-5">
            <div><dt className="text-mute">Investigator</dt><dd className="font-semibold">{c?.created_by}</dd></div>
            <div><dt className="text-mute">Traced origin</dt><dd className="font-semibold num">{inr(recon?.origin_amount ?? 100000)}</dd></div>
            <div><dt className="text-mute">Opened</dt><dd className="font-semibold">{c ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</dd></div>
          </dl>
          <p className="mt-6 text-[16px] leading-relaxed max-w-3xl">{c?.description}</p>
        </div>
      </section>

      {recon && (
        <section className="card card-pad">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-bold">Reconciliation</h2>
            <Pill tone={balanced ? 'green' : 'red'}>
              {balanced ? <><Check className="w-3.5 h-3.5 mr-1" strokeWidth={3} />Balanced, discrepancy {inr(0)}</> : `Discrepancy ${inr(recon.discrepancy)}`}
            </Pill>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              ['Origin introduced', inr(recon.origin_amount)],
              ['Observable off-ramps', inr(offramps)],
              ['Retained in balances', inr(retained)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-neutral-100 p-4">
                <div className="text-mute">{k}</div>
                <div className="font-display text-2xl font-bold num">{v}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card card-pad">
        <h2 className="text-xl font-bold mb-3">Account findings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Account</th>
                <th className="th">Bank</th>
                <th className="th">Classification</th>
                <th className="th">Confidence</th>
                <th className="th">Attributed</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td className="td id">{a.account_pseudo_id}</td>
                  <td className="td">{a.bank_name}</td>
                  <td className="td"><Pill tone={categoryTone(a.category)}>{categoryLabel(a.category)}</Pill></td>
                  <td className="td font-semibold num">{Math.round(a.confidence_score * 100)}%</td>
                  <td className="td font-semibold num">{inr(a.attributed_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card card-pad">
        <h2 className="text-xl font-bold mb-3">Audit log ({audit.length} events)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Time</th>
                <th className="th">Actor</th>
                <th className="th">Action</th>
                <th className="th">Result</th>
                <th className="th">Details</th>
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 15).map((e) => (
                <tr key={e.id}>
                  <td className="td text-mute whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                  <td className="td font-semibold">{e.actor}</td>
                  <td className="td id">{e.action}</td>
                  <td className="td"><Pill tone={e.result === 'SUCCESS' ? 'green' : 'red'}>{e.result}</Pill></td>
                  <td className="td text-mute max-w-xs truncate">{e.details ? JSON.stringify(e.details) : e.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-black p-5 text-[15px] space-y-1.5">
        <div className="font-bold">Scope and limits of this prototype</div>
        <p>All banks, accounts and transactions are synthetic. Nothing here connects to live RBI e₹, MuleHunter or bank systems.</p>
        <p>Scores organise evidence for an investigator. They are not a finding of guilt.</p>
        <p>Merchants and other counterparties that received funds are kept as non-mule nodes under explicit safeguards.</p>
      </section>
    </div>
  );
};