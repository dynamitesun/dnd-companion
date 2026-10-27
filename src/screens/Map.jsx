import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { kv, uid } from '../lib/db.js';
import { Modal, Field, Num, FilePick, shrinkImage, toast } from '../ui.jsx';

const TERRAIN = {
  floor: ['Floor', '#6b5a45'], stone: ['Stone', '#59544e'], wall: ['Wall', '#1f1b18'], door: ['Door', '#8a5a2b'],
  grass: ['Grass', '#4f6b35'], forest: ['Forest', '#2e4a26'], water: ['Water', '#2f5d7c'], road: ['Road', '#7d6d58'],
  sand: ['Sand', '#b59b62'], lava: ['Lava', '#a2361f'], snow: ['Snow', '#d8dde3'], pit: ['Pit', '#000000'],
};
const TOKEN_COLORS = ['#c0392b', '#e0b866', '#6e9bd1', '#6fae6a', '#9b59b6', '#e67e22', '#ecf0f1', '#7f8c8d'];
const MODES = [
  ['move', '✋ Move'], ['pan', '🧭 Scroll'], ['reveal', '☀️ Reveal'], ['hide', '🌫️ Fog'],
  ['paint', '🖌️ Paint'], ['erase', '🧽 Erase'], ['token', '➕ Token'],
];

export function newMap(name = 'New Map', cols = 24, rows = 18) {
  return { id: uid(), name, cols, rows, cell: 36, bgKey: '', bgOpacity: 1, terrain: {}, fog: Array(cols * rows).fill(1), fogEnabled: true, tokens: [], revealRadius: 3, walls: true };
}

export default function MapScreen() {
  const { campaign, update } = useApp();
  const map = campaign.maps.find((m) => m.id === campaign.activeMapId) || campaign.maps[0];
  const [showList, setShowList] = useState(false);

  if (!map) {
    return (
      <div className="page">
        <div className="empty">
          <p>No maps yet. Draw a dungeon on a blank grid, or upload a battle map image and lay a grid and fog of war over it.</p>
          <button
            className="btn primary"
            onClick={() => {
              const m = newMap('First Map');
              update((c) => {
                c.maps.push(m);
                c.activeMapId = m.id;
              });
            }}
          >
            + Create a map
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <MapEditor key={map.id} map={map} onList={() => setShowList(true)} />
      {showList && <MapList onClose={() => setShowList(false)} />}
    </>
  );
}

function MapList({ onClose }) {
  const { campaign, update } = useApp();
  const [name, setName] = useState('');
  const [cols, setCols] = useState(24);
  const [rows, setRows] = useState(18);
  return (
    <Modal title="Maps" onClose={onClose}>
      {campaign.maps.map((m) => (
        <div key={m.id} className="list-item">
          <div className="grow" onClick={() => { update((c) => void (c.activeMapId = m.id)); onClose(); }} style={{ cursor: 'pointer' }}>
            <b>{m.name}</b> {m.id === campaign.activeMapId && <span className="chip gold">open</span>}
            <div className="tiny muted">{m.cols}×{m.rows} · {m.tokens.length} tokens</div>
          </div>
          <button
            className="btn xs danger"
            onClick={() => {
              if (!confirm(`Delete map “${m.name}”?`)) return;
              if (m.bgKey) kv.del(m.bgKey);
              update((c) => {
                c.maps = c.maps.filter((x) => x.id !== m.id);
                if (c.activeMapId === m.id) c.activeMapId = c.maps[0]?.id || null;
              });
            }}
          >
            Delete
          </button>
        </div>
      ))}
      <hr />
      <h3>New map</h3>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Death House, cellar" /></Field>
      <div className="grid2">
        <Field label="Columns"><Num value={cols} min={4} max={80} onChange={setCols} /></Field>
        <Field label="Rows"><Num value={rows} min={4} max={80} onChange={setRows} /></Field>
      </div>
      <button
        className="btn primary"
        onClick={() => {
          const m = newMap(name.trim() || `Map ${campaign.maps.length + 1}`, cols, rows);
          update((c) => {
            c.maps.push(m);
            c.activeMapId = m.id;
          });
          onClose();
        }}
      >
        Create
      </button>
    </Modal>
  );
}

function MapEditor({ map, onList }) {
  const { campaign, update } = useApp();
  const [local, setLocalState] = useState(map);
  const localRef = useRef(map);
  // Updates run immediately (outside React's render) so commits never loop.
  const setLocal = (v) => {
    const next = typeof v === 'function' ? v(localRef.current) : v;
    localRef.current = next;
    setLocalState(next);
  };
  const [mode, setMode] = useState('move');
  const [terrain, setTerrain] = useState('floor');
  const [zoom, setZoom] = useState(1);
  const [dmView, setDmView] = useState(false);
  const [bg, setBg] = useState(null);
  const [editTok, setEditTok] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const imgCache = useRef({});

  useEffect(() => setLocal(map), [map]);
  useEffect(() => {
    let alive = true;
    if (!local.bgKey) return setBg(null);
    kv.get(local.bgKey).then((url) => {
      if (!alive || !url) return;
      const i = new Image();
      i.onload = () => alive && setBg(i);
      i.src = url;
    });
    return () => (alive = false);
  }, [local.bgKey]);

  const cell = local.cell * zoom;
  const W = local.cols * cell;
  const H = local.rows * cell;

  const commit = (m) =>
    update((c) => {
      const i = c.maps.findIndex((x) => x.id === m.id);
      if (i >= 0) c.maps[i] = m;
    });

  const portraitOf = (t) => {
    if (t.img) return t.img;
    if (t.charId) return campaign.party.find((p) => p.id === t.charId)?.portrait || '';
    return '';
  };

  // Draw
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0d0b0a';
    ctx.fillRect(0, 0, W, H);
    if (bg) {
      ctx.globalAlpha = local.bgOpacity ?? 1;
      ctx.drawImage(bg, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    for (const [k, t] of Object.entries(local.terrain)) {
      const [x, y] = k.split(',').map(Number);
      ctx.fillStyle = TERRAIN[t]?.[1] || '#555';
      ctx.globalAlpha = bg ? 0.75 : 1;
      ctx.fillRect(x * cell, y * cell, cell, cell);
      ctx.globalAlpha = 1;
      if (t === 'wall') {
        ctx.strokeStyle = '#3a332d';
        ctx.strokeRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      }
      if (t === 'door') {
        ctx.fillStyle = '#c99654';
        ctx.fillRect(x * cell + cell * 0.35, y * cell + cell * 0.15, cell * 0.3, cell * 0.7);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= local.cols; x++) { ctx.moveTo(x * cell + 0.5, 0); ctx.lineTo(x * cell + 0.5, H); }
    for (let y = 0; y <= local.rows; y++) { ctx.moveTo(0, y * cell + 0.5); ctx.lineTo(W, y * cell + 0.5); }
    ctx.stroke();

    const fogged = (x, y) => local.fogEnabled && local.fog[y * local.cols + x] === 1;
    for (const t of local.tokens) {
      const hiddenNow = t.secret && fogged(t.x, t.y);
      if (hiddenNow && !dmView) continue;
      const s = (t.size || 1) * cell;
      const cx = t.x * cell + s / 2, cy = t.y * cell + s / 2, r = s / 2 - 3;
      ctx.save();
      ctx.globalAlpha = hiddenNow ? 0.5 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = t.color || '#c0392b';
      ctx.fill();
      const src = portraitOf(t);
      if (src) {
        let im = imgCache.current[src];
        if (!im) {
          im = new Image();
          im.onload = () => setLocal((l) => ({ ...l }));
          im.src = src;
          imgCache.current[src] = im;
        }
        if (im.complete && im.naturalWidth) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(im, cx - r + 2, cy - r + 2, (r - 2) * 2, (r - 2) * 2);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, r * 0.9)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((t.label || '?').slice(0, 2).toUpperCase(), cx, cy + 1);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = t.kind === 'enemy' ? '#ff6a5a' : t.kind === 'pc' ? '#e0b866' : '#ddd';
      if (hiddenNow) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (cell >= 28) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const label = t.label || '';
        ctx.font = '10px system-ui';
        const w = ctx.measureText(label).width + 6;
        ctx.fillRect(cx - w / 2, t.y * cell + s - 2, w, 12);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, cx, t.y * cell + s - 1);
      }
    }

    if (local.fogEnabled) {
      ctx.fillStyle = dmView ? 'rgba(0,0,0,0.55)' : '#050404';
      for (let y = 0; y < local.rows; y++)
        for (let x = 0; x < local.cols; x++) if (local.fog[y * local.cols + x] === 1) ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
    }
  }, [local, bg, cell, W, H, dmView, campaign.party]);

  const cellAt = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: Math.floor((e.clientX - r.left) / cell), y: Math.floor((e.clientY - r.top) / cell) };
  };
  const inBounds = (p) => p.x >= 0 && p.y >= 0 && p.x < local.cols && p.y < local.rows;
  const tokenAt = (p) => [...local.tokens].reverse().find((t) => p.x >= t.x && p.x < t.x + (t.size || 1) && p.y >= t.y && p.y < t.y + (t.size || 1));

  function revealAround(m, x, y, rad) {
    const fog = m.fog.slice();
    for (let yy = y - rad; yy <= y + rad; yy++)
      for (let xx = x - rad; xx <= x + rad; xx++) {
        if (xx < 0 || yy < 0 || xx >= m.cols || yy >= m.rows) continue;
        if ((xx - x) ** 2 + (yy - y) ** 2 <= rad * rad + rad) {
          if (m.walls && blocked(m, x, y, xx, yy)) continue;
          fog[yy * m.cols + xx] = 0;
        }
      }
    return { ...m, fog };
  }

  function brush(m, p, value) {
    const fog = m.fog.slice();
    for (let yy = p.y - 1; yy <= p.y + 1; yy++)
      for (let xx = p.x - 1; xx <= p.x + 1; xx++)
        if (xx >= 0 && yy >= 0 && xx < m.cols && yy < m.rows) fog[yy * m.cols + xx] = value;
    return { ...m, fog };
  }

  function onDown(e) {
    if (mode === 'pan') return;
    const p = cellAt(e);
    if (!inBounds(p)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (mode === 'move') {
      const t = tokenAt(p);
      if (t) drag.current = { id: t.id, ox: p.x - t.x, oy: p.y - t.y, moved: false, start: p };
    } else if (mode === 'token') {
      setEditTok({ id: null, x: p.x, y: p.y, label: '', kind: 'npc', color: TOKEN_COLORS[0], size: 1, secret: false });
    } else {
      drag.current = { brush: true };
      applyBrush(p);
    }
  }
  function applyBrush(p) {
    setLocal((m) => {
      if (mode === 'reveal') return brush(m, p, 0);
      if (mode === 'hide') return brush(m, p, 1);
      const terrainMap = { ...m.terrain };
      const k = `${p.x},${p.y}`;
      if (mode === 'paint') terrainMap[k] = terrain;
      else if (mode === 'erase') delete terrainMap[k];
      return { ...m, terrain: terrainMap };
    });
  }
  function onMove(e) {
    const d = drag.current;
    if (!d) return;
    const p = cellAt(e);
    if (!inBounds(p)) return;
    if (d.brush) return applyBrush(p);
    const nx = Math.max(0, Math.min(local.cols - 1, p.x - d.ox));
    const ny = Math.max(0, Math.min(local.rows - 1, p.y - d.oy));
    if (p.x !== d.start.x || p.y !== d.start.y) d.moved = true;
    setLocal((m) => {
      let next = { ...m, tokens: m.tokens.map((t) => (t.id === d.id ? { ...t, x: nx, y: ny } : t)) };
      const tok = next.tokens.find((t) => t.id === d.id);
      if (tok?.kind === 'pc' && m.fogEnabled) next = revealAround(next, nx, ny, m.revealRadius || 3);
      return next;
    });
  }
  function onUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.brush && !d.moved) {
      const t = localRef.current.tokens.find((x) => x.id === d.id);
      if (t) setEditTok({ ...t });
      return;
    }
    setLocal((m) => {
      commit(m);
      return m;
    });
  }

  function saveToken(t) {
    setLocal((m) => {
      let tokens;
      if (t.id) tokens = m.tokens.map((x) => (x.id === t.id ? t : x));
      else tokens = [...m.tokens, { ...t, id: uid() }];
      let next = { ...m, tokens };
      if (t.kind === 'pc' && next.fogEnabled) next = revealAround(next, t.x, t.y, next.revealRadius || 3);
      commit(next);
      return next;
    });
    setEditTok(null);
  }

  function addParty() {
    setLocal((m) => {
      const existing = new Set(m.tokens.map((t) => t.charId).filter(Boolean));
      const add = campaign.party.filter((p) => !existing.has(p.id)).map((p, i) => ({
        id: uid(), charId: p.id, label: p.name, kind: 'pc', color: TOKEN_COLORS[(i + 1) % TOKEN_COLORS.length], x: 1 + (i % 2), y: 1 + Math.floor(i / 2), size: 1,
      }));
      let next = { ...m, tokens: [...m.tokens, ...add] };
      for (const t of add) next = revealAround(next, t.x, t.y, next.revealRadius || 3);
      commit(next);
      return next;
    });
  }

  return (
    <>
      <div className="row" style={{ padding: '6px 10px', gap: 6, background: 'var(--bg2)' }}>
        <button className="btn xs" onClick={onList}>🗂️ {local.name}</button>
        <div className="grow" />
        <button className={'btn xs' + (dmView ? ' gold' : '')} onClick={() => setDmView(!dmView)} title="DM view shows fogged areas and secret tokens">
          {dmView ? '👁️ DM view' : '🙈 Player view'}
        </button>
        <button className="btn xs" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(1)))}>−</button>
        <button className="btn xs" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}>+</button>
        <button className="btn xs" onClick={() => setSettingsOpen(true)}>⚙️</button>
      </div>
      <div className="maptools">
        {MODES.map(([k, l]) => (
          <button key={k} className={'btn xs' + (mode === k ? ' on' : '')} onClick={() => setMode(k)}>{l}</button>
        ))}
        <button className="btn xs" onClick={addParty}>👥 Party</button>
      </div>
      {(mode === 'paint') && (
        <div className="maptools" style={{ paddingTop: 0 }}>
          {Object.entries(TERRAIN).map(([k, [n, col]]) => (
            <button key={k} className={'swatch' + (terrain === k ? ' on' : '')} style={{ background: col }} title={n} onClick={() => setTerrain(k)} />
          ))}
          <span className="small muted" style={{ alignSelf: 'center' }}>{TERRAIN[terrain][0]}</span>
        </div>
      )}
      <div className={'mapwrap' + (mode === 'pan' ? ' pan' : '')}>
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ display: 'block', touchAction: mode === 'pan' ? 'auto' : 'none' }}
        />
      </div>
      <div className="tiny muted" style={{ padding: '4px 10px', background: 'var(--bg2)' }}>
        {mode === 'move' && 'Drag tokens. Tap a token to edit it. Your party’s tokens clear fog as they move.'}
        {mode === 'pan' && 'Scroll around the map with your finger.'}
        {mode === 'reveal' && 'Drag to clear fog.'}
        {mode === 'hide' && 'Drag to cover areas with fog.'}
        {mode === 'paint' && 'Drag to paint terrain. Walls block what your tokens reveal.'}
        {mode === 'erase' && 'Drag to erase painted terrain.'}
        {mode === 'token' && 'Tap a square to place a token. Mark NPCs “secret” to keep them hidden under fog.'}
      </div>

      {editTok && <TokenModal t={editTok} party={campaign.party} onClose={() => setEditTok(null)} onSave={saveToken} onDelete={(id) => {
        setLocal((m) => { const next = { ...m, tokens: m.tokens.filter((x) => x.id !== id) }; commit(next); return next; });
        setEditTok(null);
      }} />}

      {settingsOpen && (
        <Modal title="Map settings" onClose={() => setSettingsOpen(false)}>
          <Field label="Name"><input value={local.name} onChange={(e) => { const n = { ...local, name: e.target.value }; setLocal(n); commit(n); }} /></Field>
          <div className="grid2">
            <Field label="Columns"><Num value={local.cols} min={4} max={80} onChange={(v) => { const n = resize(local, v, local.rows); setLocal(n); commit(n); }} /></Field>
            <Field label="Rows"><Num value={local.rows} min={4} max={80} onChange={(v) => { const n = resize(local, local.cols, v); setLocal(n); commit(n); }} /></Field>
          </div>
          <Field label="Background image (battle map)">
            <div className="row wrap" style={{ marginTop: 4 }}>
              <FilePick accept="image/*" onFile={async (f) => {
                const url = await shrinkImage(f, 2400);
                const key = 'img:' + uid();
                await kv.set(key, url);
                if (local.bgKey) kv.del(local.bgKey);
                const img = new Image();
                img.onload = () => {
                  const rows = Math.max(4, Math.round(local.cols * (img.height / img.width)));
                  const n = { ...resize(local, local.cols, rows), bgKey: key };
                  setLocal(n);
                  commit(n);
                  toast('Image added — adjust columns so the grid lines up');
                };
                img.src = url;
              }}>Upload image</FilePick>
              {local.bgKey && <button className="btn sm danger" onClick={() => { kv.del(local.bgKey); const n = { ...local, bgKey: '' }; setLocal(n); commit(n); }}>Remove</button>}
            </div>
          </Field>
          <label className="row small" style={{ gap: 10, marginBottom: 8 }}>
            <input type="checkbox" checked={local.fogEnabled} onChange={(e) => { const n = { ...local, fogEnabled: e.target.checked }; setLocal(n); commit(n); }} /> Fog of war
          </label>
          <label className="row small" style={{ gap: 10, marginBottom: 8 }}>
            <input type="checkbox" checked={local.walls !== false} onChange={(e) => { const n = { ...local, walls: e.target.checked }; setLocal(n); commit(n); }} /> Painted walls block line of sight
          </label>
          <Field label={`Party sight radius: ${local.revealRadius} squares`}>
            <input type="range" min={1} max={12} value={local.revealRadius} onChange={(e) => { const n = { ...local, revealRadius: Number(e.target.value) }; setLocal(n); commit(n); }} style={{ width: '100%' }} />
          </Field>
          <div className="row wrap">
            <button className="btn sm" onClick={() => { const n = { ...local, fog: Array(local.cols * local.rows).fill(1) }; setLocal(n); commit(n); }}>Re-fog everything</button>
            <button className="btn sm" onClick={() => { const n = { ...local, fog: Array(local.cols * local.rows).fill(0) }; setLocal(n); commit(n); }}>Reveal everything</button>
            <button className="btn sm danger" onClick={() => { const n = { ...local, terrain: {} }; setLocal(n); commit(n); }}>Clear painting</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function resize(m, cols, rows) {
  const fog = Array(cols * rows).fill(1);
  for (let y = 0; y < Math.min(rows, m.rows); y++) for (let x = 0; x < Math.min(cols, m.cols); x++) fog[y * cols + x] = m.fog[y * m.cols + x];
  const terrain = Object.fromEntries(Object.entries(m.terrain).filter(([k]) => { const [x, y] = k.split(',').map(Number); return x < cols && y < rows; }));
  return { ...m, cols, rows, fog, terrain, tokens: m.tokens.map((t) => ({ ...t, x: Math.min(t.x, cols - 1), y: Math.min(t.y, rows - 1) })) };
}

// Line of sight: walls block cells behind them (Bresenham).
function blocked(m, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
  let x = x0, y = y0;
  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
    if (x === x1 && y === y1) break;
    const t = m.terrain[`${x},${y}`];
    if (t === 'wall') return true;
  }
  return false;
}

function TokenModal({ t, party, onClose, onSave, onDelete }) {
  const [tok, setTok] = useState(t);
  const set = (p) => setTok((x) => ({ ...x, ...p }));
  return (
    <Modal
      title={t.id ? 'Edit token' : 'New token'}
      onClose={onClose}
      footer={
        <>
          {t.id && <button className="btn danger" onClick={() => onDelete(t.id)}>Delete</button>}
          <button className="btn primary" onClick={() => onSave(tok)}>Save</button>
        </>
      }
    >
      <Field label="Party member (optional)">
        <select value={tok.charId || ''} onChange={(e) => {
          const p = party.find((x) => x.id === e.target.value);
          set(p ? { charId: p.id, label: p.name, kind: 'pc' } : { charId: '' });
        }}>
          <option value="">— none —</option>
          {party.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Label"><input value={tok.label} onChange={(e) => set({ label: e.target.value })} placeholder="e.g. Ireena, Zombie 2" /></Field>
      <div className="grid2">
        <Field label="Type">
          <select value={tok.kind} onChange={(e) => set({ kind: e.target.value })}>
            <option value="pc">Party</option>
            <option value="npc">NPC</option>
            <option value="enemy">Enemy</option>
          </select>
        </Field>
        <Field label="Size">
          <select value={tok.size || 1} onChange={(e) => set({ size: Number(e.target.value) })}>
            <option value={1}>Medium / small</option>
            <option value={2}>Large (2×2)</option>
            <option value={3}>Huge (3×3)</option>
            <option value={4}>Gargantuan (4×4)</option>
          </select>
        </Field>
      </div>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        {TOKEN_COLORS.map((c) => <button key={c} className={'swatch' + (tok.color === c ? ' on' : '')} style={{ background: c }} onClick={() => set({ color: c })} />)}
      </div>
      <label className="row small" style={{ gap: 10, marginBottom: 10 }}>
        <input type="checkbox" checked={!!tok.secret} onChange={(e) => set({ secret: e.target.checked })} /> Secret — invisible until the fog over it is cleared
      </label>
      <div className="row">
        <FilePick accept="image/*" onFile={async (f) => set({ img: await shrinkImage(f, 160) })}>🖼️ Token image</FilePick>
        {tok.img && <img src={tok.img} style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover' }} />}
        {tok.img && <button className="btn xs" onClick={() => set({ img: '' })}>Remove</button>}
      </div>
    </Modal>
  );
}
