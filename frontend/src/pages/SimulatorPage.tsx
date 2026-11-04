import React, { useEffect, useState } from 'react';
import { Banknote, Send, RefreshCw, Building2, Landmark, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { Bank, Account } from '../types';

export const SimulatorPage: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer form
  const [senderPseudo, setSenderPseudo] = useState('');
  const [receiverPseudo, setReceiverPseudo] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(5000);
  const [channel, setChannel] = useState('UPI');
  const [description, setDescription] = useState('Custom simulated transfer');
  const [submitting, setSubmitting] = useState(false);
  const [transferResult, setTransferResult] = useState<any>(null);

  useEffect(() => {
    loadSimulator();
  }, []);

  async function loadSimulator() {
    try {
      const [banksData, accsData] = await Promise.all([
        api.getBanks(),
        api.getAccounts(),
      ]);
      setBanks(banksData);
      setAccounts(accsData);
      if (accsData.length >= 2) {
        setSenderPseudo(accsData[0].pseudo_id);
        setReceiverPseudo(accsData[1].pseudo_id);
      }
    } catch (err) {
      console.error('Failed to load simulator data', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!senderPseudo || !receiverPseudo || transferAmount <= 0) return;
    setSubmitting(true);
    setTransferResult(null);
    try {
      const res = await api.executeTransfer({
        sender_pseudo_id: senderPseudo,
        receiver_pseudo_id: receiverPseudo,
        amount: transferAmount,
        channel: channel,
        description: description,
      });
      setTransferResult(res);
      await loadSimulator();
    } catch (err: any) {
      alert(`Transfer failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetDemo() {
    if (!confirm('Reset database to clean synthetic demo state?')) return;
    try {
      await api.resetSimulator();
      alert('Database successfully reseeded!');
      await loadSimulator();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">
                Multi-Bank Net-Banking Simulator
              </h1>
              <p className="text-xs text-slate-400">
                Simulate transfers across 6 institutions, inspect liquidity, and test edge-case fund movements
              </p>
            </div>
          </div>

          <button
            onClick={handleResetDemo}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset / Reseed Demo Data</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Transfer Simulator Form */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" />
            <span>Initiate Simulated Transfer</span>
          </h2>

          <form onSubmit={handleTransfer} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Sender Account</label>
              <select
                value={senderPseudo}
                onChange={(e) => setSenderPseudo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.pseudo_id}>
                    {acc.pseudo_id} ({acc.bank_code}) - ₹{Number(acc.current_balance).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Receiver Account</label>
              <select
                value={receiverPseudo}
                onChange={(e) => setReceiverPseudo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.pseudo_id}>
                    {acc.pseudo_id} ({acc.bank_code}) - ₹{Number(acc.current_balance).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="UPI">UPI</option>
                  <option value="IMPS">IMPS</option>
                  <option value="NEFT">NEFT</option>
                  <option value="ATM">ATM Withdrawal</option>
                  <option value="MERCHANT_POS">Merchant POS</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            {transferResult && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 font-medium space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Transfer Successful!</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300">
                  Ref: {transferResult.transaction_ref}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <span>{submitting ? 'Executing Transfer...' : 'Send Funds (POSTED)'}</span>
            </button>
          </form>
        </div>

        {/* Right: Participating Institutions & Balances */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Participating Simulated Institutions ({banks.length})</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {banks.map((b) => {
              const bankAccounts = accounts.filter((a) => a.bank_id === b.id);
              const totalBankLiquidity = bankAccounts.reduce(
                (sum, a) => sum + Number(a.current_balance),
                0
              );
              return (
                <div
                  key={b.id}
                  className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-xs space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{b.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.is_participating
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {b.is_participating ? 'PARTICIPATING' : 'EXTERNAL'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                    <span>Code: <strong className="font-mono text-slate-200">{b.code}</strong></span>
                    <span>Accounts: <strong className="font-mono text-slate-200">{bankAccounts.length}</strong></span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] border-t border-slate-800/80 pt-1.5">
                    <span className="text-slate-400">Total Holdings:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ₹{totalBankLiquidity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
