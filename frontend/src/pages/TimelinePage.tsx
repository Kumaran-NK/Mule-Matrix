import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { Transaction } from '../types';
import { PageHeader, Pill, inr } from '../components/ui';

export const TimelinePage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.getTransactions();
        setTransactions([...list].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      } catch (err) {
        console.error('Failed to load transactions', err);
      }
    })();
  }, []);

  const t0 = transactions.length ? new Date(transactions[0].timestamp).getTime() : 0;
  const fmtElapsed = (m: number) => (m < 60 ? `+${m} min` : `+${Math.floor(m / 60)} h ${m % 60} min`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        subtitle="Every transfer in time order. Gaps between receiving and sending show how quickly money was moved on."
      />

      <section className="card card-pad">
        <ol className="relative">
          {transactions.map((tx, i) => {
            const minutes = Math.round((new Date(tx.timestamp).getTime() - t0) / 60000);
            const isSeed = tx.transaction_ref === 'TX-SEED-001';
            const cashOut = tx.channel === 'ATM';
            const last = i === transactions.length - 1;
            return (
              <li key={tx.id} className="grid grid-cols-[110px_28px_1fr] gap-x-4">
                <div className="text-right pt-4">
                  <div className="font-semibold num">{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-sm text-mute num">{fmtElapsed(minutes)}</div>
                </div>

                <div className="relative flex justify-center">
                  {!last && <span className="absolute top-8 bottom-0 w-0.5 bg-neutral-200" />}
                  <span className={`relative mt-5 w-4 h-4 rounded-full border-[3px] ${isSeed ? 'bg-black border-black' : cashOut ? 'bg-flame-500 border-black' : 'bg-white border-black'}`} />
                </div>

                <div className="pb-6">
                  <div className="rounded-xl border border-line p-4 hover:border-black transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="id">{tx.transaction_ref}</span>
                        <Pill tone="neutral">{tx.channel}</Pill>
                        {isSeed && <Pill tone="black">Seed transaction</Pill>}
                        {cashOut && <Pill tone="orange">Cash-out</Pill>}
                      </div>
                      <span className="font-display text-xl font-bold num">{inr(tx.amount)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div>
                        <div className="id">{tx.sender_pseudo_id || 'N/A'}</div>
                        <div className="text-sm text-mute">{tx.sender_bank_name}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-mute" />
                      <div>
                        <div className="id">{tx.receiver_pseudo_id || 'N/A'}</div>
                        <div className="text-sm text-mute">{tx.receiver_bank_name}</div>
                      </div>
                    </div>

                    {tx.description && <p className="text-mute mt-3">{tx.description}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
};