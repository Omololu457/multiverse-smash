// harness/batman_framedata_diff.mjs — FRAME-DATA DIFF for every character except Batman (adapted from higuruma_framedata_diff).
//   node harness/batman_framedata_diff.mjs [baseCommit | baseDir] [afterDir]
// DEFAULT baseline = this same worktree with ONLY the Batman rebuild lines reverted in characters.js (every top-level *.js
// copied to a temp dir; the batmanData import dropped, `batman: batmanRebuild,` → the legacy `batman,`, "batman" back in
// the wipe list). That isolates the rebuild from the other concurrent, uncommitted work in the shared files. Compares
// EVERY field of every move (basic_attacks, specials, ultimate, moves, combos) and the stats block for every roster key
// except `batman`, plus the Zoro / Luffy / Buggy / Sanji / Arlong move tables and Superman's whole entry (Superman's WoC
// backdrop predicate was widened for Batman; Superman's data must be untouched). Any difference fails.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arg = process.argv[2] || 'strip'
let base = arg, mode = 'dir'
if (arg === 'strip') {
  mode = 'strip'; base = fs.mkdtempSync(path.join(os.tmpdir(), 'batman-fd-'))
  for (const f of fs.readdirSync(ROOT)) if (f.endsWith('.js')) fs.copyFileSync(path.join(ROOT, f), path.join(base, f))
  const cp = path.join(base, 'characters.js'); let src = fs.readFileSync(cp, 'utf8'); const n0 = src.length
  const lines = src.split('\n'), kept = lines.filter(l => !/from '\.\/batmanData\.js'/.test(l))
  if (lines.length - kept.length !== 1) { console.log(`  ❌ expected exactly 1 batmanData import in characters.js, found ${lines.length - kept.length}`); process.exit(1) }
  src = kept.join('\n').replace(/^  batman: batmanRebuild,.*$/m, '  batman,').replace('/* "batman" REVIVED 2026-11-14 (rebuild, batman*.js) */ "dark_knight",', '"batman", "dark_knight",')
  if (/batmanRebuild|"batman" REVIVED/.test(src)) { console.log('  ❌ could not strip the Batman rebuild lines'); process.exit(1) }
  fs.writeFileSync(cp, src)
} else if (!fs.existsSync(arg)) {
  mode = 'commit'; base = fs.mkdtempSync(path.join(os.tmpdir(), 'batman-fd-'))
  execSync(`git archive ${arg} -- '*.js' | tar -x -C ${base}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash' })
}
const tables = { zoroData: 'ZORO_MOVES', luffyData: 'LUFFY_MOVES', buggyData: 'BUGGY_MOVES', sanjiData: 'SANJI_MOVES', arlongData: 'ARLONG_MOVES' }
const load = async dir => {
  const C = (await import(pathToFileURL(path.join(dir, 'characters.js')))).characters
  const T = {}
  for (const [f, k] of Object.entries(tables)) T[f] = fs.existsSync(path.join(dir, f + '.js')) ? (await import(pathToFileURL(path.join(dir, f + '.js'))))[k] : null
  return { C, T }
}
const strip = v => {
  if (Array.isArray(v)) return v.map(strip)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o }
  return v
}
const A = await load(base), B = await load(process.argv[3] ? path.resolve(process.argv[3]) : ROOT)
let checked = 0; const diffs = []
for (const key of Object.keys(A.C)) {
  if (key === 'batman') continue
  const a = A.C[key], b = B.C[key]
  if (!b) { diffs.push(`${key}: missing after`); continue }
  for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos', 'animationData', 'hidden', 'isPlayable', 'hasSprites']) {
    checked++
    if (JSON.stringify(strip(a?.[part] ?? null)) !== JSON.stringify(strip(b?.[part] ?? null))) diffs.push(`${key}.${part}`)
  }
}
checked++; if (JSON.stringify(strip(A.C.superman)) !== JSON.stringify(strip(B.C.superman))) diffs.push('superman (whole entry)')
for (const f of Object.keys(tables)) { checked++; if (JSON.stringify(strip(A.T[f])) !== JSON.stringify(strip(B.T[f]))) diffs.push(f) }
const added = Object.keys(B.C).filter(k => !A.C[k])
const bm = B.C.batman
console.log(`  baseline: ${mode === 'strip' ? 'this worktree minus the Batman rebuild lines' : arg} · roster before ${Object.keys(A.C).length} · after ${Object.keys(B.C).length} · added: ${added.join(', ') || 'none'}`)
console.log(`  batman after: rebuilt=${!!bm?.traits?.energyName} playable=${bm?.isPlayable !== false && !bm?.hidden} hasSprites=${bm?.hasSprites} · dark_knight still wiped=${!!B.C.dark_knight?.hidden}`)
console.log(`  ${diffs.length ? '❌' : '✅'} frame-data diff ZERO for every other character (${checked} blocks)${diffs.length ? '  — ' + diffs.join(', ') : ''}`)
process.exit(diffs.length || !B.C.dark_knight?.hidden ? 1 : 0)
