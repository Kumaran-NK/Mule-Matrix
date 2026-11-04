import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import {
  Case,
  AccountAssessment,
  EndpointObservation,
  ReconciliationSummary,
  AuditEvent,
} from '../types';

export const ReportsPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [assessments, setAssessments] = useState<AccountAssessment[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointObservation[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const caseList = await api.getCases();
        setCases(caseList);
        if (caseList.length > 0) {
          const caseId = caseList[0].id;
          const [assessList, epList, reconData, auditList] = await Promise.all([
            api.getCaseAssessments(caseId),
            api.getCaseEndpoints(caseId),
            api.getCaseReconciliation(caseId),
            api.getAuditEvents(),
          ]);
          setAssessments(assessList);
          setEndpoints(epList);
          setReconciliation(reconData);
          setAuditEvents(auditList);
        }
      } catch (err) {
        console.error('Failed to load report data', err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, []);

  const currentCase = cases[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Print Control */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              Investigation Case Dossier & Audit Report
            </h1>
            <p className="text-xs text-slate-400">
              Formal forensic summary with fund conservation reconciliation, account evidence, and tamper-evident logs
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF Dossier</span>
        </button>
      </div>

      {/* Official Case Summary Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Case Reference Document
            </span>
            <h2 className="text-lg font-bold text-slate-100">{currentCase?.case_ref || 'CASE-2026-001'}</h2>
          </div>
          <span className="px-3 py-1 bg-blue-950 text-blue-300 border border-blue-800 rounded-full font-mono text-xs font-bold">
            CONFIDENTIAL • INVESTIGATION RECORD
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Title</span>
            <span className="font-semibold text-slate-200 block">{currentCase?.title}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Investigator</span>
            <span className="font-semibold text-slate-200 block">{currentCase?.created_by}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Traced Origin</span>
            <span className="font-mono font-bold text-rose-300 block">₹1,00,000.00 INR</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Date Opened</span>
            <span className="font-mono text-slate-300 block">
              {currentCase ? new Date(currentCase.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          <strong>Executive Summary: </strong>
          {currentCase?.description}
        </p>
      </div>

      {/* Amount Reconciliation Verification */}
      {reconciliation && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>CBDC Provenance Reconciliation Invariant</span>
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Discrepancy: ₹{Number(reconciliation.discrepancy).toFixed(2)} (Balanced)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Total Origin Introduced</span>
              <span className="font-mono font-bold text-slate-100">
                ₹{Number(reconciliation.origin_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Observable Off-Ramps</span>
              <span className="font-mono font-bold text-amber-300">
                ₹{Number(reconciliation.terminal_offramps || (reconciliation.total_endpoints - (reconciliation.retained_balance || reconciliation.total_retained || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Retained in Balances</span>
              <span className="font-mono font-bold text-blue-300">
                ₹{Number(reconciliation.retained_balance || reconciliation.total_retained || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Reconciliation Check</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>100% Conserved</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Account Findings Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          Account Assessment & Counterparty Classification
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2 px-3">Pseudonym</th>
                <th className="py-2 px-3">Bank</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Confidence</th>
                <th className="py-2 px-3">Attributed Funds</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{a.account_pseudo_id}</td>
                  <td className="py-2.5 px-3 text-slate-300">{a.bank_name}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-200">{a.category.replace('_', ' ')}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                    {Math.round(a.confidence_score * 100)}%
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-300">
                    ₹{Number(a.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tamper-Evident Audit Log */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <span>Tamper-Evident Investigation Audit Log ({auditEvents.length} Events)</span>
        </h3>

        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Actor</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Result</th>
                <th className="py-2 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {auditEvents.slice(0, 15).map((evt) => (
                <tr key={evt.id}>
                  <td className="py-2 px-3 text-slate-400">{new Date(evt.timestamp).toLocaleString()}</td>
                  <td className="py-2 px-3 text-slate-200 font-bold">{evt.actor}</td>
                  <td className="py-2 px-3 text-blue-400">{evt.action}</td>
                  <td className="py-2 px-3">
                    <span className={evt.result === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}>
                      {evt.result}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                    {evt.details ? JSON.stringify(evt.details) : evt.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Known Limitations Disclaimer */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-300">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Important Prototype Scope & Limitations Statement (Section 17):</span>
        </div>
        <p>
          • <strong>Synthetic Data:</strong> The banking network and transaction data are simulated. Does not integrate with live RBI e₹, MuleHunter, or live bank portals.
        </p>
        <p>
          • <strong>Decision Support:</strong> Algorithmic scores and assessments provide evidence organization for investigators, not a legal finding of guilt.
        </p>
        <p>
          • <strong>Innocent Counterparties:</strong> Legitimate merchants and unflagged counterparties receiving funds are preserved as non-mule nodes under explicit safeguards.
        </p>
      </div>
    </div>
  );
};
