import React, { useEffect, useState } from 'react';
import { ArrowRight, TrendingUp, Layers, GitBranch, Repeat, Link2 } from 'lucide-react';
import { api } from '../api/client';
import { ScreeningCandidate } from '../types';
import { PageHeader, Pill, inr } from '../components/ui';

interface ScreeningPageProps {
  onSelectCandidate: (pseudoId: string, seedRef?: string) => void;
}

const TYPOLOGIES = [
  {
    id: 'PATTERN_1_RAPID_PASSTHROUGH',
    name: 'Rapid pass-through',
    desc: 'Receives money and forwards 70% or more within minutes or hours.',
    lookalike: 'A retailer or payment aggregator with fast settlement',
    icon: TrendingUp,
  },
  {
    id: 'PATTERN_2_FAN_IN',
    name: 'Fan-in',
    desc: 'Many different accounts send money into one receiving account.',
    lookalike: 'A merchant, a charity fundraiser or a shared household account',
    icon: Layers,
  },
  {
    id: 'PATTERN_3_FAN_OUT',
    name: 'Fan-out',
    desc: 'One account pays out to many different recipients.',
    lookalike: 'Corporate payroll or a supplier payout run',
    icon: GitBranch,
  },
  {
    id: 'PATTERN_4_LAYERING',
    name: 'Layering chain',
    desc: 'Money hops through several intermediaries across banks in quick succession.',
    lookalike: 'A legitimate remittance or multi-tier vendor settlement',
    icon: Link2,
  },
  {
    id: 'PATTERN_5_CIRCULAR_FLOW',
    name: 'Circular flow',
    desc: 'Money passes through several accounts and returns to an earlier one.',
    lookalike: 'A refund sequence or a treasury sweep',
    icon: Repeat,
  },
];

export const ScreeningPage: React.FC<ScreeningPageProps> = ({ onSelectCandidate }) => {
  const [candidates, setCandidates] = useState<ScreeningCandidate[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [totalScreened, setTotalScreened] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getScreeningCandidates();
        setCandidates(res.candidates);
        setBreakdown(res.pattern_breakdown);
        setTotalScreened(res.total_screened_accounts);
      } catch (err) {
        console.error('Failed to load screening candidates', err);
      }
    })();
  }, []);

  const nameOf = (id: string) => TYPOLOGIES.find((t) => t.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pattern screening"
        subtitle="Five explainable typologies flag accounts for a closer look. Each one lists the innocent behaviour it can be confused with."
      />

      <section className="card divide-y divide-line">
        {TYPOLOGIES.map((t) => {
          const Icon = t.icon;
          const count = breakdown[t.id] || 0;
          return (
            <div key={t.id} className="p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="w-11 h-11 rounded-xl bg-black text-flame-500 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-[260px]">
                <div className="text-lg font-bold font-display">{t.name}</div>
                <div className="text-mute">{t.desc}</div>
              </div>
              <div className="flex-1 min-w-[240px] text-mute">
                <span className="text-black font-medium">Could also be: </span>
                {t.lookalike}
              </div>
              <div className="text-right w-20">
                <div className="font-display text-3xl font-bold num leading-none">{count}</div>
                <div className="text-sm text-mute">flagged</div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="card card-pad">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 className="text-xl font-bold">
            {candidates.length} flagged of {totalScreened} screened accounts
          </h2>
          <span className="text-mute">Choose Investigate to open an account in the workspace.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Account</th>
                <th className="th">Institution</th>
                <th className="th">Type</th>
                <th className="th">Balance</th>
                <th className="th">Patterns</th>
                <th className="th">Behaviour score</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.account_id}>
                  <td className="td id">{c.pseudo_id}</td>
                  <td className="td">
                    {c.bank_name} <span className="text-mute">({c.bank_code})</span>
                  </td>
                  <td className="td text-mute">{c.account_type}</td>
                  <td className="td num">{inr(c.current_balance)}</td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1.5">
                      {c.detected_patterns.map((p) => (
                        <Pill key={p} tone="orange">{nameOf(p)}</Pill>
                      ))}
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold num w-12">{Math.round(c.behavioral_score * 100)}%</span>
                      <div className="w-24 h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div className="h-full bg-flame-500" style={{ width: `${Math.round(c.behavioral_score * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="td text-right">
                    <button onClick={() => onSelectCandidate(c.pseudo_id, c.potential_seeds[0]?.transaction_ref)} className="btn-dark !py-2">
                      Investigate <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};