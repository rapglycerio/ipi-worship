/**
 * apply-cifras.mjs
 *
 * Matches the songs parsed from the PowerPoint (scripts/_parsed.json) against
 * the master_songs in Supabase by normalized title, and rewrites their
 * chord_blocks with the remapped, color-split blocks.
 *
 *   node scripts/apply-cifras.mjs            # DRY RUN — match report only
 *   node scripts/apply-cifras.mjs --write    # back up + overwrite chord_blocks
 *
 * A full backup of every chord_blocks row we touch is written to
 * scripts/_backup_chord_blocks.json before any write, so the operation is
 * fully reversible.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
// .env.local lives in the main repo (not the worktree)
dotenv.config({ path: 'C:/Users/rapha/Documents/Antigravity/Projetos/ipi-worship/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const WRITE = process.argv.includes('--write');

function norm(t) {
  return t
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/['’`]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const parsed = JSON.parse(readFileSync(join(__dirname, '_parsed.json'), 'utf8'));

const { data: masters, error: mErr } = await supabase
  .from('master_songs')
  .select('id, title');
if (mErr) { console.error(mErr); process.exit(1); }

const stripParen = (t) => t.replace(/\s*\([^)]*\)\s*$/, '');

// normalized title → [masters]
const byNorm = new Map();
for (const m of masters) {
  const k = norm(m.title);
  if (!byNorm.has(k)) byNorm.set(k, []);
  byNorm.get(k).push(m);
}
const masterNorms = masters.map((m) => ({ m, k: norm(m.title) }));

const matched = [];       // { song, master }  — high confidence
const fuzzy = [];         // { song, master, reason } — needs eyeball
const ambiguous = [];     // { song, masters }
const unmatched = [];     // song with no master

// Manual overrides for near-matches the title heuristics can't catch
const OVERRIDE = { 263: 'O Senhor É O Meu Pastor' };

for (const song of parsed) {
  if (OVERRIDE[song.number]) {
    const m = masters.find((x) => x.title === OVERRIDE[song.number]);
    if (m) { matched.push({ song, master: m }); continue; }
  }
  // 1) exact normalized title (then without trailing "(artist)")
  for (const candidate of [song.title, stripParen(song.title)]) {
    const hit = byNorm.get(norm(candidate));
    if (hit) {
      if (hit.length > 1) ambiguous.push({ song, masters: hit });
      else matched.push({ song, master: hit[0] });
      song._done = true;
      break;
    }
  }
  if (song._done) continue;

  // 2) prefix match — handles titles truncated by a line-wrap in the slide
  const pk = norm(stripParen(song.title));
  const pref = masterNorms.filter(
    ({ k }) => pk.length >= 12 && (k.startsWith(pk) || pk.startsWith(k))
  );
  if (pref.length === 1) { fuzzy.push({ song, master: pref[0].m, reason: 'prefixo' }); continue; }
  if (pref.length > 1) { ambiguous.push({ song, masters: pref.map((p) => p.m) }); continue; }

  unmatched.push(song);
}

console.log('═══════════════════ MATCH REPORT ═══════════════════');
console.log(`Parsed songs:          ${parsed.length}`);
console.log(`Matched (high conf):   ${matched.length}`);
console.log(`Fuzzy (review):        ${fuzzy.length}`);
console.log(`Ambiguous (dup title): ${ambiguous.length}`);
console.log(`Unmatched (not in DB): ${unmatched.length}`);

if (fuzzy.length) {
  console.log('\n— FUZZY (proposed, please eyeball) —');
  for (const f of fuzzy) console.log(`  #${f.song.number} "${f.song.title}"  →  "${f.master.title}"  (${f.reason})`);
}
if (ambiguous.length) {
  console.log('\n— AMBIGUOUS (duplicate titles in DB) —');
  for (const a of ambiguous) console.log(`  #${a.song.number} "${a.song.title}" → ${a.masters.map((m) => m.title).join('  |  ')}`);
}
if (unmatched.length) {
  console.log('\n— UNMATCHED (in PPTX, no master in DB) —');
  for (const s of unmatched) console.log(`  #${s.number} "${s.title}"`);
}

if (!WRITE) {
  console.log('\nDRY RUN — no database changes. Re-run with --write to apply.');
  process.exitCode = 0;
} else {
  await runWrite();
}

function blocksToRows(versionId, blocks) {
  return blocks.map((b) => ({
    version_id: versionId,
    type: b.type,
    label: b.label,
    sort_order: b.sort_order,
    repeat_count: 1,
    directions: [],
    lines: b.lines,
  }));
}

/** First chord found in the song → musical key (base note + optional minor) */
function detectKey(song) {
  for (const b of song.blocks) {
    for (const ln of b.lines) {
      const tok = (ln.chords || '').trim().split(/\s+/)[0];
      const m = tok && tok.match(/^([A-G][#b]?(?:m(?![a-z]))?)/);
      if (m) return m[1];
    }
  }
  return 'C';
}

async function runWrite() {
  // Update set: high-confidence + fuzzy + every master of an ambiguous title
  const updates = [
    ...matched.map((x) => ({ song: x.song, master: x.master })),
    ...fuzzy.map((x) => ({ song: x.song, master: x.master })),
    ...ambiguous.flatMap((a) => a.masters.map((m) => ({ song: a.song, master: m }))),
  ];

  console.log(`\nResolving versions for ${updates.length} update targets…`);
  const masterIds = [...new Set(updates.map((u) => u.master.id))];
  const { data: versions, error: vErr } = await supabase
    .from('song_versions')
    .select('id, master_song_id, is_default')
    .in('master_song_id', masterIds);
  if (vErr) { console.error(vErr); return; }

  const verByMaster = new Map();
  for (const v of versions) {
    const cur = verByMaster.get(v.master_song_id);
    if (!cur || v.is_default) verByMaster.set(v.master_song_id, v);
  }

  // Backup every chord_blocks row we will delete
  const versionIds = [...verByMaster.values()].map((v) => v.id);
  const { data: backup, error: bErr } = await supabase
    .from('chord_blocks').select('*').in('version_id', versionIds);
  if (bErr) { console.error(bErr); return; }
  writeFileSync(join(__dirname, '_backup_chord_blocks.json'), JSON.stringify(backup, null, 2), 'utf8');
  console.log(`Backed up ${backup.length} chord_blocks rows → scripts/_backup_chord_blocks.json`);

  let ok = 0, fail = 0;
  for (const { song, master } of updates) {
    const version = verByMaster.get(master.id);
    if (!version) { console.log(`  ! no version for "${master.title}"`); fail++; continue; }
    const del = await supabase.from('chord_blocks').delete().eq('version_id', version.id);
    if (del.error) { console.log(`  ! delete "${master.title}": ${del.error.message}`); fail++; continue; }
    const ins = await supabase.from('chord_blocks').insert(blocksToRows(version.id, song.blocks));
    if (ins.error) { console.log(`  ! insert "${master.title}": ${ins.error.message}`); fail++; continue; }
    ok++;
  }
  console.log(`Updated ${ok} songs (${fail} failures).`);

  // Create songs that exist in the PPTX but not in the DB
  let created = 0;
  for (const song of unmatched) {
    const title = stripParen(song.title).replace(/\.\.\.$/, '').trim();
    const ms = await supabase.from('master_songs')
      .insert({ title, nature: 'louvor' }).select('id').single();
    if (ms.error) { console.log(`  ! create master "${title}": ${ms.error.message}`); continue; }
    const sv = await supabase.from('song_versions')
      .insert({ master_song_id: ms.data.id, key: detectKey(song), bpm: 0, is_default: true })
      .select('id').single();
    if (sv.error) { console.log(`  ! create version "${title}": ${sv.error.message}`); continue; }
    const ins = await supabase.from('chord_blocks').insert(blocksToRows(sv.data.id, song.blocks));
    if (ins.error) { console.log(`  ! create blocks "${title}": ${ins.error.message}`); continue; }
    created++;
    console.log(`  + created "${title}" (tom ${detectKey(song)})`);
  }
  console.log(`\nDONE. Updated ${ok}, created ${created}.`);
}
