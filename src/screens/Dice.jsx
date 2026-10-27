import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { roll } from '../lib/dice.js';
import { Num, Tabs } from '../ui.jsx';

const DICE = [4, 6, 8, 10, 12, 20, 100];

export default function Dice() {
  const { campaign, update } = useApp();
  const [count, setCount] = useState(1);
  const [bonus, setBonus] = useState(0);
  const [mode, setMode] = useState('normal');
  const [custom, setCustom] = useState('');
  const [result, setResult] = useState(null);
  const [saveName, setSaveName] = useState('');
  const [k, setK] = useState(0);

  function go(formula, label) {
    const r = roll(formula, mode);
    setResult({ ...r, label: label || formula });
    setK((x) => x + 1);
    update((c) => {
      c.rollHistory = [{ text: `${label ? label + ': ' : ''}${r.detail} = ${r.total}${mode !== 'normal' ? ` (${mode})` : ''}`, ts: Date.now() }, ...(c.rollHistory || [])].slice(0, 100);
    });
  }
  const fmt = (sides) => `${count}d${sides}${bonus ? (bonus > 0 ? '+' : '') + bonus : ''}`;
  const saved = campaign.savedRolls || [];

  return (
    <div className="page">
      <div className="card" style={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {result ? (
          <>
            <div key={k} className={'bigroll spin' + (result.crit ? ' crit' : result.fumble ? ' fumble' : '')}>{result.total}</div>
            <div className="center small muted">{result.label} · {result.detail}</div>
            {result.crit && <div className="center small" style={{ color: '#7dff8a' }}>Natural 20!</div>}
            {result.fumble && <div className="center small" style={{ color: '#ff6a5a' }}>Natural 1…</div>}
          </>
        ) : (
          <div className="center muted">Tap a die to roll</div>
        )}
      </div>

      <Tabs tabs={[['normal', 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']]} value={mode} onChange={setMode} />

      <div className="row" style={{ marginBottom: 10 }}>
        <span className="small muted">Dice</span>
        <button className="btn sm" onClick={() => setCount(Math.max(1, count - 1))}>−</button>
        <b style={{ width: 24, textAlign: 'center' }}>{count}</b>
        <button className="btn sm" onClick={() => setCount(Math.min(30, count + 1))}>+</button>
        <div className="grow" />
        <span className="small muted">Bonus</span>
        <Num value={bonus} onChange={setBonus} style={{ width: 70, textAlign: 'center' }} />
      </div>

      <div className="dicegrid">
        {DICE.map((d) => (
          <button key={d} className="btn dicebtn" onClick={() => go(fmt(d))}>d{d}</button>
        ))}
        <button className="btn dicebtn gold" onClick={() => go('4d6kh3', 'Ability score')}>4d6↓</button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <input className="grow" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Any formula: 2d8+1d6+3" />
        <button className="btn primary" disabled={!custom.trim()} onClick={() => go(custom)}>Roll</button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Saved rolls</h3>
        {saved.length === 0 && <div className="small muted">Save rolls you use often, like “Longsword 1d8+3”.</div>}
        <div className="row wrap">
          {saved.map((s, i) => (
            <span key={i} className="chip gold" style={{ fontSize: 14, padding: '6px 10px' }}>
              <span onClick={() => go(s.formula, s.name)}>{s.name} <span className="muted">{s.formula}</span></span>
              <span onClick={() => update((c) => void c.savedRolls.splice(i, 1))} style={{ marginLeft: 6 }}>✕</span>
            </span>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input className="grow" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Name" />
          <button
            className="btn sm"
            disabled={!saveName.trim() || !custom.trim()}
            onClick={() => {
              update((c) => {
                c.savedRolls = [...(c.savedRolls || []), { name: saveName.trim(), formula: custom.trim() }];
              });
              setSaveName('');
            }}
          >
            Save formula
          </button>
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h3 style={{ margin: 0 }}>History</h3>
          <button className="btn xs ghost" onClick={() => update((c) => void (c.rollHistory = []))}>Clear</button>
        </div>
        {(campaign.rollHistory || []).slice(0, 30).map((h, i) => (
          <div key={i} className="small" style={{ fontFamily: 'ui-monospace, monospace', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="muted">{new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> {h.text}
          </div>
        ))}
      </div>
    </div>
  );
}
