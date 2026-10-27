// Reference data based on the 5e System Reference Document (SRD 5.1, CC-BY-4.0)
// plus original summaries. Double-check anything important against your books.

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

export const SKILLS = {
  acrobatics: 'dex', 'animal handling': 'wis', arcana: 'int', athletics: 'str', deception: 'cha',
  history: 'int', insight: 'wis', intimidation: 'cha', investigation: 'int', medicine: 'wis',
  nature: 'int', perception: 'wis', performance: 'cha', persuasion: 'cha', religion: 'int',
  'sleight of hand': 'dex', stealth: 'dex', survival: 'wis',
};

export const mod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);
export const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`);
export const profForLevel = (lvl) => Math.ceil((Number(lvl) || 1) / 4) + 1;

export const CONDITIONS = {
  Blinded: "Can't see; auto-fails sight checks. Attacks against it have advantage; its attacks have disadvantage.",
  Charmed: "Can't attack or target the charmer with harmful effects. The charmer has advantage on social checks with it.",
  Deafened: "Can't hear; auto-fails hearing checks.",
  Exhaustion: 'Six levels: 1 disadv. on checks; 2 speed halved; 3 disadv. on attacks and saves; 4 HP max halved; 5 speed 0; 6 death. A long rest removes one level.',
  Frightened: "Disadvantage on checks and attacks while the source is in sight; can't willingly move closer to it.",
  Grappled: 'Speed 0. Ends if the grappler is incapacitated or the target is moved out of reach.',
  Incapacitated: "Can't take actions or reactions.",
  Invisible: "Can't be seen without magic. Its attacks have advantage; attacks against it have disadvantage.",
  Paralyzed: 'Incapacitated, can\'t move or speak. Fails Str/Dex saves. Attacks against it have advantage; hits within 5 ft are crits.',
  Petrified: 'Turned to stone; incapacitated, resists all damage, immune to poison and disease. Fails Str/Dex saves.',
  Poisoned: 'Disadvantage on attack rolls and ability checks.',
  Prone: 'Can only crawl. Disadv. on attacks. Melee attacks within 5 ft have advantage against it, ranged have disadvantage. Standing costs half speed.',
  Restrained: 'Speed 0. Disadv. on attacks and Dex saves. Attacks against it have advantage.',
  Stunned: "Incapacitated, can't move, speaks falteringly. Fails Str/Dex saves. Attacks against it have advantage.",
  Unconscious: 'Incapacitated, drops what it holds, falls prone. Fails Str/Dex saves. Attacks have advantage; hits within 5 ft are crits.',
  Concentration: 'Taking damage: Con save DC 10 or half the damage, whichever is higher. Ends if incapacitated or you cast another concentration spell.',
};

export const QUICK_RULES = {
  Grappling: 'Use an attack to make an Athletics check contested by the target\'s Athletics or Acrobatics. On a win the target is grappled. Escaping uses an action and the same contest.',
  Shoving: 'Use an attack: Athletics vs the target\'s Athletics or Acrobatics. Win to push it 5 ft or knock it prone.',
  'Opportunity attacks': 'When a hostile creature you can see leaves your reach, you can use your reaction to make one melee attack. Disengage avoids this.',
  Cover: 'Half cover +2 AC and Dex saves. Three-quarters +5. Total cover: can\'t be targeted directly.',
  'Death saves': 'At 0 HP roll d20 each turn: 10+ success, under 10 failure. 1 = two failures, 20 = regain 1 HP. Three successes stabilize, three failures die. Damage at 0 HP is a failure (a crit is two).',
  'Short rest': 'At least 1 hour. Spend Hit Dice: roll each plus Con modifier to heal.',
  'Long rest': 'At least 8 hours. Regain all HP and half your total Hit Dice (min 1). Once per 24 hours.',
  'Two-weapon fighting': 'After attacking with a light melee weapon, use a bonus action to attack with another light weapon in the other hand; no ability modifier to its damage unless negative.',
  'Hiding': 'Dexterity (Stealth) contested by passive Perception of those who might notice. Need to be unseen or obscured.',
  'Falling': '1d6 bludgeoning per 10 ft fallen, max 20d6. Land prone unless you avoid the damage.',
  'Suffocating': 'Hold breath for 1 + Con mod minutes (min 30 s). Then survive Con mod rounds (min 1) before dropping to 0 HP.',
  'Advantage': 'Roll two d20s and use the higher (disadvantage: lower). Multiple sources don\'t stack; having both cancels out.',
};

export const XP_THRESHOLDS = {
  1: [25, 50, 75, 100], 2: [50, 100, 150, 200], 3: [75, 150, 225, 400], 4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100], 6: [300, 600, 900, 1400], 7: [350, 750, 1100, 1700], 8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400], 10: [600, 1200, 1900, 2800], 11: [800, 1600, 2400, 3600], 12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700], 15: [1400, 2800, 4300, 6400], 16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500], 19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700],
};

export const CR_XP = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
  '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000,
  '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000,
  '28': 120000, '29': 135000, '30': 155000,
};
export const CR_LIST = Object.keys(CR_XP);

export function encounterMultiplier(count) {
  if (count <= 1) return 1;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
}

export const LEVEL_XP = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

export const CLASSES = {
  Artificer: { hd: 8, caster: 'artificer' },
  Barbarian: { hd: 12, caster: null },
  Bard: { hd: 8, caster: 'full' },
  Cleric: { hd: 8, caster: 'full' },
  Druid: { hd: 8, caster: 'full' },
  Fighter: { hd: 10, caster: null, extraAsi: [6, 14] },
  Monk: { hd: 8, caster: null },
  Paladin: { hd: 10, caster: 'half' },
  Ranger: { hd: 10, caster: 'half' },
  Rogue: { hd: 8, caster: null, extraAsi: [10] },
  Sorcerer: { hd: 6, caster: 'full' },
  Warlock: { hd: 8, caster: 'pact' },
  Wizard: { hd: 6, caster: 'full' },
};
export const ASI_LEVELS = [4, 8, 12, 16, 19];

const FULL = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
const HALF = [[], [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
  [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]];

// Returns {1: n, 2: n, ...} spell slots for a class and level.
export function slotsFor(cls, level) {
  const info = CLASSES[cls];
  const lvl = Math.max(1, Math.min(20, Number(level) || 1));
  if (!info || !info.caster) return {};
  let row = [];
  if (info.caster === 'full') row = FULL[lvl];
  else if (info.caster === 'half') row = HALF[lvl];
  else if (info.caster === 'artificer') row = lvl === 1 ? [2] : HALF[lvl];
  else if (info.caster === 'pact') {
    const count = lvl === 1 ? 1 : lvl <= 10 ? 2 : lvl <= 16 ? 3 : 4;
    const slotLvl = Math.min(5, Math.ceil(lvl / 2));
    return { [slotLvl]: count, pact: true };
  }
  const out = {};
  row.forEach((n, i) => (out[i + 1] = n));
  return out;
}

export const MONSTERS = [
  ['Commoner', '0', 10, 4, '30 ft', 'Club +2 (1d4)'],
  ['Raven', '0', 12, 1, '10 ft, fly 50 ft', 'Beak +4 (1)'],
  ['Bandit', '1/8', 12, 11, '30 ft', 'Scimitar +3 (1d6+1); light crossbow +3 (1d8+1)'],
  ['Cultist', '1/8', 12, 9, '30 ft', 'Scimitar +3 (1d6+1)'],
  ['Guard', '1/8', 16, 11, '30 ft', 'Spear +3 (1d6+1)'],
  ['Giant Rat', '1/8', 12, 7, '30 ft', 'Bite +4 (1d4+2)'],
  ['Kobold', '1/8', 12, 5, '30 ft', 'Dagger +4 (1d4+2); pack tactics'],
  ['Goblin', '1/4', 15, 7, '30 ft', 'Scimitar +4 (1d6+2); nimble escape'],
  ['Skeleton', '1/4', 13, 13, '30 ft', 'Shortsword +4 (1d6+2); shortbow +4 (1d6+2)'],
  ['Zombie', '1/4', 8, 22, '20 ft', 'Slam +3 (1d6+1); undead fortitude'],
  ['Wolf', '1/4', 13, 11, '40 ft', 'Bite +4 (2d4+2), DC 11 Str or prone; pack tactics'],
  ['Swarm of Bats', '1/4', 12, 22, 'fly 30 ft', 'Bites +4 (2d4, half if swarm at half HP)'],
  ['Swarm of Rats', '1/4', 10, 24, '30 ft', 'Bites +2 (2d6, half if swarm at half HP)'],
  ['Black Bear', '1/2', 11, 19, '40 ft', 'Bite +3 (1d6+2), claws +3 (2d4+2)'],
  ['Gnoll', '1/2', 15, 22, '30 ft', 'Spear +4 (1d6+2); rampage'],
  ['Hobgoblin', '1/2', 18, 11, '30 ft', 'Longsword +3 (1d8+1); martial advantage'],
  ['Orc', '1/2', 13, 15, '30 ft', 'Greataxe +5 (1d12+3); aggressive'],
  ['Scout', '1/2', 13, 16, '30 ft', 'Two attacks: longbow +4 (1d8+2)'],
  ['Shadow', '1/2', 12, 16, '40 ft', 'Strength Drain +4 (2d6+2 necrotic, -1d4 Str)'],
  ['Thug', '1/2', 11, 32, '30 ft', 'Two attacks: mace +4 (1d6+2)'],
  ['Animated Armor', '1', 18, 33, '25 ft', 'Two attacks: slam +4 (1d6+2)'],
  ['Brown Bear', '1', 11, 34, '40 ft', 'Bite +6 (1d8+4), claws +6 (2d6+4)'],
  ['Bugbear', '1', 16, 27, '30 ft', 'Morningstar +4 (2d8+2); surprise attack'],
  ['Dire Wolf', '1', 14, 37, '50 ft', 'Bite +5 (2d6+3), DC 13 Str or prone'],
  ['Ghoul', '1', 12, 22, '30 ft', 'Claws +4 (2d4+2), DC 10 Con or paralyzed'],
  ['Giant Spider', '1', 14, 26, '30 ft, climb 30 ft', 'Bite +5 (1d8+3 + 2d8 poison); web'],
  ['Specter', '1', 12, 22, 'fly 50 ft', 'Life Drain +4 (3d6 necrotic)'],
  ['Bandit Captain', '2', 15, 65, '30 ft', 'Scimitar +5 (1d6+3) x2, dagger +5 (1d4+3)'],
  ['Berserker', '2', 13, 67, '30 ft', 'Greataxe +5 (1d12+3); reckless'],
  ['Cult Fanatic', '2', 13, 33, '30 ft', 'Two dagger attacks +4 (1d4+2); spells'],
  ['Gargoyle', '2', 15, 52, '30 ft, fly 60 ft', 'Bite +4 (1d6+2), claws +4 (1d6+2)'],
  ['Ghast', '2', 13, 36, '30 ft', 'Claws +5 (2d6+3), paralysis; stench'],
  ['Ogre', '2', 11, 59, '40 ft', 'Greatclub +6 (2d8+4)'],
  ['Ogre Zombie', '2', 8, 85, '30 ft', 'Morningstar +6 (2d8+4)'],
  ['Priest', '2', 13, 27, '25 ft', 'Mace +2 (1d6); spells'],
  ['Wererat', '2', 12, 33, '30 ft', 'Bite +4 (1d4+2), shortsword +4 (1d6+2)'],
  ['Basilisk', '3', 15, 52, '20 ft', 'Bite +5 (2d6+3 + 2d6 poison); petrifying gaze'],
  ['Green Hag', '3', 17, 82, '30 ft', 'Claws +6 (2d8+4); illusions'],
  ['Knight', '3', 18, 52, '30 ft', 'Two attacks: greatsword +5 (2d6+3)'],
  ['Minotaur', '3', 14, 76, '40 ft', 'Greataxe +6 (2d12+4); charge'],
  ['Mummy', '3', 11, 58, '20 ft', 'Rotting Fist +5 (2d6+3 + 3d6 necrotic); dreadful glare'],
  ['Owlbear', '3', 13, 59, '40 ft', 'Beak +7 (1d10+5), claws +7 (2d8+5)'],
  ['Veteran', '3', 17, 58, '30 ft', 'Two attacks: longsword +5 (1d8+3)'],
  ['Werewolf', '3', 12, 58, '30 ft (40 wolf)', 'Two attacks +4: bite (1d8+2), claws (2d4+2)'],
  ['Wight', '3', 14, 45, '30 ft', 'Two longsword +4 (1d8+2) or Life Drain +4 (1d6+2)'],
  ['Winter Wolf', '3', 13, 75, '50 ft', 'Bite +6 (2d6+4); cold breath'],
  ['Ghost', '4', 11, 45, 'fly 40 ft', 'Withering Touch +5 (4d6+3 necrotic); possession'],
  ['Night Hag', '5', 17, 112, '30 ft', 'Claws +7 (2d8+4); etherealness'],
  ['Troll', '5', 15, 84, '30 ft', 'Bite +7 (1d6+4), two claws +7 (2d6+4); regeneration'],
  ['Vampire Spawn', '5', 15, 82, '30 ft', 'Claws +6 (2d4+3), bite +6 (1d6+3 + 2d6 necrotic)'],
  ['Wraith', '5', 13, 67, 'fly 60 ft', 'Life Drain +6 (4d8+3 necrotic)'],
  ['Mage', '6', 12, 40, '30 ft', 'Dagger +5 (1d4+2); spells incl. fireball'],
  ['Young Green Dragon', '8', 18, 136, '40 ft, fly 80 ft', 'Bite +7, two claws +7; poison breath'],
  ['Vampire', '13', 16, 144, '30 ft', 'Unarmed +9 (1d8+4), bite +9 (1d6+4 + 3d6 necrotic); charm'],
].map(([name, cr, ac, hp, speed, attacks]) => ({ name, cr, ac, hp, speed, attacks }));

// DMG "monster statistics by CR" used for homebrew checks.
// [cr, prof, ac, hpMin, hpMax, atk, dmgMin, dmgMax, dc]
export const CR_TABLE = [
  ['0', 2, 13, 1, 6, 3, 0, 1, 13], ['1/8', 2, 13, 7, 35, 3, 2, 3, 13], ['1/4', 2, 13, 36, 49, 3, 4, 5, 13],
  ['1/2', 2, 13, 50, 70, 3, 6, 8, 13], ['1', 2, 13, 71, 85, 3, 9, 14, 13], ['2', 2, 13, 86, 100, 3, 15, 20, 13],
  ['3', 2, 13, 101, 115, 4, 21, 26, 13], ['4', 2, 14, 116, 130, 5, 27, 32, 14], ['5', 3, 15, 131, 145, 6, 33, 38, 15],
  ['6', 3, 15, 146, 160, 6, 39, 44, 15], ['7', 3, 15, 161, 175, 6, 45, 50, 15], ['8', 3, 16, 176, 190, 7, 51, 56, 16],
  ['9', 4, 16, 191, 205, 7, 57, 62, 16], ['10', 4, 17, 206, 220, 7, 63, 68, 16], ['11', 4, 17, 221, 235, 8, 69, 74, 17],
  ['12', 4, 17, 236, 250, 8, 75, 80, 17], ['13', 5, 18, 251, 265, 8, 81, 86, 18], ['14', 5, 18, 266, 280, 8, 87, 92, 18],
  ['15', 5, 18, 281, 295, 8, 93, 98, 18], ['16', 5, 18, 296, 310, 9, 99, 104, 18], ['17', 6, 19, 311, 325, 10, 105, 110, 19],
  ['18', 6, 19, 326, 340, 10, 111, 116, 19], ['19', 6, 19, 341, 355, 10, 117, 122, 19], ['20', 6, 19, 356, 400, 10, 123, 140, 19],
];

export const RARITY = {
  Common: { price: '50–100 gp', minLevel: 1 },
  Uncommon: { price: '101–500 gp', minLevel: 1 },
  Rare: { price: '501–5,000 gp', minLevel: 5 },
  'Very rare': { price: '5,001–50,000 gp', minLevel: 11 },
  Legendary: { price: '50,001+ gp', minLevel: 17 },
};

export const EQUIPMENT = [
  ['Backpack', 2], ['Bedroll', 1], ['Rope, hempen (50 ft)', 1], ['Torch', 0.01], ['Rations (1 day)', 0.5],
  ['Waterskin', 0.2], ['Tinderbox', 0.5], ['Crowbar', 2], ['Lantern, hooded', 5], ['Oil (flask)', 0.1],
  ['Healer\'s kit', 5], ['Potion of healing', 50], ['Holy water (flask)', 25], ['Holy symbol', 5],
  ['Component pouch', 25], ['Thieves\' tools', 25], ['Climber\'s kit', 25], ['Mirror, steel', 5],
  ['Arrows (20)', 1], ['Crossbow bolts (20)', 1], ['Dagger', 2], ['Handaxe', 5], ['Mace', 5],
  ['Quarterstaff', 0.2], ['Spear', 1], ['Shortsword', 10], ['Longsword', 15], ['Battleaxe', 10],
  ['Warhammer', 15], ['Greatsword', 50], ['Shortbow', 25], ['Longbow', 50], ['Crossbow, light', 25],
  ['Shield', 10], ['Leather armor', 10], ['Studded leather', 45], ['Chain shirt', 50], ['Scale mail', 50],
  ['Breastplate', 400], ['Chain mail', 75], ['Half plate', 750], ['Splint', 200], ['Plate', 1500],
].map(([name, price]) => ({ name, price }));

export const NAMES = {
  Human: ['Aldric', 'Mara', 'Tomas', 'Elena', 'Gareth', 'Lysa', 'Corin', 'Isolde', 'Bram', 'Wren', 'Jorin', 'Selka', 'Halden', 'Rosalind'],
  Barovian: ['Anya', 'Dmitri', 'Katya', 'Pavel', 'Mirela', 'Stefan', 'Ilyana', 'Vasil', 'Nadia', 'Bogdan', 'Oksana', 'Radu', 'Yelena', 'Lev'],
  Dwarf: ['Thrain', 'Borga', 'Durik', 'Helsa', 'Kortan', 'Mardred', 'Orsik', 'Vistra', 'Grunna', 'Baldur'],
  Elf: ['Aelar', 'Sariel', 'Thalion', 'Naivara', 'Erevan', 'Lia', 'Quarion', 'Shava', 'Ithil', 'Faen'],
  Halfling: ['Pip', 'Merry', 'Cade', 'Lidda', 'Osborn', 'Verna', 'Roscoe', 'Tansy', 'Finnan', 'Bree'],
  'Half-orc': ['Grosh', 'Ovak', 'Shura', 'Dench', 'Yevelda', 'Krusk', 'Engong', 'Baggi', 'Thokk', 'Volen'],
  Tiefling: ['Akmenos', 'Kallista', 'Mordai', 'Nemeia', 'Damakos', 'Orianna', 'Skamos', 'Rieta', 'Ekemon', 'Lerissa'],
};
export const SURNAMES = ['Ashford', 'Blackwood', 'Ironfoot', 'Moonwhisper', 'Thornbury', 'Vorlak', 'Greaves', 'Halloway', 'Stonehelm', 'Duskmere', 'Petrov', 'Krastova'];

export const TAVERN_A = ['Blood', 'Gilded', 'Drowned', 'Crooked', 'Silver', 'Weeping', 'Lucky', 'Rusty', 'Howling', 'Sleeping', 'Wandering', 'Black', 'Laughing', 'Broken'];
export const TAVERN_B = ['Vine', 'Stag', 'Lantern', 'Raven', 'Tankard', 'Wolf', 'Crown', 'Goose', 'Barrel', 'Moon', 'Candle', 'Anchor', 'Boar', 'Kettle'];

export const WEATHER = ['Clear and cold', 'Thick fog rolling in', 'Light drizzle', 'Heavy rain', 'Thunderstorm', 'Overcast and still', 'Biting wind', 'Light snow', 'Heavy snow', 'Muggy and warm', 'Hail', 'Eerie calm, no birdsong'];

export const ENCOUNTERS = {
  Forest: ['A pack of wolves circles the camp', 'A lost child who may not be what they seem', 'Hunters arguing over a strange carcass', 'A giant spider\'s web across the trail', 'A druid tending a dying tree', 'Bandits pretending to be pilgrims'],
  Road: ['A merchant wagon with a broken wheel', 'Patrolling guards demanding tolls', 'A funeral procession', 'A traveling performer troupe', 'An overturned carriage, no bodies', 'A lone knight on a dying horse'],
  Mountains: ['A rockslide blocks the path', 'Goblins in a ruined watchtower', 'A hermit who trades riddles for directions', 'An ogre counting sheep', 'Gargoyles on a cliffside shrine', 'A blizzard forces you to shelter'],
  Swamp: ['A will-o\'-wisp leads you astray', 'Lizardfolk fishing party', 'A sunken shrine with a glowing idol', 'A hag offering a bargain', 'Zombies rising from the bog', 'Giant leeches in the water'],
  Underground: ['A collapsing tunnel', 'Kobolds setting traps', 'A glowing fungus grove', 'An ancient sealed door', 'A gelatinous something oozing nearby', 'Dwarven miners, long trapped'],
  Town: ['A pickpocket bumps into you', 'A public trial in the square', 'A street preacher warns of doom', 'A noble offers suspicious work', 'A tavern brawl spills outside', 'A missing-person notice with a familiar face'],
  Haunted: ['Footsteps where no one walks', 'A portrait whose eyes follow you', 'Cold spots and whispering', 'A ghostly figure reenacting its death', 'Ravens watching silently', 'A door that wasn\'t there before'],
};

export const LOOT = {
  'Tier 1 (lvl 1–4)': ['2d6 sp and a tarnished locket', '15 gp in a pouch', 'A potion of healing', 'A silver dagger', '3d6 gp and a map fragment', 'A scroll of a 1st-level spell', 'A small garnet (10 gp)', 'A well-made lute'],
  'Tier 2 (lvl 5–10)': ['4d6 × 10 gp', 'A potion of greater healing', 'A +1 weapon', 'Bag of holding', 'A pair of pearls (100 gp each)', 'Scroll of a 3rd-level spell', 'Cloak of protection', 'A gold idol (250 gp)'],
  'Tier 3 (lvl 11–16)': ['2d6 × 100 gp', 'A +2 weapon or armor', 'Ring of protection', 'Potion of superior healing', 'Wand of web', 'A ruby (1,000 gp)', 'Boots of speed', 'Scroll of a 6th-level spell'],
  'Tier 4 (lvl 17+)': ['4d6 × 1,000 gp', 'A +3 weapon', 'Staff of power', 'A diamond (5,000 gp)', 'Ring of regeneration', 'Scroll of a 9th-level spell', 'Belt of giant strength', 'Robe of the archmagi'],
};

export const BAROVIA_LOCATIONS = [
  'Village of Barovia', 'Death House', 'Tser Pool', 'Old Svalich Road', 'Vallaki', 'Old Bonegrinder',
  'Lake Zarovich', 'Wizard of Wines', 'Yester Hill', 'Krezk', 'Abbey of Saint Markovia', 'Berez',
  'Argynvostholt', 'Van Richten\'s Tower', 'Werewolf Den', 'Tsolenka Pass', 'Amber Temple', 'Castle Ravenloft',
];
export const TAROKKA_SLOTS = ['Tome of Strahd', 'Holy Symbol of Ravenkind', 'Sunsword', 'Ally', 'Strahd\'s location'];

export const MOON_PHASES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
