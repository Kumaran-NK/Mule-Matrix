import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Store,
  HelpCircle,
  Flag,
  BarChart3,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { Case, AccountAssessment } from '../types';

export const AssessmentPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [assessments, setAssessments] = useState<AccountAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AccountAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssessments() {
      try {
        const caseList = await api.getCases();
        setCases(caseList);
        if (caseList.length > 0) {
          const assessList = await api.getCaseAssessments(caseList[0].id);
          setAssessments(assessList);
        }
      } catch (err) {
        console.error('Failed to load assessments', err);
      } finally {
        setLoading(false);
      }
    }
    loadAssessments();
  }, []);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'LIKELY_MULE':
        return 'bg-rose-950 border-rose-800 text-rose-300';
      case 'MERCHANT':
        return 'bg-amber-950 border-amber-800 text-amber-300';
      case 'LEGITIMATE_COUNTERPARTY':
        return 'bg-emerald-950 border-emerald-800 text-emerald-300';
      case 'SEED_ACCOUNT':
        return 'bg-indigo-950 border-indigo-800 text-indigo-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Deterministic & Explainable Account Assessment
            </h1>
            <p className="text-xs text-slate-400">
              Separating fund attribution from account suspicion scoring: receiving suspicious funds does not establish complicity
            </p>
          </div>
        </div>

        {/* Scoring formula callout */}
        <div className="mt-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-200 block mb-1">
              Multi-Dimensional Evidence Scoring Formula:
            </span>
            <code className="font-mono text-blue-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 inline-block text-[11px]">
              Score = 0.30×Behavior + 0.20×Temporal + 0.20×Graph + 0.15×Fund + 0.15×Relationship
            </code>
          </div>
          <div className="text-[11px] text-slate-400 max-w-sm">
            Deterministic weights prevent black-box bias. Provides auditable evidence explanations for court and compliance review.
          </div>
        </div>
      </div>

      {/* Accounts Assessment Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-100">Evaluated Discovered Accounts</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Account Pseudonym</th>
                <th className="py-2.5 px-3">Institution</th>
                <th className="py-2.5 px-3">Assessment Classification</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Attributed Funds</th>
                <th className="py-2.5 px-3">5 Dimensions Breakdown</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {assessments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-3 font-mono font-bold text-blue-400">
                    {a.account_pseudo_id}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {a.bank_name} <span className="text-slate-500 font-mono text-[10px]">({a.bank_code})</span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getCategoryBadge(
                        a.category
                      )}`}
                    >
                      {a.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-100">
                    {Math.round(a.confidence_score * 100)}%
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-rose-300">
                    ₹{Number(a.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span title="Behavior">B: {Math.round(a.behavioral_score * 100)}%</span>
                      <span>•</span>
                      <span title="Temporal">T: {Math.round(a.temporal_score * 100)}%</span>
                      <span>•</span>
                      <span title="Graph">G: {Math.round(a.graph_score * 100)}%</span>
                      <span>•</span>
                      <span title="Fund">F: {Math.round(a.fund_score * 100)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedAssessment(a)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition font-medium"
                    >
                      Inspect Evidence
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Assessment Evidence Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Assessment Evidence File
                </span>
                <h3 className="text-base font-bold text-blue-400 font-mono">
                  {selectedAssessment.account_pseudo_id}
                </h3>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getCategoryBadge(
                  selectedAssessment.category
                )}`}
              >
                {selectedAssessment.category.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Composite Confidence</span>
                  <span className="font-mono text-base font-bold text-slate-100">
                    {Math.round(selectedAssessment.confidence_score * 100)}%
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Attributed Exposure</span>
                  <span className="font-mono text-base font-bold text-rose-300">
                    ₹{Number(selectedAssessment.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Dimensions Table */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block mb-1">
                  Evidence Dimensions:
                </span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Behavioral Score (w=0.30):</span>
                    <span className="font-mono font-bold text-slate-200">
                      {Math.round(selectedAssessment.behavioral_score * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Temporal Velocity Score (w=0.20):</span>
                    <span className="font-mono font-bold text-slate-200">
                      {Math.round(selectedAssessment.temporal_score * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Graph Position Score (w=0.20):</span>
                    <span className="font-mono font-bold text-slate-200">
                      {Math.round(selectedAssessment.graph_score * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fund Exposure Score (w=0.15):</span>
                    <span className="font-mono font-bold text-slate-200">
                      {Math.round(selectedAssessment.fund_score * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Relationship Score (w=0.15):</span>
                    <span className="font-mono font-bold text-slate-200">
                      {Math.round(selectedAssessment.relationship_score * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence details list */}
              {Array.isArray(selectedAssessment.evidence) && selectedAssessment.evidence.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-300 block">Supporting Evidence:</span>
                  {selectedAssessment.evidence.map((ev: any, i: number) => (
                    <div
                      key={i}
                      className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300"
                    >
                      <div className="font-bold text-blue-400 mb-0.5">{ev.dimension || 'EVIDENCE'}</div>
                      <div>{ev.summary || ev.pattern || JSON.stringify(ev)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedAssessment(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
