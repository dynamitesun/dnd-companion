import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

async function load(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

// Extract text page by page. onProgress(done, total).
export async function extractPages(file, onProgress) {
  const doc = await load(file);
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let text = '';
    let lastY = null;
    for (const item of tc.items) {
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) text += '\n';
      else if (text && !text.endsWith(' ')) text += ' ';
      text += item.str;
      lastY = y;
    }
    pages.push(text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim());
    onProgress && onProgress(i, doc.numPages);
  }
  return pages;
}

// Split pages into ~1600-char chunks that remember their page number.
export function chunkPages(pages) {
  const chunks = [];
  pages.forEach((text, idx) => {
    const paras = text.split(/\n\s*\n|\n(?=[A-Z][A-Z ]{3,}\n)/);
    let buf = '';
    for (const p of paras) {
      if ((buf + p).length > 1600 && buf) {
        chunks.push({ page: idx + 1, text: buf.trim() });
        buf = '';
      }
      buf += p + '\n';
    }
    if (buf.trim()) chunks.push({ page: idx + 1, text: buf.trim() });
  });
  return chunks;
}

const STOP = new Set('the a an and or of to in on at for with is are was were be by it its this that from as you your they their he she his her them we our i me my what who into than then there here have has had not but if so do does did can will would could should'.split(' '));
const tokenize = (s) => (s.toLowerCase().match(/[a-z0-9']{3,}/g) || []).filter((w) => !STOP.has(w));

// Simple keyword search with idf weighting. Returns best chunks.
export function searchChunks(chunks, query, k = 4, maxChars = 7000) {
  if (!chunks?.length) return [];
  const q = [...new Set(tokenize(query))];
  if (!q.length) return [];
  const df = {};
  const toks = chunks.map((c) => {
    const t = tokenize(c.text);
    new Set(t).forEach((w) => (df[w] = (df[w] || 0) + 1));
    return t;
  });
  const N = chunks.length;
  const scored = chunks.map((c, i) => {
    const counts = {};
    toks[i].forEach((w) => (counts[w] = (counts[w] || 0) + 1));
    let s = 0;
    for (const w of q) if (counts[w]) s += (1 + Math.log(counts[w])) * Math.log(1 + N / df[w]);
    return { ...c, score: s / Math.sqrt(1 + toks[i].length / 200) };
  });
  const out = [];
  let used = 0;
  for (const c of scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score)) {
    if (out.length >= k || used + c.text.length > maxChars) break;
    out.push(c);
    used += c.text.length;
  }
  return out.sort((a, b) => a.page - b.page);
}

// Read the form fields and text from a character sheet PDF (e.g. D&D Beyond export).
export async function readCharacterPdf(file) {
  const doc = await load(file);
  let fields = {};
  try {
    const objs = await doc.getFieldObjects();
    if (objs) {
      for (const [name, arr] of Object.entries(objs)) {
        const v = arr.map((o) => o.value).find((x) => x !== undefined && x !== null && x !== '' && x !== 'Off');
        if (v !== undefined) fields[name] = String(v);
      }
    }
  } catch {}
  if (!Object.keys(fields).length) {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const ann = await page.getAnnotations();
      ann.forEach((a) => {
        if (a.fieldName && a.fieldValue) fields[a.fieldName] = String(a.fieldValue);
      });
    }
  }
  const pages = await extractPages(file);
  return { fields, text: pages.join('\n\n') };
}

// Best-effort mapping of common sheet field names to a character.
export function heuristicCharacter(fields) {
  const norm = {};
  for (const [k, v] of Object.entries(fields)) norm[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v;
  const pick = (...keys) => {
    for (const k of keys) if (norm[k] !== undefined && norm[k] !== '') return norm[k];
    return '';
  };
  const num = (v, d) => {
    const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : d;
  };
  const classLevel = pick('classlevel', 'class', 'classandlevel');
  const lvlMatch = classLevel.match(/(\d+)/);
  const clsMatch = classLevel.match(/[A-Za-z]+/);
  return {
    name: pick('charactername', 'name', 'charactername2') || 'Imported Hero',
    class: clsMatch ? clsMatch[0] : '',
    level: lvlMatch ? Number(lvlMatch[1]) : 1,
    race: pick('race', 'species', 'racesubrace'),
    background: pick('background'),
    alignment: pick('alignment'),
    ac: num(pick('ac', 'armorclass'), 10),
    hpMax: num(pick('maxhp', 'hpmax', 'hitpointmaximum'), 10),
    speed: pick('speed') || '30 ft',
    abilities: {
      str: num(pick('str', 'strength', 'strscore'), 10),
      dex: num(pick('dex', 'dexterity', 'dexscore'), 10),
      con: num(pick('con', 'constitution', 'conscore'), 10),
      int: num(pick('int', 'intelligence', 'intscore'), 10),
      wis: num(pick('wis', 'wisdom', 'wisscore'), 10),
      cha: num(pick('cha', 'charisma', 'chascore'), 10),
    },
    features: pick('featurestraits', 'featurestraits1', 'features'),
    inventory: pick('equipment', 'eq', 'inventory'),
  };
}
