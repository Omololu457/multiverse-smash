// harness/violet_framedata_diff.mjs — FRAME-DATA DIFF for every character except Violet (adapted from batman_framedata_diff).
//   node harness/violet_framedata_diff.mjs [baseCommit=main] [afterDir=.]
// Baseline = `git archive <baseCommit>` of every top-level *.js (default: main). Compares EVERY field of basic_attacks,
// specials, ultimate, stats, moves, combos, animationData, hidden / isPlayable / hasSprites for every roster key except
// `violet`, plus the Zoro / Luffy / Buggy / Sanji / Arlong / Batman move tables. Any difference fails.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arg = process.argv[2] || 'main'
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'violet-fd-'))
execSync(`git archive ${arg} -- '*.js' | tar -x -C ${base}`, { cwd: process.env.VIOLET_GIT_DIR || ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash' })
const tables = { zoroData: 'ZORO_MOVES', luffyData: 'LUFFY_MOVES', buggyData: 'BUGGY_MOVES', sanjiData: 'SANJI_MOVES', arlongData: 'ARLONG_MOVES', batmanData: 'MOVES' }
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
  if (key === 'violet') continue
  const a = A.C[key], b = B.C[key]
  if (!b) { diffs.push(`${key}: missing after`); continue }
  for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos', 'animationData', 'hidden', 'isPlayable', 'hasSprites', 'universe']) {
    checked++
    if (JSON.stringify(strip(a?.[part] ?? null)) !== JSON.stringify(strip(b?.[part] ?? null))) diffs.push(`${key}.${part}`)
  }
}
for (const f of Object.keys(tables)) { checked++; if (JSON.stringify(strip(A.T[f])) !== JSON.stringify(strip(B.T[f]))) diffs.push(f) }
const added = Object.keys(B.C).filter(k => !A.C[k]), removed = Object.keys(A.C).filter(k => !B.C[k])
console.log(`  baseline: ${arg} · roster before ${Object.keys(A.C).length} · after ${Object.keys(B.C).length} · added: ${added.join(', ') || 'none'} · removed: ${removed.join(', ') || 'none'}`)
console.log(`  ${diffs.length ? '❌' : '✅'} frame-data diff ZERO for every other character (${checked} blocks)${diffs.length ? '  — ' + diffs.join(', ') : ''}`)
fs.rmSync(base, { recursive: true, force: true })
process.exit(diffs.length || removed.length ? 1 : 0)
