import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { uid } from '../lib/db.js';
import { roll } from '../lib/dice.js';
import { NAMES, SURNAMES, TAVERN_A, TAVERN_B, WEATHER, ENCOUNTERS, LOOT } from '../lib/srd.js';
import { Tabs, pick, toast } from '../ui.jsx';

const TRAITS = ['nervous and talkative', 'gruff but fair', 'overly friendly', 'suspicious of strangers', 'grieving a loss', 'secretly cowardly', 'pious and stern', 'drunk and loud', 'curious about magic', 'greedy', 'kind to animals', 'haunted by nightmares'];
const JOBS = ['innkeeper', 'blacksmith', 'priest', 'farmer', 'guard', 'merchant', 'hunter', 'herbalist', 'beggar', 'noble', 'gravedigger', 'fortune teller'];
const SPECIALS = ['spiced wine', 'mutton stew', 'black bread and cheese', 'smoked fish', 'mystery meat pie', 'honey mead', 'garlic soup', 'roast boar'];

export default function Generators() {
  const { update } = useApp();
  const [tab, setTab] = useState('npc');
  const [race, setRace] = useState('Human');
  const [terrain, setTerrain] = useState('Forest');
  const [tier, setTier] = useState(Object.keys(LOOT)[0]);
  const [out, setOut] = useState([]);

  const push = (text) => setOut((o) => [{ id: uid(), text }, ...o].slice(0, 20));
  const gen = () => {
    if (tab === 'npc') push(`**${pick(NAMES[race])} ${pick(SURNAMES)}** — ${race.toLowerCase()} ${pick(JOBS)}, ${pick(TRAITS)}.`);
    if (tab === 'name') push(Array.from({ length: 5 }, () => `${pick(NAMES[race])} ${pick(SURNAMES)}`).join(' · '));
    if (tab === 'tavern') push(`**The ${pick(TAVERN_A)} ${pick(TAVERN_B)}** — run by a ${pick(TRAITS)} keeper. Tonight's special: ${pick(SPECIALS)}. Rooms ${pick(['5 sp', '8 sp', '1 gp', '2 gp'])} a night.`);
    if (tab === 'encounter') push(`**${terrain}:** ${pick(ENCOUNTERS[terrain])}.`);
    if (tab === 'loot') {
      const t = pick(LOOT[tier]).replace(/(\d+d\d+)/g, (m) => `${m} (${roll(m).total})`);
      push(`**Loot:** ${t}`);
    }
    if (tab === 'weather') push(`**Weather:** ${pick(WEATHER)}. Temperature ${pick(['bitter', 'cold', 'cool', 'mild', 'warm'])}.`);
  };

  return (
    <div className="page">
      <Tabs tabs={[['npc', 'NPC'], ['name', 'Names'], ['tavern', 'Tavern'], ['encounter', 'Encounter'], ['loot', 'Loot'], ['weather', 'Weather']]} value={tab} onChange={setTab} />
      {(tab === 'npc' || tab === 'name') && (
        <select value={race} onChange={(e) => setRace(e.target.value)} style={{ marginBottom: 10 }}>
          {Object.keys(NAMES).map((r) => <option key={r}>{r}</option>)}
        </select>
      )}
      {tab === 'encounter' && (
        <select value={terrain} onChange={(e) => setTerrain(e.target.value)} style={{ marginBottom: 10 }}>
          {Object.keys(ENCOUNTERS).map((r) => <option key={r}>{r}</option>)}
        </select>
      )}
      {tab === 'loot' && (
        <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ marginBottom: 10 }}>
          {Object.keys(LOOT).map((r) => <option key={r}>{r}</option>)}
        </select>
      )}
      <button className="btn primary" style={{ width: '100%' }} onClick={gen}>🎰 Generate</button>
      <div className="spacer" />
      {out.map((o) => (
        <div key={o.id} className="card tight row">
          <div className="grow small" dangerouslySetInnerHTML={{ __html: o.text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') }} />
          <button className="btn xs" title="Save to journal" onClick={() => {
            update((c) => {
              const clean = o.text.replace(/\*\*/g, '');
              if (tab === 'npc') c.journal.npcs.unshift({ id: uid(), name: clean.split(' — ')[0], note: clean.split(' — ')[1] || '', attitude: 0 });
              else if (tab === 'loot') c.journal.loot.unshift({ id: uid(), text: clean.replace(/^Loot: /, ''), day: c.calendar.day });
              else c.journal.notes.unshift({ id: uid(), text: clean, day: c.calendar.day });
            });
            toast('Saved to journal');
          }}>📓</button>
        </div>
      ))}
    </div>
  );
}
