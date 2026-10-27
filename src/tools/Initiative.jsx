import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { roll } from '../lib/dice.js';
import { uid } from '../lib/db.js';
import { applyHp, syncInitiativeHp } from '../lib/dm.js';
import { mod, CONDITIONS } from '../lib/srd.js';
import { Field, Num, Modal, HpBar } from '../ui.jsx';

export default function Initiative() {
  const { campaign, update } = useApp();
  const ini = campaign.initiative;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', init: 10, hp: 10, ac: 12, count: 1 });
  const [sel, setSel] = useState(null);
  const [amt, setAmt] = useState(5);

  const sorted = ini.entries;
  const cur = sorted[ini.turn];

  function next(dir = 1) {
    update((c) => {
      const n = c.initiative.entries.length;
      if (!n) return;
      let t = c.initiative.turn + dir;
      if (t >= n) { t = 0; c.initiative.round += 1; }
      if (t < 0) { t = n - 1; c.initiative.round = Math.max(1, c.initiative.round - 1); }
      c.initiative.turn = t;
    });
  }

  function rollParty() {
    update((c) => {
      for (const p of c.party) {
        const init = roll('1d20').total + mod(p.abilities.dex);
        const ex = c.initiative.entries.find((e) => e.charId === p.id);
        if (ex) ex.init = init;
        else c.initiative.entries.push({ id: uid(), charId: p.id, name: p.name, init, hp: p.hp, hpMax: p.hpMax, ac: p.ac, conditions: [] });
      }
      c.initiative.entries.sort((a, b) => b.init - a.init);
      c.initiative.turn = 0;
      syncInitiativeHp(c);
    });
  }

  function changeHp(id, d) {
    update((c) => {
      const e = c.initiative.entries.find((x) => x.id === id);
      if (!e) return;
      if (e.charId) {
        const p = c.party.find((x) => x.id === e.charId);
        if (p) applyHp(p, d);
        syncInitiativeHp(c);
      } else e.hp = Math.max(0, Math.min(e.hpMax, e.hp + d));
    });
  }

  const selE = sorted.find((e) => e.id === sel);

  return (
    <div className="page">
      <div className="row between" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Round {ini.round}</h2>
        <div className="row">
          <button className="btn sm" onClick={() => next(-1)}>‹ Prev</button>
          <button className="btn sm primary" onClick={() => next(1)}>Next ›</button>
        </div>
      </div>
      {cur && <div className="small muted" style={{ marginBottom: 8 }}>Now: <b style={{ color: 'var(--accent2)' }}>{cur.name}</b></div>}
      {sorted.length === 0 && <div className="empty">No combat. Roll the party in and add monsters, or let the DM start a fight.</div>}
      {sorted.map((e, i) => (
        <div key={e.id} className={'init-row' + (i === ini.turn ? ' cur' : '') + (e.hp <= 0 ? ' down' : '')} onClick={() => setSel(e.id)}>
          <div className="init-num">{e.init}</div>
          <div className="grow">
            <div className="row between">
              <b style={{ color: e.enemy ? '#ff9d90' : undefined }}>{e.name}</b>
              <span className="small muted">AC {e.ac}</span>
            </div>
            <HpBar hp={e.hp} max={e.hpMax} />
            <div className="tiny muted">{e.hp}/{e.hpMax} HP {e.conditions?.length ? '· ' + e.conditions.join(', ') : ''}</div>
          </div>
        </div>
      ))}
      <div className="row wrap" style={{ marginTop: 10 }}>
        <button className="btn sm" onClick={rollParty}>🎲 Roll party</button>
        <button className="btn sm" onClick={() => setAdding(true)}>+ Add combatant</button>
        <button className="btn sm danger" disabled={!sorted.length} onClick={() => update((c) => void (c.initiative = { round: 1, turn: 0, entries: [] }))}>End combat</button>
      </div>

      {adding && (
        <Modal title="Add combatant" onClose={() => setAdding(false)} footer={
          <button className="btn primary" disabled={!form.name.trim()} onClick={() => {
            update((c) => {
              for (let k = 0; k < form.count; k++) {
                const init = form.rollInit ? roll('1d20').total + (form.dexMod || 0) : form.init;
                c.initiative.entries.push({ id: uid(), name: form.count > 1 ? `${form.name} ${k + 1}` : form.name, init, hp: form.hp, hpMax: form.hp, ac: form.ac, conditions: [], enemy: true });
              }
              c.initiative.entries.sort((a, b) => b.init - a.init);
            });
            setAdding(false);
          }}>Add</button>
        }>
          <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid2">
            <Field label="Count"><Num value={form.count} min={1} max={20} onChange={(v) => setForm({ ...form, count: v })} /></Field>
            <Field label="HP"><Num value={form.hp} min={1} onChange={(v) => setForm({ ...form, hp: v })} /></Field>
            <Field label="AC"><Num value={form.ac} min={1} onChange={(v) => setForm({ ...form, ac: v })} /></Field>
            <Field label="Initiative"><Num value={form.init} onChange={(v) => setForm({ ...form, init: v })} /></Field>
          </div>
          <label className="row small" style={{ gap: 10 }}>
            <input type="checkbox" checked={!!form.rollInit} onChange={(e) => setForm({ ...form, rollInit: e.target.checked })} /> Roll initiative instead (d20 + Dex mod
            <Num value={form.dexMod || 0} onChange={(v) => setForm({ ...form, dexMod: v })} style={{ width: 56, minHeight: 30, padding: 3 }} />)
          </label>
        </Modal>
      )}

      {selE && (
        <Modal title={selE.name} onClose={() => setSel(null)}>
          <div className="row" style={{ marginBottom: 10 }}>
            <button className="btn sm danger" onClick={() => changeHp(selE.id, -amt)}>− Damage</button>
            <Num value={amt} min={0} onChange={setAmt} style={{ width: 70, textAlign: 'center' }} />
            <button className="btn sm" style={{ color: 'var(--good)' }} onClick={() => changeHp(selE.id, amt)}>+ Heal</button>
          </div>
          <div className="small muted">HP {selE.hp}/{selE.hpMax} · AC {selE.ac}</div>
          <Field label="Initiative">
            <Num value={selE.init} onChange={(v) => update((c) => { const e = c.initiative.entries.find((x) => x.id === selE.id); e.init = v; c.initiative.entries.sort((a, b) => b.init - a.init); })} />
          </Field>
          <h3>Conditions</h3>
          <div className="row wrap" style={{ marginBottom: 10 }}>
            {Object.keys(CONDITIONS).map((k) => (
              <button key={k} className={'chip' + (selE.conditions?.includes(k) ? ' red' : '')} onClick={() => update((c) => {
                const e = c.initiative.entries.find((x) => x.id === selE.id);
                const target = e.charId ? c.party.find((p) => p.id === e.charId) : e;
                target.conditions = target.conditions?.includes(k) ? target.conditions.filter((x) => x !== k) : [...(target.conditions || []), k];
                syncInitiativeHp(c);
              })}>{k}</button>
            ))}
          </div>
          <button className="btn sm danger" onClick={() => { update((c) => { c.initiative.entries = c.initiative.entries.filter((x) => x.id !== selE.id); c.initiative.turn = Math.min(c.initiative.turn, Math.max(0, c.initiative.entries.length - 1)); }); setSel(null); }}>Remove from combat</button>
        </Modal>
      )}
    </div>
  );
}
