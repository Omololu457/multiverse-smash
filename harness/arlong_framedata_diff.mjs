// harness/arlong_framedata_diff.mjs — FRAME-DATA DIFF for every character except Arlong.
//   node harness/arlong_framedata_diff.mjs [baseCommit | baseDir]   (default: docs/arlong/START_COMMIT.txt)
// Loads characters.js (+ the Zoro / Luffy / Buggy move tables) from the base tree and from this tree in Node and
// compares EVERY field of every move (basic_attacks, specials, ultimate, moves, combos) and the stats block for every
// roster key except `arlong`. Any difference fails (no field is ignored).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arg = process.argv[2] || fs.readFileSync(path.join(ROOT, 'docs/arlong/START_COMMIT.txt'), 'utf8').trim()
let base = arg
if (!fs.existsSync(arg)) {
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'arlong-fd-'))
  execSync(`git archive ${arg} -- '*.js' | tar -x -C ${base}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash' })
}
const tables = { zoroData: 'ZORO_MOVES', luffyData: 'LUFFY_MOVES', buggyData: 'BUGGY_MOVES' }
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
const A = await load(base), B = await load(ROOT)
let checked = 0; const diffs = []
for (const key of Object.keys(A.C)) {
  if (key === 'arlong') continue
  const a = A.C[key], b = B.C[key]
  if (!b) { diffs.push(`${key}: missing after`); continue }
  for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos']) {
    checked++
    if (JSON.stringify(strip(a?.[part] ?? null)) !== JSON.stringify(strip(b?.[part] ?? null))) diffs.push(`${key}.${part}`)
  }
}
for (const f of Object.keys(tables)) { checked++; if (JSON.stringify(strip(A.T[f])) !== JSON.stringify(strip(B.T[f]))) diffs.push(f) }
const added = Object.keys(B.C).filter(k => !A.C[k])
console.log(`  roster before ${Object.keys(A.C).length} · after ${Object.keys(B.C).length} · added: ${added.join(', ') || 'none'}`)
console.log(`  ${diffs.length ? '❌' : '✅'} frame-data diff ZERO for every other character (${checked} blocks)${diffs.length ? '  — ' + diffs.join(', ') : ''}`)
process.exit(diffs.length ? 1 : 0)
