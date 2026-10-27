import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { uid } from '../lib/db.js';
import { advanceTime } from '../lib/dm.js';
import { Field, Num, toast } from '../ui.jsx';

const PRESETS = [
  { kind: 'Crafting', days: 10, cost: 25, note: 'Item value ÷ 5 gp of progress per day (half the market price in materials).' },
  { kind: 'Training (language/tool)', days: 250, cost: 250, note: '250 days at 1 gp per day.' },
  { kind: 'Recuperating', days: 3, cost: 0, note: 'After 3 days, end one lingering effect or gain advantage vs disease/poison.' },
  { kind: 'Researching', days: 5, cost: 5, note: '1 gp per day; clues from libraries and sages.' },
  { kind: 'Carousing', days: 5, cost: 10, note: 'Make contacts — and maybe trouble.' },
  { kind: 'Working a job', days: 7, cost: 0, note: 'Earn a modest living (1 gp/day) with a related skill.' },
  { kind: 'Religious service', days: 10, cost: 0, note: 'Gain favor with a temple.' },
];

export default function Downtime() {
  const { campaign, update } = useApp();
  const [form, setForm] = useState({ who: campaign.playerId, kind: PRESETS[0].kind, title: '', days: 10, cost: 25 });
  const [passDays, setPassDays] = useState(1);
  const list = campaign.downtime;
  const name = (id) => campaign.party.find((p) => p.id === id)?.name || '?';

  return (
    <div className="page">
      <div className="card">
        <h3>New activity</h3>
        <div className="grid2">
          <Field label="Who">
            <select value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value })}>{campaign.party.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </Field>
          <Field label="Activity">
            <select value={form.kind} onChange={(e) => { const p = PRESETS.find((x) => x.kind === e.target.value); setForm({ ...form, kind: p.kind, days: p.days, cost: p.cost }); }}>
              {PRESETS.map((p) => <option key={p.kind}>{p.kind}</option>)}
            </select>
          </Field>
        </div>
        <div className="tiny muted" style={{ marginBottom: 8 }}>{PRESETS.find((p) => p.kind === form.kind)?.note}</div>
        <Field label="Details"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Forging a silvered longsword" /></Field>
        <div className="grid2">
          <Field label="Days needed"><Num value={form.days} min={1} onChange={(v) => setForm({ ...form, days: v })} /></Field>
          <Field label="Total cost (gp)"><Num value={form.cost} min={0} onChange={(v) => setForm({ ...form, cost: v })} /></Field>
        </div>
        <button className="btn sm primary" onClick={() => update((c) => void c.downtime.push({ id: uid(), ...form, progress: 0, started: c.calendar.day }))}>Start</button>
      </div>

      <div className="card row">
        <span className="small">Let time pass:</span>
        <Num value={passDays} min={1} max={365} onChange={setPassDays} style={{ width: 70 }} />
        <span className="small">days</span>
        <button className="btn sm gold" onClick={() => {
          update((c) => {
            advanceTime(c, passDays * 24);
            for (const d of c.downtime) if (d.progress < d.days) {
              d.progress = Math.min(d.days, d.progress + passDays);
              if (d.kind === 'Working a job') { const p = c.party.find((x) => x.id === d.who); if (p) p.gold = (p.gold || 0) + passDays; }
            }
          });
          toast(`${passDays} day(s) pass. Calendar updated.`);
        }}>Advance</button>
      </div>

      {list.map((d) => (
        <div key={d.id} className="card tight">
          <div className="row between">
            <div><b>{name(d.who)}</b> · {d.kind}{d.progress >= d.days && <span className="chip green">done</span>}</div>
            <button className="btn xs ghost danger" onClick={() => update((c) => void (c.downtime = c.downtime.filter((x) => x.id !== d.id)))}>✕</button>
          </div>
          {d.title && <div className="small muted">{d.title}</div>}
          <div className="hpbar" style={{ marginTop: 6 }}><div style={{ width: `${(d.progress / d.days) * 100}%`, background: 'var(--accent2)' }} /></div>
          <div className="tiny muted">{d.progress}/{d.days} days · {d.cost} gp total · started day {d.started}</div>
        </div>
      ))}
      {!list.length && <div className="empty">Nothing in progress.</div>}
    </div>
  );
}
