import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { uid } from '../lib/db.js';
import { roll } from '../lib/dice.js';
import { EQUIPMENT, mod, fmtMod } from '../lib/srd.js';
import { Field, Num, Modal, toast } from '../ui.jsx';

const gp = (n) => (n >= 1 ? `${+n.toFixed(2)} gp` : n >= 0.1 ? `${Math.round(n * 10)} sp` : `${Math.round(n * 100)} cp`);

export default function Shop() {
  const { campaign, update } = useApp();
  const [shopId, setShopId] = useState(campaign.shops[0]?.id);
  const [buyer, setBuyer] = useState(campaign.playerId);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', keeper: '', markup: 0 });
  const [newItem, setNewItem] = useState({ name: '', price: 1, qty: 1 });
  const [sell, setSell] = useState({ name: '', value: 10 });
  const shop = campaign.shops.find((s) => s.id === shopId);
  const b = campaign.party.find((p) => p.id === buyer) || campaign.party[0];

  const price = (it) => it.price * (1 + (shop.markup || 0) / 100) * (1 + (shop.haggle || 0) / 100);
  const editShop = (fn) => update((c) => fn(c.shops.find((s) => s.id === shop.id), c));

  function buy(it) {
    const cost = price(it);
    if ((b.gold || 0) < cost - 1e-9) return toast(`${b.name} can't afford that`);
    editShop((s, c) => {
      const p = c.party.find((x) => x.id === b.id);
      p.gold = Math.round((p.gold - cost) * 100) / 100;
      p.inventory = (p.inventory ? p.inventory + ', ' : '') + it.name;
      const item = s.stock.find((x) => x.id === it.id);
      if (item.qty !== -1) item.qty -= 1;
      s.stock = s.stock.filter((x) => x.qty !== 0);
    });
    toast(`${b.name} bought ${it.name} for ${gp(cost)}`);
  }

  function haggle() {
    const bonus = mod(b.abilities.cha) + (b.skills.includes('persuasion') ? b.prof : 0);
    const r = roll(`1d20${fmtMod(bonus)}`);
    const dc = 15;
    const delta = r.total >= dc + 5 ? -20 : r.total >= dc ? -10 : r.total < 8 ? 10 : 0;
    editShop((s) => void (s.haggle = delta));
    toast(`Persuasion ${r.total} (DC ${dc}): ${delta < 0 ? `prices ${-delta}% off` : delta > 0 ? 'offended — prices up 10%' : 'no deal'}`);
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <select className="grow" value={shopId || ''} onChange={(e) => setShopId(e.target.value)}>
          {!campaign.shops.length && <option value="">No shops yet</option>}
          {campaign.shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="btn sm primary" onClick={() => setCreating(true)}>+ Shop</button>
      </div>

      {shop ? (
        <>
          <div className="card">
            <div className="row between">
              <div><b>{shop.name}</b>{shop.keeper && <div className="small muted">Keeper: {shop.keeper}</div>}</div>
              <button className="btn xs ghost danger" onClick={() => { update((c) => void (c.shops = c.shops.filter((s) => s.id !== shop.id))); setShopId(campaign.shops.find((s) => s.id !== shop.id)?.id); }}>Delete</button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span className="small muted">Buyer</span>
              <select value={b.id} onChange={(e) => setBuyer(e.target.value)} className="grow">
                {campaign.party.map((p) => <option key={p.id} value={p.id}>{p.name} ({gp(p.gold || 0)})</option>)}
              </select>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn sm" onClick={haggle}>🗣️ Haggle</button>
              <span className="small muted">Markup {shop.markup || 0}%{shop.haggle ? ` · haggled ${shop.haggle > 0 ? '+' : ''}${shop.haggle}%` : ''}</span>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {shop.stock.map((it) => (
              <div key={it.id} className="list-item">
                <div className="grow"><b className="small">{it.name}</b><div className="tiny muted">{it.qty === -1 ? 'plenty' : `${it.qty} left`}</div></div>
                <span className="small">{gp(price(it))}</span>
                <button className="btn xs gold" onClick={() => buy(it)}>Buy</button>
              </div>
            ))}
            {!shop.stock.length && <div className="empty">Sold out.</div>}
          </div>

          <div className="card">
            <h3>Add stock</h3>
            <select onChange={(e) => { const eq = EQUIPMENT.find((x) => x.name === e.target.value); if (eq) setNewItem({ name: eq.name, price: eq.price, qty: 1 }); }} value="">
              <option value="">From the equipment list…</option>
              {EQUIPMENT.map((e) => <option key={e.name}>{e.name}</option>)}
            </select>
            <div className="grid3" style={{ marginTop: 6 }}>
              <Field label="Item"><input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} /></Field>
              <Field label="Price (gp)"><Num value={newItem.price} min={0} step={0.01} onChange={(v) => setNewItem({ ...newItem, price: v })} /></Field>
              <Field label="Qty (-1 = ∞)"><Num value={newItem.qty} min={-1} onChange={(v) => setNewItem({ ...newItem, qty: v })} /></Field>
            </div>
            <button className="btn sm" disabled={!newItem.name.trim()} onClick={() => { editShop((s) => void s.stock.push({ id: uid(), ...newItem, name: newItem.name.trim() })); setNewItem({ name: '', price: 1, qty: 1 }); }}>Add</button>
          </div>

          <div className="card">
            <h3>Sell to {shop.keeper || 'the shop'}</h3>
            <p className="tiny muted">Shops usually pay half an item's value.</p>
            <div className="grid2">
              <Field label="Item"><input value={sell.name} onChange={(e) => setSell({ ...sell, name: e.target.value })} /></Field>
              <Field label="Full value (gp)"><Num value={sell.value} min={0} step={0.01} onChange={(v) => setSell({ ...sell, value: v })} /></Field>
            </div>
            <button className="btn sm" disabled={!sell.name.trim()} onClick={() => {
              const pay = Math.round(sell.value * 0.5 * (1 - (shop.haggle || 0) / 100) * 100) / 100;
              update((c) => {
                const p = c.party.find((x) => x.id === b.id);
                p.gold = Math.round(((p.gold || 0) + pay) * 100) / 100;
                p.inventory = (p.inventory || '').split(/,\s*/).filter((x) => x && x.toLowerCase() !== sell.name.trim().toLowerCase()).join(', ');
                const s = c.shops.find((x) => x.id === shop.id);
                s.stock.push({ id: uid(), name: sell.name.trim(), price: sell.value, qty: 1 });
              });
              toast(`${b.name} sold ${sell.name} for ${gp(pay)}`);
              setSell({ name: '', value: 10 });
            }}>Sell</button>
          </div>
        </>
      ) : (
        <div className="empty">Create a shop for each merchant your party meets.</div>
      )}

      {creating && (
        <Modal title="New shop" onClose={() => setCreating(false)} footer={
          <button className="btn primary" disabled={!form.name.trim()} onClick={() => {
            const s = { id: uid(), name: form.name.trim(), keeper: form.keeper.trim(), markup: form.markup, haggle: 0, stock: form.starter ? EQUIPMENT.slice(0, 24).map((e) => ({ id: uid(), ...e, qty: -1 })) : [] };
            update((c) => void c.shops.push(s));
            setShopId(s.id);
            setCreating(false);
            setForm({ name: '', keeper: '', markup: 0 });
          }}>Create</button>
        }>
          <Field label="Shop name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Blood on the Vine supplies" /></Field>
          <Field label="Shopkeeper"><input value={form.keeper} onChange={(e) => setForm({ ...form, keeper: e.target.value })} /></Field>
          <Field label="Price markup %"><Num value={form.markup} min={-90} max={500} onChange={(v) => setForm({ ...form, markup: v })} /></Field>
          <label className="row small" style={{ gap: 10 }}><input type="checkbox" checked={!!form.starter} onChange={(e) => setForm({ ...form, starter: e.target.checked })} /> Start with general adventuring gear</label>
        </Modal>
      )}
    </div>
  );
}
