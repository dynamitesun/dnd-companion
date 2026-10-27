import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { uid } from '../lib/db.js';
import { BAROVIA_LOCATIONS, TAROKKA_SLOTS } from '../lib/srd.js';
import { Tabs } from '../ui.jsx';

const ATT = ['Hostile', 'Unfriendly', 'Wary', 'Neutral', 'Friendly', 'Trusted', 'Devoted'];

export default function Strahd() {
  const { campaign, update } = useApp();
  const [tab, setTab] = useState('places');
  const [name, setName] = useState('');
  const s = campaign.strahd;
  const visitedCount = BAROVIA_LOCATIONS.filter((l) => s.visited[l]).length;

  return (
    <div className="page">
      <Tabs tabs={[['places', `Barovia (${visitedCount}/${BAROVIA_LOCATIONS.length})`], ['tarokka', 'Tarokka reading'], ['npcs', 'Relationships']]} value={tab} onChange={setTab} />

      {tab === 'places' && (
        <div className="card" style={{ padding: 4 }}>
          {BAROVIA_LOCATIONS.map((l) => {
            const v = s.visited[l] || {};
            return (
              <div key={l} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="row">
                  <input type="checkbox" checked={!!v.done} onChange={(e) => update((c) => void (c.strahd.visited[l] = { ...v, done: e.target.checked }))} />
                  <span className="grow" style={{ opacity: v.done ? 1 : 0.75 }}>{l}</span>
                  {v.done && <span className="chip green">visited</span>}
                </div>
                {v.done && <input value={v.note || ''} onChange={(e) => update((c) => void (c.strahd.visited[l] = { ...v, note: e.target.value }))} placeholder="What happened here?" style={{ marginTop: 6 }} />}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'tarokka' && (
        <>
          <p className="small muted">Record Madam Eva's reading as it's revealed to you. Only you see this.</p>
          {TAROKKA_SLOTS.map((slot) => {
            const t = s.tarokka[slot] || {};
            return (
              <div key={slot} className="card tight">
                <div className="row between">
                  <h3 style={{ margin: 0 }}>{slot}</h3>
                  <label className="small row" style={{ gap: 6 }}>
                    <input type="checkbox" checked={!!t.found} onChange={(e) => update((c) => void (c.strahd.tarokka[slot] = { ...t, found: e.target.checked }))} /> Found
                  </label>
                </div>
                <input value={t.card || ''} onChange={(e) => update((c) => void (c.strahd.tarokka[slot] = { ...t, card: e.target.value }))} placeholder="Card drawn" style={{ marginTop: 6 }} />
                <textarea value={t.clue || ''} onChange={(e) => update((c) => void (c.strahd.tarokka[slot] = { ...t, clue: e.target.value }))} placeholder="What Madam Eva said / your guess" style={{ marginTop: 6, minHeight: 50 }} />
              </div>
            );
          })}
        </>
      )}

      {tab === 'npcs' && (
        <>
          <div className="row" style={{ marginBottom: 10 }}>
            <input className="grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="NPC name (e.g. Ireena)" />
            <button className="btn sm" disabled={!name.trim()} onClick={() => { update((c) => void c.strahd.npcs.push({ id: uid(), name: name.trim(), attitude: 3, note: '' })); setName(''); }}>Add</button>
          </div>
          {s.npcs.map((n) => (
            <div key={n.id} className="card tight">
              <div className="row between">
                <b>{n.name}</b>
                <span className="chip" style={{ color: n.attitude <= 1 ? '#ff9d90' : n.attitude >= 4 ? '#9fd69a' : undefined }}>{ATT[n.attitude]}</span>
              </div>
              <input type="range" min={0} max={6} value={n.attitude} onChange={(e) => update((c) => void (c.strahd.npcs.find((x) => x.id === n.id).attitude = Number(e.target.value)))} style={{ width: '100%' }} />
              <div className="row">
                <input className="grow" value={n.note} onChange={(e) => update((c) => void (c.strahd.npcs.find((x) => x.id === n.id).note = e.target.value))} placeholder="Notes" />
                <button className="btn xs ghost danger" onClick={() => update((c) => void (c.strahd.npcs = c.strahd.npcs.filter((x) => x.id !== n.id)))}>✕</button>
              </div>
            </div>
          ))}
          {!s.npcs.length && <div className="empty">Track how Barovia's people feel about the party.</div>}
        </>
      )}
    </div>
  );
}
