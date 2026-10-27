import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
        {footer && <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return <label className="f">{label}{children}</label>;
}

export function Num({ value, onChange, min, max, step = 1, style }) {
  const [txt, setTxt] = useState(String(value ?? ''));
  useEffect(() => setTxt(String(value ?? '')), [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      value={txt}
      step={step}
      style={style}
      onChange={(e) => {
        setTxt(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(n)) onChange(clamp(n, min, max));
      }}
      onBlur={() => setTxt(String(value ?? ''))}
    />
  );
}
const clamp = (n, a, b) => Math.max(a ?? -Infinity, Math.min(b ?? Infinity, n));

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => {
        const [k, label] = Array.isArray(t) ? t : [t, t];
        return (
          <button key={k} className={'tab' + (value === k ? ' on' : '')} onClick={() => onChange(k)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

let toastSetter = null;
export function ToastHost() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    toastSetter = setMsg;
    return () => (toastSetter = null);
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast">{msg}</div> : null;
}
export const toast = (m) => toastSetter && toastSetter(m);

export function HpBar({ hp, max }) {
  const pct = Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100));
  return (
    <div className={'hpbar' + (pct <= 25 ? ' crit' : pct <= 50 ? ' low' : '')}>
      <div style={{ width: pct + '%' }} />
    </div>
  );
}

// Render DM prose with **bold** and *italic* and paragraphs.
export function Prose({ text }) {
  const paras = String(text || '').split(/\n\s*\n|\n/).filter((p) => p.trim());
  return paras.map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: inline(p) }} />);
}
export function inline(s) {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
}
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function readFileAsDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Shrink an image so maps and portraits don't bloat storage.
export async function shrinkImage(file, maxDim = 1600) {
  const url = await readFileAsDataUrl(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = scale < 1;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

export function FilePick({ accept, onFile, children, className = 'btn sm' }) {
  return (
    <label className={className} style={{ cursor: 'pointer' }}>
      {children}
      <input
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </label>
  );
}

// Save a text file: on Android write to Documents, in a browser download it.
export async function saveTextFile(name, text) {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    try {
      await Filesystem.requestPermissions();
    } catch {}
    await Filesystem.writeFile({ path: name, data: text, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
    toast(`Saved to Documents/${name}`);
    return;
  }
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
