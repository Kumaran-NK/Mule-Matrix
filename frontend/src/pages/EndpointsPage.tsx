import React, { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  Store,
  Landmark,
  Wallet,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import { Case, EndpointObservation } from '../types';

export const EndpointsPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointObservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEndpoints() {
      try {
        const caseList = await api.getCases();
        setCases(caseList);
        if (caseList.length > 0) {
          const epList = await api.getCaseEndpoints(caseList[0].id);
          setEndpoints(epList);
        }
      } catch (err) {
        console.error('Failed to load endpoints', err);
      } finally {
        setLoading(false);
      }
    }
    loadEndpoints();
  }, []);

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'ATM_WITHDRAWAL':
        return {
          icon: ArrowDownToLine,
          title: 'ATM Cash Withdrawal',
          color: 'text-amber-400 bg-amber-950/40 border-amber-800',
          safeguard: 'Records withdrawal event. Does not claim identity of person collecting cash without external CCTV.',
        };
      case 'MERCHANT_PAYMENT':
        return {
          icon: Store,
          title: 'Merchant POS Settlement',
          color: 'text-blue-400 bg-blue-950/40 border-blue-800',
          safeguard: 'Payment settled with registered business. Merchant is NOT assumed complicit in fraud.',
        };
      case 'EXTERNAL_BANK':
        return {
          icon: Landmark,
          title: 'External Bank Boundary',
          color: 'text-indigo-400 bg-indigo-950/40 border-indigo-800',
          safeguard: 'Transfer reached non-participating institution. Tracing stops cleanly without inventing downstream records.',
        };
      case 'RETAINED_BALANCE':
        return {
          icon: Coins,
          title: 'Retained Account Balance',
          color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800',
          safeguard: 'Funds remain in intermediary account balance at end of observation window.',
        };
      case 'WALLET_TRANSFER':
        return {
          icon: Wallet,
          title: 'Prepaid Wallet Transfer',
          color: 'text-purple-400 bg-purple-950/40 border-purple-800',
          safeguard: 'Funds loaded onto prepaid wallet. Requires wallet provider records for further tracking.',
        };
      default:
        return {
          icon: Info,
          title: cat.replace('_', ' '),
          color: 'text-slate-400 bg-slate-950/40 border-slate-800',
          safeguard: 'Observable trail boundary reached in current participating dataset.',
        };
    }
  };

  const totalAttributed = endpoints.reduce((acc, ep) => acc + Number(ep.attributed_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
            <ArrowDownToLine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Observable Off-Ramp & Endpoint Analysis
            </h1>
            <p className="text-xs text-slate-400">
              Categorizing where traced funds exit the observable banking network, with explicit evidence boundaries
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Endpoint Reporting Rule (Section 8):</p>
          <p>
            An off-ramp is not defined as one final account into which all funds converge. For every branch,
            Mule Matrix records the last observed event, attributed amount, evidence source, and reasons tracing stopped.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {endpoints.map((ep) => {
          const meta = getCategoryMeta(ep.category);
          const Icon = meta.icon;
          return (
            <div
              key={ep.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 backdrop-blur-md ${meta.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5" />
                  <span className="font-mono text-[10px] uppercase tracking-wider bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                    {ep.category}
                  </span>
                </div>
                <h3 className="font-bold text-slate-100 text-sm">{meta.title}</h3>
                <div className="text-xl font-mono font-bold text-slate-100 mt-2">
                  ₹{Number(ep.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-1 text-[11px] border-t border-slate-800/80 pt-2">
                <div className="flex justify-between text-slate-300">
                  <span>Account:</span>
                  <span className="font-mono font-bold text-slate-100">{ep.account_pseudo_id}</span>
                </div>
                <p className="text-slate-400 text-[10px] leading-tight pt-1">{ep.reason}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-100">
          Terminal Evidence & Safeguard Guarantees
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Attributed Value</th>
                <th className="py-2.5 px-3">Holding Account</th>
                <th className="py-2.5 px-3">Last Observed Transaction</th>
                <th className="py-2.5 px-3">Safeguard Guarantee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {endpoints.map((ep) => {
                const meta = getCategoryMeta(ep.category);
                return (
                  <tr key={ep.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{meta.title}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-300">
                      ₹{Number(ep.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                      {ep.account_pseudo_id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {ep.last_transaction_ref || 'Terminal Balance'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-400 leading-snug">
                      {meta.safeguard}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
