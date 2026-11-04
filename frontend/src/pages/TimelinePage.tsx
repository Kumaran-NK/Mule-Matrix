import React, { useEffect, useState } from 'react';

import { api } from '../api/client';

import { Transaction } from '../types';

import { Head, th, td } from '../components/ui/Page';

export const TimelinePage: React.FC = () => {

  const [tx, setTx] = useState<Transaction[]>([]);

  useEffect(() => {

    api.getTransactions().then((l) => setTx([...l].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)))).catch(console.error);

  }, []);

  const t0 = tx.length ? +new Date(tx[0].timestamp) : 0;

  return (

    <div>

      <Head title="Timeline" sub="Every transfer in time order. A short gap between receiving and sending is the signature of a mule account." />

      <table className="w-full text-[13px]">

        <thead><tr><th className={th}>Time</th><th className={th}>Since start</th><th className={th}>Gap</th><th className={th}>Transfer</th><th className={th}>Channel</th><th className={`${th} text-right`}>Amount</th></tr></thead>

        <tbody>{tx.map((t, i) => {

          const ms = +new Date(t.timestamp), gap = i ? Math.round((ms - +new Date(tx[i - 1].timestamp)) / 60000) : 0;

          return (

            <tr key={t.id}>

              <td className={td}>{new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>

              <td className={`${td} text-slate-400`}>+{Math.round((ms - t0) / 60000)} min</td>

              <td className={`${td} text-slate-400`}>{i ? `${gap} min` : ''}</td>

              <td className={td}><div>{t.sender_pseudo_id || 'Unknown'} → {t.receiver_pseudo_id || 'Unknown'}</div><div className="text-xs text-slate-400">{t.transaction_ref}{t.description ? ` · ${t.description}` : ''}</div></td>

              <td className={td}>{t.channel}</td>

              <td className={`${td} text-right font-serif`}>₹{Number(t.amount).toLocaleString('en-IN')}</td>

            </tr>

          );

        })}</tbody>

      </table>

    </div>

  );

};
