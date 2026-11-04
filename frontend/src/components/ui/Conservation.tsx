import React from 'react';

export const inr = (n: number | string) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const CAT: Record<string, { label: string }> = {
  ATM_WITHDRAWAL: { label: 'ATM withdrawal' },
  MERCHANT_PAYMENT: { label: 'Merchant POS' },
  EXTERNAL_BANK: { label: 'External bank' },
  WALLET_TRANSFER: { label: 'Prepaid wallet' },
  RETAINED_BALANCE: { label: 'Retained in account' },
  default: { label: 'Terminal off-ramp' },
};

interface Detail {
  category: string;
  amount: number | string;
}

export const Conservation: React.FC<{ details: Detail[] }> = ({ details }) => {
  const total = details.reduce((s, d) => s + Number(d.amount || 0), 0);
  if (!details.length || total === 0) return <p className="text-sm text-slate-400">No endpoint data yet.</p>;

  const grouped: Record<string, number> = {};
  details.forEach((d) => {
    const key = d.category || 'default';
    grouped[key] = (grouped[key] || 0) + Number(d.amount || 0);
  });

  const palette: Record<string, string> = {
    ATM_WITHDRAWAL: '#D9402B',
    MERCHANT_PAYMENT: '#C27A10',
    EXTERNAL_BANK: '#4F49AA',
    WALLET_TRANSFER: '#2F7A52',
    RETAINED_BALANCE: '#5C6B63',
  };

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-800 mb-4">
        {entries.map(([cat, amt]) => (
          <div
            key={cat}
            style={{ width: `${(amt / total) * 100}%`, background: palette[cat] || '#5C6B63' }}
            title={`${(CAT[cat] || CAT.default).label}: ${inr(amt)}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[13px]">
        {entries.map(([cat, amt]) => (
          <div key={cat} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: palette[cat] || '#5C6B63' }} />
            <span className="text-slate-300">{(CAT[cat] || CAT.default).label}</span>
            <span className="font-serif text-slate-100">{inr(amt)}</span>
            <span className="text-slate-400">{Math.round((amt / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
