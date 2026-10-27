import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { kv, uid } from './db.js';
import { profForLevel, slotsFor } from './srd.js';

const Ctx = createContext(null);

export function newCharacter(over = {}) {
  const c = {
    id: uid(),
    name: 'New Hero',
    race: 'Human',
    class: 'Fighter',
    level: 1,
    background: '',
    alignment: 'Neutral Good',
    ac: 14,
    hpMax: 12,
    hp: 12,
    tempHp: 0,
    speed: '30 ft',
    abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    saves: [],
    skills: [],
    expertise: [],
    features: '',
    inventory: '',
    gold: 10,
    xp: 0,
    hitDiceUsed: 0,
    personality: '',
    conditions: [],
    concentration: '',
    spells: { slots: {}, used: {}, list: [], ability: 'int' },
    portrait: '',
    deathSaves: { s: 0, f: 0 },
    notes: '',
    ...over,
  };
  if (!Object.keys(c.spells.slots || {}).length) c.spells.slots = slotsFor(c.class, c.level);
  c.prof = profForLevel(c.level);
  return c;
}

export function newCampaign(name = 'New Campaign', setting = '') {
  const id = uid();
  const hero = newCharacter({ name: 'Your Hero' });
  return {
    id,
    name,
    setting,
    leveling: /strahd/i.test(name + setting) ? 'milestone' : 'xp',
    followModule: true,
    moduleName: '',
    created: Date.now(),
    updated: Date.now(),
    playerId: hero.id,
    party: [hero],
    log: [],
    summary: '',
    summarizedUpTo: 0,
    location: '',
    pendingRoll: null,
    maps: [],
    activeMapId: null,
    initiative: { round: 1, turn: 0, entries: [] },
    journal: { notes: [], npcs: [], quests: [], loot: [] },
    strahd: { visited: {}, tarokka: {}, npcs: [] },
    calendar: { day: 1, hour: 8, events: [], moonOffset: 0 },
    shops: [],
    downtime: [],
    homebrew: { monsters: [], items: [] },
    encounter: { monsters: [] },
    sounds: { scenes: [], clips: [] },
    rollHistory: [],
  };
}

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettingsState] = useState({ apiKey: '', model: 'claude-sonnet-5-5', forgiving: true, narration: 'detailed' });
  const [index, setIndex] = useState([]); // [{id,name,updated}]
  const [campaign, setCampaignState] = useState(null);
  const saveTimer = useRef(null);
  const latest = useRef(null);

  useEffect(() => {
    (async () => {
      const s = await kv.get('settings');
      if (s) setSettingsState((p) => ({ ...p, ...s }));
      const idx = (await kv.get('campaigns')) || [];
      setIndex(idx);
      const activeId = await kv.get('activeCampaign');
      if (activeId) {
        const c = await kv.get('camp:' + activeId);
        if (c) setCampaignState(migrate(c));
      }
      setReady(true);
    })();
  }, []);

  const setSettings = useCallback((patch) => {
    setSettingsState((p) => {
      const n = { ...p, ...patch };
      kv.set('settings', n);
      return n;
    });
  }, []);

  const persist = useCallback((c) => {
    latest.current = c;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const cur = latest.current;
      await kv.set('camp:' + cur.id, cur);
      setIndex((idx) => {
        const n = [{ id: cur.id, name: cur.name, setting: cur.setting, updated: cur.updated }, ...idx.filter((i) => i.id !== cur.id)];
        kv.set('campaigns', n);
        return n;
      });
    }, 350);
  }, []);

  // update(fn): fn receives a deep copy it may mutate, or returns a new object.
  const update = useCallback(
    (fn) => {
      setCampaignState((prev) => {
        if (!prev) return prev;
        const draft = structuredClone(prev);
        const res = fn(draft);
        const next = res && typeof res === 'object' ? res : draft;
        next.updated = Date.now();
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const openCampaign = useCallback(async (id) => {
    const c = await kv.get('camp:' + id);
    if (c) {
      setCampaignState(migrate(c));
      kv.set('activeCampaign', id);
    }
  }, []);

  const createCampaign = useCallback(
    (name, setting) => {
      const c = newCampaign(name, setting);
      setCampaignState(c);
      kv.set('activeCampaign', c.id);
      persist(c);
      return c;
    },
    [persist]
  );

  const importCampaign = useCallback(
    async (data) => {
      if (data.media) {
        for (const [k, v] of Object.entries(data.media)) if (v) await kv.set(k, v);
        delete data.media;
      }
      const c = migrate({ ...data, id: uid(), name: data.name + ' (imported)' });
      setCampaignState(c);
      kv.set('activeCampaign', c.id);
      persist(c);
    },
    [persist]
  );

  const deleteCampaign = useCallback(async (id) => {
    await kv.del('camp:' + id);
    setIndex((idx) => {
      const n = idx.filter((i) => i.id !== id);
      kv.set('campaigns', n);
      return n;
    });
    setCampaignState((c) => (c && c.id === id ? null : c));
  }, []);

  const closeCampaign = useCallback(() => {
    setCampaignState(null);
    kv.del('activeCampaign');
  }, []);

  if (!ready) return <div className="splash">Lighting the candles…</div>;

  return (
    <Ctx.Provider value={{ settings, setSettings, index, campaign, update, openCampaign, createCampaign, importCampaign, deleteCampaign, closeCampaign }}>
      {children}
    </Ctx.Provider>
  );
}

// Fill in any fields added in newer versions of the app.
function migrate(c) {
  const base = newCampaign(c.name, c.setting);
  const out = { ...base, ...c };
  for (const k of ['journal', 'strahd', 'calendar', 'initiative', 'homebrew', 'encounter', 'sounds']) out[k] = { ...base[k], ...(c[k] || {}) };
  out.party = (c.party || []).map((p) => ({ ...newCharacter(), ...p, spells: { ...newCharacter().spells, ...(p.spells || {}) } }));
  return out;
}

export const useApp = () => useContext(Ctx);

export function usePlayer() {
  const { campaign } = useApp();
  return campaign?.party.find((p) => p.id === campaign.playerId) || campaign?.party[0];
}
