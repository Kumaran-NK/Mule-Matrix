import React, { useState, useEffect } from 'react';

import { Play, ArrowRight } from 'lucide-react';

import { api } from '../api/client';

import { Case, GraphResponse } from '../types';

import { Lanes } from '../components/graph/Lanes';

import { Statement } from '../components/graph/Statement';

interface Props { onNavigateToIdentity: () => void; onRequestSubmittedNotification?: () => void; }

const sel = 'bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-600';

const legend: [string, string][] = [['#4F3FCB', 'Victim'], ['#D4463E', 'Likely mule'], ['#C27A10', 'Merchant'], ['#1A9A6C', 'Legitimate']];

export const WorkspacePage: React.FC<Props> = ({ onNavigateToIdentity, onRequestSubmittedNotification }) => {

  const [cases, setCases] = useState<Case[]>([]);

  const [caseId, setCaseId] = useState('');

  const [graph, setGraph] = useState<GraphResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [tracing, setTracing] = useState(false);

  const [policy, setPolicy] = useState<'FIFO' | 'PROPORTIONAL'>('FIFO');

  const [hops, setHops] = useState(10);

  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD' | 'COMBINED'>('FORWARD');

  const [modal, setModal] = useState(false);

  const [target, setTarget] = useState('');

  const [why, setWhy] = useState('');

  const [sending, setSending] = useState(false);

  const [done, setDone] = useState('');

  const [pick, setPick] = useState<string | null>(null);

  useEffect(() => {

    (async () => {

      try {

        const list = await api.getCases();

        setCases(list);

        if (list.length) { setCaseId(list[0].id); setGraph(await api.getCaseGraph(list[0].id)); }

      } catch (e) { console.error(e); } finally { setLoading(false); }

    })();

  }, []);

  const current = cases.find((c) => c.id === caseId) || cases[0];

  const s = graph?.summary;

  const picked = graph?.nodes.find((n) => n.id === pick);

  async function run() {

    if (!caseId) return;

    setTracing(true);

    try {

      await api.runTrace(caseId, { allocation_policy: policy, direction, max_hops: hops });

      setGraph(await api.getCaseGraph(caseId));

    } catch (e) { console.error(e); } finally { setTracing(false); }

  }

  function open(id: string) {

    setTarget(id); setDone('');

    setWhy(`Investigation of suspected mule activity under ${current?.case_ref || 'this case'}. Legal identity needed for a freeze notice.`);

    setModal(true);

  }

  async function send() {

    setSending(true);

    try {

      await api.submitIdentityRequest({ case_id: caseId, account_pseudo_id: target, requested_by: 'lead_investigator', justification: why });

      setDone(`Request sent for ${target}. Switch to Reviewer to approve it.`);

      onRequestSubmittedNotification?.();

      setTimeout(() => { setModal(false); setDone(''); }, 2200);

    } catch (e: any) { alert(`Submission failed: ${e.message}`); } finally { setSending(false); }

  }

  return (

    <div className="space-y-4">

      <div className="flex flex-wrap items-end justify-between gap-4">

        <div>

          <p className="text-xs text-slate-500">{current?.case_ref} · {s?.discovered_accounts ?? 0} accounts · {s?.endpoints_count ?? 0} exit points</p>

          <h1 className="text-xl font-semibold">{current?.title || 'Money trail'}</h1>

        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">

          <label className="flex items-center gap-2">Method

            <select className={sel} value={policy} onChange={(e) => setPolicy(e.target.value as any)}>

              <option value="FIFO">First in, first out</option><option value="PROPORTIONAL">Proportional</option>

            </select></label>

          <label className="flex items-center gap-2">Direction

            <select className={sel} value={direction} onChange={(e) => setDirection(e.target.value as any)}>

              <option value="FORWARD">Downstream</option><option value="BACKWARD">Upstream</option><option value="COMBINED">Both</option>

            </select></label>

          <label className="flex items-center gap-2">Max hops

            <input type="number" min={1} max={20} value={hops} onChange={(e) => setHops(Number(e.target.value))} className={`${sel} w-16 text-center`} /></label>

          <button onClick={run} disabled={tracing} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 disabled:opacity-50">

            <Play className="w-3.5 h-3.5 fill-current" />{tracing ? 'Tracing…' : 'Run trace'}

          </button>

        </div>

      </div>

      {loading ? <div className="h-40 text-sm text-slate-400">Loading…</div> : (<>

        <Lanes nodes={graph?.nodes || []} edges={graph?.edges || []} selectedId={pick} onSelect={setPick} />

        {picked ? <Statement node={picked} nodes={graph?.nodes || []} edges={graph?.edges || []} onRequestIdentity={open} />

          : <p className="text-sm text-slate-400">Select an account lane to open its statement.</p>}

      </>)}

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">

        <div className="flex items-center gap-5">

          

          <span>Red band = traced rupees. Its width shows the amount, and it thins as money moves on.</span>

        </div>

        <button onClick={onNavigateToIdentity} className="flex items-center gap-1 text-blue-400 hover:text-blue-300">Identity requests <ArrowRight className="w-3 h-3" /></button>

      </div>

      {modal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">

            <div><h3 className="text-base font-semibold">Request identity disclosure</h3><p className="text-xs text-slate-400 mt-0.5">{target}</p></div>

            <label className="block text-xs text-slate-400">Legal basis and purpose

              <textarea rows={4} value={why} onChange={(e) => setWhy(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-blue-600" /></label>

            {done && <p className="text-sm text-emerald-400">{done}</p>}

            <div className="flex justify-end gap-3">

              <button onClick={() => setModal(false)} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-100">Cancel</button>

              <button onClick={send} disabled={sending || !why} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50">{sending ? 'Sending…' : 'Send request'}</button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};
