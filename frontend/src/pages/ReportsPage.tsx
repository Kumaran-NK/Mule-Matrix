import React, { useEffect, useState } from 'react';

import { api } from '../api/client';

import { Case, AccountAssessment, ReconciliationSummary, AuditEvent } from '../types';

import { Head, Section, Stats, th, td, btn } from '../components/ui/Page';

import { Conservation, inr } from '../components/ui/Conservation';

export const ReportsPage: React.FC = () => {

  const [c, setCase] = useState<Case | null>(null);

  const [as, setAs] = useState<AccountAssessment[]>([]);

  const [rec, setRec] = useState<ReconciliationSummary | null>(null);

  const [log, setLog] = useState<AuditEvent[]>([]);

  useEffect(() => {

    (async () => {

      try {

        const cs = await api.getCases();

        if (!cs.length) return;

        setCase(cs[0]);

        const [a, r, l] = await Promise.all([api.getCaseAssessments(cs[0].id), api.getCaseReconciliation(cs[0].id), api.getAuditEvents()]);

        setAs(a); setRec(r); setLog(l);

      } catch (e) { console.error(e); }

    })();

  }, []);

  const d = rec?.details || [];

  const held = d.filter((x) => x.category === 'RETAINED_BALANCE').reduce((s, x) => s + Number(x.amount), 0);

  const exited = d.reduce((s, x) => s + Number(x.amount), 0) - held;

  return (

    <div className="max-w-4xl mx-auto">

      <Head title="Case report" sub={`${c?.case_ref || ''} · Confidential investigation record`} right={<button className={btn} onClick={() => window.print()}>Print or save as PDF</button>} />

      <Section title={c?.title || 'Case'}><p className="text-[13px] text-slate-300">{c?.description}</p><p className="text-xs text-slate-400 mt-2">Lead investigator {c?.created_by} · Opened {c ? new Date(c.created_at).toLocaleDateString() : ''}</p></Section>

      {rec && <Stats items={[['Original amount', inr(rec.origin_amount)], ['Left the network', inr(exited)], ['Still in accounts', inr(held)], ['Unaccounted', inr(rec.discrepancy)]]} />}

      <Section title="Where the money went"><Conservation details={d} /></Section>

      <Section title="Accounts">

        <table className="w-full text-[13px]"><thead><tr><th className={th}>Account</th><th className={th}>Bank</th><th className={th}>Verdict</th><th className={th}>Confidence</th><th className={`${th} text-right`}>Traced through</th></tr></thead>

          <tbody>{as.map((a) => <tr key={a.id}><td className={`${td} font-medium`}>{a.account_pseudo_id}</td><td className={td}>{a.bank_name}</td><td className={td}>{a.category.replace(/_/g, ' ').toLowerCase()}</td><td className={td}>{Math.round(a.confidence_score * 100)}%</td><td className={`${td} text-right font-serif`}>{inr(a.attributed_amount)}</td></tr>)}</tbody></table>

      </Section>

      <Section title={`Audit log (${log.length} events)`}>

        <table className="w-full text-[13px]"><thead><tr><th className={th}>Time</th><th className={th}>Actor</th><th className={th}>Action</th><th className={th}>Result</th></tr></thead>

          <tbody>{log.slice(0, 15).map((e) => <tr key={e.id}><td className={`${td} text-slate-400`}>{new Date(e.timestamp).toLocaleString()}</td><td className={td}>{e.actor}</td><td className={td}>{e.action}</td><td className={td} style={{ color: e.result === 'SUCCESS' ? '#2F7A52' : '#D9402B' }}>{e.result.toLowerCase()}</td></tr>)}</tbody></table>

      </Section>

      <Section title="Scope and limits">

        <ul className="text-[13px] text-slate-300 space-y-1.5 list-disc pl-5">

          <li>The banks and transactions are simulated. Nothing connects to live bank systems.</li>

          <li>Scores organise evidence for investigators. They are not a finding of guilt.</li>

          <li>Merchants and other unflagged receivers are never treated as mules by default.</li>

        </ul>

      </Section>

    </div>

  );

};
