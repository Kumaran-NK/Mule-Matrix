import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ArrowDownToLine, Landmark, Wallet, Store } from 'lucide-react';
import { GraphNodeData } from '../../types';
import { categoryLabel, endpointLabel, inr } from '../ui';

interface AccountNodeProps {
  data: GraphNodeData;
  selected?: boolean;
}

export const AccountNode = memo(({ data, selected }: AccountNodeProps) => {
  const cat = data.assessment_category;
  const isSeed = data.is_seed;

  let shell = 'bg-white border-neutral-300 text-black';
  let inner = 'bg-neutral-100';
  let sub = 'text-mute';
  let tag = isSeed ? 'Seed account' : categoryLabel(cat);

  if (isSeed) {
    shell = 'bg-black border-black text-white';
    inner = 'bg-white/10';
    sub = 'text-neutral-400';
  } else if (cat === 'LIKELY_MULE') {
    shell = 'bg-flame-500 border-black text-black';
    inner = 'bg-black/10';
    sub = 'text-black/70';
  } else if (cat === 'MERCHANT') {
    shell = 'bg-white border-black border-dashed text-black';
  }

  const EndpointIcon =
    data.endpoint_type === 'ATM_WITHDRAWAL'
      ? ArrowDownToLine
      : data.endpoint_type === 'EXTERNAL_BANK'
      ? Landmark
      : data.endpoint_type === 'WALLET_TRANSFER'
      ? Wallet
      : data.endpoint_type === 'MERCHANT_PAYMENT'
      ? Store
      : null;

  return (
    <div
      className={`w-[236px] rounded-xl border-2 p-3.5 transition-transform ${shell} ${
        selected ? 'ring-4 ring-flame-500/40 scale-[1.03]' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} />

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{data.bank_code}</span>
        <span className={`text-[13px] font-medium ${sub}`}>{tag}</span>
      </div>

      <div className="id mt-1.5 truncate">{data.pseudo_id}</div>

      <div className={`mt-3 rounded-lg px-3 py-2 ${inner}`}>
        <div className={`text-[13px] ${sub}`}>Attributed</div>
        <div className="font-display text-[20px] font-bold leading-tight num">{inr(data.attributed_amount)}</div>
        {cat === 'LIKELY_MULE' && (
          <div className="text-[13px] font-medium mt-0.5">
            {Math.round(data.confidence_score * 100)}% suspicion
          </div>
        )}
      </div>

      {data.is_endpoint && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[13px] font-medium">
          {EndpointIcon && <EndpointIcon className="w-4 h-4" />}
          <span>{endpointLabel(data.endpoint_type || '')}</span>
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
});