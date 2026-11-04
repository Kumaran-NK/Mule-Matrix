import React from 'react';

import { GraphNodeData, GraphEdgeData } from '../../types';

interface Props { node: GraphNodeData; nodes: GraphNodeData[]; edges: GraphEdgeData[]; onRequestIdentity: (id: string) => void; }

const n2 = (n: number) => Number(n).toLocaleString('en-IN');

/** Passbook for one account: traced rupees in, out, and the running balance. */

export const Statement: React.FC<Props> = ({ node, nodes, edges, onRequestIdentity }) => {

  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const rows = edges.filter((e) => e.source === node.id || e.target === node.id)

    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));

  let bal = node.is_seed ? rows.reduce((s, e) => s + (e.source === node.id ? Number(e.attributed_amount) : 0), 0) : 0;

  return (

    <section className="mt-5 border border-slate-800 rounded-lg bg-slate-900 p-5">

      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">

        <h3 className="text-lg">Statement · {node.pseudo_id} · {node.bank_name}</h3>

        <span className="text-xs text-slate-400">Only traced rupees</span>

      </div>

      <table className="w-full text-[13px]">

        <thead><tr className="text-left text-xs text-slate-400">

          <th className="py-1.5 pr-3">Time</th><th className="pr-3">Entry</th><th className="pr-3 text-right">Debit</th><th className="pr-3 text-right">Credit</th><th className="text-right">Balance</th>

        </tr></thead>

        <tbody>{rows.map((e) => {

          const out = e.source === node.id, amt = Number(e.attributed_amount);

          bal += out ? -amt : amt;

          const other = by[out ? e.target : e.source];

          return (

            <tr key={e.id} className="border-b border-slate-800">

              <td className="py-2 pr-3 text-slate-400">{new Date(e.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>

              <td className="pr-3">{out ? 'To' : 'From'} {other?.pseudo_id.replace('PSEUDO-', '')} <span className="text-slate-400">({e.channel})</span></td>

              <td className="pr-3 text-right font-mono">{out ? n2(amt) : ''}</td>

              <td className="pr-3 text-right font-mono">{out ? '' : n2(amt)}</td>

              <td className="text-right font-mono font-medium">{n2(bal)}</td>

            </tr>

          );

        })}</tbody>

      </table>

      <button onClick={() => onRequestIdentity(node.pseudo_id)} className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Request identity disclosure</button>

    </section>

  );

};
