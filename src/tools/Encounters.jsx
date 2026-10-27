import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { uid } from '../lib/db.js';
import { roll } from '../lib/dice.js';
import { MONSTERS, CR_XP, CR_LIST, XP_THRESHOLDS, encounterMultiplier } from '../lib/srd.js';
import { Field, Num, toast } from '../ui.jsx';

export default function Encounters({ goTab, openTool }) {
  const { campaign, update } = useApp();
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState({ name: '', cr: '1', ac: 12, hp: 20 });
  const enc = campaign.encounter.monsters;
  const library = [...MONSTERS, ...campaign.homebrew.monsters.map((m) => ({ ...m, homebrew: true }))];

  const levels = campaign.party.map((p) => Math.max(1, Math.min(20, p.level)));
  const th = levels.reduce((a, l) => a.map((v, i) => v + XP_THRESHOLDS[l][i]), [0, 0, 0, 0]);
  const count = enc.reduce((s, m) => s + m.count, 0);
  const base = enc.reduce((s, m) => s + (CR_XP[m.cr] || 0) * m.count, 0);
  const adjMult = encounterMultiplier(count) * (levels.length < 3 ? 1.5 : levels.length >= 6 ? 0.67 : 1);
  const adj = Math.round(base * adjMult);
  const diff = adj >= th[3] ? 'Deadly' : adj >= th[2] ? 'Hard' : adj >= th[1] ? 'Medium' : adj >= th[0] ? 'Easy' : count ? 'Trivial' : '—';
  const diffColor = { Deadly: '#ff6a5a', Hard: '#e67e22', Medium: '#e0b866', Easy: '#6fae6a', Trivial: '#888' }[diff];

  const addMon = (m) =>
    update((c) => {
      const ex = c.encounter.monsters.find((x) => x.name === m.name);
      if (ex) ex.count += 1;
      else c.encounter.monsters.push({ ...m, count: 1 });
    });

  return (
    <div className="page">
      <div className="card">
        <div className="row between">
          <h3 style={{ margin: 0 }}>Difficulty</h3>
          <b style={{ color: diffColor, fontSize: 20 }}>{diff}</b>
        </div>
        <div className="small muted" style={{ marginTop: 4 }}>
          Party levels {levels.join(', ')} · Thresholds E {th[0]} / M {th[1]} / H {th[2]} / D {th[3]}
        </div>
        <div className="small" style={{ marginTop: 4 }}>{count} monsters · {base} XP (×{adjMult.toFixed(2)} → {adj} adjusted) · {Math.floor(base / Math.max(1, levels.length))} XP each on victory</div>
      </div>

      {enc.map((m) => (
        <div key={m.name} className="card tight">
          <div className="row">
            <div className="grow"><b>{m.name}</b> <span className="small muted">CR {m.cr} · AC {m.ac} · HP {m.hp}</span></div>
            <button className="btn xs" onClick={() => update((c) => { const x = c.encounter.monsters.find((y) => y.name === m.name); x.count -= 1; if (x.count <= 0) c.encounter.monsters = c.encounter.monsters.filter((y) => y !== x); })}>−</button>
            <b style={{ width: 22, textAlign: 'center' }}>{m.count}</b>
            <button className="btn xs" onClick={() => addMon(m)}>+</button>
          </div>
          {m.attacks && <div className="tiny muted" style={{ marginTop: 4 }}>{m.speed} · {m.attacks}</div>}
        </div>
      ))}
      {enc.length > 0 && (
        <div className="row wrap" style={{ marginBottom: 12 }}>
          <button className="btn sm primary" onClick={() => {
            update((c) => {
              for (const m of c.encounter.monsters)
                for (let i = 0; i < m.count; i++)
                  c.initiative.entries.push({ id: uid(), name: m.count > 1 ? `${m.name} ${i + 1}` : m.name, init: roll('1d20').total, hp: m.hp, hpMax: m.hp, ac: m.ac, conditions: [], enemy: true });
              c.initiative.entries.sort((a, b) => b.init - a.init);
            });
            toast('Added to initiative');
            openTool('initiative');
          }}>⚔️ Send to initiative</button>
          <button className="btn sm danger" onClick={() => update((c) => void (c.encounter.monsters = []))}>Clear</button>
        </div>
      )}

      <h3>Monsters</h3>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or CR" style={{ marginBottom: 8 }} />
      <div className="card" style={{ padding: 0, maxHeight: 360, overflowY: 'auto' }}>
        {library.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.cr === q).map((m) => (
          <div key={m.name} className="list-item" onClick={() => addMon(m)} style={{ cursor: 'pointer' }}>
            <div className="grow">
              <b>{m.name}</b>{m.homebrew && <span className="chip gold">homebrew</span>}
              <div className="tiny muted">CR {m.cr} ({CR_XP[m.cr]} XP) · AC {m.ac} · HP {m.hp} · {m.attacks}</div>
            </div>
            <span style={{ fontSize: 20 }}>＋</span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Custom monster</h3>
        <Field label="Name"><input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} /></Field>
        <div className="grid3">
          <Field label="CR"><select value={custom.cr} onChange={(e) => setCustom({ ...custom, cr: e.target.value })}>{CR_LIST.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="AC"><Num value={custom.ac} onChange={(v) => setCustom({ ...custom, ac: v })} /></Field>
          <Field label="HP"><Num value={custom.hp} onChange={(v) => setCustom({ ...custom, hp: v })} /></Field>
        </div>
        <button className="btn sm" disabled={!custom.name.trim()} onClick={() => { addMon({ ...custom, name: custom.name.trim() }); setCustom({ ...custom, name: '' }); }}>Add to encounter</button>
      </div>
      <p className="tiny muted">Monster stats are a quick SRD reference; your books are the final word.</p>
    </div>
  );
}
