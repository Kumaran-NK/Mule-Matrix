import React, { useEffect, useState } from 'react';

import { api } from '../api/client';

import { AccountAssessment } from '../types';

import { Head, Bar, th, td, ghost } from '../components/ui/Page';

import { inr } from '../components/ui/Conservation';

const tone: Record<string, string> = { LIKELY_MULE: '#D9402B', MERCHANT: '#C27A10', LEGITIMATE_COUNTERPARTY: '#2F7A52', SEED_ACCOUNT: '#4F49AA' };

const dims = (a: AccountAssessment): [string, number, string][] => [

  ['Behaviour', a.behavioral_score, '30%'], ['Timing', a.temporal_score, '20%'], ['Network position', a.graph_score, '20%'], ['Fund exposure', a.fund_score, '15%'], ['Relationships', a.relationship_score, '15%'],

];

export const AssessmentPage: React.FC = () => {

  const [rows, setRows] = useState<AccountAssessment[]>([]);

  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {

    (async () => { try { const c = await api.getCases(); if (c.length) setRows(await api.getCaseAssessments(c[0].id)); } catch (e) { console.error(e); } })();

  }, []);

  return (

    <div>

      <Head title="Account risk" sub="Receiving stolen money does not make an account guilty. Each account is scored on five fixed dimensions so every score can be explained in court." />

      <p className="text-sm mb-5">Score = 30% behaviour + 20% timing + 20% network position + 15% fund exposure + 15% relationships</p>

      <table className="w-full text-[13px]">

        <thead><tr><th className={th}>Account</th><th className={th}>Verdict</th><th className={th}>Confidence</th><th className={`${th} text-right`}>Traced through</th><th /></tr></thead>

        <tbody>{rows.map((a) => (

          <React.Fragment key={a.id}>

            <tr>

              <td className={td}><div className="font-medium">{a.account_pseudo_id}</div><div className="text-xs text-slate-400">{a.bank_name}</div></td>

              <td className={td} style={{ color: tone[a.category] }}>{a.category.replace(/_/g, ' ').toLowerCase()}</td>

              <td className={td}><Bar pct={a.confidence_score * 100} color={tone[a.category]} /> <span className="ml-2">{Math.round(a.confidence_score * 100)}%</span></td>

              <td className={`${td} text-right font-serif`}>{inr(a.attributed_amount)}</td>

              <td className={`${td} text-right`}><button className={ghost} onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? 'Hide evidence' : 'Show evidence'}</button></td>

            </tr>

            {open === a.id && (

              <tr><td colSpan={5} className="py-4 border-b border-slate-800 bg-slate-900">

                <div className="grid md:grid-cols-2 gap-8 px-4">

                  <dl className="space-y-2">{dims(a).map(([k, v, w]) => (

                    <div key={k} className="flex items-center justify-between text-[13px]"><dt className="text-slate-400">{k} <span className="text-xs">(weight {w})</span></dt><dd><Bar pct={v * 100} /> <span className="ml-2">{Math.round(v * 100)}%</span></dd></div>))}</dl>

                  <ul className="space-y-1.5 text-[13px] text-slate-300">

                    {Array.isArray(a.evidence) && a.evidence.length ? a.evidence.map((e: any, i: number) => <li key={i}>{e.summary || e.pattern || JSON.stringify(e)}</li>) : <li className="text-slate-400">No further notes.</li>}

                  </ul>

                </div>

              </td></tr>

            )}

          </React.Fragment>))}</tbody>

      </table>

    </div>

  );

};
