import React, { useEffect, useState } from 'react';
import {
  SearchCode,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  GitBranch,
  Repeat,
  Layers,
  CheckCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { ScreeningCandidate } from '../types';

interface ScreeningPageProps {
  onSelectCandidate: (pseudoId: string, seedRef?: string) => void;
}

export const ScreeningPage: React.FC<ScreeningPageProps> = ({ onSelectCandidate }) => {
  const [candidates, setCandidates] = useState<ScreeningCandidate[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [totalScreened, setTotalScreened] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScreening() {
      try {
        const res = await api.getScreeningCandidates();
        setCandidates(res.candidates);
        setBreakdown(res.pattern_breakdown);
        setTotalScreened(res.total_screened_accounts);
      } catch (err) {
        console.error('Failed to load screening candidates', err);
      } finally {
        setLoading(false);
      }
    }
    fetchScreening();
  }, []);

  const typologies = [
    {
      id: 'PATTERN_1_RAPID_PASSTHROUGH',
      name: '1. Rapid Pass-Through',
      desc: 'Account receives funds and transfers >= 70% shortly afterward (within minutes/hours).',
      lookalike: 'Retailer or payment aggregator with fast batch settlement.',
      icon: TrendingUp,
      color: 'text-rose-400 bg-rose-950/60 border-rose-800',
    },
    {
      id: 'PATTERN_2_FAN_IN',
      name: '2. Fan-In Aggregation',
      desc: 'Many distinct accounts send funds into one central receiving account.',
      lookalike: 'Merchant, charitable fundraiser, or shared household account.',
      icon: Layers,
      color: 'text-amber-400 bg-amber-950/60 border-amber-800',
    },
    {
      id: 'PATTERN_3_FAN_OUT',
      name: '3. Fan-Out Distribution',
      desc: 'One account distributes funds out to multiple different recipient accounts.',
      lookalike: 'Corporate payroll disbursement or supplier payout.',
      icon: GitBranch,
      color: 'text-blue-400 bg-blue-950/60 border-blue-800',
    },
    {
      id: 'PATTERN_4_LAYERING',
      name: '4. Layering Chain',
      desc: 'Funds move through multiple intermediary hops with short intervals across different banks.',
      lookalike: 'Legitimate remittance or multi-tier vendor settlement chain.',
      icon: Layers,
      color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800',
    },
    {
      id: 'PATTERN_5_CIRCULAR_FLOW',
      name: '5. Circular / Return Flow',
      desc: 'Funds circulate through multiple accounts and return to an earlier node (cycle).',
      lookalike: 'Refund sequence, treasury sweep, or internal account rebalancing.',
      icon: Repeat,
      color: 'text-purple-400 bg-purple-950/60 border-purple-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
            <SearchCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Synthetic Behavioral Screening & Typologies
            </h1>
            <p className="text-xs text-slate-400">
              Upstream screening feed applying 5 explainable mule typologies with false-positive lookalike safeguards
            </p>
          </div>
        </div>
      </div>

      {/* 5 Typologies Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {typologies.map((t) => {
          const Icon = t.icon;
          const count = breakdown[t.id] || 0;
          return (
            <div
              key={t.id}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 text-xs backdrop-blur-md ${t.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4" />
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800">
                    {count} Flagged
                  </span>
                </div>
                <h3 className="font-bold text-slate-100">{t.name}</h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">{t.desc}</p>
              </div>

              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 text-[10px]">
                <span className="text-slate-400 block font-semibold">Legitimate Lookalike:</span>
                <span className="text-slate-300 leading-tight block">{t.lookalike}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Candidate Accounts Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-slate-100">
              Flagged Candidate Accounts ({candidates.length} of {totalScreened} Screened)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Click 'Investigate' to load into Investigation Workspace
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Account Pseudonym</th>
                <th className="py-2.5 px-3">Institution</th>
                <th className="py-2.5 px-3">Account Type</th>
                <th className="py-2.5 px-3">Current Balance</th>
                <th className="py-2.5 px-3">Detected Typologies</th>
                <th className="py-2.5 px-3">Behavior Score</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {candidates.map((c) => (
                <tr key={c.account_id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                    {c.pseudo_id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-medium">
                    {c.bank_name} <span className="text-slate-500 font-mono">({c.bank_code})</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{c.account_type}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-200">
                    ₹{Number(c.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {c.detected_patterns.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 border border-rose-800 text-rose-300"
                        >
                          {p.replace('PATTERN_', 'P').replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400">
                        {Math.round(c.behavioral_score * 100)}%
                      </span>
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full"
                          style={{ width: `${Math.round(c.behavioral_score * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() =>
                        onSelectCandidate(c.pseudo_id, c.potential_seeds[0]?.transaction_ref)
                      }
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-[11px] inline-flex items-center gap-1 transition"
                    >
                      <span>Investigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
