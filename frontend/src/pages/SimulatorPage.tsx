import React, { useEffect, useState } from 'react';

import { api } from '../api/client';

import { Bank, Account } from '../types';

import { Head, th, td, btn, ghost, field } from '../components/ui/Page';

import { inr } from '../components/ui/Conservation';

export const SimulatorPage: React.FC = () => {

  const [banks, setBanks] = useState<Bank[]>([]);

  const [accs, setAccs] = useState<Account[]>([]);

  const [from, setFrom] = useState('');

  const [to, setTo] = useState('');

  const [amount, setAmount] = useState(5000);

  const [channel, setChannel] = useState('UPI');

  const [note, setNote] = useState('Custom simulated transfer');

  const [busy, setBusy] = useState(false);

  const [ref, setRef] = useState('');

  async function load() {

    try {

      const [b, a] = await Promise.all([api.getBanks(), api.getAccounts()]);

      setBanks(b); setAccs(a);

      if (a.length > 1 && !from) { setFrom(a[0].pseudo_id); setTo(a[1].pseudo_id); }

    } catch (e) { console.error(e); }

  }

  useEffect(() => { load(); }, []);

  async function send(e: React.FormEvent) {

    e.preventDefault();

    setBusy(true); setRef('');

    try { const r = await api.executeTransfer({ sender_pseudo_id: from, receiver_pseudo_id: to, amount, channel, description: note }); setRef(r.transaction_ref); await load(); }

    catch (err: any) { alert(`Transfer failed. ${err.message}`); } finally { setBusy(false); }

  }

  async function reseed() {

    if (!confirm('Reset to the standard demo data?')) return;

    try { await api.resetSimulator(); await load(); } catch (e: any) { alert(`Reset failed. ${e.message}`); }

  }

  const opts = accs.map((a) => <option key={a.id} value={a.pseudo_id}>{a.pseudo_id} ({a.bank_code}) · {inr(a.current_balance)}</option>);

  return (

    <div>

      <Head title="Bank simulator" sub="Move money between the simulated banks to test edge cases. The trace picks up new transfers when you run it again." right={<button className={ghost} onClick={reseed}>Reset demo data</button>} />

      <div className="grid lg:grid-cols-3 gap-10">

        <form onSubmit={send} className="space-y-3">

          <h2 className="text-lg">New transfer</h2>

          <label className="block text-xs text-slate-400">From<select className={`${field} mt-1`} value={from} onChange={(e) => setFrom(e.target.value)}>{opts}</select></label>

          <label className="block text-xs text-slate-400">To<select className={`${field} mt-1`} value={to} onChange={(e) => setTo(e.target.value)}>{opts}</select></label>

          <div className="grid grid-cols-2 gap-3">

            <label className="block text-xs text-slate-400">Amount (₹)<input type="number" min={1} step="0.01" className={`${field} mt-1`} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required /></label>

            <label className="block text-xs text-slate-400">Channel<select className={`${field} mt-1`} value={channel} onChange={(e) => setChannel(e.target.value)}>{['UPI', 'IMPS', 'NEFT', 'ATM', 'MERCHANT_POS'].map((c) => <option key={c}>{c}</option>)}</select></label>

          </div>

          <label className="block text-xs text-slate-400">Note<input className={`${field} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} /></label>

          <button className={btn} disabled={busy}>{busy ? 'Sending…' : 'Send transfer'}</button>

          {ref && <p className="text-sm text-emerald-400">Transfer posted. Reference {ref}.</p>}

        </form>

        <div className="lg:col-span-2">

          <h2 className="text-lg mb-2">Institutions</h2>

          <table className="w-full text-[13px]">

            <thead><tr><th className={th}>Bank</th><th className={th}>Status</th><th className={`${th} text-right`}>Accounts</th><th className={`${th} text-right`}>Holdings</th></tr></thead>

            <tbody>{banks.map((b) => (

              <tr key={b.id}><td className={td}>{b.name} <span className="text-slate-400">({b.code})</span></td><td className={td}>{b.is_participating ? 'Participating' : 'External'}</td>

                <td className={`${td} text-right`}>{accs.filter((a) => a.bank_id === b.id).length}</td>

                <td className={`${td} text-right font-serif`}>{inr(accs.filter((a) => a.bank_id === b.id).reduce((s, a) => s + Number(a.current_balance), 0))}</td></tr>))}</tbody>

          </table>

        </div>

      </div>

    </div>

  );

};
