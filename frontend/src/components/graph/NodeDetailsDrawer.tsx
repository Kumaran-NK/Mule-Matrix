import React from 'react';
import { X, ShieldAlert, KeyRound, ArrowRight, Clock, Building2, Wallet } from 'lucide-react';
import { GraphNodeData, GraphEdgeData } from '../../types';

interface NodeDetailsDrawerProps {
  node: GraphNodeData | null;
  edge: GraphEdgeData | null;
  onClose: () => void;
  onRequestIdentity: (pseudoId: string) => void;
}

export const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({
  node,
  edge,
  onClose,
  onRequestIdentity,
}) => {
  if (!node && !edge) return null;

  return (
    <div className="absolute top-4 right-4 z-20 w-96 max-h-[calc(100%-2rem)] overflow-y-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl transition-all">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          {node ? 'Account Node Details' : 'Transaction Edge Details'}
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {node && (
        <div className="space-y-4 text-xs">
          {/* Identity & Bank */}
          <div>
            <span className="text-slate-400 block mb-1">Pseudonymous Identifier</span>
            <div className="font-mono text-base font-bold text-blue-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
              <span>{node.pseudo_id}</span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                {node.account_type}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px] mb-1">Institution</span>
              <span className="font-semibold text-slate-200 block truncate">{node.bank_name}</span>
              <span className="text-[10px] text-slate-500 font-mono">{node.bank_code}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[11px] mb-1">Current Balance</span>
              <span className="font-mono font-semibold text-slate-200 block">
                ₹{Number(node.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Attributed Suspicious Value */}
          <div className="bg-rose-950/30 border border-rose-900/50 p-3.5 rounded-xl">
            <span className="text-rose-400 block text-[11px] font-semibold mb-1">
              CBDC-Inspired Attributed Value
            </span>
            <div className="font-mono text-xl font-bold text-rose-300">
              ₹{Number(node.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Estimated suspicious origin exposure calculated under declared accounting policy.
            </p>
          </div>

          {/* Assessment & Scores */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Assessment Category:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  node.assessment_category === 'LIKELY_MULE'
                    ? 'bg-rose-900/70 text-rose-200 border border-rose-700'
                    : node.assessment_category === 'MERCHANT'
                    ? 'bg-amber-900/70 text-amber-200 border border-amber-700'
                    : node.assessment_category === 'LEGITIMATE_COUNTERPARTY'
                    ? 'bg-emerald-900/70 text-emerald-200 border border-emerald-700'
                    : 'bg-indigo-900/70 text-indigo-200 border border-indigo-700'
                }`}
              >
                {node.assessment_category.replace('_', ' ')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Confidence Score:</span>
              <span className="font-mono font-bold text-slate-200">
                {Math.round(node.confidence_score * 100)}%
              </span>
            </div>

            {/* Confidence bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${
                  node.confidence_score >= 0.55
                    ? 'bg-rose-500'
                    : node.confidence_score >= 0.35
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.round(node.confidence_score * 100)}%` }}
              />
            </div>
          </div>

          {/* Endpoint observation if applicable */}
          {node.is_endpoint && (
            <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-xl text-[11px]">
              <span className="font-semibold text-amber-300 block mb-0.5">Terminal Endpoint</span>
              <span className="text-slate-300">
                Category: <strong>{node.endpoint_type?.replace('_', ' ')}</strong>
              </span>
            </div>
          )}

          {/* Identity Disclosure Action */}
          <div className="pt-2">
            <button
              onClick={() => onRequestIdentity(node.pseudo_id)}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
            >
              <KeyRound className="w-4 h-4" />
              <span>Request Authorized De-anonymisation</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-1.5">
              Requires case justification and simulated bank officer approval.
            </p>
          </div>
        </div>
      )}

      {edge && (
        <div className="space-y-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Transaction Reference</span>
            <div className="font-mono text-sm font-bold text-blue-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
              {edge.transaction_ref}
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Transaction Amount:</span>
              <span className="font-mono font-bold text-slate-100 text-sm">
                ₹{Number(edge.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center text-rose-300">
              <span className="text-slate-400">Attributed Suspicious Value:</span>
              <span className="font-mono font-bold">
                ₹{Number(edge.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Payment Channel:</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-slate-300">
                {edge.channel}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Timestamp:</span>
              <span className="font-mono text-slate-300">
                {new Date(edge.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Transaction Status:</span>
              <span className="text-emerald-400 font-semibold">{edge.status}</span>
            </div>

            {edge.is_reversal && (
              <div className="bg-amber-950/60 p-2 rounded border border-amber-800 text-amber-300">
                Compensating reversal transaction.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
