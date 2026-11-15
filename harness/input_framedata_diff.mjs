// harness/input_framedata_diff.mjs — FRAME-DATA DIFF for EVERY character (no exclusions), for input-plumbing work.
//   node harness/input_framedata_diff.mjs [baseCommit=HEAD]
// Baseline = `git archive <baseCommit>` of every top-level *.js. Compares, for every roster key in characters.js,
// every non-function field (basic_attacks, specials, ultimate, stats, moves, combos, animationData, flags...), plus
// every export of every top-level *Data.js move table and kits.js (help-text tables excluded: CONTROL_REFERENCE).
// Any difference (or any key present on only one side) fails.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ref = process.argv[2] || 'HEAD'
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'input-fd-'))
execSync(`git archive ${ref} -- '*.js' | tar -x -C ${base}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash' })
const HELP_EXPORTS = new Set(['CONTROL_REFERENCE'])
const strip = v => {
  if (Array.isArray(v)) return v.map(strip)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o }
  return typeof v === 'function' ? undefined : v
}
const dataFiles = dir => fs.readdirSync(dir).filter(f => /Data\.js$/.test(f)).sort()
const load = async dir => {
  const C = (await import(pathToFileURL(path.join(dir, 'characters.js')))).characters
  const T = {}
  for (const f of [...dataFiles(dir), 'kits.js']) {
    try { const m = await import(pathToFileURL(path.join(dir, f))); T[f] = {}; for (const k of Object.keys(m)) if (!HELP_EXPORTS.has(k)) T[f][k] = JSON.stringify(strip(m[k])) }
    catch (e) { T[f] = { __loadError: String(e.message).slice(0, 80) } }
  }
  return { C, T }
}
const A = await load(base), B = await load(ROOT)
let checked = 0; const diffs = []
const keys = new Set([...Object.keys(A.C), ...Object.keys(B.C)])
for (const key of keys) {
  checked++
  const a = JSON.stringify(strip(A.C[key])), b = JSON.stringify(strip(B.C[key]))
  if (a !== b) diffs.push(`characters.${key}`)
}
for (const f of new Set([...Object.keys(A.T), ...Object.keys(B.T)])) {
  const ta = A.T[f] || {}, tb = B.T[f] || {}
  for (const k of new Set([...Object.keys(ta), ...Object.keys(tb)])) { checked++; if (ta[k] !== tb[k]) diffs.push(`${f}:${k}`) }
}
fs.rmSync(base, { recursive: true, force: true })
console.log(`FRAME-DATA DIFF vs ${ref}: ${Object.keys(B.C).length} characters + ${Object.keys(B.T).length} data modules, ${checked} entries checked, ${diffs.length} differences`)
for (const d of diffs.slice(0, 40)) console.log('  ❌', d)
process.exit(diffs.length ? 1 : 0)
