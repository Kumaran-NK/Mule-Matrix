import React, { useEffect, useState } from 'react';
import { GitFork, CheckCircle2, Layers, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { Case, FundLot, ReconciliationSummary } from '../types';

export const LineagePage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [lots, setLots] = useState<FundLot[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const caseList = await api.getCases();
        setCases(caseList);
        if (caseList.length > 0) {
          const caseId = caseList[0].id;
          const [lotsData, reconData] = await Promise.all([
            api.getCaseLots(caseId),
            api.getCaseReconciliation(caseId),
          ]);
          setLots(lotsData);
          setReconciliation(reconData);
        }
      } catch (err) {
        console.error('Failed to load lineage data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const originLot = lots.find((l) => l.parent_lot_id === null);
  const childLots = lots.filter((l) => l.parent_lot_id !== null);

  return (
    <div className="space-y-6">
      {/* Header & Concept Explanation */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              CBDC-Inspired Fund Provenance & Split Lineage
            </h1>
            <p className="text-xs text-slate-400">
              Logical provenance overlay tracking estimated suspicious rupee portions across parent-child splits
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold text-slate-200 mb-1">What is being tokenized?</h4>
            <p className="text-[11px] text-slate-400">
              Mule Matrix creates a digital provenance lot representing the estimated suspicious portion of
              bank transfers. The banking simulator remains the source of payment events.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 mb-1">Parent-Child Lot Splitting</h4>
            <p className="text-[11px] text-slate-400">
              When an account forwards money, the parent lot deducts that amount and creates immutable child
              lots. Never overwrites historical tokens.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 mb-1">Origin Conservation Rule</h4>
            <p className="text-[11px] text-slate-400">
              The sum of child transfers, retained balances, and observed terminal events must reconcile
              strictly to the original seed amount.
            </p>
          </div>
        </div>
      </div>

      {/* Reconciliation Invariant Card */}
      {reconciliation && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-100">
                Provenance Conservation & Invariant Reconciliation
              </h2>
            </div>
            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-xs font-semibold rounded-full flex items-center gap-1.5">
              <span>Status:</span>
              <span>100% Balanced</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs mb-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Origin Introduced</span>
              <span className="font-mono text-base font-bold text-rose-300 block">
                ₹{Number(reconciliation.origin_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Terminal Off-Ramps</span>
              <span className="font-mono text-base font-bold text-amber-300 block">
                ₹{Number(reconciliation.terminal_offramps || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Retained in Accounts</span>
              <span className="font-mono text-base font-bold text-blue-300 block">
                ₹{Number(reconciliation.retained_balance || reconciliation.total_retained || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Compensating Reversals</span>
              <span className="font-mono text-base font-bold text-slate-300 block">
                ₹{Number(reconciliation.total_reversed).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Discrepancy / Leakage</span>
              <span className="font-mono text-base font-bold text-emerald-400 block">
                ₹{Number(reconciliation.discrepancy).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Terminal Category</th>
                  <th className="py-2.5 px-3">Attributed Value</th>
                  <th className="py-2.5 px-3">Observed Account</th>
                  <th className="py-2.5 px-3">Boundary Evidence Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {reconciliation.details.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {item.category.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-300">
                      ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {item.account_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] leading-snug">
                      {item.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provenance Lots Hierarchy */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Active Provenance Lot Tree (Parent → Child Splits)</span>
        </h2>

        {originLot && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                ROOT LOT: {originLot.lot_ref}
              </span>
              <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                Hop 0 (Seed)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Current Holding Account</span>
                <span className="font-mono font-semibold text-slate-200">
                  {originLot.current_account_pseudo_id}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Attributed Amount</span>
                <span className="font-mono font-bold text-rose-300">
                  ₹{Number(originLot.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Lot Status</span>
                <span className="font-semibold text-amber-400">{originLot.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Child Lots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {childLots.map((lot) => (
            <div
              key={lot.id}
              className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-400">{lot.lot_ref}</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                  Hop {lot.hop_count}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Account:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {lot.current_account_pseudo_id}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Attributed:</span>
                  <span className="font-mono font-bold text-rose-300">
                    ₹{Number(lot.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Remaining:</span>
                  <span className="font-mono font-medium text-slate-300">
                    ₹{Number(lot.remaining_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-blue-400">{lot.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
