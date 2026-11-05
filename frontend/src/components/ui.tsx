import React from 'react';

export const inr = (n: number | string | undefined | null, digits = 2) =>
  '₹' +
  Number(n ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const categoryLabel = (c: string) =>
  ({
    LIKELY_MULE: 'Likely mule',
    MERCHANT: 'Merchant',
    LEGITIMATE_COUNTERPARTY: 'Legitimate counterparty',
    SEED_ACCOUNT: 'Seed account',
    UNRESOLVED: 'Unresolved',
  } as Record<string, string>)[c] || c;

export const endpointLabel = (c: string) =>
  ({
    ATM_WITHDRAWAL: 'ATM withdrawal',
    MERCHANT_PAYMENT: 'Merchant settlement',
    EXTERNAL_BANK: 'External bank',
    RETAINED_BALANCE: 'Retained balance',
    WALLET_TRANSFER: 'Wallet transfer',
    CROSS_BORDER: 'Cross-border',
    NO_FURTHER_RECORD: 'No further record',
  } as Record<string, string>)[c] || c;

type Tone = 'orange' | 'black' | 'outline' | 'neutral' | 'green' | 'red' | 'pending';

const toneClass: Record<Tone, string> = {
  orange: 'bg-flame-500 text-black border-flame-500',
  black: 'bg-black text-white border-black',
  outline: 'bg-white text-black border-black border-dashed',
  neutral: 'bg-neutral-100 text-neutral-700 border-line',
  green: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  red: 'bg-red-50 text-red-800 border-red-300',
  pending: 'bg-flame-50 text-flame-700 border-flame-200',
};

export const categoryTone = (c: string): Tone =>
  c === 'LIKELY_MULE' ? 'orange' : c === 'SEED_ACCOUNT' ? 'black' : c === 'MERCHANT' ? 'outline' : 'neutral';

export const Pill: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'neutral', children }) => (
  <span className={`pill ${toneClass[tone]}`}>{children}</span>
);

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
    <div className="max-w-3xl">
      <h1 className="text-[32px] leading-[1.1] font-bold">{title}</h1>
      {subtitle && <p className="text-[16px] text-mute mt-2">{subtitle}</p>}
    </div>
    {actions}
  </div>
);

export const StatStrip: React.FC<{
  items: { label: string; value: React.ReactNode; note?: string }[];
}> = ({ items }) => (
  <div className="card grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line">
    {items.map((it) => (
      <div key={it.label} className="p-6">
        <div className="text-sm text-mute">{it.label}</div>
        <div className="font-display text-[30px] font-bold leading-tight mt-1 num">{it.value}</div>
        {it.note && <div className="text-sm text-mute mt-1">{it.note}</div>}
      </div>
    ))}
  </div>
);

export const FlowBar: React.FC<{
  segments: { label: string; amount: number }[];
  onDark?: boolean;
}> = ({ segments, onDark = false }) => {
  const total = segments.reduce((s, x) => s + x.amount, 0) || 1;
  const shades = onDark
    ? ['#FF6A13', '#FFA05C', '#FFD2B0', '#FFFFFF', '#8A8A8A']
    : ['#FF6A13', '#FFA05C', '#FFD2B0', '#000000', '#8A8A8A'];
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-md gap-[3px]">
        {segments.map((s, i) => (
          <div
            key={s.label + i}
            style={{ width: `${(s.amount / total) * 100}%`, background: shades[i % shades.length] }}
            title={`${s.label}: ${inr(s.amount)}`}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
        {segments.map((s, i) => (
          <div key={s.label + i} className="flex items-start gap-2.5">
            <span className="mt-1.5 w-3 h-3 rounded-sm shrink-0" style={{ background: shades[i % shades.length] }} />
            <div>
              <div className={`text-sm ${onDark ? 'text-neutral-400' : 'text-mute'}`}>{s.label}</div>
              <div className="font-semibold num">{inr(s.amount, 0)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Modal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-7 shadow-2xl">{children}</div>
  </div>
);