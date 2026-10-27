import React, { useEffect, useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { kv, uid } from '../lib/db.js';
import { extractPages, chunkPages, searchChunks } from '../lib/pdf.js';
import { FilePick, toast } from '../ui.jsx';

export default function Adventure() {
  const { campaign, update } = useApp();
  const [progress, setProgress] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (campaign.moduleId) kv.get('module:' + campaign.moduleId).then((c) => setChunks(c || []));
    else setChunks([]);
  }, [campaign.moduleId]);

  async function load(file) {
    try {
      setProgress('Opening…');
      const pages = await extractPages(file, (d, t) => setProgress(`Reading page ${d} of ${t}…`));
      const ch = chunkPages(pages);
      const chars = pages.join('').length;
      if (chars < 500) throw new Error('No text found — this PDF may be scanned images only.');
      const id = uid();
      await kv.set('module:' + id, ch);
      if (campaign.moduleId) kv.del('module:' + campaign.moduleId);
      update((c) => {
        c.moduleId = id;
        c.moduleName = file.name.replace(/\.pdf$/i, '');
        c.modulePages = pages.length;
        c.followModule = true;
      });
      toast(`Loaded ${pages.length} pages`);
    } catch (e) {
      toast(e.message || 'Could not read that PDF');
    }
    setProgress(null);
  }

  const hits = q.trim() ? searchChunks(chunks, q, 6, 12000) : [];

  return (
    <div className="page">
      <div className="card">
        <h3>Adventure source</h3>
        {campaign.moduleId ? (
          <>
            <p><b>{campaign.moduleName}</b> <span className="small muted">· {campaign.modulePages} pages · {chunks.length} sections indexed</span></p>
            <label className="row small" style={{ gap: 10, marginBottom: 10 }}>
              <input type="checkbox" checked={campaign.followModule} onChange={(e) => update((c) => void (c.followModule = e.target.checked))} />
              DM follows this book strictly (no deviations unless you ask)
            </label>
          </>
        ) : (
          <p className="small muted">Load your copy of the adventure (for example Curse of Strahd) as a PDF. Each turn, the DM pulls the sections relevant to where you are and what you're doing, so it can run the book as written. The PDF stays on your phone.</p>
        )}
        {progress ? <div className="small">⏳ {progress}</div> : (
          <div className="row wrap">
            <FilePick accept="application/pdf" className="btn primary sm" onFile={load}>{campaign.moduleId ? 'Replace PDF' : '⬆️ Load adventure PDF'}</FilePick>
            {campaign.moduleId && (
              <button className="btn sm danger" onClick={() => { kv.del('module:' + campaign.moduleId); update((c) => { c.moduleId = null; c.moduleName = ''; }); }}>Remove</button>
            )}
          </div>
        )}
      </div>
      {chunks.length > 0 && (
        <div className="card">
          <h3>Search the book</h3>
          <p className="tiny muted">Spoilers ahead — this shows the DM's material.</p>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Vallaki burgomaster" />
          {hits.map((h, i) => (
            <div key={i} style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 8 }}>
              <div className="tiny muted">Page {h.page}</div>
              <div className="small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'system-ui' }}>{h.text.slice(0, 1200)}</div>
            </div>
          ))}
          {q.trim() && !hits.length && <div className="small muted" style={{ marginTop: 8 }}>No matches.</div>}
        </div>
      )}
    </div>
  );
}
