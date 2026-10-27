import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { askClaude } from '../lib/ai.js';
import { CONDITIONS, QUICK_RULES } from '../lib/srd.js';
import { Prose, Tabs } from '../ui.jsx';

export default function Rules() {
  const { settings } = useApp();
  const [tab, setTab] = useState('ask');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [filter, setFilter] = useState('');

  async function ask() {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const a = await askClaude({
        settings,
        maxTokens: 700,
        temperature: 0.2,
        system: 'You are a precise D&D 5th edition (2014 rules) rules expert. Answer briefly and practically for use at the table: the rule, then how to apply it. Mention if something is an optional rule or DM call. No preamble.',
        messages: [{ role: 'user', content: q }],
      });
      setAnswers((x) => [{ q, a }, ...x]);
      setQ('');
    } catch (e) {
      setAnswers((x) => [{ q, a: '⚠️ ' + e.message }, ...x]);
    }
    setBusy(false);
  }

  const ref = { ...CONDITIONS, ...QUICK_RULES };
  return (
    <div className="page">
      <Tabs tabs={[['ask', 'Ask a question'], ['ref', 'Quick reference']]} value={tab} onChange={setTab} />
      {tab === 'ask' && (
        <>
          <div className="row">
            <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="e.g. Can I shove as a bonus action?" />
            <button className="btn primary" disabled={busy || !settings.apiKey || !q.trim()} onClick={ask}>{busy ? '…' : 'Ask'}</button>
          </div>
          {!settings.apiKey && <p className="small muted">Asking needs an API key. The quick reference works offline.</p>}
          <div className="spacer" />
          {answers.map((x, i) => (
            <div key={i} className="card">
              <div className="small" style={{ color: 'var(--accent2)', marginBottom: 6 }}>{x.q}</div>
              <div className="small" style={{ fontFamily: 'system-ui', lineHeight: 1.5 }}><Prose text={x.a} /></div>
            </div>
          ))}
        </>
      )}
      {tab === 'ref' && (
        <>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter" style={{ marginBottom: 10 }} />
          {Object.entries(ref).filter(([k, v]) => !filter || (k + v).toLowerCase().includes(filter.toLowerCase())).map(([k, v]) => (
            <div key={k} className="card tight">
              <b>{k}</b>
              <div className="small muted" style={{ fontFamily: 'system-ui', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
