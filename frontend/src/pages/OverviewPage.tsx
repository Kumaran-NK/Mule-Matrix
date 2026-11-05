import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  ShieldCheck,
  GitFork,
  ArrowDownToLine,
  Coins,
} from 'lucide-react';
import { api } from '../api/client';
import { Case, GraphResponse } from '../types';
import { PageHeader, StatStrip, Pill, inr } from '../components/ui';

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
    (async () => {
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
    })();
  }, []);

  const mainCase = cases[0];
  const summary = graphData?.summary;
  const reconciliation = summary?.reconciliation;
  const isBalanced = reconciliation ? Number(reconciliation.discrepancy) === 0 : true;

  const statItems = [
    {
      label: 'Traced origin volume',
      value: inr(summary?.total_attributed ?? 100000, 0),
      note: `Ref: ${summary?.origin_ref || 'ORG-SEED-01'} (100% Attributed)`,
    },
    {
      label: 'Discovered intermediaries',
      value: `${summary?.discovered_accounts ?? 6} Accounts`,
      note: 'Across 4 participating institutions',
    },
    {
      label: 'Observable endpoints',
      value: `${summary?.endpoints_count ?? 4} Off-ramps`,
      note: 'ATM, Merchant POS, External, Retained',
    },
    {
      label: 'Provenance invariant',
      value: isBalanced ? '100% Balanced' : 'Unbalanced',
      note: `Discrepancy: ${inr(reconciliation?.discrepancy ?? 0)} (Zero leakage)`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Incident Banner - Solid High Contrast (No Blurry Fog) */}
      <div className="bg-black text-white rounded-xl p-8 border border-black shadow-sm">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-flame-500" />
            <span className="font-mono text-xs uppercase tracking-wider text-neutral-300">
              Cross-Bank Fund Lineage & Temporal Investigation
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-white">
            CBDC-Inspired Fund Provenance & Mule Network Intelligence
          </h1>

          <p className="text-neutral-300 text-[15px] leading-relaxed max-w-2xl">
            Reconstructing the observable movement of suspicious-origin funds across simulated banks,
            splits, and intermediaries. Combines tokenized fund-lot provenance with time-respecting
            graph intelligence and privacy-preserving identity resolution.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onNavigateToWorkspace}
              className="btn btn-primary"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Preloaded Demo ({inr(100000, 0)} Fraud Ring)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onNavigateToScreening}
              className="btn bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-700"
            >
              Explore 5 Synthetic Typologies
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <StatStrip items={statItems} />

      {/* Case Overview & Traversal Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Case Card */}
        <div className="card card-pad flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-mute">
                Active Investigation
              </span>
              <Pill tone="orange">{mainCase?.case_ref || 'CASE-2026-001'}</Pill>
            </div>

            <h2 className="text-xl font-bold font-display text-black leading-snug">
              {mainCase?.title || 'Operation Falcon: Cross-Bank Fraud Mule Ring'}
            </h2>

            <p className="text-sm text-mute leading-relaxed">
              {mainCase?.description ||
                'Victim complaint reporting ₹1,00,000 unauthorized debit traced across multi-bank intermediary splits, ATM cash-out, and merchant off-ramp.'}
            </p>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-line text-sm">
            <div className="flex justify-between items-center">
              <span className="text-mute">Status:</span>
              <Pill tone="green">{mainCase?.status || 'TRACED'}</Pill>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-mute">Created by:</span>
              <span className="font-medium text-black">{mainCase?.created_by || 'lead_investigator'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-mute">Seed origin:</span>
              <span className="font-display font-bold text-black num">{inr(100000)}</span>
            </div>
          </div>

          <button
            onClick={onNavigateToWorkspace}
            className="btn btn-dark w-full"
          >
            <span>Open in Investigation Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: End-to-End Pipeline */}
        <div className="lg:col-span-2 card card-pad space-y-6">
          <div>
            <h2 className="text-xl font-bold font-display text-black">
              End-to-End Investigation Pipeline
            </h2>
            <p className="text-sm text-mute mt-1">
              Deterministic 4-gate verification process ensuring mathematical provenance and compliance governance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                step: '01',
                title: 'Complaint / Alert',
                desc: 'Seed transfer reported. Initial suspicious candidate flagged by 5 behavioral typologies.',
              },
              {
                step: '02',
                title: 'Provenance Lots',
                desc: 'CBDC-inspired parent-child lots split and track suspicious rupees across multi-bank jumps.',
              },
              {
                step: '03',
                title: 'Temporal Traversal',
                desc: 'Chronological graph traversal explores every branch to its terminal off-ramp boundary.',
              },
              {
                step: '04',
                title: 'De-anonymisation',
                desc: 'Pseudonymous investigation; purpose-bound de-anonymisation requires compliance review.',
              },
            ].map((gate) => (
              <div
                key={gate.step}
                className="p-4 rounded-lg border border-line bg-white space-y-2 shadow-xs"
              >
                <span className="font-mono text-xs font-bold text-flame-500 block">
                  GATE {gate.step}
                </span>
                <h3 className="font-bold text-[15px] text-black">{gate.title}</h3>
                <p className="text-xs text-mute leading-snug">{gate.desc}</p>
              </div>
            ))}
          </div>

          {/* Key Engineering Safeguards */}
          <div className="p-4 rounded-lg border border-line bg-white space-y-2 shadow-xs">
            <h3 className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
              Key Engineering Safeguards & Guarantees:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-mute">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Exact Decimal monetary math (PostgreSQL NUMERIC 18,2)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Merchants receiving funds NOT classified as mules</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Circular flow cycle detection prevents infinite loops</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reversals preserve immutable historical lineage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
