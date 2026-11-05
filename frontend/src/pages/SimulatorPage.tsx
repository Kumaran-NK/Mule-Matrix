import React, { useEffect, useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { api } from '../api/client';
import { Bank, Account } from '../types';
import { PageHeader, Pill, inr } from '../components/ui';

export const SimulatorPage: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [senderPseudo, setSenderPseudo] = useState('');
  const [receiverPseudo, setReceiverPseudo] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(5000);
  const [channel, setChannel] = useState('UPI');
  const [description, setDescription] = useState('Custom simulated transfer');
  const [submitting, setSubmitting] = useState(false);
  const [transferResult, setTransferResult] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [b, a] = await Promise.all([api.getBanks(), api.getAccounts()]);
      setBanks(b);
      setAccounts(a);
      if (a.length >= 2 && !senderPseudo) {
        setSenderPseudo(a[0].pseudo_id);
        setReceiverPseudo(a[1].pseudo_id);
      }
    } catch (err) {
      console.error('Failed to load simulator data', err);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!senderPseudo || !receiverPseudo || transferAmount <= 0) return;
    setSubmitting(true);
    setTransferResult(null);
    try {
      setTransferResult(
        await api.executeTransfer({
          sender_pseudo_id: senderPseudo,
          receiver_pseudo_id: receiverPseudo,
          amount: transferAmount,
          channel,
          description,
        })
      );
      await load();
    } catch (err: any) {
      alert(`Transfer failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reset the database to the clean synthetic demo state?')) return;
    try {
      await api.resetSimulator();
      alert('Demo data reseeded.');
      await load();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    }
  }

  const accountOptions = accounts.map((acc) => (
    <option key={acc.id} value={acc.pseudo_id}>
      {acc.pseudo_id} ({acc.bank_code}) {inr(acc.current_balance, 0)}
    </option>
  ));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank simulator"
        subtitle="Move money between the six simulated institutions to test edge cases, then trace it."
        actions={
          <button onClick={handleReset} className="btn-ghost">
            <RefreshCw className="w-4 h-4" />
            Reseed demo data
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <section className="card card-pad">
          <h2 className="text-xl font-bold mb-4">Send a transfer</h2>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="label">From</label>
              <select value={senderPseudo} onChange={(e) => setSenderPseudo(e.target.value)} className="field">{accountOptions}</select>
            </div>
            <div>
              <label className="label">To</label>
              <select value={receiverPseudo} onChange={(e) => setReceiverPseudo(e.target.value)} className="field">{accountOptions}</select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" min="1" step="0.01" value={transferAmount} onChange={(e) => setTransferAmount(Number(e.target.value))} className="field num" required />
              </div>
              <div>
                <label className="label">Channel</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className="field">
                  <option value="UPI">UPI</option>
                  <option value="IMPS">IMPS</option>
                  <option value="NEFT">NEFT</option>
                  <option value="ATM">ATM withdrawal</option>
                  <option value="MERCHANT_POS">Merchant POS</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="field" />
            </div>

            {transferResult && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-3.5 text-emerald-900">
                <div className="flex items-center gap-2 font-semibold"><Check className="w-4 h-4" strokeWidth={3} />Transfer posted</div>
                <div className="id mt-0.5">{transferResult.transaction_ref}</div>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Sending…' : 'Send transfer'}
            </button>
          </form>
        </section>

        <section className="lg:col-span-2 card card-pad">
          <h2 className="text-xl font-bold mb-4">Institutions ({banks.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Bank</th>
                  <th className="th">Code</th>
                  <th className="th">Accounts</th>
                  <th className="th">Holdings</th>
                  <th className="th">Network</th>
                </tr>
              </thead>
              <tbody>
                {banks.map((b) => {
                  const own = accounts.filter((a) => a.bank_id === b.id);
                  const total = own.reduce((s, a) => s + Number(a.current_balance), 0);
                  return (
                    <tr key={b.id}>
                      <td className="td font-semibold">{b.name}</td>
                      <td className="td id">{b.code}</td>
                      <td className="td num">{own.length}</td>
                      <td className="td font-semibold num">{inr(total)}</td>
                      <td className="td"><Pill tone={b.is_participating ? 'black' : 'outline'}>{b.is_participating ? 'Participating' : 'External'}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};