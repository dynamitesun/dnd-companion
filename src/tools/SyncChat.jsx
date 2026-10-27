import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { SYNC_PROMPT, parseSync, applySync } from '../lib/sync.js';
import { toast } from '../ui.jsx';

export async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export default function SyncChat({ goTab, openTool }) {
  const { campaign, update } = useApp();
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [showPrompt, setShowPrompt] = useState(!campaign.lastSync);

  function apply(src) {
    const data = parseSync(src ?? text);
    if (!data) return toast("Couldn't find the game state in that text — copy Claude's whole sync reply.");
    const draft = structuredClone(campaign);
    const changes = applySync(draft, data);
    update(() => draft);
    setResult(changes.length ? changes : ['Everything was already up to date']);
    setText('');
  }

  return (
    <div className="page">
      {result && (
        <div className="card" style={{ borderColor: '#3d6b3a' }}>
          <h3>✓ Updated</h3>
          {result.map((r, i) => <div key={i} className="small">• {r}</div>)}
          <div className="row wrap" style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => goTab('party')}>View party</button>
            {campaign.initiative.entries.length > 0 && <button className="btn sm" onClick={() => openTool('initiative')}>View combat</button>}
          </div>
        </div>
      )}
      {campaign.lastSync && <p className="small muted">Last synced {new Date(campaign.lastSync).toLocaleString()}</p>}

      <div className="card">
        <h3>1 · Set up the chat (once)</h3>
        <p className="small muted">Copy this message and send it in your Solo Table chat. After that, just type <b>sync</b> there any time.</p>
        <div className="row wrap">
          <button className="btn sm gold" onClick={async () => toast((await copyText(SYNC_PROMPT)) ? 'Copied — paste it into the Solo Table chat' : 'Copy failed — select the text below')}>📋 Copy setup message</button>
          <button className="btn sm ghost" onClick={() => setShowPrompt(!showPrompt)}>{showPrompt ? 'Hide' : 'Show'} it</button>
        </div>
        {showPrompt && <textarea readOnly value={SYNC_PROMPT} style={{ marginTop: 8, minHeight: 140, fontSize: 12 }} />}
      </div>

      <div className="card">
        <h3>2 · Paste the sync reply</h3>
        <p className="small muted">In the chat, say <b>sync</b>, long-press Claude's reply → Copy, then paste here.</p>
        <button
          className="btn sm"
          style={{ marginBottom: 8 }}
          onClick={async () => {
            try {
              const t = await navigator.clipboard.readText();
              if (t) apply(t);
              else toast('Clipboard is empty');
            } catch {
              toast('Paste into the box below instead');
            }
          }}
        >
          📥 Paste from clipboard & update
        </button>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="…or paste it here" style={{ minHeight: 110 }} />
        <button className="btn primary" style={{ marginTop: 8 }} disabled={!text.trim()} onClick={() => apply()}>Update my game</button>
      </div>

    </div>
  );
}
