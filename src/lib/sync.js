// Import game state that a Claude chat (e.g. "Solo Table") writes out as JSON.
import { uid } from './db.js';
import { newCharacter } from './store.jsx';
import { profForLevel, slotsFor, CLASSES } from './srd.js';
import { syncInitiativeHp } from './dm.js';

export const SYNC_PROMPT = `From now on, whenever I say "sync", reply with ONLY a JSON code block of the current game state in exactly this format (fill in everything you know, keep names consistent):

\`\`\`json
{
  "soloDmSync": 1,
  "campaign": "campaign name",
  "location": "where the party is",
  "day": 1,
  "hour": 8,
  "summary": "3-6 sentence story so far, no secrets",
  "party": [
    {"name": "", "isPlayer": true, "race": "", "class": "", "level": 1, "hp": 10, "hpMax": 10, "tempHp": 0, "ac": 12, "speed": "30 ft",
     "abilities": {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
     "conditions": [], "concentration": "", "gold": 0, "xp": 0, "inventory": "comma, separated",
     "spellSlotsUsed": {"1": 0}, "spells": ["spell names"], "personality": "", "alignment": ""}
  ],
  "combat": null,
  "quests": [{"title": "", "status": "active", "note": ""}],
  "npcs": [{"name": "", "note": ""}],
  "loot": ["item"],
  "notes": ["anything important"]
}
\`\`\`

During a fight, "combat" is {"round": 1, "turn": "whose turn", "combatants": [{"name": "", "init": 10, "hp": 10, "hpMax": 10, "ac": 12, "conditions": [], "enemy": true}]} — describe enemy health only as the characters would see it if you prefer, but give numbers. Never include secrets the characters don't know. Now sync.`;

// Pull the sync object out of pasted text (the whole chat reply is fine).
export function parseSync(text) {
  const blocks = [...String(text).matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  const candidates = blocks.length ? blocks : [text];
  for (const src of candidates.reverse()) {
    const s = src.indexOf('{');
    const e = src.lastIndexOf('}');
    if (s < 0 || e <= s) continue;
    try {
      const j = JSON.parse(src.slice(s, e + 1));
      if (j && (j.party || j.soloDmSync || j.location)) return j;
    } catch {}
  }
  return null;
}

const norm = (s) => String(s || '').toLowerCase().trim();

// Apply sync data to a campaign draft (mutates). Returns a list of changes.
export function applySync(c, d) {
  const changes = [];
  if (d.campaign && c.name !== d.campaign && /^new campaign|^solo table/i.test(c.name)) c.name = d.campaign;
  if (d.location && d.location !== c.location) { changes.push(`Location: ${d.location}`); c.location = d.location; }
  if (Number.isFinite(+d.day) && +d.day > 0) c.calendar.day = +d.day;
  if (Number.isFinite(+d.hour)) c.calendar.hour = Math.max(0, Math.min(23, Math.round(+d.hour)));
  if (d.summary) c.summary = d.summary;

  for (const p of d.party || []) {
    if (!p?.name) continue;
    let ch = c.party.find((x) => norm(x.name) === norm(p.name));
    const isNew = !ch;
    if (isNew) {
      // Replace the untouched placeholder hero first.
      const placeholder = c.party.find((x) => x.name === 'Your Hero' || x.name === 'New Companion');
      if (placeholder) { ch = placeholder; ch.name = p.name; }
      else { ch = newCharacter({ name: p.name }); c.party.push(ch); }
    }
    const before = `${ch.hp}/${ch.hpMax}`;
    const setIf = (k, v) => { if (v !== undefined && v !== null && v !== '') ch[k] = v; };
    setIf('race', p.race);
    setIf('class', p.class);
    setIf('alignment', p.alignment);
    setIf('speed', p.speed);
    setIf('personality', p.personality);
    if (p.level) { ch.level = +p.level; ch.prof = profForLevel(ch.level); }
    if (CLASSES[ch.class] && (p.level || p.class)) ch.spells.slots = slotsFor(ch.class, ch.level);
    for (const k of ['hpMax', 'hp', 'tempHp', 'ac', 'gold', 'xp']) if (p[k] !== undefined && p[k] !== null && p[k] !== '') ch[k] = +p[k];
    if (p.abilities) ch.abilities = { ...ch.abilities, ...Object.fromEntries(Object.entries(p.abilities).map(([k, v]) => [k.toLowerCase().slice(0, 3), +v])) };
    if (Array.isArray(p.conditions)) ch.conditions = p.conditions.map((x) => String(x).replace(/^\w/, (m) => m.toUpperCase()));
    if (p.concentration !== undefined) ch.concentration = p.concentration || '';
    if (p.inventory !== undefined) ch.inventory = Array.isArray(p.inventory) ? p.inventory.join(', ') : String(p.inventory || '');
    if (p.spellSlotsUsed) ch.spells.used = Object.fromEntries(Object.entries(p.spellSlotsUsed).map(([k, v]) => [k, +v || 0]));
    if (Array.isArray(p.spells) && p.spells.length) {
      const known = new Map((ch.spells.list || []).map((s) => [norm(s.name), s]));
      ch.spells.list = p.spells.map((s) => (typeof s === 'string' ? { name: s, level: known.get(norm(s))?.level ?? 1, prepared: true } : { prepared: true, level: 1, ...s }));
    }
    if (p.isPlayer) c.playerId = ch.id;
    changes.push(isNew ? `Added ${ch.name}` : `${ch.name}: HP ${before} → ${ch.hp}/${ch.hpMax}`);
  }

  if (d.combat && Array.isArray(d.combat.combatants) && d.combat.combatants.length) {
    const entries = d.combat.combatants.map((e) => {
      const pc = c.party.find((x) => norm(x.name) === norm(e.name));
      return { id: uid(), charId: pc?.id, name: e.name, init: +e.init || 0, hp: +e.hp || 0, hpMax: +e.hpMax || +e.hp || 1, ac: +e.ac || 10, conditions: e.conditions || [], enemy: pc ? false : e.enemy !== false };
    }).sort((a, b) => b.init - a.init);
    const turnIdx = Math.max(0, entries.findIndex((e) => norm(e.name) === norm(d.combat.turn)));
    c.initiative = { round: +d.combat.round || 1, turn: turnIdx, entries };
    syncInitiativeHp(c);
    changes.push(`Combat: round ${c.initiative.round}, ${entries.length} combatants`);
  } else if (d.combat === null && c.initiative.entries.length) {
    c.initiative = { round: 1, turn: 0, entries: [] };
    changes.push('Combat ended');
  }

  for (const q of d.quests || []) {
    if (!q?.title) continue;
    const ex = c.journal.quests.find((x) => norm(x.title) === norm(q.title));
    if (ex) Object.assign(ex, { status: q.status || ex.status, note: q.note || ex.note });
    else { c.journal.quests.push({ id: uid(), title: q.title, status: q.status || 'active', note: q.note || '' }); changes.push(`Quest: ${q.title}`); }
  }
  for (const n of d.npcs || []) {
    if (!n?.name) continue;
    const ex = c.journal.npcs.find((x) => norm(x.name) === norm(n.name));
    if (ex) ex.note = n.note || ex.note;
    else { c.journal.npcs.push({ id: uid(), name: n.name, note: n.note || '', attitude: 0 }); changes.push(`NPC: ${n.name}`); }
  }
  for (const l of d.loot || []) {
    const t = typeof l === 'string' ? l : l?.name;
    if (t && !c.journal.loot.some((x) => norm(x.text) === norm(t))) c.journal.loot.push({ id: uid(), text: t, day: c.calendar.day });
  }
  for (const n of d.notes || []) {
    if (n && !c.journal.notes.some((x) => norm(x.text) === norm(n))) c.journal.notes.push({ id: uid(), text: n, day: c.calendar.day, auto: true });
  }
  c.lastSync = Date.now();
  return changes;
}
