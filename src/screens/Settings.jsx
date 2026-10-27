import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { MODELS, askClaude } from '../lib/ai.js';
import { Field, toast } from '../ui.jsx';

export default function Settings() {
  const { settings, setSettings } = useApp();
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  return (
    <div className="page">
      <div className="card">
        <h3>AI Dungeon Master</h3>
        <Field label="Anthropic API key">
          <div className="row">
            <input type={show ? 'text' : 'password'} value={settings.apiKey} onChange={(e) => setSettings({ apiKey: e.target.value })} placeholder="sk-ant-…" autoComplete="off" />
            <button className="btn sm" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </Field>
        <p className="tiny muted">
          Get one at console.anthropic.com → API Keys. It's stored only on this phone and sent only to Anthropic. API use is billed per request by Anthropic; a typical scene costs a few cents on Sonnet, less on Haiku.
        </p>
        <button
          className="btn sm"
          disabled={!settings.apiKey || testing}
          onClick={async () => {
            setTesting(true);
            try {
              const r = await askClaude({ settings, maxTokens: 30, system: 'Reply in five words or fewer.', messages: [{ role: 'user', content: 'Say the DM is ready.' }] });
              toast('✓ ' + r);
            } catch (e) {
              toast(e.message);
            }
            setTesting(false);
          }}
        >
          {testing ? 'Testing…' : 'Test key'}
        </button>
        <hr />
        <Field label="Model">
          <select value={settings.model} onChange={(e) => setSettings({ model: e.target.value })}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Narration">
          <select value={settings.narration} onChange={(e) => setSettings({ narration: e.target.value })}>
            <option value="detailed">Detailed & atmospheric</option>
            <option value="brief">Brief</option>
          </select>
        </Field>
        <label className="row small" style={{ gap: 10 }}>
          <input type="checkbox" checked={settings.forgiving} onChange={(e) => setSettings({ forgiving: e.target.checked })} />
          Forgiving DM (fair warnings, fewer instant deaths)
        </label>
      </div>
      <div className="card small muted">
        <b style={{ color: 'var(--text)' }}>Solo DM</b> · Everything you make is saved on this device. Use Tools → Save & Backup to export campaigns. Rules reference text is based on the 5e SRD (CC-BY-4.0). Your adventure PDFs stay on your phone.
      </div>
    </div>
  );
}
