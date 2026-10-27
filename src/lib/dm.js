import { askClaude, extractJson } from './ai.js';
import { dicePool, roll } from './dice.js';
import { kv, uid } from './db.js';
import { searchChunks } from './pdf.js';
import { mod, fmtMod, SKILLS, LEVEL_XP, MOON_PHASES } from './srd.js';

export function charSummary(c, isPlayer) {
  const ab = Object.entries(c.abilities).map(([k, v]) => `${k.toUpperCase()} ${v}(${fmtMod(mod(v))})`).join(' ');
  const slots = Object.entries(c.spells?.slots || {})
    .filter(([k]) => k !== 'pact')
    .map(([lvl, n]) => `L${lvl}:${n - (c.spells.used?.[lvl] || 0)}/${n}`)
    .join(' ');
  const spells = (c.spells?.list || []).filter((s) => s.prepared || s.level === 0).map((s) => s.name).join(', ');
  return [
    `### ${c.name}${isPlayer ? ' (PLAYER CHARACTER — controlled by the human)' : ' (AI companion)'}`,
    `${c.race} ${c.class} ${c.level}, ${c.alignment}. AC ${c.ac}, HP ${c.hp}/${c.hpMax}${c.tempHp ? ` +${c.tempHp} temp` : ''}, speed ${c.speed}, prof +${c.prof}.`,
    ab,
    c.saves?.length ? `Save proficiencies: ${c.saves.join(', ')}` : '',
    c.skills?.length ? `Skills: ${c.skills.join(', ')}` : '',
    c.conditions?.length ? `Conditions: ${c.conditions.join(', ')}` : '',
    c.concentration ? `Concentrating on: ${c.concentration}` : '',
    slots ? `Spell slots: ${slots}` : '',
    spells ? `Spells: ${spells}` : '',
    c.features ? `Features: ${c.features.slice(0, 600)}` : '',
    c.inventory ? `Inventory: ${c.inventory.slice(0, 400)}` : '',
    c.personality && !isPlayer ? `Personality & motives: ${c.personality.slice(0, 500)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function transcript(log, n = 18) {
  return log
    .slice(-n)
    .map((e) => {
      if (e.role === 'player') return `PLAYER: ${e.text}`;
      if (e.role === 'dm') return `DM: ${e.text}`;
      if (e.role === 'companion') return `${e.name}: ${e.text}`;
      if (e.role === 'roll') return `[ROLL] ${e.text}`;
      return `[${e.role}] ${e.text}`;
    })
    .join('\n');
}

function timeString(cal) {
  const day = cal.day;
  const h = cal.hour;
  const phase = MOON_PHASES[Math.floor(((day + (cal.moonOffset || 0)) % 28) / 3.5)];
  const part = h < 5 ? 'deep night' : h < 8 ? 'dawn' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 20 ? 'dusk' : 'night';
  return `Day ${day}, ${String(h).padStart(2, '0')}:00 (${part}), ${phase}`;
}

const SCHEMA = `Respond with ONLY one JSON object, no prose outside it:
{
  "narration": "What happens, written for the player. Vivid second-person prose. Use short paragraphs separated by \\n\\n.",
  "companions": [{"name": "companion name", "speech": "what they say (optional)", "action": "what they do", "refused": false}],
  "rolls": [{"who": "who rolled", "label": "e.g. Goblin 1 attacks Mira", "formula": "1d20+4", "dice": [13], "total": 17, "outcome": "hit / miss / success / fail / damage"}],
  "playerRoll": null or {"label": "Perception check", "kind": "skill|ability|save|attack|damage|custom", "key": "perception or dex or wis etc.", "formula": "only for attack/damage/custom e.g. 1d20+5 or 1d8+3", "hiddenDC": 13},
  "updates": {
    "hp": [{"name": "exact name", "delta": -5}],
    "conditions": [{"name": "exact name", "add": [], "remove": []}],
    "slotsUsed": [{"name": "caster", "level": 1}],
    "gold": [{"name": "exact name", "delta": 0}],
    "items": [{"name": "exact name", "add": "item", "remove": "item"}],
    "xp": 0,
    "milestone": false,
    "location": "short current location name",
    "advanceHours": 0,
    "combat": {"start": [{"name": "Goblin 1", "hp": 7, "ac": 15, "init": 14}], "damage": [{"name": "Goblin 1", "delta": -6}], "end": false},
    "journal": {"npcs": [{"name": "", "note": ""}], "quests": [{"title": "", "status": "active|done|failed", "note": ""}], "loot": [""], "notes": [""]}
  },
  "suggestions": ["2-4 short things the player might do next"]
}
Omit keys you don't need (empty arrays are fine).`;

export async function runDmTurn({ campaign, settings, playerText, rollResult }) {
  const player = campaign.party.find((p) => p.id === campaign.playerId) || campaign.party[0];
  const companions = campaign.party.filter((p) => p.id !== player.id);
  const pool = dicePool();

  let moduleBlock = '';
  if (campaign.moduleId) {
    const chunks = (await kv.get('module:' + campaign.moduleId)) || [];
    const lastDm = [...campaign.log].reverse().find((e) => e.role === 'dm');
    const q = [playerText, rollResult, campaign.location, lastDm?.text?.slice(0, 600)].filter(Boolean).join(' ');
    const hits = searchChunks(chunks, q, 4, 7500);
    if (hits.length) {
      moduleBlock = `\n## Adventure source material (${campaign.moduleName}) — relevant excerpts\n${hits.map((h) => `[p.${h.page}]\n${h.text}`).join('\n\n')}`;
    }
  }

  const inCombat = campaign.initiative.entries.length > 0;
  const combatBlock = inCombat
    ? `\n## Combat in progress (round ${campaign.initiative.round})\n${campaign.initiative.entries
        .map((e, i) => `${i === campaign.initiative.turn ? '→ ' : ''}${e.name}: init ${e.init}, HP ${e.hp}/${e.hpMax}, AC ${e.ac}${e.conditions?.length ? ', ' + e.conditions.join(', ') : ''}`)
        .join('\n')}`
    : '';

  const quests = campaign.journal.quests.filter((q) => q.status === 'active').map((q) => `- ${q.title}: ${q.note || ''}`).join('\n');

  const system = `You are the Dungeon Master for a solo game of Dungeons & Dragons 5th edition (2014 rules). One human plays one character; you run the world, every NPC and monster, AND the AI companions in the party.

## Campaign
Name: ${campaign.name}
Setting: ${campaign.setting || 'Classic fantasy'}
Leveling: ${campaign.leveling === 'milestone' ? 'Milestone (set "milestone": true only when the party clearly hits a story milestone)' : 'Experience points (award "xp" per character after defeating foes or overcoming challenges)'}
${campaign.moduleId && campaign.followModule ? `Follow the published adventure "${campaign.moduleName}" faithfully: its locations, NPCs, events, secrets and stat blocks. Do not invent major deviations unless the player explicitly asks. Use the excerpts below when relevant.` : ''}

## How to DM
- Narration style: ${settings.narration === 'brief' ? 'concise, 1-2 short paragraphs' : 'rich and atmospheric, 2-4 paragraphs, engaging all senses'}.
- NEVER reveal secrets, hidden DCs, monster HP, traps, or plot twists the characters haven't discovered. Describe only what they perceive.
- ${settings.forgiving ? 'Be a little forgiving: give fair warnings before deadly danger, allow creative solutions, and avoid instant character death from bad luck.' : 'Play it straight: consequences are real.'}
- Never decide what the PLAYER CHARACTER does, says, thinks or feels. End each turn at a point where the player can act.
- The player rolls their own dice. When a check, save, attack or damage roll for the player character is needed, ask for it with "playerRoll" and STOP — resolve it next turn when you receive the result. Put the DC in hiddenDC; it is never shown.
- You roll for NPCs, monsters and companions using ONLY the pre-rolled dice below, consuming each list in order and never reusing a value. Report every roll in "rolls" with the dice you used.
- Track HP, conditions, spell slots, gold, items, time and location through "updates". Damage to party members uses negative hp deltas.
- Start combat with "combat.start" (include each enemy's HP and AC and rolled initiative; party initiative is handled by the app). On enemy turns, act for them. End with "combat.end": true.

## AI companions
Each companion is an independent person with their own will. They act according to their alignment, personality, stats and the situation — not merely as the player's tools. They may disagree, suggest other plans, or flatly refuse requests that clash with their values (set "refused": true and explain in their voice). In combat they choose their own sensible tactics and roll with the pre-rolled dice. Keep each voice distinct. Not every companion must speak every turn.

## Pre-rolled dice for this turn
${Object.entries(pool).map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n')}

## Party
${[player, ...companions].map((c) => charSummary(c, c.id === player.id)).join('\n\n')}

## State
Location: ${campaign.location || 'unknown'}
Time: ${timeString(campaign.calendar)}
${quests ? `Active quests:\n${quests}` : ''}${combatBlock}
${campaign.pendingRoll ? `\nYou previously asked the player for: ${campaign.pendingRoll.label} (hidden DC ${campaign.pendingRoll.hiddenDC ?? 'n/a'}).` : ''}
${campaign.summary ? `\n## Story so far\n${campaign.summary}` : ''}
${moduleBlock}

${SCHEMA}`;

  const userMsg = `## Recent events\n${transcript(campaign.log) || '(This is the start of the adventure. Open with a strong scene that introduces the setting and gives the party a reason to act.)'}\n\n## Now\n${
    rollResult ? `[ROLL RESULT] ${rollResult}` : `PLAYER (${player.name}): ${playerText}`
  }`;

  const text = await askClaude({ settings, system, messages: [{ role: 'user', content: userMsg }], maxTokens: 2500 });
  const json = extractJson(text);
  if (!json) return { narration: text.trim(), companions: [], rolls: [], updates: {}, suggestions: [] };
  return json;
}

const find = (list, name) => {
  const n = String(name || '').toLowerCase().trim();
  return list.find((x) => x.name.toLowerCase() === n) || list.find((x) => x.name.toLowerCase().startsWith(n.split(' ')[0]) && n.length > 2);
};

// Apply a DM response to a campaign draft (mutates).
export function applyDmResult(c, r) {
  const ts = Date.now();
  if (r.rolls?.length) {
    for (const rl of r.rolls) {
      c.log.push({ id: uid(), role: 'roll', name: rl.who, ts, text: `${rl.label}: ${rl.formula} → ${(rl.dice || []).join(', ')} = ${rl.total}${rl.outcome ? ` (${rl.outcome})` : ''}`, dm: true });
    }
  }
  if (r.narration) c.log.push({ id: uid(), role: 'dm', ts, text: r.narration });
  for (const comp of r.companions || []) {
    const t = [comp.speech ? `“${comp.speech}”` : '', comp.action ? `*${comp.action}*` : ''].filter(Boolean).join(' ');
    if (t) c.log.push({ id: uid(), role: 'companion', name: comp.name, ts, text: t, refused: !!comp.refused });
  }
  const u = r.updates || {};
  const party = c.party;
  for (const h of u.hp || []) {
    const p = find(party, h.name);
    if (p) applyHp(p, Number(h.delta) || 0);
    else {
      const e = find(c.initiative.entries, h.name);
      if (e) e.hp = Math.max(0, Math.min(e.hpMax, e.hp + (Number(h.delta) || 0)));
    }
  }
  for (const cd of u.conditions || []) {
    const p = find(party, cd.name) || find(c.initiative.entries, cd.name);
    if (!p) continue;
    p.conditions = p.conditions || [];
    for (const a of cd.add || []) if (!p.conditions.includes(a)) p.conditions.push(a);
    p.conditions = p.conditions.filter((x) => !(cd.remove || []).includes(x));
  }
  for (const s of u.slotsUsed || []) {
    const p = find(party, s.name);
    if (p) p.spells.used[s.level] = Math.min(p.spells.slots[s.level] || 0, (p.spells.used[s.level] || 0) + 1);
  }
  for (const g of u.gold || []) {
    const p = find(party, g.name);
    if (p) p.gold = Math.max(0, Math.round(((Number(p.gold) || 0) + Number(g.delta)) * 100) / 100);
  }
  for (const it of u.items || []) {
    const p = find(party, it.name);
    if (!p) continue;
    if (it.add) p.inventory = (p.inventory ? p.inventory + ', ' : '') + it.add;
    if (it.remove) p.inventory = (p.inventory || '').split(/,\s*/).filter((x) => x.toLowerCase() !== it.remove.toLowerCase()).join(', ');
  }
  if (u.xp && c.leveling === 'xp') {
    for (const p of party) p.xp = (Number(p.xp) || 0) + Number(u.xp);
    c.log.push({ id: uid(), role: 'system', ts, text: `Each party member gains ${u.xp} XP.` });
  }
  if (u.milestone) {
    for (const p of party) p.levelUpReady = true;
    c.log.push({ id: uid(), role: 'system', ts, text: 'Milestone reached — the party can level up!' });
  }
  if (c.leveling === 'xp') for (const p of party) if (p.level < 20 && p.xp >= LEVEL_XP[p.level]) p.levelUpReady = true;
  if (u.location) c.location = u.location;
  if (u.advanceHours) advanceTime(c, Number(u.advanceHours));
  const cb = u.combat || {};
  if (cb.start?.length) {
    const entries = cb.start.map((e) => ({ id: uid(), name: e.name, init: Number(e.init) || roll('1d20').total, hp: Number(e.hp) || 10, hpMax: Number(e.hp) || 10, ac: Number(e.ac) || 12, conditions: [], enemy: true }));
    const already = new Set(c.initiative.entries.map((e) => e.name));
    if (!c.initiative.entries.some((e) => e.charId)) {
      for (const p of party) {
        const r2 = roll('1d20');
        const init = r2.total + mod(p.abilities.dex);
        c.initiative.entries.push({ id: uid(), charId: p.id, name: p.name, init, hp: p.hp, hpMax: p.hpMax, ac: p.ac, conditions: [] });
        c.log.push({ id: uid(), role: 'roll', name: p.name, ts, text: `${p.name} initiative: d20 ${r2.total} ${fmtMod(mod(p.abilities.dex))} = ${init}` });
      }
    }
    for (const e of entries) if (!already.has(e.name)) c.initiative.entries.push(e);
    c.initiative.entries.sort((a, b) => b.init - a.init);
    c.initiative.round = c.initiative.round || 1;
    c.initiative.turn = 0;
  }
  for (const d of cb.damage || []) {
    const e = find(c.initiative.entries, d.name);
    if (e) e.hp = Math.max(0, Math.min(e.hpMax, e.hp + (Number(d.delta) || 0)));
  }
  if (cb.end) c.initiative = { round: 1, turn: 0, entries: [] };
  syncInitiativeHp(c);
  const j = u.journal || {};
  for (const n of j.npcs || []) {
    if (!n.name) continue;
    const ex = c.journal.npcs.find((x) => x.name.toLowerCase() === n.name.toLowerCase());
    if (ex) ex.note = n.note ? (ex.note ? ex.note + ' ' : '') + n.note : ex.note;
    else c.journal.npcs.push({ id: uid(), name: n.name, note: n.note || '', attitude: 0 });
  }
  for (const q of j.quests || []) {
    if (!q.title) continue;
    const ex = c.journal.quests.find((x) => x.title.toLowerCase() === q.title.toLowerCase());
    if (ex) Object.assign(ex, { status: q.status || ex.status, note: q.note || ex.note });
    else c.journal.quests.push({ id: uid(), title: q.title, status: q.status || 'active', note: q.note || '' });
  }
  for (const l of j.loot || []) if (l) c.journal.loot.push({ id: uid(), text: l, day: c.calendar.day });
  for (const n of j.notes || []) if (n) c.journal.notes.push({ id: uid(), text: n, day: c.calendar.day, auto: true });

  c.pendingRoll = r.playerRoll && r.playerRoll.label ? r.playerRoll : null;
  c.suggestions = r.suggestions || [];
}

export function applyHp(p, delta) {
  if (delta < 0 && p.tempHp) {
    const absorbed = Math.min(p.tempHp, -delta);
    p.tempHp -= absorbed;
    delta += absorbed;
  }
  p.hp = Math.max(0, Math.min(p.hpMax, (Number(p.hp) || 0) + delta));
  if (p.hp > 0) p.deathSaves = { s: 0, f: 0 };
}

export function syncInitiativeHp(c) {
  for (const e of c.initiative.entries) {
    if (e.charId) {
      const p = c.party.find((x) => x.id === e.charId);
      if (p) Object.assign(e, { hp: p.hp, hpMax: p.hpMax, ac: p.ac, name: p.name, conditions: p.conditions });
    }
  }
}

export function advanceTime(c, hours) {
  let h = c.calendar.hour + hours;
  while (h >= 24) {
    h -= 24;
    c.calendar.day += 1;
  }
  while (h < 0) {
    h += 24;
    c.calendar.day = Math.max(1, c.calendar.day - 1);
  }
  c.calendar.hour = Math.round(h);
}

// Roll for the player's pending check using their sheet.
export function rollForPlayer(player, req, mode = 'normal') {
  const key = String(req.key || '').toLowerCase();
  let formula = req.formula;
  let bonus = 0;
  if (!formula || req.kind === 'skill' || req.kind === 'ability' || req.kind === 'save') {
    if (req.kind === 'skill' && SKILLS[key]) {
      bonus = mod(player.abilities[SKILLS[key]]);
      if ((player.skills || []).includes(key)) bonus += player.prof;
      if ((player.expertise || []).includes(key)) bonus += player.prof;
    } else if (req.kind === 'save' && player.abilities[key] !== undefined) {
      bonus = mod(player.abilities[key]) + ((player.saves || []).includes(key) ? player.prof : 0);
    } else if (player.abilities[key] !== undefined) {
      bonus = mod(player.abilities[key]);
    }
    formula = `1d20${bonus ? fmtMod(bonus) : ''}`;
  }
  return roll(formula, mode);
}

// Fold older log entries into the running summary to keep prompts small.
export async function maybeSummarize(campaign, settings) {
  const keep = 18;
  const upto = campaign.log.length - keep;
  if (upto - (campaign.summarizedUpTo || 0) < 24) return null;
  const chunk = campaign.log.slice(campaign.summarizedUpTo || 0, upto);
  const text = await askClaude({
    settings,
    maxTokens: 900,
    temperature: 0.3,
    system: 'You maintain a concise campaign log for a D&D game. Merge the previous summary and new events into one updated summary (max ~350 words). Keep names, places, promises, unresolved threads, and items gained. Past tense, third person. Plain text only.',
    messages: [{ role: 'user', content: `PREVIOUS SUMMARY:\n${campaign.summary || '(none)'}\n\nNEW EVENTS:\n${transcript(chunk, chunk.length)}` }],
  });
  return { summary: text.trim(), summarizedUpTo: upto };
}
