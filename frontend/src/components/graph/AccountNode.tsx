import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  ShieldAlert,
  ShieldCheck,
  Store,
  HelpCircle,
  Flag,
  ArrowDownToLine,
  Landmark,
  Wallet,
} from 'lucide-react';
import { GraphNodeData } from '../../types';

interface AccountNodeProps {
  data: GraphNodeData;
  selected?: boolean;
}

export const AccountNode = memo(({ data, selected }: AccountNodeProps) => {
  const isSeed = data.is_seed;
  const isEndpoint = data.is_endpoint;
  const category = data.assessment_category;

  // Category styles
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
  let borderColor = 'border-slate-700 bg-slate-900/95';
  let Icon = HelpCircle;
  let iconColor = 'text-slate-400';

  if (isSeed) {
    badgeColor = 'bg-indigo-950 text-indigo-300 border-indigo-700';
    borderColor = 'border-indigo-500 bg-indigo-950/80 shadow-indigo-500/20';
    Icon = Flag;
    iconColor = 'text-indigo-400';
  } else if (category === 'LIKELY_MULE') {
    badgeColor = 'bg-rose-950 text-rose-300 border-rose-700';
    borderColor = 'border-rose-500 bg-rose-950/80 shadow-rose-500/20';
    Icon = ShieldAlert;
    iconColor = 'text-rose-400';
  } else if (category === 'MERCHANT') {
    badgeColor = 'bg-amber-950 text-amber-300 border-amber-700';
    borderColor = 'border-amber-500 bg-amber-950/80 shadow-amber-500/20';
    Icon = Store;
    iconColor = 'text-amber-400';
  } else if (category === 'LEGITIMATE_COUNTERPARTY') {
    badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-700';
    borderColor = 'border-emerald-500 bg-emerald-950/80 shadow-emerald-500/20';
    Icon = ShieldCheck;
    iconColor = 'text-emerald-400';
  }

  // Endpoint icon override
  let EndpointIcon = null;
  if (isEndpoint) {
    if (data.endpoint_type === 'ATM_WITHDRAWAL') EndpointIcon = ArrowDownToLine;
    else if (data.endpoint_type === 'EXTERNAL_BANK') EndpointIcon = Landmark;
    else if (data.endpoint_type === 'WALLET_TRANSFER') EndpointIcon = Wallet;
    else if (data.endpoint_type === 'MERCHANT_PAYMENT') EndpointIcon = Store;
  }

  return (
    <div
      className={`min-w-[210px] rounded-xl border-2 p-3 text-xs shadow-xl transition-all duration-150 backdrop-blur-md ${borderColor} ${
        selected ? 'ring-4 ring-blue-500/50 scale-105' : 'hover:scale-[1.02]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-blue-500 !w-2.5 !h-2.5" />

      {/* Header: Bank & Category Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="truncate max-w-[110px]">{data.bank_code}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${badgeColor}`}>
          {isSeed ? 'SEED' : category.replace('_', ' ')}
        </span>
      </div>

      {/* Pseudonym */}
      <div className="font-mono text-xs font-bold text-slate-100 tracking-wider truncate mb-1.5">
        {data.pseudo_id}
      </div>

      {/* Metrics: Attributed suspicious funds */}
      <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800 space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400">Attributed:</span>
          <span className="font-mono font-semibold text-rose-300">
            ₹{Number(data.attributed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {category === 'LIKELY_MULE' && (
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400">Suspicion:</span>
            <span className="font-semibold text-rose-400">
              {Math.round(data.confidence_score * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Endpoint pill */}
      {isEndpoint && (
        <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-950/50 border border-amber-800/60 rounded px-2 py-0.5">
          {EndpointIcon && <EndpointIcon className="w-3 h-3 text-amber-400" />}
          <span className="truncate">{data.endpoint_type?.replace('_', ' ')}</span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-2.5 !h-2.5" />
    </div>
  );
});
