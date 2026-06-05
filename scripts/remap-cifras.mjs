/**
 * remap-cifras.mjs
 *
 * Re-derives the IPI Imirim chord sheets DIRECTLY from the PowerPoint XML
 * (the church's projection deck = the source of truth), fixing the two bugs
 * the previous import introduced:
 *
 *   1) Chord spacing — the deck positions chords with literal spaces typed in
 *      Arial (proportional). Rendered in the app's MONOSPACE font those spaces
 *      drift far off. We remap each chord's *visual x-position* (Arial metrics,
 *      chord=10pt / lyric=9pt) to the correct monospace character column above
 *      its syllable (±1 char tolerance).
 *
 *   2) Blocks — each song's sections are color-coded in the deck (pink=verse,
 *      green=chorus, etc.). A change of lyric color marks a new block. The old
 *      import collapsed everything into a single block.
 *
 * Usage:
 *   node scripts/remap-cifras.mjs --songs 1,30,31     # preview (no DB writes)
 *   node scripts/remap-cifras.mjs --all               # parse all, print summary
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLIDES_DIR = join(__dirname, '_slides');

// ─── Arial advance widths (per 1000 em — standard Helvetica/Arial AFM) ───────
const W = {
  ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667,
  "'": 191, '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333,
  '.': 278, '/': 278, '0': 556, '1': 556, '2': 556, '3': 556, '4': 556,
  '5': 556, '6': 556, '7': 556, '8': 556, '9': 556, ':': 278, ';': 278,
  '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278,
  J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 278, '\\': 278, ']': 278, '^': 469, '_': 556, '`': 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222,
  j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333,
  s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
};
const stripAccent = (ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
function adv(ch) {
  const base = stripAccent(ch) || ch;
  return W[base] ?? W[base.toUpperCase()] ?? 556;
}
/** width of a string in points, given font size in 1/100 pt (DrawingML `sz`) */
function widthPt(str, sz) {
  const pt = sz / 100;
  let w = 0;
  for (const ch of str) w += (adv(ch) / 1000) * pt;
  return w;
}

// ─── Chord detection ─────────────────────────────────────────────────────────
const CHORD_RE = /^[A-G][#b]?(m(?![a-z])|M|maj|min|dim|aug|º|°|sus[24]?|add\d*|\d+)*(\([^)]*\))?(\/[A-G][#b]?)?$/;
function isChordToken(t) {
  return CHORD_RE.test(t);
}
function isChordLine(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  const chords = tokens.filter(isChordToken).length;
  return chords / tokens.length >= 0.6;
}

// ─── Remap one chord line onto its lyric ─────────────────────────────────────
function remapChordLine(chordText, chordSz, lyricText, lyricSz) {
  // chord tokens with their source character offset
  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordText))) tokens.push({ tok: m[0], src: m.index });

  if (!lyricText.trim()) {
    // instrumental / intro chord-only line — just normalize to readable spacing
    return tokens.map((t) => t.tok).join('  ');
  }

  // cumulative x (pt) at the boundary *before* lyric char j
  const cum = [0];
  for (let j = 0; j < lyricText.length; j++) {
    cum.push(cum[j] + widthPt(lyricText[j], lyricSz));
  }

  const out = [];
  let nextFree = 0;
  for (const { tok, src } of tokens) {
    const xChord = widthPt(chordText.slice(0, src), chordSz);
    // nearest lyric column to xChord
    let best = 0, bestD = Infinity;
    for (let j = 0; j < cum.length; j++) {
      const d = Math.abs(cum[j] - xChord);
      if (d < bestD) { bestD = d; best = j; }
    }
    let col = best;
    if (col < nextFree) col = nextFree; // avoid overlap, keep order
    out[col] = tok;
    nextFree = col + tok.length + 1;
  }

  // render array → string
  let s = '';
  for (let i = 0; i < out.length; i++) {
    if (out[i]) { s += out[i]; i += out[i].length - 1; }
    else s += ' ';
  }
  return s.replace(/\s+$/, '');
}

// ─── Color → block role ──────────────────────────────────────────────────────
const COLOR_BLOCK = {
  F32F8B: { type: 'verse',   label: 'Estrofe' },
  B5054C: { type: 'verse',   label: 'Estrofe' },
  '2EB703': { type: 'chorus', label: 'Refrão' },
  '00B050': { type: 'chorus', label: 'Refrão' },
  '92D050': { type: 'chorus', label: 'Refrão' },
  FF0000: { type: 'bridge',  label: 'Ponte' },
  C00000: { type: 'bridge',  label: 'Ponte' },
  '0070C0': { type: 'bridge', label: 'Ponte' },
  '00B0F0': { type: 'bridge', label: 'Ponte' },
  '002060': { type: 'bridge', label: 'Ponte' },
  '322F8B': { type: 'bridge', label: 'Ponte' },
  D525D9: { type: 'bridge',  label: 'Ponte' },
  B6DCDF: { type: 'bridge',  label: 'Ponte' },
};
function blockFor(color) {
  return COLOR_BLOCK[color] || { type: 'verse', label: 'Parte' };
}

// ─── XML parsing ─────────────────────────────────────────────────────────────
function decodeXml(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/\t/g, ' '); // tabs break monospace column alignment
}

/** Parse a slide XML into an ordered list of lines: {text, color, sz, kind} */
function parseSlideLines(xml) {
  const lines = [];
  // iterate paragraphs
  const paras = xml.match(/<a:p>[\s\S]*?<\/a:p>/g) || [];
  for (const p of paras) {
    // a paragraph may contain <a:br/> line-breaks → split into visual lines
    const chunks = p.split(/<a:br\s*\/?>(?:<a:rPr[^>]*\/>)?/);
    for (const chunk of chunks) {
      const runRe = /<a:r>(?:<a:rPr([^>]*)(?:\/>|>([\s\S]*?)<\/a:rPr>))?<a:t>([\s\S]*?)<\/a:t><\/a:r>/g;
      let r;
      let text = '';
      let color = 'none';
      let sz = 0;
      let any = false;
      while ((r = runRe.exec(chunk))) {
        const pr = (r[1] || '') + (r[2] || '');
        const t = decodeXml(r[3] || '');
        text += t;
        any = true;
        const szM = pr.match(/sz="(\d+)"/);
        if (szM && !sz) sz = parseInt(szM[1], 10);
        // Block color comes ONLY from a visible (non-blank) run carrying a
        // custom srgbClr. Blank leading-space runs sometimes carry a stray
        // color; theme colors (schemeClr dk1/tx1) = black = chord/title.
        if (t.trim() && color === 'none') {
          const cM = pr.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"/);
          if (cM) color = cM[1].toUpperCase();
        }
      }
      if (!any) continue;
      lines.push({ text, color, sz });
    }
  }
  return lines;
}

// ─── Build songs from all slides ─────────────────────────────────────────────
function classify(line) {
  const t = line.text;
  if (!t.trim()) return 'blank';
  if (/COLET[ÂA]NIA DE C[ÂA]NTICOS/i.test(t)) return 'skip'; // deck title/footer
  if (/^\s*\d{1,3}\s*$/.test(t) && line.color === 'none') return 'skip'; // page number
  const headM = t.match(/^\s*(\d{1,3})\.\s*(.*)$/);
  if (headM && line.color === 'none' && !isChordLine(t)) {
    return 'header';
  }
  // chord lines are black (none) and match chord heuristic
  if (line.color === 'none' && isChordLine(t)) return 'chord';
  return 'lyric';
}

function buildSongs() {
  const files = readdirSync(SLIDES_DIR)
    .filter((f) => /^slide\d+\.xml$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
  // gather every line across every slide, tagged by slide for debugging
  let allLines = [];
  for (const f of files) {
    const xml = readFileSync(join(SLIDES_DIR, f), 'utf8');
    const lines = parseSlideLines(xml);
    allLines.push(...lines.map((l) => ({ ...l, slide: f })));
  }

  // split into songs by header markers
  const songs = [];
  let cur = null;
  let titlePending = false;
  let lastNumber = 0;
  for (const line of allLines) {
    let kind = classify(line);
    if (kind === 'skip') continue;
    if (kind === 'header') {
      const hm = line.text.match(/^\s*(\d{1,3})\.\s*(.*)$/);
      const number = parseInt(hm[1], 10);
      // Accept as a new song only if the number is strictly increasing.
      // Stray "1ª/2ª vez" ending markers carry small numbers → rejected.
      if (number > lastNumber) {
        const inlineTitle = hm[2].trim();
        cur = { number, title: inlineTitle, slide: line.slide, raw: [] };
        songs.push(cur);
        lastNumber = number;
        titlePending = inlineTitle === '';
        continue;
      }
      // not a real header → reclassify as ordinary content
      kind = line.color === 'none' && isChordLine(line.text) ? 'chord' : 'lyric';
    }
    if (!cur) continue; // skip anything before song 1
    if (titlePending && line.color === 'none' && line.text.trim() && !isChordLine(line.text)) {
      cur.title = line.text.trim();
      titlePending = false;
      continue;
    }
    cur.raw.push({ ...line, kind });
  }
  return songs;
}

// ─── Assemble blocks (pairing chords→lyrics, splitting by color) ─────────────
function assembleBlocks(song) {
  const blocks = [];
  let block = null;
  let pendingChord = null; // {text, sz}

  const pushLine = (color, chordLine, lyricLine) => {
    // A black (none) lyric line continues the current section rather than
    // opening a spurious block; only a real color change starts a new block.
    let eff = color;
    if (color === 'none' && block) eff = block.color;
    const role = blockFor(eff);
    if (!block || block.color !== eff) {
      block = { color: eff, type: role.type, label: role.label, lines: [] };
      blocks.push(block);
    }
    block.lines.push({ chords: chordLine, lyrics: lyricLine });
  };

  for (const line of song.raw) {
    if (line.kind === 'blank') { pendingChord = null; continue; }
    if (line.kind === 'chord') {
      // a chord with no following lyric yet — hold it
      if (pendingChord) {
        // two chord lines in a row → first one is instrumental (intro)
        flushIntro(blocks, pendingChord);
      }
      pendingChord = { text: line.text, sz: line.sz || 1000 };
      continue;
    }
    if (line.kind === 'lyric') {
      const lyricText = line.text.replace(/\s+$/, '');
      let chordLine = '';
      if (pendingChord) {
        chordLine = remapChordLine(pendingChord.text, pendingChord.sz, lyricText, line.sz || 900);
        pendingChord = null;
      }
      pushLine(line.color, chordLine, lyricText);
    }
  }
  if (pendingChord) flushIntro(blocks, pendingChord);
  return blocks;
}

function flushIntro(blocks, pendingChord) {
  const chords = remapChordLine(pendingChord.text, pendingChord.sz, '', 900);
  // attach to an intro block at the front if the song has no blocks yet,
  // otherwise as an instrumental line in the current last block
  if (blocks.length === 0) {
    blocks.push({ color: 'intro', type: 'intro', label: 'Intro', lines: [{ chords, lyrics: '' }] });
  } else {
    blocks[blocks.length - 1].lines.push({ chords, lyrics: '' });
  }
}

// ─── Pretty-print for preview ────────────────────────────────────────────────
function printSong(song) {
  const blocks = assembleBlocks(song);
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`#${song.number}  ${song.title}   (${song.slide}, ${blocks.length} blocos)`);
  console.log('═'.repeat(72));
  for (const b of blocks) {
    console.log(`\n  ┌─ ${b.label}  [${b.type}]  cor=${b.color}`);
    for (const ln of b.lines) {
      if (ln.chords) console.log('  │ ' + ln.chords);
      if (ln.lyrics) console.log('  │ ' + ln.lyrics);
      if (!ln.chords && !ln.lyrics) console.log('  │');
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const songs = buildSongs();

if (args.includes('--export')) {
  const { writeFileSync } = await import('node:fs');
  const out = songs.map((s) => ({
    number: s.number,
    title: s.title,
    slide: s.slide,
    blocks: assembleBlocks(s).map((b, i) => ({
      type: b.type, label: b.label, color: b.color, sort_order: i,
      lines: b.lines,
    })),
  }));
  writeFileSync(join(__dirname, '_parsed.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(`Exported ${out.length} songs → scripts/_parsed.json`);
} else if (args.includes('--all')) {
  console.log(`Total songs parsed: ${songs.length}`);
  const nums = songs.map((s) => s.number);
  console.log(`Number range: ${Math.min(...nums)}–${Math.max(...nums)}`);
  // detect gaps / duplicates
  const seen = new Set();
  const dups = [];
  for (const n of nums) { if (seen.has(n)) dups.push(n); seen.add(n); }
  const gaps = [];
  for (let n = Math.min(...nums); n <= Math.max(...nums); n++) if (!seen.has(n)) gaps.push(n);
  if (dups.length) console.log(`Duplicate numbers: ${dups.join(', ')}`);
  if (gaps.length) console.log(`Missing numbers: ${gaps.join(', ')}`);
} else {
  const list = (args.find((a) => a.startsWith('--songs'))?.split('=')[1]) ||
    args[args.indexOf('--songs') + 1] || '1,30,31';
  const want = new Set(list.split(',').map((n) => parseInt(n.trim(), 10)));
  for (const s of songs.filter((s) => want.has(s.number)).sort((a, b) => a.number - b.number)) {
    printSong(s);
  }
}
