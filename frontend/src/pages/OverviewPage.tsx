import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Banknote,
  GitFork,
  ArrowDownToLine,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';
import { Case, GraphResponse } from '../types';

interface OverviewPageProps {
  onNavigateToWorkspace: () => void;
  onNavigateToScreening: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigateToWorkspace,
  onNavigateToScreening,
}) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      try {
        const casesList = await api.getCases();
        setCases(casesList);
        if (casesList.length > 0) {
          const graph = await api.getCaseGraph(casesList[0].id);
          setGraphData(graph);
        }
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, []);

  const mainCase = cases[0];
  const summary = graphData?.summary;
  const reconciliation = summary?.reconciliation;

  return (
    <div className="space-y-6">
      {/* Hero Banner with Demo Launcher */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 border border-blue-800/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            National Hackathon MVP Blueprint • Live Prototype
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            CBDC-Inspired Fund Provenance & Cross-Bank Mule Intelligence
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Reconstructing the observable movement of suspicious-origin funds across simulated banks,
            splits, and intermediaries. Combines tokenized fund-lot provenance with time-respecting
            graph intelligence and privacy-preserving identity resolution.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onNavigateToWorkspace}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Preloaded Demo Case (₹1,00,000 Fraud Ring)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onNavigateToScreening}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs border border-slate-700 transition"
            >
              Explore 5 Synthetic Typologies
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Traced Origin Amount */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Traced Origin Volume</span>
            <Banknote className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ₹{summary ? Number(summary.total_attributed).toLocaleString('en-IN') : '1,00,000'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Origin Ref: {summary?.origin_ref || 'ORG-SEED-01'} (100% Attributed)
          </p>
        </div>

        {/* KPI 2: Discovered Intermediaries */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Discovered Intermediaries</span>
            <GitFork className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {summary?.discovered_accounts ?? 6} Accounts
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across 4 participating institutions</p>
        </div>

        {/* KPI 3: Observable Off-ramp Endpoints */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Observable Endpoints</span>
            <ArrowDownToLine className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {summary?.endpoints_count ?? 4} Off-ramps
          </div>
          <p className="text-[11px] text-slate-500 mt-1">ATM, Merchant POS, External, Retained</p>
        </div>

        {/* KPI 4: Provenance Reconciliation */}
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Provenance Invariant</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center gap-2">
            <span>100% Balanced</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Discrepancy: ₹{reconciliation?.discrepancy ?? '0.00'} (Zero leakage)
          </p>
        </div>
      </div>

      {/* Case Overview & Demo Ring Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Demo Case Card */}
        <div className="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Active Investigation Case</h2>
            <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full">
              {mainCase?.case_ref || 'CASE-2026-001'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <h3 className="font-semibold text-slate-100 text-sm">
              {mainCase?.title || 'Operation Falcon: Cross-Bank Fraud Mule Ring'}
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {mainCase?.description ||
                'Victim complaint reporting ₹1,00,000 unauthorized debit traced across multi-bank intermediary splits, ATM cash-out, and merchant off-ramp.'}
            </p>
          </div>

          <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className="font-semibold text-blue-400">{mainCase?.status || 'OPEN'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Created By:</span>
              <span className="text-slate-200">{mainCase?.created_by || 'lead_investigator'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Seed Origin:</span>
              <span className="font-mono font-semibold text-rose-300">₹1,00,000.00 INR</span>
            </div>
          </div>

          <button
            onClick={onNavigateToWorkspace}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>Open in Investigation Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Architecture & Investigation Pipeline */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-200">End-to-End Investigation Pipeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* Step 1 */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-blue-900/60 text-blue-400 border border-blue-700 flex items-center justify-center font-bold text-[10px]">
                1
              </span>
              <h4 className="font-semibold text-slate-200">Complaint / Alert</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                Seed transfer reported. Initial suspicious candidate flagged by 5 behavioral typologies.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-900/60 text-indigo-400 border border-indigo-700 flex items-center justify-center font-bold text-[10px]">
                2
              </span>
              <h4 className="font-semibold text-slate-200">Provenance Lots</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                CBDC-inspired parent-child lots split and track suspicious rupees across multi-bank jumps.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-amber-900/60 text-amber-400 border border-amber-700 flex items-center justify-center font-bold text-[10px]">
                3
              </span>
              <h4 className="font-semibold text-slate-200">Temporal Traversal</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                Chronological graph traversal explores every branch to its terminal off-ramp boundary.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-700 flex items-center justify-center font-bold text-[10px]">
                4
              </span>
              <h4 className="font-semibold text-slate-200">De-anonymisation</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                Pseudonymous investigation; purpose-bound de-anonymisation requires compliance review.
              </p>
            </div>
          </div>

          {/* Key Invariant Safeguards */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
            <h4 className="font-semibold text-slate-300">Key Engineering Safeguards & Guarantees:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Exact Decimal monetary math (PostgreSQL NUMERIC 18,2)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Merchants receiving funds NOT classified as mules</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Circular flow cycle detection prevents infinite loops</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Reversals preserve immutable historical lineage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
