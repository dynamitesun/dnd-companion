import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { askClaude } from '../lib/ai.js';
import { Prose, toast } from '../ui.jsx';

export default function Recap() {
  const { campaign, update, settings } = useApp();
  const [busy, setBusy] = useState(false);
  const [style, setStyle] = useState('dramatic');
  const recaps = campaign.recaps || [];

  async function make() {
    setBusy(true);
    try {
      const recent = campaign.log.slice(-40).filter((e) => e.role !== 'roll').map((e) => `${e.role === 'player' ? 'PLAYER' : e.role === 'dm' ? 'DM' : e.name || e.role}: ${e.text}`).join('\n');
      const quests = campaign.journal.quests.filter((q) => q.status === 'active').map((q) => q.title).join('; ');
      const text = await askClaude({
        settings,
        maxTokens: 700,
        temperature: 0.8,
        system: `Write a "Previously on…" recap for a D&D campaign, read aloud before the next session. ${style === 'dramatic' ? 'Dramatic, TV-narrator tone.' : style === 'bullets' ? 'A concise bulleted list of key events, then open threads.' : 'Written in-world, as a page from the party\'s journal.'} 150–250 words. Use only what the players know; no secrets. Plain text with short paragraphs.`,
        messages: [{ role: 'user', content: `Campaign: ${campaign.name}\nParty: ${campaign.party.map((p) => p.name).join(', ')}\nLocation: ${campaign.location}\nActive quests: ${quests || 'none'}\n\nSTORY SO FAR:\n${campaign.summary || '(none)'}\n\nMOST RECENT EVENTS:\n${recent || '(none yet)'}` }],
      });
      update((c) => void (c.recaps = [{ ts: Date.now(), day: c.calendar.day, text: text.trim() }, ...(c.recaps || [])].slice(0, 20)));
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="page">
      <div className="card">
        <div className="row wrap" style={{ marginBottom: 8 }}>
          {[['dramatic', 'Dramatic'], ['bullets', 'Bullet points'], ['journal', 'In-world journal']].map(([k, l]) => (
            <button key={k} className={'tab' + (style === k ? ' on' : '')} onClick={() => setStyle(k)}>{l}</button>
          ))}
        </div>
        <button className="btn primary" disabled={busy || !settings.apiKey || campaign.log.length === 0} onClick={make}>{busy ? 'Writing…' : '📰 Write a recap'}</button>
        {!settings.apiKey && <p className="small muted">Needs an API key.</p>}
      </div>
      {campaign.summary && (
        <div className="card">
          <h3>Running campaign log</h3>
          <div className="small" style={{ fontFamily: 'system-ui', lineHeight: 1.5 }}><Prose text={campaign.summary} /></div>
          <p className="tiny muted">The DM keeps this automatically so it remembers older sessions.</p>
        </div>
      )}
      {recaps.map((r) => (
        <div key={r.ts} className="card">
          <div className="tiny muted">{new Date(r.ts).toLocaleDateString()} · in-game day {r.day}</div>
          <div style={{ lineHeight: 1.55 }}><Prose text={r.text} /></div>
        </div>
      ))}
    </div>
  );
}
