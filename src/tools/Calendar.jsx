import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { uid } from '../lib/db.js';
import { advanceTime } from '../lib/dm.js';
import { MOON_PHASES } from '../lib/srd.js';
import { Field, Num } from '../ui.jsx';

const MOON_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

export default function Calendar() {
  const { campaign, update } = useApp();
  const cal = campaign.calendar;
  const [ev, setEv] = useState({ title: '', day: cal.day + 1 });
  const phaseIdx = Math.floor(((cal.day + (cal.moonOffset || 0)) % 28) / 3.5);
  const h = cal.hour;
  const part = h < 5 ? 'Deep night' : h < 8 ? 'Dawn' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 20 ? 'Dusk' : 'Night';
  const night = h < 6 || h >= 19;
  const adv = (hours) => update((c) => advanceTime(c, hours));
  const upcoming = [...cal.events].sort((a, b) => a.day - b.day);

  return (
    <div className="page">
      <div className="card center">
        <div style={{ fontSize: 46 }}>{night ? MOON_ICONS[phaseIdx] : h < 8 || h >= 17 ? '🌅' : '☀️'}</div>
        <h1 style={{ marginBottom: 2 }}>Day {cal.day}</h1>
        <div>{String(h).padStart(2, '0')}:00 · {part}</div>
        <div className="small muted">{MOON_PHASES[phaseIdx]}</div>
        {night && /strahd|barovia/i.test(campaign.name + campaign.setting) && <div className="small" style={{ color: '#ff9d90', marginTop: 6 }}>Night in Barovia. The dead walk and wolves hunt.</div>}
      </div>
      <div className="grid3" style={{ marginBottom: 10 }}>
        <button className="btn" onClick={() => adv(1)}>+1 hour</button>
        <button className="btn" onClick={() => adv(8)}>+8 hours</button>
        <button className="btn" onClick={() => adv(24)}>+1 day</button>
        <button className="btn" onClick={() => adv(-1)}>−1 hour</button>
        <button className="btn" onClick={() => update((c) => { const add = (24 - c.calendar.hour + 7) % 24 || 24; advanceTime(c, add); })}>Next dawn</button>
        <button className="btn" onClick={() => update((c) => { const add = (24 - c.calendar.hour + 19) % 24 || 24; advanceTime(c, add); })}>Next dusk</button>
      </div>
      <div className="card">
        <div className="grid2">
          <Field label="Set day"><Num value={cal.day} min={1} onChange={(v) => update((c) => void (c.calendar.day = v))} /></Field>
          <Field label="Moon phase offset"><Num value={cal.moonOffset || 0} onChange={(v) => update((c) => void (c.calendar.moonOffset = v))} /></Field>
        </div>
      </div>
      <div className="card">
        <h3>Timed events</h3>
        <div className="row">
          <input className="grow" value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} placeholder="e.g. Festival of the Blazing Sun" />
          <Num value={ev.day} min={1} onChange={(v) => setEv({ ...ev, day: v })} style={{ width: 70 }} />
          <button className="btn sm" disabled={!ev.title.trim()} onClick={() => { update((c) => void c.calendar.events.push({ id: uid(), ...ev, title: ev.title.trim() })); setEv({ title: '', day: cal.day + 1 }); }}>Add</button>
        </div>
        {upcoming.map((e) => {
          const d = e.day - cal.day;
          return (
            <div key={e.id} className="list-item">
              <div className="grow"><b className="small">{e.title}</b><div className="tiny muted">Day {e.day} · {d > 0 ? `in ${d} day${d > 1 ? 's' : ''}` : d === 0 ? 'today!' : `${-d} day(s) ago`}</div></div>
              <button className="btn xs ghost danger" onClick={() => update((c) => void (c.calendar.events = c.calendar.events.filter((x) => x.id !== e.id)))}>✕</button>
            </div>
          );
        })}
        {!upcoming.length && <div className="small muted" style={{ marginTop: 8 }}>The DM sees the current time each turn and advances it as you travel and rest.</div>}
      </div>
    </div>
  );
}
