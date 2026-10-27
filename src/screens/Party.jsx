import React, { useState } from 'react';
import { useApp, newCharacter } from '../lib/store.jsx';
import { readCharacterPdf, heuristicCharacter } from '../lib/pdf.js';
import { askClaude, extractJson } from '../lib/ai.js';
import { roll } from '../lib/dice.js';
import { applyHp, syncInitiativeHp } from '../lib/dm.js';
import { uid } from '../lib/db.js';
import { ABILITIES, ABILITY_NAMES, SKILLS, CLASSES, CONDITIONS, mod, fmtMod, profForLevel, slotsFor, LEVEL_XP } from '../lib/srd.js';
import { Field, Num, Modal, HpBar, FilePick, shrinkImage, toast, Tabs } from '../ui.jsx';

export default function Party({ openTool }) {
  const { campaign, update, settings } = useApp();
  const [sel, setSel] = useState(null);
  const [importing, setImporting] = useState(null);

  const selected = campaign.party.find((p) => p.id === sel);
  if (selected) return <Sheet c={selected} onBack={() => setSel(null)} openTool={openTool} />;

  async function importPdf(file) {
    setImporting('Reading the sheet…');
    try {
      const { fields, text } = await readCharacterPdf(file);
      let data = heuristicCharacter(fields);
      if (settings.apiKey) {
        setImporting('Asking Claude to read every detail…');
        const reply = await askClaude({
          settings,
          maxTokens: 3000,
          temperature: 0,
          system: 'You convert D&D 5e character sheet data into JSON. Output ONLY JSON.',
          messages: [{
            role: 'user',
            content: `Convert this character sheet into JSON with keys: name, race, class (main class name only), level (total), background, alignment, ac, hpMax, speed, abilities {str,dex,con,int,wis,cha} (scores), saves (array of ability keys like "dex" with proficiency), skills (lowercase skill names with proficiency), expertise (lowercase skill names), features (string, concise list of class/race features and feats), inventory (comma-separated string), gold (number), xp (number), spells {ability: "int"|"wis"|"cha", list: [{name, level (0 for cantrip), prepared (bool)}]}, personality (traits, ideals, bonds, flaws as one string).\n\nFORM FIELDS:\n${JSON.stringify(fields).slice(0, 12000)}\n\nPAGE TEXT:\n${text.slice(0, 14000)}`,
          }],
        });
        const j = extractJson(reply);
        if (j) data = { ...data, ...j, abilities: { ...data.abilities, ...(j.abilities || {}) } };
      }
      const ch = newCharacter({
        ...data,
        hp: data.hpMax,
        prof: profForLevel(data.level),
        spells: { slots: slotsFor(data.class, data.level), used: {}, list: data.spells?.list || [], ability: data.spells?.ability || 'int' },
      });
      update((c) => {
        if (c.party.length >= 4) c.party.pop();
        c.party.push(ch);
      });
      toast(`Imported ${ch.name}`);
    } catch (e) {
      toast("Couldn't read that PDF: " + (e.message || e));
    }
    setImporting(null);
  }

  return (
    <div className="page">
      <div className="row between">
        <h1>Party</h1>
        <span className="small muted">{campaign.party.length}/4</span>
      </div>
      <p className="small muted">★ is you. Everyone else is an AI companion with a mind of their own — give them a personality on their sheet.</p>
      {campaign.party.map((p) => (
        <div key={p.id} className="card row" style={{ cursor: 'pointer' }} onClick={() => setSel(p.id)}>
          <div className="portrait" style={p.portrait ? { backgroundImage: `url(${p.portrait})` } : null}>{!p.portrait && (p.id === campaign.playerId ? '★' : '🧝')}</div>
          <div className="grow">
            <div className="row between">
              <b>{p.name}</b>
              {p.levelUpReady && <span className="chip gold">Level up!</span>}
            </div>
            <div className="small muted">{p.race} {p.class} {p.level} · {p.id === campaign.playerId ? 'You' : 'AI companion'}</div>
            <HpBar hp={p.hp} max={p.hpMax} />
            <div className="tiny muted">{p.hp}/{p.hpMax} HP · AC {p.ac}</div>
          </div>
        </div>
      ))}
      {importing && <div className="card small">⏳ {importing}</div>}
      <div className="row wrap">
        <button
          className="btn primary"
          disabled={campaign.party.length >= 4}
          onClick={() => {
            const ch = newCharacter({ name: 'New Companion', personality: 'Describe who they are, what they want, and what they would never do.' });
            update((c) => void c.party.push(ch));
            setSel(ch.id);
          }}
        >
          + New character
        </button>
        <FilePick accept="application/pdf" className={'btn' + (campaign.party.length >= 4 ? ' disabled' : '')} onFile={importPdf}>
          ⬆️ Import D&D Beyond PDF
        </FilePick>
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>
        On D&D Beyond: open the character → Export to PDF, then pick the file here. {settings.apiKey ? 'Claude reads the whole sheet, including spells.' : 'Add an API key for a fuller import with spells and features.'}
        {campaign.party.length >= 4 && ' Party is full — importing replaces the last member.'}
      </p>
    </div>
  );
}

function Sheet({ c, onBack, openTool }) {
  const { campaign, update } = useApp();
  const [tab, setTab] = useState('main');
  const [delta, setDelta] = useState(5);
  const [lastRoll, setLastRoll] = useState(null);
  const isPlayer = campaign.playerId === c.id;

  const set = (patch) =>
    update((camp) => {
      const p = camp.party.find((x) => x.id === c.id);
      Object.assign(p, typeof patch === 'function' ? patch(p) || {} : patch);
      syncInitiativeHp(camp);
    });

  function rollCheck(label, bonus) {
    const r = roll(`1d20${bonus ? fmtMod(bonus) : ''}`);
    const line = `${c.name} — ${label}: ${r.detail} = ${r.total}`;
    setLastRoll({ label, r });
    update((camp) => {
      camp.rollHistory = [{ text: line, ts: Date.now() }, ...(camp.rollHistory || [])].slice(0, 100);
    });
  }

  const skillBonus = (s) => mod(c.abilities[SKILLS[s]]) + (c.skills.includes(s) ? c.prof : 0) + (c.expertise?.includes(s) ? c.prof : 0);
  const toggle = (key, val) => set((p) => ({ [key]: p[key].includes(val) ? p[key].filter((x) => x !== val) : [...p[key], val] }));

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn sm" onClick={onBack}>‹ Party</button>
        <div className="grow" />
        {!isPlayer && <button className="btn sm" onClick={() => update((camp) => void (camp.playerId = c.id))}>Make this me</button>}
        {c.levelUpReady || (campaign.leveling === 'xp' && c.xp >= LEVEL_XP[c.level]) ? (
          <button className="btn sm gold" onClick={() => openTool('levelup')}>⬆ Level up</button>
        ) : null}
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        <FilePick accept="image/*" className="portrait" onFile={async (f) => set({ portrait: await shrinkImage(f, 256) })}>
          {c.portrait ? <img src={c.portrait} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} /> : '📷'}
        </FilePick>
        <div className="grow">
          <input value={c.name} onChange={(e) => set({ name: e.target.value })} style={{ fontWeight: 700, fontSize: 18 }} />
          <div className="small muted" style={{ marginTop: 4 }}>{isPlayer ? '★ Your character' : 'AI companion'} · {c.race} {c.class} {c.level}</div>
        </div>
      </div>

      {lastRoll && (
        <div className="card tight row between" onClick={() => setLastRoll(null)}>
          <span className="small">{lastRoll.label}: <span className="muted">{lastRoll.r.detail}</span></span>
          <b style={{ fontSize: 22, color: lastRoll.r.crit ? '#7dff8a' : lastRoll.r.fumble ? '#ff6a5a' : 'var(--accent2)' }}>{lastRoll.r.total}</b>
        </div>
      )}

      <Tabs tabs={[['main', 'Stats'], ['skills', 'Skills'], ['spells', 'Spells'], ['gear', 'Gear'], ['about', 'About']]} value={tab} onChange={setTab} />

      {tab === 'main' && (
        <>
          <div className="card">
            <div className="row between">
              <h3 style={{ margin: 0 }}>Hit Points</h3>
              <span className="small muted">Temp <Num value={c.tempHp} min={0} onChange={(v) => set({ tempHp: v })} style={{ width: 60, display: 'inline-block', minHeight: 30, padding: 3 }} /></span>
            </div>
            <div className="row" style={{ margin: '8px 0' }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{c.hp}</div>
              <div className="muted">/</div>
              <Num value={c.hpMax} min={1} onChange={(v) => set({ hpMax: v, hp: Math.min(c.hp, v) })} style={{ width: 70 }} />
              <div className="grow" />
            </div>
            <HpBar hp={c.hp} max={c.hpMax} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn sm danger" onClick={() => set((p) => void applyHp(p, -delta))}>− Damage</button>
              <Num value={delta} min={0} onChange={setDelta} style={{ width: 64, textAlign: 'center' }} />
              <button className="btn sm" style={{ color: 'var(--good)' }} onClick={() => set((p) => void applyHp(p, delta))}>+ Heal</button>
            </div>
            {c.hp === 0 && (
              <div className="row" style={{ marginTop: 8 }}>
                <span className="small">Death saves</span>
                <button className="btn xs" onClick={() => set((p) => ({ deathSaves: { ...p.deathSaves, s: (p.deathSaves.s + 1) % 4 } }))}>✓ {c.deathSaves.s}/3</button>
                <button className="btn xs" onClick={() => set((p) => ({ deathSaves: { ...p.deathSaves, f: (p.deathSaves.f + 1) % 4 } }))}>✗ {c.deathSaves.f}/3</button>
                <button className="btn xs" onClick={() => rollCheck('Death save', 0)}>Roll</button>
              </div>
            )}
          </div>

          <div className="grid3" style={{ marginBottom: 10 }}>
            <div className="stat"><div className="lbl">AC</div><Num value={c.ac} onChange={(v) => set({ ac: v })} style={{ textAlign: 'center', fontWeight: 700 }} /></div>
            <div className="stat" onClick={() => rollCheck('Initiative', mod(c.abilities.dex))}><div className="lbl">Initiative</div><div className="v">{fmtMod(mod(c.abilities.dex))}</div></div>
            <div className="stat"><div className="lbl">Speed</div><input value={c.speed} onChange={(e) => set({ speed: e.target.value })} style={{ textAlign: 'center' }} /></div>
          </div>

          <div className="grid6" style={{ marginBottom: 10 }}>
            {ABILITIES.map((a) => (
              <div key={a} className="ability">
                <div className="lbl">{a.toUpperCase()}</div>
                <div className="m" onClick={() => rollCheck(ABILITY_NAMES[a] + ' check', mod(c.abilities[a]))}>{fmtMod(mod(c.abilities[a]))}</div>
                <Num value={c.abilities[a]} min={1} max={30} onChange={(v) => set((p) => ({ abilities: { ...p.abilities, [a]: v } }))} />
              </div>
            ))}
          </div>
          <p className="tiny muted center">Tap a modifier, save or skill to roll it.</p>

          <div className="card">
            <h3>Saving throws</h3>
            {ABILITIES.map((a) => {
              const b = mod(c.abilities[a]) + (c.saves.includes(a) ? c.prof : 0);
              return (
                <div key={a} className="skillrow">
                  <input type="checkbox" checked={c.saves.includes(a)} onChange={() => toggle('saves', a)} />
                  <span className="grow" onClick={() => rollCheck(ABILITY_NAMES[a] + ' save', b)}>{ABILITY_NAMES[a]}</span>
                  <b onClick={() => rollCheck(ABILITY_NAMES[a] + ' save', b)}>{fmtMod(b)}</b>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h3>Conditions</h3>
            <div className="row wrap">
              {Object.keys(CONDITIONS).filter((k) => k !== 'Concentration').map((k) => (
                <button key={k} className={'chip' + (c.conditions.includes(k) ? ' red' : '')} onClick={() => toggle('conditions', k)}>{k}</button>
              ))}
            </div>
            <Field label="Concentrating on"><input value={c.concentration || ''} onChange={(e) => set({ concentration: e.target.value })} placeholder="Spell name, or blank" /></Field>
          </div>

          <div className="card">
            <h3>Rest</h3>
            <div className="small muted" style={{ marginBottom: 6 }}>Hit dice: {c.level - (c.hitDiceUsed || 0)}/{c.level} d{CLASSES[c.class]?.hd || 8}</div>
            <div className="row wrap">
              <button
                className="btn sm"
                disabled={c.level - (c.hitDiceUsed || 0) <= 0 || c.hp >= c.hpMax}
                onClick={() => {
                  const r = roll(`1d${CLASSES[c.class]?.hd || 8}`);
                  const heal = Math.max(1, r.total + mod(c.abilities.con));
                  set((p) => {
                    applyHp(p, heal);
                    p.hitDiceUsed = (p.hitDiceUsed || 0) + 1;
                  });
                  toast(`Hit die: ${r.detail} ${fmtMod(mod(c.abilities.con))} → +${heal} HP`);
                }}
              >
                Spend hit die
              </button>
              <button
                className="btn sm"
                onClick={() => {
                  set((p) => {
                    if (CLASSES[p.class]?.caster === 'pact') p.spells.used = {};
                  });
                  toast('Short rest taken');
                }}
              >
                Short rest
              </button>
              <button
                className="btn sm gold"
                onClick={() => {
                  set((p) => ({
                    hp: p.hpMax,
                    tempHp: 0,
                    hitDiceUsed: Math.max(0, (p.hitDiceUsed || 0) - Math.max(1, Math.floor(p.level / 2))),
                    spells: { ...p.spells, used: {} },
                    conditions: p.conditions.filter((x) => x !== 'Exhaustion'),
                    concentration: '',
                    deathSaves: { s: 0, f: 0 },
                  }));
                  toast('Long rest: HP and spell slots restored');
                }}
              >
                Long rest
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'skills' && (
        <div className="card">
          <div className="small muted" style={{ marginBottom: 6 }}>☐ proficient · ★ expertise · Passive Perception {10 + skillBonus('perception')}</div>
          {Object.keys(SKILLS).map((s) => (
            <div key={s} className="skillrow">
              <input type="checkbox" checked={c.skills.includes(s)} onChange={() => toggle('skills', s)} />
              <button className={'btn xs' + (c.expertise?.includes(s) ? ' gold' : ' ghost')} onClick={() => toggle('expertise', s)}>★</button>
              <span className="grow" onClick={() => rollCheck(cap(s), skillBonus(s))} style={{ textTransform: 'capitalize' }}>
                {s} <span className="tiny muted">({SKILLS[s]})</span>
              </span>
              <b onClick={() => rollCheck(cap(s), skillBonus(s))}>{fmtMod(skillBonus(s))}</b>
            </div>
          ))}
        </div>
      )}

      {tab === 'spells' && <SpellPanel c={c} set={set} />}

      {tab === 'gear' && (
        <div className="card">
          <Field label="Gold (gp)"><Num value={c.gold} min={0} step={0.01} onChange={(v) => set({ gold: v })} /></Field>
          <Field label="Inventory (comma separated)"><textarea value={c.inventory} onChange={(e) => set({ inventory: e.target.value })} style={{ minHeight: 140 }} /></Field>
          <Field label="Features, traits & feats"><textarea value={c.features} onChange={(e) => set({ features: e.target.value })} style={{ minHeight: 160 }} /></Field>
        </div>
      )}

      {tab === 'about' && (
        <div className="card">
          <div className="grid2">
            <Field label="Race / species"><input value={c.race} onChange={(e) => set({ race: e.target.value })} /></Field>
            <Field label="Class">
              <select value={CLASSES[c.class] ? c.class : ''} onChange={(e) => set((p) => ({ class: e.target.value, spells: { ...p.spells, slots: slotsFor(e.target.value, p.level) } }))}>
                {!CLASSES[c.class] && <option value="">{c.class || 'Choose'}</option>}
                {Object.keys(CLASSES).map((k) => <option key={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Level"><Num value={c.level} min={1} max={20} onChange={(v) => set((p) => ({ level: v, prof: profForLevel(v), spells: { ...p.spells, slots: slotsFor(p.class, v) } }))} /></Field>
            <Field label="XP"><Num value={c.xp} min={0} onChange={(v) => set({ xp: v })} /></Field>
            <Field label="Alignment">
              <select value={c.alignment} onChange={(e) => set({ alignment: e.target.value })}>
                {['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'].map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Background"><input value={c.background} onChange={(e) => set({ background: e.target.value })} /></Field>
          </div>
          <Field label={isPlayer ? 'Personality & backstory' : 'Personality, motives & limits (the AI plays them by this)'}>
            <textarea value={c.personality} onChange={(e) => set({ personality: e.target.value })} style={{ minHeight: 140 }} placeholder="Traits, ideals, bonds, flaws. What would make them refuse?" />
          </Field>
          <Field label="Notes"><textarea value={c.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
          <button
            className="btn sm danger"
            disabled={isPlayer}
            onClick={() => {
              update((camp) => void (camp.party = camp.party.filter((p) => p.id !== c.id)));
              onBack();
            }}
          >
            Remove from party
          </button>
        </div>
      )}
    </div>
  );
}

const cap = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());

export function SpellPanel({ c, set }) {
  const [name, setName] = useState('');
  const [lvl, setLvl] = useState(1);
  const slots = Object.entries(c.spells.slots || {}).filter(([k, n]) => k !== 'pact' && n > 0);
  const ab = c.spells.ability || 'int';
  const atk = mod(c.abilities[ab]) + c.prof;
  return (
    <>
      <div className="card">
        <div className="row between">
          <h3 style={{ margin: 0 }}>Spell slots</h3>
          <select value={ab} onChange={(e) => set((p) => ({ spells: { ...p.spells, ability: e.target.value } }))} style={{ width: 'auto' }}>
            {['int', 'wis', 'cha'].map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="small muted" style={{ margin: '4px 0 8px' }}>Spell attack {fmtMod(atk)} · Save DC {8 + atk}{c.spells.slots?.pact ? ' · Pact magic (recharges on short rest)' : ''}</div>
        {slots.length === 0 && <div className="small muted">No spell slots for this class/level.</div>}
        {slots.map(([lv, n]) => {
          const used = c.spells.used?.[lv] || 0;
          return (
            <div key={lv} className="row" style={{ marginBottom: 6 }}>
              <span style={{ width: 54 }} className="small">Level {lv}</span>
              <div className="row wrap grow" style={{ gap: 4 }}>
                {Array.from({ length: n }, (_, i) => (
                  <button
                    key={i}
                    className="btn xs"
                    style={{ width: 30, background: i < n - used ? 'var(--accent2)' : 'var(--bg2)' }}
                    onClick={() => set((p) => ({ spells: { ...p.spells, used: { ...p.spells.used, [lv]: i < n - used ? used + 1 : Math.max(0, used - 1) } } }))}
                  />
                ))}
              </div>
              <span className="small muted">{n - used}/{n}</span>
            </div>
          );
        })}
        <button className="btn xs" onClick={() => set((p) => ({ spells: { ...p.spells, slots: slotsFor(p.class, p.level) } }))}>Reset slots to class table</button>
      </div>
      <div className="card">
        <h3>Spells known / prepared</h3>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((L) => {
          const list = (c.spells.list || []).filter((s) => Number(s.level) === L);
          if (!list.length) return null;
          return (
            <div key={L}>
              <div className="tiny muted" style={{ marginTop: 6 }}>{L === 0 ? 'CANTRIPS' : `LEVEL ${L}`}</div>
              {list.map((s) => (
                <div key={s.name} className="skillrow">
                  {L > 0 && <input type="checkbox" checked={!!s.prepared} onChange={() => set((p) => ({ spells: { ...p.spells, list: p.spells.list.map((x) => (x.name === s.name ? { ...x, prepared: !x.prepared } : x)) } }))} />}
                  <span className="grow">{s.name}</span>
                  <button className="btn xs ghost" onClick={() => set((p) => ({ spells: { ...p.spells, list: p.spells.list.filter((x) => x.name !== s.name) } }))}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
        <div className="row" style={{ marginTop: 10 }}>
          <input className="grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spell name" />
          <select value={lvl} onChange={(e) => setLvl(Number(e.target.value))} style={{ width: 80 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => <option key={l} value={l}>{l === 0 ? 'Cantrip' : 'L' + l}</option>)}
          </select>
          <button
            className="btn sm"
            disabled={!name.trim()}
            onClick={() => {
              set((p) => ({ spells: { ...p.spells, list: [...(p.spells.list || []), { name: name.trim(), level: lvl, prepared: true, id: uid() }] } }));
              setName('');
            }}
          >
            Add
          </button>
        </div>
      </div>
    </>
  );
}
