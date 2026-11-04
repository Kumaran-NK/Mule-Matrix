import React from 'react';

export const Head: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({ title, sub, right }) => (

  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">

    <div><h1>{title}</h1>{sub && <p className="text-sm text-slate-400 mt-1 max-w-2xl">{sub}</p>}</div>{right}

  </div>

);

export const Stats: React.FC<{ items: [string, string][] }> = ({ items }) => (

  <dl className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-800 border-y border-slate-800 py-4 mb-6">

    {items.map(([k, v]) => (

      <div key={k} className="px-6 first:pl-0"><dt className="text-xs text-slate-400">{k}</dt><dd className="font-serif text-2xl mt-0.5">{v}</dd></div>

    ))}

  </dl>

);

export const Bar: React.FC<{ pct: number; color?: string }> = ({ pct, color = '#D9402B' }) => (

  <div className="h-1.5 w-20 rounded-full bg-slate-800 overflow-hidden inline-block align-middle"><div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} /></div>

);

export const th = 'py-2 pr-4 text-left text-xs text-slate-400 font-normal';

export const td = 'py-2.5 pr-4 border-b border-slate-800';

export const btn = 'px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50';

export const ghost = 'px-3 py-1.5 text-xs border border-slate-700 rounded-lg hover:bg-slate-900';

export const field = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-100';

export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (

  <section className="mb-8"><h2 className="text-lg mb-2">{title}</h2>{children}</section>

);
