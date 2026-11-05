import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { EndpointObservation } from '../types';
import { FlowBar, PageHeader, Pill, endpointLabel, inr } from '../components/ui';

export const EndpointsPage: React.FC = () => {
  const [endpoints, setEndpoints] = useState<EndpointObservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cases = await api.getCases();
        if (cases.length > 0) {
          const epList = await api.getCaseEndpoints(cases[0].id);
          setEndpoints(epList);
        }
      } catch (err) {
        console.error('Failed to load endpoints', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalAttributed = endpoints.reduce((acc, ep) => acc + Number(ep.attributed_amount), 0);
  const segments = endpoints.map((ep) => ({
    label: endpointLabel(ep.category),
    amount: Number(ep.attributed_amount),
  }));

  const safeguards: Record<string, string> = {
    ATM_WITHDRAWAL: 'Records cash withdrawal. Does not presume collector identity without external surveillance.',
    MERCHANT_PAYMENT: 'Payment settled with registered merchant. Counterparty is not presumed complicit in fraud.',
    EXTERNAL_BANK: 'Reached non-participating institution boundary. Traversal terminates cleanly without speculation.',
    RETAINED_BALANCE: 'Liquidity trapped in intermediary account balance at end of observation window.',
    WALLET_TRANSFER: 'Loaded onto prepaid wallet. Subsequent tracing requires closed-loop wallet issuer disclosure.',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Off-ramp endpoints"
        subtitle="Every branch ends at the last thing we can observe. We record where tracing stopped, the attributed amount, and the evidential reason without guessing beyond network boundaries."
      />

      {/* Summary Flow */}
      <section className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-bold">Observable terminal off-ramps ({inr(totalAttributed, 0)})</h2>
          <Pill tone="black">{endpoints.length} Terminal Sinks</Pill>
        </div>

        <FlowBar segments={segments} />
      </section>

      {/* Detailed Table */}
      <section className="card overflow-hidden">
        <div className="card-pad border-b border-line">
          <h2 className="text-xl font-bold">Terminal evidence & safeguard guarantees</h2>
          <p className="text-sm text-mute mt-1">
            An off-ramp is not defined as one single account. For every branch, the system records the terminal event, attributed sum, and boundary rationale.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="th">Terminal category</th>
                <th className="th text-right">Attributed value</th>
                <th className="th">Observed account</th>
                <th className="th">Terminal transaction</th>
                <th className="th">Evidential safeguard</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep) => (
                <tr key={ep.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="td font-medium text-black">
                    {endpointLabel(ep.category)}
                  </td>
                  <td className="td text-right font-display font-bold num text-black">
                    {inr(ep.attributed_amount)}
                  </td>
                  <td className="td">
                    <span className="id text-black">{ep.account_pseudo_id}</span>
                  </td>
                  <td className="td text-mute font-mono text-xs">
                    {ep.last_transaction_ref || 'Terminal balance'}
                  </td>
                  <td className="td text-sm text-mute leading-snug max-w-xs">
                    {safeguards[ep.category] || ep.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
