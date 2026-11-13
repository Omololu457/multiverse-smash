// harness/buggy_framedata_diff.mjs — FRAME-DATA DIFF for every character except Buggy.
//   node harness/buggy_framedata_diff.mjs [baseCommit]   (default: docs/buggy/START_COMMIT.txt)
// Extracts the base commit's tree to a temp dir, imports characters.js (+ zoroData / luffyData move tables) from
// both trees in Node and compares EVERY field of every move (basic_attacks, specials, ultimate, the Zoro/Luffy
// move tables) and the stats block, for every roster key except `buggy`. The ONLY field allowed to differ is the
// new `damageType` tag (Phase 3). Any damage / startup / active / recovery / hitstun / range change fails.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = process.argv[2] || fs.readFileSync(path.join(ROOT, 'docs/buggy/START_COMMIT.txt'), 'utf8').trim()
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buggy-fd-'))
execSync(`git archive ${base} -- '*.js' | tar -x -C ${tmp}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash' })
const IGNORE = new Set(['damageType'])
const load = async dir => {
  const C = (await import(pathToFileURL(path.join(dir, 'characters.js')))).characters
  const z = fs.existsSync(path.join(dir, 'zoroData.js')) ? (await import(pathToFileURL(path.join(dir, 'zoroData.js')))).ZORO_MOVES : {}
  const l = fs.existsSync(path.join(dir, 'luffyData.js')) ? (await import(pathToFileURL(path.join(dir, 'luffyData.js')))).LUFFY_MOVES : {}
  return { C, z, l }
}
const strip = v => {
  if (Array.isArray(v)) return v.map(strip)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (!IGNORE.has(k) && typeof v[k] !== 'function') o[k] = strip(v[k]); return o }
  return v
}
const A = await load(tmp), B = await load(ROOT)
let checked = 0, diffs = []
for (const key of Object.keys(A.C)) {
  if (key === 'buggy') continue
  const a = A.C[key], b = B.C[key]
  if (!b) { diffs.push(`${key}: missing after`); continue }
  for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos']) {
    const x = JSON.stringify(strip(a?.[part] ?? null)), y = JSON.stringify(strip(b?.[part] ?? null))
    checked++
    if (x !== y) diffs.push(`${key}.${part}`)
  }
}
for (const [nm, a, b] of [['ZORO_MOVES', A.z, B.z], ['LUFFY_MOVES', A.l, B.l]]) {
  checked++; if (JSON.stringify(strip(a)) !== JSON.stringify(strip(b))) diffs.push(nm)
}
const added = Object.keys(B.C).filter(k => !(k in A.C))
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`  base ${base.slice(0, 8)} · ${Object.keys(A.C).length} characters · ${checked} blocks compared · added keys: ${added.join(', ') || 'none'}`)
if (diffs.length) console.log('  ❌ DIFF:', diffs.slice(0, 20).join(', '))
const ok = diffs.length === 0 && added.every(k => k === 'buggy')
console.log(`\nFRAME-DATA DIFF (others): ${ok ? 'ZERO — 1 passed, 0 failed' : `${diffs.length} differences — 0 passed, 1 failed`}`)
process.exit(ok ? 0 : 1)
