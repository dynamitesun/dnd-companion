import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { Field, FilePick, Modal, toast } from '../ui.jsx';

const PRESETS = [
  { name: 'Curse of Strahd', setting: 'Gothic horror in the mist-shrouded land of Barovia, ruled by the vampire Strahd von Zarovich.' },
  { name: 'Lost Mine of Phandelver', setting: 'Classic fantasy around the frontier town of Phandalin on the Sword Coast.' },
  { name: 'Homebrew adventure', setting: '' },
];

export default function Campaigns() {
  const { index, openCampaign, createCampaign, deleteCampaign, importCampaign, settings } = useApp();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [setting, setSetting] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  return (
    <div className="page">
      {!settings.apiKey && (
        <div className="card" style={{ borderColor: '#7a6233' }}>
          <b>First time?</b> <span className="muted">Add your Anthropic API key in Settings (⚙️) so the AI DM can run your game. Every tool works without it.</span>
        </div>
      )}
      <div className="row between" style={{ marginBottom: 10 }}>
        <h1>Campaigns</h1>
        <button className="btn primary" onClick={() => setCreating(true)}>+ New</button>
      </div>

      {index.length === 0 && <div className="empty">No campaigns yet. Start one and your DM will set the scene.</div>}
      {index.map((c) => (
        <div key={c.id} className="card row" onClick={() => openCampaign(c.id)} style={{ cursor: 'pointer' }}>
          <div className="grow">
            <h2 style={{ marginBottom: 2 }}>{c.name}</h2>
            <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.setting || 'Custom setting'}</div>
            <div className="tiny muted">Last played {new Date(c.updated).toLocaleString()}</div>
          </div>
          <button className="iconbtn" onClick={(e) => { e.stopPropagation(); setConfirmDel(c); }}>🗑️</button>
        </div>
      ))}

      <div className="spacer" />
      <FilePick
        accept=".json,application/json"
        className="btn ghost sm"
        onFile={async (f) => {
          try {
            const data = JSON.parse(await f.text());
            if (!data.party) throw new Error();
            importCampaign(data);
            toast('Campaign imported');
          } catch {
            toast("That file isn't a Solo DM backup");
          }
        }}
      >
        ⬆️ Import a backup
      </FilePick>

      {creating && (
        <Modal
          title="New campaign"
          onClose={() => setCreating(false)}
          footer={
            <button
              className="btn primary"
              disabled={!name.trim()}
              onClick={() => {
                createCampaign(name.trim(), setting.trim());
                setCreating(false);
                setName('');
                setSetting('');
              }}
            >
              Begin
            </button>
          }
        >
          <div className="row wrap" style={{ marginBottom: 10 }}>
            {PRESETS.map((p) => (
              <button key={p.name} className="btn xs" onClick={() => { setName(p.name); setSetting(p.setting); }}>{p.name}</button>
            ))}
          </div>
          <Field label="Campaign name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Curse of Strahd" /></Field>
          <Field label="Setting & tone (the DM uses this)">
            <textarea value={setting} onChange={(e) => setSetting(e.target.value)} placeholder="Where, when, and what kind of story…" />
          </Field>
          <p className="small muted">Next: build your party on the Party tab, and add your adventure PDF under Tools → Adventure Book.</p>
        </Modal>
      )}

      {confirmDel && (
        <Modal
          title="Delete campaign?"
          onClose={() => setConfirmDel(null)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn primary" onClick={() => { deleteCampaign(confirmDel.id); setConfirmDel(null); }}>Delete</button>
            </>
          }
        >
          <p>“{confirmDel.name}” and everything in it will be gone. Export a backup first (Tools → Save & Backup) if you might want it back.</p>
        </Modal>
      )}
    </div>
  );
}
