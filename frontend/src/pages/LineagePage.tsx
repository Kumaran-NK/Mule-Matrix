import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FundLot, ReconciliationSummary } from '../types';
import { FlowBar, PageHeader, Pill, endpointLabel, inr } from '../components/ui';

export const LineagePage: React.FC = () => {
  const [lots, setLots] = useState<FundLot[]>([]);
  const [recon, setRecon] = useState<ReconciliationSummary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cases = await api.getCases();
        if (cases.length > 0) {
          const [l, r] = await Promise.all([api.getCaseLots(cases[0].id), api.getCaseReconciliation(cases[0].id)]);
          setLots(l);
          setRecon(r);
        }
      } catch (err) {
        console.error('Failed to load lineage data', err);
      }
    })();
  }, []);

  const root = lots.find((l) => !l.parent_lot_id);
  const children = lots.filter((l) => l.parent_lot_id);
  const balanced = recon ? Number(recon.discrepancy) === 0 : false;
  const segments = (recon?.details || []).map((d) => ({ label: endpointLabel(d.category), amount: Number(d.amount) }));
  const retained = recon?.retained_balance ?? recon?.total_retained ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fund lineage"
        subtitle="The suspicious portion of each transfer is tracked as lots. When an account forwards money, the parent lot shrinks and child lots are created. Nothing is overwritten."
      />

      {recon && (
        <section className="card card-pad">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-xl font-bold">Where the {inr(recon.origin_amount, 0)} ended up</h2>
            <Pill tone={balanced ? 'green' : 'red'}>
              {balanced ? 'Balanced to the rupee' : `Discrepancy ${inr(recon.discrepancy)}`}
            </Pill>
          </div>

          <FlowBar segments={segments} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-line">
            {[
              ['Origin introduced', inr(recon.origin_amount)],
              ['Terminal off-ramps', inr(recon.terminal_offramps ?? 0)],
              ['Retained in accounts', inr(retained)],
              ['Compensating reversals', inr(recon.total_reversed)],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-mute">{k}</div>
                <div className="font-display text-2xl font-bold num">{v}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Endpoint</th>
                  <th className="th">Attributed</th>
                  <th className="th">Account</th>
                  <th className="th">Why tracing stopped</th>
                </tr>
              </thead>
              <tbody>
                {recon.details.map((d, i) => (
                  <tr key={i}>
                    <td className="td font-semibold">{endpointLabel(d.category)}</td>
                    <td className="td font-semibold num">{inr(d.amount)}</td>
                    <td className="td id text-mute">{d.account_id}</td>
                    <td className="td text-mute">{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card card-pad">
        <h2 className="text-xl font-bold mb-5">Lot tree</h2>

        {root && (
          <div className="rounded-xl bg-black text-white p-5 flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="text-neutral-400">Root lot</div>
              <div className="id text-lg text-flame-500">{root.lot_ref}</div>
            </div>
            <div>
              <div className="text-neutral-400">Held by</div>
              <div className="id">{root.current_account_pseudo_id}</div>
            </div>
            <div>
              <div className="text-neutral-400">Attributed</div>
              <div className="font-display text-2xl font-bold num">{inr(root.attributed_amount)}</div>
            </div>
            <Pill tone="orange">{root.status}</Pill>
          </div>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Child lot</th>
                <th className="th">Hop</th>
                <th className="th">Held by</th>
                <th className="th">Attributed</th>
                <th className="th">Remaining</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {children.map((lot) => (
                <tr key={lot.id}>
                  <td className="td id" style={{ paddingLeft: `${16 + Math.min(lot.hop_count, 5) * 14}px` }}>
                    <span className="text-mute mr-2">└</span>
                    {lot.lot_ref}
                  </td>
                  <td className="td num">{lot.hop_count}</td>
                  <td className="td id">{lot.current_account_pseudo_id}</td>
                  <td className="td font-semibold num">{inr(lot.attributed_amount)}</td>
                  <td className="td num text-mute">{inr(lot.remaining_amount)}</td>
                  <td className="td"><Pill tone="neutral">{lot.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};