// harness/starfire_framedata_diff.mjs — FRAME-DATA DIFF for every character except Starfire.
//   node harness/starfire_framedata_diff.mjs [baseCommit | baseDir] [afterDir]
// Default baseline = THIS tree with Starfire's hooks reverted (tools/starfire/apply_hooks.py --revert on a /tmp copy) and the
// starfire*.js modules removed, so the check isolates exactly Starfire's integration even while other characters' work is
// uncommitted in the shared worktree. Loads characters.js (+ the Zoro / Luffy / Buggy / Sanji / Arlong move tables) from both
// trees in Node and compares EVERY field of every move (basic_attacks, specials, ultimate, moves, combos) and the stats
// block for every roster key except `starfire`. Any difference fails (no field is ignored).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let base = process.argv[2] || null
if (!base) {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'starfire-fd-'))
  execSync(`rsync -a --include='*/' --include='*.js' --include='*.json' --exclude='*' --exclude='node_modules' --prune-empty-dirs ./ ${base}/`, { cwd: ROOT, shell: '/bin/bash' })
  for (const f of fs.readdirSync(base)) if (/^starfire.*\.js$/.test(f)) fs.rmSync(path.join(base, f))
  execSync(`python3 tools/starfire/apply_hooks.py --revert --root ${base}`, { cwd: ROOT })
} else if (!fs.existsSync(base)) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'starfire-fd-'))
  execSync(`git archive ${base} -- '*.js' | tar -x -C ${d}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash' }); base = d
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
  if (key === 'starfire') continue
  const a = A.C[key], b = B.C[key]
  if (!b) { diffs.push(`${key}: missing after`); continue }
  for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos']) {
    checked++
    if (JSON.stringify(strip(a?.[part] ?? null)) !== JSON.stringify(strip(b?.[part] ?? null))) diffs.push(`${key}.${part}`)
  }
}
for (const f of Object.keys(tables)) { checked++; if (JSON.stringify(strip(A.T[f])) !== JSON.stringify(strip(B.T[f]))) diffs.push(f) }
const added = Object.keys(B.C).filter(k => !A.C[k])
console.log(`  baseline ${base}`)
console.log(`  roster before ${Object.keys(A.C).length} · after ${Object.keys(B.C).length} · added: ${added.join(', ') || 'none'}`)
console.log(`  ${diffs.length ? '❌' : '✅'} frame-data diff ZERO for every other character (${checked} blocks)${diffs.length ? '  — ' + diffs.join(', ') : ''}`)
process.exit(diffs.length ? 1 : 0)
