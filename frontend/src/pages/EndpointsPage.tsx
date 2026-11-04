import React, { useEffect, useState } from 'react';

import { api } from '../api/client';

import { EndpointObservation } from '../types';

import { Head, th, td } from '../components/ui/Page';

import { Conservation, CAT, inr } from '../components/ui/Conservation';

export const EndpointsPage: React.FC = () => {

  const [eps, setEps] = useState<EndpointObservation[]>([]);

  useEffect(() => {

    (async () => { try { const c = await api.getCases(); if (c.length) setEps(await api.getCaseEndpoints(c[0].id)); } catch (e) { console.error(e); } })();

  }, []);

  return (

    <div>

      <Head title="Where the money exited" sub="Each branch ends at the last thing we can observe. We record where tracing stopped and why, and never guess beyond that." />

      <div className="mb-8"><Conservation details={eps.map((e) => ({ category: e.category, amount: e.attributed_amount }))} /></div>

      <table className="w-full text-[13px]">

        <thead><tr><th className={th}>Outcome</th><th className={th}>Amount</th><th className={th}>Account</th><th className={th}>Last transfer</th><th className={th}>Why tracing stopped</th></tr></thead>

        <tbody>{eps.map((e) => (

          <tr key={e.id} className="align-top">

            <td className={`${td} font-medium`}>{(CAT[e.category] || CAT.default).label}</td>

            <td className={`${td} font-serif`}>{inr(e.attributed_amount)}</td>

            <td className={td}>{e.account_pseudo_id}</td>

            <td className={`${td} text-slate-400`}>{e.last_transaction_ref || 'Balance at end'}</td>

            <td className={`${td} text-slate-400`}>{e.reason}</td>

          </tr>))}</tbody>

      </table>

    </div>

  );

};
