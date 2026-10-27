import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { roll } from '../lib/dice.js';
import { CLASSES, ASI_LEVELS, LEVEL_XP, ABILITIES, mod, fmtMod, profForLevel, slotsFor } from '../lib/srd.js';
import { Tabs, toast } from '../ui.jsx';

export default function LevelUp() {
  const { campaign, update } = useApp();
  const ready = campaign.party.find((p) => p.levelUpReady) || campaign.party.find((p) => p.id === campaign.playerId);
  const [id, setId] = useState(ready?.id);
  const c = campaign.party.find((p) => p.id === id) || campaign.party[0];
  const [hpMode, setHpMode] = useState('avg');
  const [rolled, setRolled] = useState(null);
  const [asi, setAsi] = useState({});

  const info = CLASSES[c.class] || { hd: 8 };
  const next = c.level + 1;
  const conMod = mod(c.abilities.con);
  const avg = Math.floor(info.hd / 2) + 1;
  const hpGain = Math.max(1, (hpMode === 'avg' ? avg : rolled ?? avg) + conMod);
  const isAsi = ASI_LEVELS.includes(next) || (info.extraAsi || []).includes(next);
  const oldSlots = slotsFor(c.class, c.level);
  const newSlots = slotsFor(c.class, next);
  const slotChanges = Object.keys(newSlots).filter((k) => k !== 'pact' && newSlots[k] !== oldSlots[k]);
  const asiUsed = Object.values(asi).reduce((s, v) => s + v, 0);

  return (
    <div className="page">
      <Tabs tabs={campaign.party.map((p) => [p.id, (p.levelUpReady ? '⬆ ' : '') + p.name])} value={c.id} onChange={(v) => { setId(v); setRolled(null); setAsi({}); }} />
      <div className="card">
        <h2>{c.name}: {c.class} {c.level} → {next}</h2>
        {campaign.leveling === 'xp' && <div className="small muted">XP {c.xp} / {LEVEL_XP[c.level] ?? '—'} needed for level {next}</div>}
        {!CLASSES[c.class] && <div className="small" style={{ color: 'var(--warn)' }}>Set a standard class on the sheet for hit dice and slot tables.</div>}
      </div>
      {c.level >= 20 ? <div className="empty">Already level 20.</div> : (
        <>
          <div className="card">
            <h3>Hit points (d{info.hd} {fmtMod(conMod)} Con)</h3>
            <div className="row">
              <button className={'btn sm' + (hpMode === 'avg' ? ' gold' : '')} onClick={() => setHpMode('avg')}>Average ({avg})</button>
              <button className={'btn sm' + (hpMode === 'roll' ? ' gold' : '')} onClick={() => { setHpMode('roll'); setRolled(roll(`1d${info.hd}`).total); }}>Roll{rolled ? ` (${rolled})` : ''}</button>
              <div className="grow" />
              <b style={{ fontSize: 20 }}>+{hpGain} HP</b>
            </div>
          </div>
          <div className="card small">
            <h3>Also at level {next}</h3>
            <div>Proficiency bonus: {fmtMod(profForLevel(next))}{profForLevel(next) !== c.prof && <span className="chip gold">up!</span>}</div>
            {slotChanges.length > 0 && <div>New spell slots: {slotChanges.map((k) => `L${k}: ${oldSlots[k] || 0}→${newSlots[k]}`).join(', ')}</div>}
            {newSlots.pact && <div>Pact slots: {Object.entries(newSlots).filter(([k]) => k !== 'pact').map(([k, n]) => `${n} × level ${k}`)}</div>}
            <div className="muted" style={{ marginTop: 6 }}>Check your class table for new features{info.caster ? ', spells known and cantrips' : ''} and add them on the sheet.</div>
          </div>
          {isAsi && (
            <div className="card">
              <h3>Ability Score Improvement</h3>
              <div className="small muted" style={{ marginBottom: 6 }}>Add 2 points (max 20), or take a feat and note it in Features. {2 - asiUsed} left.</div>
              <div className="grid3">
                {ABILITIES.map((a) => (
                  <div key={a} className="ability">
                    <div className="lbl">{a.toUpperCase()}</div>
                    <div className="m">{c.abilities[a] + (asi[a] || 0)}</div>
                    <div className="row" style={{ justifyContent: 'center', gap: 4 }}>
                      <button className="btn xs" disabled={!asi[a]} onClick={() => setAsi({ ...asi, [a]: (asi[a] || 0) - 1 })}>−</button>
                      <button className="btn xs" disabled={asiUsed >= 2 || c.abilities[a] + (asi[a] || 0) >= 20} onClick={() => setAsi({ ...asi, [a]: (asi[a] || 0) + 1 })}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button className="btn primary" style={{ width: '100%' }} onClick={() => {
            update((camp) => {
              const p = camp.party.find((x) => x.id === c.id);
              const abil = { ...p.abilities };
              for (const [k, v] of Object.entries(asi)) abil[k] += v;
              const newCon = mod(abil.con);
              const retro = (newCon - mod(p.abilities.con)) * next;
              p.abilities = abil;
              p.level = next;
              p.prof = profForLevel(next);
              p.hpMax += hpGain + retro;
              p.hp += hpGain + retro;
              p.spells.slots = slotsFor(p.class, next);
              p.levelUpReady = campaign.leveling === 'xp' ? p.xp >= (LEVEL_XP[next] ?? Infinity) : false;
            });
            setRolled(null);
            setAsi({});
            toast(`${c.name} is now level ${next}!`);
          }}>Level up to {next}</button>
        </>
      )}
    </div>
  );
}
