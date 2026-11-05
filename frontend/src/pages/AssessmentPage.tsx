import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AccountAssessment } from '../types';
import { Modal, PageHeader, Pill, categoryLabel, categoryTone, inr } from '../components/ui';

const DIMENSIONS: { key: keyof AccountAssessment; label: string; weight: string }[] = [
  { key: 'behavioral_score', label: 'Behaviour', weight: '30%' },
  { key: 'temporal_score', label: 'Timing', weight: '20%' },
  { key: 'graph_score', label: 'Network position', weight: '20%' },
  { key: 'fund_score', label: 'Fund exposure', weight: '15%' },
  { key: 'relationship_score', label: 'Relationships', weight: '15%' },
];

const MiniBars: React.FC<{ a: AccountAssessment }> = ({ a }) => (
  <div className="flex items-end gap-1 h-8" aria-label="Five evidence scores">
    {DIMENSIONS.map((d) => {
      const v = Number(a[d.key] as number) || 0;
      return (
        <div key={d.label} className="w-2.5 bg-neutral-100 rounded-sm h-full flex items-end" title={`${d.label}: ${Math.round(v * 100)}%`}>
          <div className="w-full bg-flame-500 rounded-sm" style={{ height: `${Math.max(8, v * 100)}%` }} />
        </div>
      );
    })}
  </div>
);

export const AssessmentPage: React.FC = () => {
  const [assessments, setAssessments] = useState<AccountAssessment[]>([]);
  const [selected, setSelected] = useState<AccountAssessment | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cases = await api.getCases();
        if (cases.length > 0) setAssessments(await api.getCaseAssessments(cases[0].id));
      } catch (err) {
        console.error('Failed to load assessments', err);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account assessments"
        subtitle="Receiving suspicious money does not make an account guilty. Fund exposure and suspicion are scored separately, so every classification can be explained."
      />

      <section className="card card-pad">
        <h2 className="text-xl font-bold mb-4">How the score is built</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {DIMENSIONS.map((d) => (
            <div key={d.label} className="rounded-xl bg-neutral-100 p-4">
              <div className="font-display text-3xl font-bold num">{d.weight}</div>
              <div className="text-mute">{d.label}</div>
            </div>
          ))}
        </div>
        <p className="text-mute mt-4">Fixed weights, no hidden model. The same inputs always give the same score.</p>
      </section>

      <section className="card card-pad">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Account</th>
                <th className="th">Institution</th>
                <th className="th">Classification</th>
                <th className="th">Confidence</th>
                <th className="th">Attributed funds</th>
                <th className="th">Evidence</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td className="td id">{a.account_pseudo_id}</td>
                  <td className="td">
                    {a.bank_name} <span className="text-mute">({a.bank_code})</span>
                  </td>
                  <td className="td"><Pill tone={categoryTone(a.category)}>{categoryLabel(a.category)}</Pill></td>
                  <td className="td font-semibold num">{Math.round(a.confidence_score * 100)}%</td>
                  <td className="td font-semibold num">{inr(a.attributed_amount)}</td>
                  <td className="td"><MiniBars a={a} /></td>
                  <td className="td text-right">
                    <button onClick={() => setSelected(a)} className="btn-ghost !py-2">Inspect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <Modal>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-mute">Evidence file</div>
              <h3 className="id text-xl">{selected.account_pseudo_id}</h3>
            </div>
            <Pill tone={categoryTone(selected.category)}>{categoryLabel(selected.category)}</Pill>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-neutral-100 p-4">
              <div className="text-mute">Composite confidence</div>
              <div className="font-display text-3xl font-bold num">{Math.round(selected.confidence_score * 100)}%</div>
            </div>
            <div className="rounded-xl bg-black text-white p-4">
              <div className="text-neutral-400">Attributed exposure</div>
              <div className="font-display text-2xl font-bold text-flame-500 num">{inr(selected.attributed_amount)}</div>
            </div>
          </div>

          <div className="space-y-3.5">
            {DIMENSIONS.map((d) => {
              const v = Math.round((Number(selected[d.key] as number) || 0) * 100);
              return (
                <div key={d.label}>
                  <div className="flex justify-between mb-1.5">
                    <span>{d.label} <span className="text-mute">(weight {d.weight})</span></span>
                    <span className="font-semibold num">{v}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full bg-flame-500" style={{ width: `${v}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {Array.isArray(selected.evidence) && selected.evidence.length > 0 && (
            <div className="mt-6">
              <h4 className="font-bold mb-2">Supporting evidence</h4>
              <ul className="space-y-2">
                {selected.evidence.map((ev: any, i: number) => (
                  <li key={i} className="rounded-lg border border-line p-3">
                    <div className="font-semibold">{ev.dimension || 'Evidence'}</div>
                    <div className="text-mute">{ev.summary || ev.pattern || JSON.stringify(ev)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button onClick={() => setSelected(null)} className="btn-dark">Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
};