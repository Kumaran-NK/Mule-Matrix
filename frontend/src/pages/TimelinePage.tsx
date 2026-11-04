import React, { useEffect, useState } from 'react';
import { History, Clock, ArrowRight, Banknote, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { Case, Transaction } from '../types';

export const TimelinePage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTimeline() {
      try {
        const caseList = await api.getCases();
        setCases(caseList);
        const txList = await api.getTransactions();
        // Sort chronologically ascending
        const sorted = [...txList].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setTransactions(sorted);
      } catch (err) {
        console.error('Failed to load transactions for timeline', err);
      } finally {
        setLoading(false);
      }
    }
    loadTimeline();
  }, []);

  const seedTime = transactions.length > 0 ? new Date(transactions[0].timestamp).getTime() : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Temporal Transaction Timeline & Velocity Analysis
            </h1>
            <p className="text-xs text-slate-400">
              Chronological flow reconstruction showing transfer velocity, receive-to-send delays, and cross-bank jumps
            </p>
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {transactions.map((tx, idx) => {
            const txTime = new Date(tx.timestamp).getTime();
            const elapsedMinutes = Math.round((txTime - seedTime) / 60000);
            const isSeed = tx.transaction_ref === 'TX-SEED-001';
            const isAtm = tx.channel === 'ATM';
            const isMerchant = tx.channel === 'MERCHANT_POS';

            return (
              <div key={tx.id} className="relative group">
                {/* Node icon on vertical line */}
                <span
                  className={`absolute -left-[1.85rem] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isSeed
                      ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                      : isAtm
                      ? 'bg-amber-950 border-amber-500 text-amber-300'
                      : isMerchant
                      ? 'bg-amber-950 border-amber-500 text-amber-300'
                      : 'bg-blue-950 border-blue-500 text-blue-300'
                  }`}
                >
                  <span className="text-[10px] font-bold">{idx + 1}</span>
                </span>

                <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-400">{tx.transaction_ref}</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                        {tx.channel}
                      </span>
                      {isSeed && (
                        <span className="bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                          SEED TRANSACTION
                        </span>
                      )}
                      {isAtm && (
                        <span className="bg-amber-950 border border-amber-800 text-amber-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                          ATM CASH OUT
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                      <span className="text-slate-500 font-mono">(T + {elapsedMinutes}m)</span>
                    </div>
                  </div>

                  {/* Transfer Details */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-slate-500 block text-[10px]">From</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {tx.sender_pseudo_id || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{tx.sender_bank_name}</span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />

                      <div>
                        <span className="text-slate-500 block text-[10px]">To</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {tx.receiver_pseudo_id || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{tx.receiver_bank_name}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">Transferred</span>
                      <span className="font-mono text-sm font-bold text-slate-100">
                        ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {tx.description && (
                    <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                      {tx.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
