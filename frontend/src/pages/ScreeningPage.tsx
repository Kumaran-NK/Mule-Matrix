import React, { useEffect, useState } from 'react';

import { api } from '../api/client';

import { ScreeningCandidate } from '../types';

import { Head, Bar, th, td, ghost } from '../components/ui/Page';

import { inr } from '../components/ui/Conservation';

const TYPES: [string, string, string, string][] = [

  ['PATTERN_1_RAPID_PASSTHROUGH', 'Rapid pass-through', 'Forwards 70% or more within minutes.', 'Fast-settling retailers'],

  ['PATTERN_2_FAN_IN', 'Fan-in', 'Many senders into one account.', 'Fundraisers, shops'],

  ['PATTERN_3_FAN_OUT', 'Fan-out', 'One account pays many others.', 'Payroll, suppliers'],

  ['PATTERN_4_LAYERING', 'Layering', 'Short hops across several banks.', 'Remittance chains'],

  ['PATTERN_5_CIRCULAR_FLOW', 'Circular flow', 'Money returns to an earlier account.', 'Refunds, treasury sweeps'],

];

export const ScreeningPage: React.FC<{ onSelectCandidate: (id: string, seed?: string) => void }> = ({ onSelectCandidate }) => {

  const [rows, setRows] = useState<ScreeningCandidate[]>([]);

  const [counts, setCounts] = useState<Record<string, number>>({});

  const [total, setTotal] = useState(0);

  useEffect(() => {

    api.getScreeningCandidates().then((r) => { setRows(r.candidates); setCounts(r.pattern_breakdown); setTotal(r.total_screened_accounts); }).catch(console.error);

  }, []);

  return (

    <div>

      <Head title="Flagged accounts" sub={`${rows.length} of ${total} screened accounts match at least one mule pattern. Each pattern lists the honest lookalike it could be confused with.`} />

      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-slate-800 border-y border-slate-800 py-4 mb-8">

        {TYPES.map(([id, name, desc, look]) => (

          <div key={id} className="px-4 first:pl-0">

            <div className="font-serif text-3xl" style={{ color: counts[id] ? '#D9402B' : undefined }}>{counts[id] || 0}</div>

            <div className="text-[13px] font-medium">{name}</div>

            <p className="text-xs text-slate-400 mt-1">{desc}</p>

            <p className="text-xs text-slate-400 mt-1">Could be: {look}</p>

          </div>))}

      </div>

      <table className="w-full text-[13px]">

        <thead><tr><th className={th}>Account</th><th className={th}>Patterns</th><th className={`${th} text-right`}>Balance</th><th className={th}>Score</th><th /></tr></thead>

        <tbody>{rows.map((c) => (

          <tr key={c.account_id}>

            <td className={td}><div className="font-medium">{c.pseudo_id}</div><div className="text-xs text-slate-400">{c.bank_name}</div></td>

            <td className={`${td} text-slate-300`}>{c.detected_patterns.map((p) => p.replace(/PATTERN_\d_/, '').replace(/_/g, ' ').toLowerCase()).join(', ')}</td>

            <td className={`${td} text-right font-serif`}>{inr(c.current_balance)}</td>

            <td className={td}><Bar pct={c.behavioral_score * 100} /> <span className="ml-2">{Math.round(c.behavioral_score * 100)}%</span></td>

            <td className={`${td} text-right`}><button className={ghost} onClick={() => onSelectCandidate(c.pseudo_id, c.potential_seeds[0]?.transaction_ref)}>Investigate</button></td>

          </tr>))}</tbody>

      </table>

    </div>

  );

};
