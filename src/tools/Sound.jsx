import React, { useEffect, useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { kv, uid } from '../lib/db.js';
import { LAYER_NAMES, ONESHOT_NAMES, setLayer, getLayers, stopAll, playOneShot, setMaster, playClip, clipPlaying } from '../lib/audio.js';
import { FilePick, shrinkImage, toast } from '../ui.jsx';

const PRESETS = [
  { name: 'Barovian night', mix: { wind: 0.6, drone: 0.5, heartbeat: 0 } },
  { name: 'Storm', mix: { rain: 0.8, wind: 0.5 } },
  { name: 'Tavern', mix: { tavern: 0.7, fire: 0.4 } },
  { name: 'Campfire', mix: { fire: 0.8, wind: 0.2 } },
  { name: 'Dungeon', mix: { drips: 0.7, drone: 0.35 } },
  { name: 'Haunted house', mix: { drone: 0.6, heartbeat: 0.4, wind: 0.25 } },
  { name: 'Riverside', mix: { water: 0.7, wind: 0.2 } },
];

export default function Sound() {
  const { campaign, update } = useApp();
  const [mix, setMix] = useState(getLayers());
  const [vol, setVol] = useState(0.8);
  const [, force] = useState(0);
  const scenes = campaign.sounds.scenes || [];
  const clips = campaign.sounds.clips || [];

  const apply = (m) => {
    for (const k of Object.keys(LAYER_NAMES)) setLayer(k, m[k] || 0);
    setMix({ ...m });
  };
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="small muted">Master</span>
        <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => { setVol(+e.target.value); setMaster(+e.target.value); }} className="grow" />
        <button className="btn sm danger" onClick={() => { stopAll(); setMix({}); force((x) => x + 1); }}>⏹ Stop all</button>
      </div>

      <h3>Scenes</h3>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        {PRESETS.map((p) => <button key={p.name} className="btn sm" onClick={() => apply(p.mix)}>{p.name}</button>)}
      </div>

      {scenes.length > 0 && <h3>Your mood board</h3>}
      <div className="grid2" style={{ marginBottom: 12 }}>
        {scenes.map((s) => (
          <div key={s.id} className="card tight" style={{ padding: 0, overflow: 'hidden' }}>
            <div onClick={() => apply(s.mix)} style={{ height: 90, background: s.img ? `url(${s.img}) center/cover` : 'var(--card2)', display: 'flex', alignItems: 'flex-end', cursor: 'pointer' }}>
              <div style={{ background: 'rgba(0,0,0,0.6)', width: '100%', padding: '4px 8px' }}><b className="small">{s.name}</b></div>
            </div>
            <div className="row" style={{ padding: 6, gap: 4 }}>
              <FilePick accept="image/*" className="btn xs" onFile={async (f) => { const img = await shrinkImage(f, 500); update((c) => void (c.sounds.scenes.find((x) => x.id === s.id).img = img)); }}>🖼️</FilePick>
              <button className="btn xs" onClick={() => { update((c) => void (c.sounds.scenes.find((x) => x.id === s.id).mix = { ...mix })); toast('Scene updated'); }}>Save mix</button>
              <button className="btn xs ghost danger" onClick={() => update((c) => void (c.sounds.scenes = c.sounds.scenes.filter((x) => x.id !== s.id)))}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <button className="btn sm" onClick={() => {
        const name = prompt('Scene name?', campaign.location || 'New scene');
        if (name) update((c) => void c.sounds.scenes.push({ id: uid(), name, mix: { ...mix }, img: '' }));
      }}>+ Save current mix as a scene</button>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Ambience layers</h3>
        {Object.entries(LAYER_NAMES).map(([k, label]) => (
          <div key={k} className="row" style={{ marginBottom: 6 }}>
            <span style={{ width: 110 }} className="small">{label}</span>
            <input type="range" min={0} max={1} step={0.05} value={mix[k] || 0} className="grow" onChange={(e) => { const v = +e.target.value; setLayer(k, v); setMix((m) => ({ ...m, [k]: v })); }} />
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Sound effects</h3>
        <div className="row wrap">
          {Object.entries(ONESHOT_NAMES).map(([k, label]) => <button key={k} className="btn sm" onClick={() => playOneShot(k)}>{label}</button>)}
        </div>
      </div>

      <div className="card">
        <h3>Your music & clips</h3>
        <p className="tiny muted">Add audio files you own (MP3, OGG…). They stay on your phone.</p>
        {clips.map((cl) => (
          <div key={cl.id} className="list-item">
            <button className="btn sm" onClick={async () => { const url = await kv.get(cl.key); if (url) playClip(cl.id, url, cl.loop); force((x) => x + 1); }}>{clipPlaying(cl.id) ? '⏸' : '▶️'}</button>
            <span className="grow small">{cl.name}</span>
            <label className="small row" style={{ gap: 4 }}><input type="checkbox" checked={!!cl.loop} onChange={(e) => update((c) => void (c.sounds.clips.find((x) => x.id === cl.id).loop = e.target.checked))} /> loop</label>
            <button className="btn xs ghost danger" onClick={() => { kv.del(cl.key); update((c) => void (c.sounds.clips = c.sounds.clips.filter((x) => x.id !== cl.id))); }}>✕</button>
          </div>
        ))}
        <FilePick accept="audio/*" onFile={async (f) => {
          if (f.size > 25 * 1024 * 1024) return toast('Please use files under 25 MB');
          const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
          const key = 'audio:' + uid();
          await kv.set(key, url);
          update((c) => void c.sounds.clips.push({ id: uid(), name: f.name.replace(/\.[^.]+$/, ''), key, loop: true }));
        }}>+ Add audio file</FilePick>
      </div>
    </div>
  );
}
