import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { uid } from '../lib/db.js';
import { Tabs } from '../ui.jsx';

export default function Journal() {
  const { campaign, update } = useApp();
  const [tab, setTab] = useState('quests');
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const [draft2, setDraft2] = useState('');
  const j = campaign.journal;
  const match = (s) => !q.trim() || String(s).toLowerCase().includes(q.toLowerCase());

  const add = () => {
    if (!draft.trim()) return;
    update((c) => {
      const J = c.journal;
      if (tab === 'notes') J.notes.unshift({ id: uid(), text: draft.trim(), day: c.calendar.day });
      if (tab === 'npcs') J.npcs.unshift({ id: uid(), name: draft.trim(), note: draft2.trim(), attitude: 0 });
      if (tab === 'quests') J.quests.unshift({ id: uid(), title: draft.trim(), note: draft2.trim(), status: 'active' });
      if (tab === 'loot') J.loot.unshift({ id: uid(), text: draft.trim(), day: c.calendar.day });
    });
    setDraft('');
    setDraft2('');
  };
  const edit = (list, id, patch) => update((c) => Object.assign(c.journal[list].find((x) => x.id === id), patch));
  const del = (list, id) => update((c) => void (c.journal[list] = c.journal[list].filter((x) => x.id !== id)));

  return (
    <div className="page">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Search the journal" style={{ marginBottom: 10 }} />
      <Tabs tabs={[['quests', `Quests (${j.quests.length})`], ['npcs', `NPCs (${j.npcs.length})`], ['notes', `Notes (${j.notes.length})`], ['loot', `Loot (${j.loot.length})`]]} value={tab} onChange={setTab} />
      <div className="card">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tab === 'npcs' ? 'NPC name' : tab === 'quests' ? 'Quest title' : tab === 'loot' ? 'Item found' : 'New note'} />
        {(tab === 'npcs' || tab === 'quests') && <input value={draft2} onChange={(e) => setDraft2(e.target.value)} placeholder="Details" style={{ marginTop: 6 }} />}
        <button className="btn sm primary" style={{ marginTop: 6 }} onClick={add} disabled={!draft.trim()}>Add</button>
      </div>
      <p className="tiny muted">The DM adds NPCs, quests and loot here automatically as you play.</p>

      {tab === 'quests' && ['active', 'done', 'failed'].map((st) => {
        const list = j.quests.filter((x) => x.status === st && match(x.title + x.note));
        if (!list.length) return null;
        return (
          <div key={st}>
            <h3 style={{ textTransform: 'capitalize' }}>{st}</h3>
            {list.map((x) => (
              <div key={x.id} className="card tight">
                <div className="row">
                  <input className="grow" value={x.title} onChange={(e) => edit('quests', x.id, { title: e.target.value })} style={{ fontWeight: 600 }} />
                  <select value={x.status} onChange={(e) => edit('quests', x.id, { status: e.target.value })} style={{ width: 100 }}>
                    <option value="active">Active</option><option value="done">Done</option><option value="failed">Failed</option>
                  </select>
                </div>
                <textarea value={x.note} onChange={(e) => edit('quests', x.id, { note: e.target.value })} style={{ marginTop: 6, minHeight: 50 }} />
                <button className="btn xs ghost danger" onClick={() => del('quests', x.id)}>Delete</button>
              </div>
            ))}
          </div>
        );
      })}

      {tab === 'npcs' && j.npcs.filter((x) => match(x.name + x.note)).map((x) => (
        <div key={x.id} className="card tight">
          <div className="row">
            <input className="grow" value={x.name} onChange={(e) => edit('npcs', x.id, { name: e.target.value })} style={{ fontWeight: 600 }} />
            <button className="btn xs ghost danger" onClick={() => del('npcs', x.id)}>✕</button>
          </div>
          <textarea value={x.note} onChange={(e) => edit('npcs', x.id, { note: e.target.value })} style={{ marginTop: 6, minHeight: 50 }} />
        </div>
      ))}

      {(tab === 'notes' || tab === 'loot') && j[tab].filter((x) => match(x.text)).map((x) => (
        <div key={x.id} className="card tight">
          <div className="row between tiny muted"><span>Day {x.day}{x.auto ? ' · by DM' : ''}</span><button className="btn xs ghost danger" onClick={() => del(tab, x.id)}>✕</button></div>
          <textarea value={x.text} onChange={(e) => edit(tab, x.id, { text: e.target.value })} style={{ minHeight: 44 }} />
        </div>
      ))}
    </div>
  );
}
