import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { uid } from '../lib/db.js';
import { CR_TABLE, RARITY } from '../lib/srd.js';
import { Field, Num, Tabs, toast } from '../ui.jsx';

function rowIndexBy(fn) {
  for (let i = 0; i < CR_TABLE.length; i++) if (fn(CR_TABLE[i])) return i;
  return CR_TABLE.length - 1;
}

// DMG-style CR estimate: defensive from HP adjusted by AC, offensive from damage adjusted by attack bonus.
export function estimateCR({ hp, ac, dpr, atk }) {
  let d = rowIndexBy((r) => hp <= r[4]);
  d += Math.trunc((ac - CR_TABLE[d][2]) / 2);
  d = Math.max(0, Math.min(CR_TABLE.length - 1, d));
  let o = rowIndexBy((r) => dpr <= r[7]);
  o += Math.trunc((atk - CR_TABLE[o][5]) / 2);
  o = Math.max(0, Math.min(CR_TABLE.length - 1, o));
  const avg = Math.round((d + o) / 2);
  return { cr: CR_TABLE[avg][0], def: CR_TABLE[d][0], off: CR_TABLE[o][0], row: CR_TABLE[avg] };
}

export default function Homebrew() {
  const { campaign, update } = useApp();
  const [tab, setTab] = useState('monster');
  const [m, setM] = useState({ name: '', hp: 45, ac: 13, dpr: 10, atk: 4, speed: '30 ft', attacks: '', notes: '' });
  const [it, setIt] = useState({ name: '', rarity: 'Uncommon', attune: false, type: 'Wondrous item', desc: '' });
  const est = estimateCR(m);
  const hb = campaign.homebrew;

  return (
    <div className="page">
      <Tabs tabs={[['monster', 'Monster'], ['item', 'Magic item'], ['saved', `Saved (${hb.monsters.length + hb.items.length})`]]} value={tab} onChange={setTab} />

      {tab === 'monster' && (
        <>
          <div className="card">
            <Field label="Name"><input value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="e.g. Mist Wraith" /></Field>
            <div className="grid2">
              <Field label="Hit points"><Num value={m.hp} min={1} onChange={(v) => setM({ ...m, hp: v })} /></Field>
              <Field label="Armor class"><Num value={m.ac} min={5} max={30} onChange={(v) => setM({ ...m, ac: v })} /></Field>
              <Field label="Damage per round"><Num value={m.dpr} min={0} onChange={(v) => setM({ ...m, dpr: v })} /></Field>
              <Field label="Attack bonus / save DC−8"><Num value={m.atk} min={0} max={20} onChange={(v) => setM({ ...m, atk: v })} /></Field>
            </div>
            <Field label="Speed"><input value={m.speed} onChange={(e) => setM({ ...m, speed: e.target.value })} /></Field>
            <Field label="Attacks & abilities"><textarea value={m.attacks} onChange={(e) => setM({ ...m, attacks: e.target.value })} placeholder="Claw +5 (2d6+3). Misty step at will…" /></Field>
          </div>
          <div className="card">
            <div className="row between"><h3 style={{ margin: 0 }}>Estimated CR</h3><b style={{ fontSize: 26, color: 'var(--accent2)' }}>{est.cr}</b></div>
            <div className="small muted">Defensive CR {est.def} · Offensive CR {est.off}</div>
            <div className="small" style={{ marginTop: 6 }}>Typical at CR {est.cr}: AC {est.row[2]}, HP {est.row[3]}–{est.row[4]}, attack +{est.row[5]}, {est.row[6]}–{est.row[7]} dmg/round, save DC {est.row[8]}, prof +{est.row[1]}.</div>
            {Math.abs(CR_TABLE.findIndex((r) => r[0] === est.def) - CR_TABLE.findIndex((r) => r[0] === est.off)) >= 4 && (
              <div className="small" style={{ color: 'var(--warn)', marginTop: 6 }}>Offense and defense are far apart — this monster may feel swingy.</div>
            )}
          </div>
          <button className="btn primary" disabled={!m.name.trim()} onClick={() => {
            update((c) => void c.homebrew.monsters.push({ id: uid(), name: m.name.trim(), cr: est.cr, ac: m.ac, hp: m.hp, speed: m.speed, attacks: m.attacks || `+${m.atk} to hit, ~${m.dpr} dmg/round` }));
            toast('Saved — it now appears in the Encounter Builder');
          }}>Save monster</button>
        </>
      )}

      {tab === 'item' && (
        <>
          <div className="card">
            <Field label="Name"><input value={it.name} onChange={(e) => setIt({ ...it, name: e.target.value })} placeholder="e.g. Lantern of Dawn's Mercy" /></Field>
            <div className="grid2">
              <Field label="Type"><input value={it.type} onChange={(e) => setIt({ ...it, type: e.target.value })} /></Field>
              <Field label="Rarity"><select value={it.rarity} onChange={(e) => setIt({ ...it, rarity: e.target.value })}>{Object.keys(RARITY).map((r) => <option key={r}>{r}</option>)}</select></Field>
            </div>
            <label className="row small" style={{ gap: 10, marginBottom: 8 }}><input type="checkbox" checked={it.attune} onChange={(e) => setIt({ ...it, attune: e.target.checked })} /> Requires attunement</label>
            <Field label="What it does"><textarea value={it.desc} onChange={(e) => setIt({ ...it, desc: e.target.value })} style={{ minHeight: 120 }} /></Field>
          </div>
          <div className="card small">
            <h3>Balance guide: {it.rarity}</h3>
            <div>Typical value {RARITY[it.rarity].price} · suits characters level {RARITY[it.rarity].minLevel}+</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {it.rarity === 'Common' && 'Flavorful, minor utility. No combat bonuses.'}
              {it.rarity === 'Uncommon' && 'A +1 bonus, a 2nd–3rd level spell once per day, or a solid utility effect.'}
              {it.rarity === 'Rare' && 'A +2 bonus, 4th–5th level spell effects, or a strong always-on ability.'}
              {it.rarity === 'Very rare' && 'A +3 bonus, 6th–8th level spell effects, or flight and similar powers.'}
              {it.rarity === 'Legendary' && 'Game-changing power, often with a cost or story attached.'}
              {!it.attune && ' Strong items usually need attunement (max 3 per character).'}
            </div>
          </div>
          <button className="btn primary" disabled={!it.name.trim()} onClick={() => { update((c) => void c.homebrew.items.push({ id: uid(), ...it, name: it.name.trim() })); toast('Item saved'); }}>Save item</button>
        </>
      )}

      {tab === 'saved' && (
        <>
          {hb.monsters.map((x) => (
            <div key={x.id} className="card tight row">
              <div className="grow"><b>{x.name}</b> <span className="small muted">CR {x.cr} · AC {x.ac} · HP {x.hp}</span><div className="tiny muted">{x.attacks}</div></div>
              <button className="btn xs ghost danger" onClick={() => update((c) => void (c.homebrew.monsters = c.homebrew.monsters.filter((y) => y.id !== x.id)))}>✕</button>
            </div>
          ))}
          {hb.items.map((x) => (
            <div key={x.id} className="card tight">
              <div className="row between"><b>{x.name}</b><button className="btn xs ghost danger" onClick={() => update((c) => void (c.homebrew.items = c.homebrew.items.filter((y) => y.id !== x.id)))}>✕</button></div>
              <div className="tiny muted">{x.type}, {x.rarity.toLowerCase()}{x.attune ? ' (requires attunement)' : ''}</div>
              <div className="small" style={{ marginTop: 4 }}>{x.desc}</div>
            </div>
          ))}
          {!hb.monsters.length && !hb.items.length && <div className="empty">Nothing saved yet.</div>}
        </>
      )}
    </div>
  );
}
