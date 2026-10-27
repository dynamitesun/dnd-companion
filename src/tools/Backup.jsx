import React from 'react';
import { useApp } from '../lib/store.jsx';
import { kv } from '../lib/db.js';
import { saveTextFile, toast } from '../ui.jsx';

export default function Backup() {
  const { campaign, closeCampaign } = useApp();
  const size = Math.round(JSON.stringify(campaign).length / 1024);

  async function exportIt(withMedia) {
    const data = structuredClone(campaign);
    if (withMedia) {
      data.media = {};
      for (const m of data.maps) if (m.bgKey) data.media[m.bgKey] = await kv.get(m.bgKey);
      if (data.moduleId) data.media['module:' + data.moduleId] = await kv.get('module:' + data.moduleId);
    }
    const safe = campaign.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    try {
      await saveTextFile(`solo-dm-${safe}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data));
    } catch (e) {
      toast('Export failed: ' + e.message);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h3>Autosave</h3>
        <p className="small muted">Everything saves automatically on this phone as you play — close the app any time and pick up mid-scene. Campaign data: about {size} KB.</p>
      </div>
      <div className="card">
        <h3>Backup</h3>
        <p className="small muted">Export to a file you can keep or move to another phone. Import from the campaign list.</p>
        <div className="row wrap">
          <button className="btn primary sm" onClick={() => exportIt(false)}>💾 Export campaign</button>
          <button className="btn sm" onClick={() => exportIt(true)}>Export with maps & adventure text</button>
        </div>
      </div>
      <div className="card">
        <h3>Switch campaign</h3>
        <button className="btn sm" onClick={closeCampaign}>🏰 Back to campaign list</button>
      </div>
    </div>
  );
}
