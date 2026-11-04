import React, { useMemo } from 'react';

import { GraphNodeData, GraphEdgeData } from '../../types';

import { inr } from '../ui/Conservation';

const INK = '#1B2433', RED = '#D9402B', MUTED = '#5C6B63', RULE = '#D4DDD0';

const W = 900, L = 130, R = 150, LH = 44, TOP = 30;

const CAP: Record<string, string> = { ATM_WITHDRAWAL: 'ATM', MERCHANT_PAYMENT: 'POS', EXTERNAL_BANK: 'Out', WALLET_TRANSFER: 'Wallet' };

interface Props { nodes: GraphNodeData[]; edges: GraphEdgeData[]; selectedId: string | null; onSelect: (id: string) => void; }

/** One lane per account, time left to right. Tainted rupees are the red band; its width is the amount. */

export const Lanes: React.FC<Props> = ({ nodes, edges, selectedId, onSelect }) => {

  const v = useMemo(() => {

    if (!nodes.length || !edges.length) return null;

    const t = (e: GraphEdgeData) => new Date(e.timestamp).getTime();

    const ts = edges.map(t), t0 = Math.min(...ts), t1 = Math.max(...ts), span = Math.max(t1 - t0, 60000);

    const x = (ms: number) => L + 10 + ((ms - t0) / span) * (W - L - R - 10);

    const first: Record<string, number> = {};

    nodes.forEach((n) => (first[n.id] = n.is_seed ? -1 : Infinity));

    edges.forEach((e) => (first[e.target] = Math.min(first[e.target] ?? Infinity, t(e))));

    const lanes = [...nodes].sort((a, b) => first[a.id] - first[b.id]);

    const y: Record<string, number> = {};

    lanes.forEach((n, i) => (y[n.id] = TOP + i * LH + LH / 2));

    const k = 14 / Math.max(...edges.map((e) => Number(e.attributed_amount)), 1);

    const mins = Math.ceil(span / 60000), step = mins > 8 ? Math.ceil(mins / 6) : 1;

    const ticks: number[] = [];

    for (let m = 0; t0 + m * step * 60000 <= t1; m++) ticks.push(t0 + m * step * 60000);

    return { x, lanes, y, k, t, ticks };

  }, [nodes, edges]);

  if (!v) return <div className="border border-slate-800 rounded-lg bg-slate-900 p-10 text-center text-sm text-slate-400">No trace yet. Run the trace to draw the lanes.</div>;

  const { x, lanes, y, k, t, ticks } = v;

  const H = TOP + lanes.length * LH + 8;

  const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (

    <div className="border border-slate-800 rounded-lg bg-slate-900 p-2 overflow-x-auto">

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px]" role="img" aria-label="Lanes showing where the traced money moved over time">

        {lanes.map((n, i) => (

          <g key={n.id} onClick={() => onSelect(n.id)} style={{ cursor: 'pointer' }}>

            <rect x={0} y={TOP + i * LH} width={W} height={LH} fill={selectedId === n.id ? '#E4EBDF' : 'transparent'} />

            <line x1={0} x2={W} y1={TOP + (i + 1) * LH} y2={TOP + (i + 1) * LH} stroke={RULE} />

            <text x={10} y={y[n.id] - 2} fontSize={13} fontWeight={500} fill={INK}>{n.bank_code} · {n.pseudo_id.replace('PSEUDO-', '')}</text>

            <text x={10} y={y[n.id] + 13} fontSize={11} fill={n.assessment_category === 'LIKELY_MULE' ? RED : MUTED}>

              {n.is_seed ? 'Victim' : n.assessment_category === 'LIKELY_MULE' ? `Likely mule ${Math.round(n.confidence_score * 100)}%` : n.assessment_category.replace(/_/g, ' ').toLowerCase()}

            </text>

          </g>

        ))}

        <line x1={L - 6} x2={L - 6} y1={0} y2={H} stroke="#E3A59C" strokeWidth={1.2} />

        {ticks.map((m, i) => (

          <g key={i}><line x1={x(m)} x2={x(m)} y1={TOP - 6} y2={H} stroke={RULE} /><text x={x(m)} y={14} fontSize={11} fill={MUTED} textAnchor="middle">{clock(m)}</text></g>

        ))}

        {lanes.filter((n) => !n.is_seed).map((n) => {

          const ev = edges.filter((e) => e.target === n.id || e.source === n.id)

            .map((e) => ({ ms: t(e), d: e.target === n.id ? Number(e.attributed_amount) : -Number(e.attributed_amount) }))

            .sort((a, b) => a.ms - b.ms);

          const terminal = n.is_endpoint && n.endpoint_type !== 'RETAINED_BALANCE';

          let bal = 0;

          const out: React.ReactNode[] = [];

          ev.forEach((e, i) => {

            bal += e.d;

            const end = i < ev.length - 1 ? x(ev[i + 1].ms) : terminal ? x(e.ms) + 40 : W - R;

            const hasNext = i < ev.length - 1;

            if (bal > 1 && (hasNext || true)) out.push(<rect key={i} x={x(e.ms)} y={y[n.id] - (bal * k) / 2} width={Math.max(end - x(e.ms), 0)} height={Math.max(bal * k, 1.5)} fill={RED} />);

          });

          if (bal > 1) {

            const ex = terminal ? x(ev[ev.length - 1].ms) + 40 : W - R;

            out.push(terminal

              ? <g key="cap">

                  {n.endpoint_type === 'ATM_WITHDRAWAL' ? <rect x={ex} y={y[n.id] - 6} width={12} height={12} fill={INK} />

                    : n.endpoint_type === 'EXTERNAL_BANK' ? <path d={`M${ex} ${y[n.id] - 7}l11 7-11 7z`} fill={INK} />

                    : <circle cx={ex + 5} cy={y[n.id]} r={6} fill="none" stroke={INK} strokeWidth={1.6} />}

                  <text x={ex + 18} y={y[n.id] + 4} fontSize={13} fill={INK} className="font-serif">{CAP[n.endpoint_type || ''] || 'End'} {inr(bal)}</text>

                </g>

              : <text key="held" x={W - R - 4} y={y[n.id] - 10} fontSize={12} textAnchor="end" fill={MUTED} className="font-serif">held {inr(bal)}</text>);

          }

          return <g key={n.id}>{out}</g>;

        })}

        {edges.map((e) => {

          const w = Math.max(Number(e.attributed_amount) * k, 1.5), xx = x(t(e));

          const a = y[e.source], b = y[e.target];

          return (

            <g key={e.id}>

              <rect x={xx - w / 2} y={Math.min(a, b)} width={w} height={Math.abs(b - a)} fill={e.is_reversal ? '#C27A10' : RED} />

              <text x={xx + w / 2 + 6} y={b - 9} fontSize={12} fill={INK} fontStyle="italic" className="font-serif">{inr(e.attributed_amount)}</text>

            </g>

          );

        })}

        {lanes.filter((n) => n.is_seed).map((n) => <circle key={n.id} cx={x(Math.min(...edges.map(t)))} cy={y[n.id]} r={4.5} fill={INK} />)}

      </svg>

    </div>

  );

};
