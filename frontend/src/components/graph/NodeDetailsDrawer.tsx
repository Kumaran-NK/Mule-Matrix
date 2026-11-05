import React from 'react';
import { X, KeyRound } from 'lucide-react';
import { GraphNodeData, GraphEdgeData } from '../../types';
import { Pill, categoryLabel, categoryTone, endpointLabel, inr } from '../ui';

interface NodeDetailsDrawerProps {
  node: GraphNodeData | null;
  edge: GraphEdgeData | null;
  onClose: () => void;
  onRequestIdentity: (pseudoId: string) => void;
}

const Row: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-line last:border-0">
    <span className="text-mute">{k}</span>
    <span className="font-medium text-right">{children}</span>
  </div>
);

export const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({ node, edge, onClose, onRequestIdentity }) => {
  if (!node && !edge) return null;

  return (
    <aside className="absolute top-4 right-4 z-20 w-[380px] max-h-[calc(100%-2rem)] overflow-y-auto bg-white border border-black rounded-2xl p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-xl font-bold">{node ? 'Account' : 'Transaction'}</h3>
        <button onClick={onClose} aria-label="Close details" className="p-1.5 -mr-1.5 rounded-lg hover:bg-neutral-100">
          <X className="w-5 h-5" />
        </button>
      </div>

      {node && (
        <div>
          <div className="id text-lg">{node.pseudo_id}</div>
          <div className="mt-2 mb-4">
            <Pill tone={node.is_seed ? 'black' : categoryTone(node.assessment_category)}>
              {node.is_seed ? 'Seed account' : categoryLabel(node.assessment_category)}
            </Pill>
          </div>

          <div className="rounded-xl bg-black text-white p-4 mb-4">
            <div className="text-sm text-neutral-400">Attributed suspicious value</div>
            <div className="font-display text-[30px] font-bold text-flame-500 num leading-tight">
              {inr(node.attributed_amount)}
            </div>
            <p className="text-sm text-neutral-400 mt-1">
              An estimate under the selected accounting policy, not a count of physical notes.
            </p>
          </div>

          <Row k="Institution">
            {node.bank_name} <span className="text-mute">({node.bank_code})</span>
          </Row>
          <Row k="Account type">{node.account_type}</Row>
          <Row k="Current balance">
            <span className="num">{inr(node.current_balance)}</span>
          </Row>
          <Row k="Confidence">
            <span className="num">{Math.round(node.confidence_score * 100)}%</span>
          </Row>

          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden mt-1 mb-4">
            <div className="h-full bg-flame-500" style={{ width: `${Math.round(node.confidence_score * 100)}%` }} />
          </div>

          {node.is_endpoint && (
            <div className="rounded-lg border border-dashed border-black p-3 mb-4 text-[15px]">
              Tracing stops here: <strong>{endpointLabel(node.endpoint_type || '')}</strong>
            </div>
          )}

          <button onClick={() => onRequestIdentity(node.pseudo_id)} className="btn-primary w-full">
            <KeyRound className="w-4 h-4" />
            Request identity disclosure
          </button>
          <p className="text-sm text-mute text-center mt-2">Needs a case justification and reviewer approval.</p>
        </div>
      )}

      {edge && (
        <div>
          <div className="id text-lg mb-3">{edge.transaction_ref}</div>
          <Row k="Amount">
            <span className="num">{inr(edge.amount)}</span>
          </Row>
          <Row k="Attributed suspicious">
            <span className="num text-flame-700 font-semibold">{inr(edge.attributed_amount)}</span>
          </Row>
          <Row k="Channel">{edge.channel}</Row>
          <Row k="Time">{new Date(edge.timestamp).toLocaleString()}</Row>
          <Row k="Status">{edge.status}</Row>
          {edge.is_reversal && (
            <div className="mt-3 rounded-lg bg-flame-50 border border-flame-200 p-3 text-flame-700">
              This is a compensating reversal. The original transaction stays in the lineage.
            </div>
          )}
        </div>
      )}
    </aside>
  );
};