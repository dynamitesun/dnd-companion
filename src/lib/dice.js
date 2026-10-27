// Dice rolling with crypto-quality randomness.
export function die(sides) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / sides) * sides;
  let v;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return (v % sides) + 1;
}

// Roll a formula like "2d6+3", "d20-1", "4d6kh3", "1d8+1d6+2".
// mode: 'normal' | 'adv' | 'dis' (applies to a single d20 term).
export function roll(formula, mode = 'normal') {
  const clean = String(formula || 'd20').replace(/\s+/g, '').toLowerCase();
  const terms = clean.match(/[+-]?[^+-]+/g) || [];
  let total = 0;
  const parts = [];
  for (const raw of terms) {
    const sign = raw.startsWith('-') ? -1 : 1;
    const t = raw.replace(/^[+-]/, '');
    const m = t.match(/^(\d*)d(\d+)(k[hl]\d+)?$/);
    if (m) {
      const count = Math.min(100, Number(m[1] || 1));
      const sides = Number(m[2]);
      let rolls = [];
      let dropped = [];
      if (sides === 20 && count === 1 && mode !== 'normal') {
        const a = die(20), b = die(20);
        const keep = mode === 'adv' ? Math.max(a, b) : Math.min(a, b);
        rolls = [keep];
        dropped = [keep === a ? b : a];
      } else {
        rolls = Array.from({ length: count }, () => die(sides));
        if (m[3]) {
          const n = Number(m[3].slice(2));
          const sorted = [...rolls].sort((x, y) => (m[3][1] === 'h' ? y - x : x - y));
          const kept = sorted.slice(0, n);
          dropped = sorted.slice(n);
          rolls = kept;
        }
      }
      const sum = rolls.reduce((s, r) => s + r, 0) * sign;
      total += sum;
      parts.push({ term: (sign < 0 ? '-' : '') + t, rolls, dropped, sides });
    } else if (/^\d+$/.test(t)) {
      total += sign * Number(t);
      parts.push({ term: (sign < 0 ? '-' : '+') + t, flat: true });
    }
  }
  const d20 = parts.find((p) => p.sides === 20 && p.rolls && p.rolls.length === 1);
  return {
    formula: clean,
    mode,
    total,
    parts,
    crit: d20 ? d20.rolls[0] === 20 : false,
    fumble: d20 ? d20.rolls[0] === 1 : false,
    detail: parts
      .map((p) => (p.flat ? p.term : `${p.term}[${p.rolls.join(',')}${p.dropped.length ? ' ~' + p.dropped.join(',') : ''}]`))
      .join(' '),
  };
}

// A pool of pre-rolled dice handed to the AI DM so its rolls are real and visible.
export function dicePool() {
  const make = (sides, n) => Array.from({ length: n }, () => die(sides));
  return { d20: make(20, 12), d12: make(12, 4), d10: make(10, 6), d8: make(8, 8), d6: make(6, 12), d4: make(4, 6), d100: make(100, 2) };
}
