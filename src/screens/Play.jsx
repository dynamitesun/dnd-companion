import React, { useEffect, useRef, useState } from 'react';
import { useApp, usePlayer } from '../lib/store.jsx';
import { runDmTurn, applyDmResult, rollForPlayer, maybeSummarize } from '../lib/dm.js';
import { uid } from '../lib/db.js';
import { Prose, HpBar, Num } from '../ui.jsx';

export default function Play({ openTool }) {
  const { campaign, update, settings } = useApp();
  const player = usePlayer();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastReq, setLastReq] = useState(null);
  const [manual, setManual] = useState(false);
  const [manualVal, setManualVal] = useState(10);
  const logRef = useRef(null);
  const campRef = useRef(campaign);
  campRef.current = campaign;

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [campaign.log.length, busy]);

  async function callDm(req) {
    setBusy(true);
    setError(null);
    setLastReq(req);
    try {
      const r = await runDmTurn({ campaign: req.snapshot, settings, playerText: req.playerText, rollResult: req.rollResult });
      update((c) => applyDmResult(c, r));
      setTimeout(async () => {
        try {
          const s = await maybeSummarize(campRef.current, settings);
          if (s) update((c) => Object.assign(c, s));
        } catch {}
      }, 50);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function send(msg) {
    const t = (msg ?? text).trim();
    if (!t || busy) return;
    const snapshot = campaign;
    update((c) => {
      c.log.push({ id: uid(), role: 'player', name: player.name, text: t, ts: Date.now() });
      c.suggestions = [];
    });
    setText('');
    callDm({ snapshot, playerText: t });
  }

  function doRoll(mode) {
    const req = campaign.pendingRoll;
    const r = rollForPlayer(player, req, mode);
    finishRoll(`${player.name} — ${req.label}: ${r.detail} = ${r.total}${r.crit ? ' (natural 20!)' : r.fumble ? ' (natural 1)' : ''}${mode !== 'normal' ? ` [${mode === 'adv' ? 'advantage' : 'disadvantage'}]` : ''}`);
  }

  function finishRoll(line) {
    const snapshot = campaign;
    update((c) => {
      c.log.push({ id: uid(), role: 'roll', name: player.name, text: line, ts: Date.now(), mine: true });
      c.rollHistory = [{ text: line, ts: Date.now() }, ...(c.rollHistory || [])].slice(0, 100);
    });
    setManual(false);
    callDm({ snapshot, rollResult: line });
  }

  const started = campaign.log.length > 0;

  return (
    <div className="play">
      <div className="row" style={{ gap: 6, padding: '6px 10px', overflowX: 'auto', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
        {campaign.party.map((p) => (
          <div key={p.id} style={{ minWidth: 86, flex: '0 0 auto' }} className="small">
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
              {p.id === campaign.playerId ? '★ ' : ''}{p.name}
            </div>
            <HpBar hp={p.hp} max={p.hpMax} />
            <div className="tiny muted">{p.hp}/{p.hpMax} HP · AC {p.ac}{p.conditions?.length ? ' · ' + p.conditions.join(', ') : ''}</div>
          </div>
        ))}
        {campaign.initiative.entries.length > 0 && (
          <button className="btn xs gold" onClick={() => openTool('initiative')}>⚔️ Round {campaign.initiative.round}</button>
        )}
      </div>

      <div className="log" ref={logRef}>
        {!started && (
          <div className="entry center" style={{ marginTop: 30 }}>
            <h2>{campaign.name}</h2>
            <p className="muted">{campaign.setting}</p>
            <p className="small muted">
              Party: {campaign.party.map((p) => p.name).join(', ')}.{' '}
              {campaign.party.length < 4 && 'Add up to three companions on the Party tab. '}
              {!campaign.moduleId && 'Load an adventure PDF in Tools → Adventure Book to have the DM follow it.'}
            </p>
            <button className="btn primary" disabled={busy || !settings.apiKey} onClick={() => send('Begin the adventure.')}>
              🕯️ Begin the adventure
            </button>
            {!settings.apiKey && <p className="small" style={{ color: 'var(--warn)' }}>Add your API key in Settings ⚙️ first.</p>}
          </div>
        )}
        {campaign.log.map((e) => <Entry key={e.id || e.ts + e.text} e={e} />)}
        {busy && <div className="thinking">The DM considers<span className="dot">…</span></div>}
        {error && (
          <div className="entry card" style={{ borderColor: '#7a2c24' }}>
            <div className="small" style={{ color: '#ff9d90' }}>{error}</div>
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn sm" onClick={() => lastReq && callDm(lastReq)}>Retry</button>
              <button className="btn sm ghost" onClick={() => setError(null)}>Dismiss</button>
            </div>
          </div>
        )}
      </div>

      <div className="composer">
        {campaign.pendingRoll && !busy && (
          <div className="rollreq">
            <div className="row between">
              <div><b>🎲 {campaign.pendingRoll.label}</b> <span className="small muted">for {player.name}</span></div>
              <button className="btn xs ghost" onClick={() => setManual((m) => !m)}>{manual ? 'App roll' : 'Physical dice'}</button>
            </div>
            {manual ? (
              <div className="row" style={{ marginTop: 8 }}>
                <span className="small muted">Total</span>
                <Num value={manualVal} onChange={setManualVal} style={{ width: 90 }} />
                <button className="btn primary sm" onClick={() => finishRoll(`${player.name} — ${campaign.pendingRoll.label}: rolled ${manualVal} (physical dice)`)}>Submit</button>
              </div>
            ) : (
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn primary sm grow" onClick={() => doRoll('normal')}>Roll</button>
                <button className="btn sm" onClick={() => doRoll('adv')}>Adv</button>
                <button className="btn sm" onClick={() => doRoll('dis')}>Dis</button>
              </div>
            )}
          </div>
        )}
        {!!campaign.suggestions?.length && !busy && !campaign.pendingRoll && (
          <div className="suggest">
            {campaign.suggestions.map((s, i) => (
              <button key={i} className="btn xs" onClick={() => setText(s)}>{s}</button>
            ))}
          </div>
        )}
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <textarea
            className="grow"
            rows={1}
            value={text}
            placeholder={started ? `What does ${player.name} do?` : 'Or describe how you want to begin…'}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 700) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn primary" disabled={busy || !text.trim() || !settings.apiKey} onClick={() => send()}>Send</button>
        </div>
      </div>
    </div>
  );
}

function Entry({ e }) {
  if (e.role === 'dm') return <div className="entry dm"><Prose text={e.text} /></div>;
  if (e.role === 'player') return <div className="entry player">{e.text}</div>;
  if (e.role === 'companion')
    return (
      <div className={'entry companion' + (e.refused ? ' refused' : '')}>
        <div className="who">{e.name}{e.refused ? ' · refuses' : ''}</div>
        <Prose text={e.text} />
      </div>
    );
  if (e.role === 'roll') return <div className={'entry roll' + (e.mine ? ' mine' : '')}>🎲 {e.text}</div>;
  return <div className="entry system">{e.text}</div>;
}
