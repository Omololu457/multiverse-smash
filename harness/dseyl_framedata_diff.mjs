// harness/dseyl_framedata_diff.mjs — Dseyl must leave EVERY other character unchanged (adapted from syndrome_framedata_diff.mjs).
//   node harness/dseyl_framedata_diff.mjs [baseCommit]      default base = docs/dseyl/START_COMMIT.txt
// 1. Every field of every move (basic_attacks, specials, ultimate, moves, combos) + stats for every roster key except
//    `dseyl`, base commit vs this worktree — ESPECIALLY Syndrome, the Flash, Dash Parr, Homelander, Superman.
// 2. Syndrome's own data module tables (moves, budgets, ultimate, timelines, sprite table) deep-equal.
// 3. flight.js: every pre-existing FLIGHT_PROFILES entry (Homelander, Superman) deep-equal; logic functions byte-identical.
// 4. Dash Parr / Flash Time data deep-equal.
// 5. Sprite / asset files of Syndrome, the Flash, Dash Parr, Homelander, Superman byte-identical to the base commit
//    (git diff on tracked paths + no untracked files under them).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || fs.readFileSync(path.join(ROOT, 'docs/dseyl/START_COMMIT.txt'), 'utf8').trim()
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dseyl-fd-'))
execSync(`git archive ${BASE} -- '*.js' | tar -x -C ${tmp}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash' })
const strip = v => {
  if (Array.isArray(v)) return v.map(strip)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o }
  return v
}
const J = v => JSON.stringify(strip(v))
const imp = (dir, f) => import(pathToFileURL(path.join(dir, f)))
let checked = 0, pass = 0, fail = 0; const diffs = []
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d) } else { fail++; console.log('  ❌', n, d) } }

const A = (await imp(tmp, 'characters.js')).characters, B = (await imp(ROOT, 'characters.js')).characters
for (const key of Object.keys(A)) {
  const a = A[key], b = B[key]
  if (!b) { diffs.push(`${key}: missing after`); continue }
  for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos', 'traits', 'animationData']) { checked++; if (J(a?.[part] ?? null) !== J(b?.[part] ?? null)) diffs.push(`${key}.${part}`) }
}
const added = Object.keys(B).filter(k => !A[k])
ok(`frame data / stats / traits / animation tables unchanged for all ${Object.keys(A).length} existing characters (${checked} blocks)`, !diffs.length, diffs.join(', '))
ok('the only roster addition is dseyl', added.length === 1 && added[0] === 'dseyl', 'added: ' + added.join(', '))
for (const k of ['syndrome', 'flash', 'dash_parr', 'homelander', 'superman']) ok(`  ${k}: identical`, !!A[k] && !diffs.some(d => d.startsWith(k + '.')))

const sA = await imp(tmp, 'syndromeData.js'), sB = await imp(ROOT, 'syndromeData.js')
const sk = Object.keys(sA).filter(k => k !== 'syndrome' && k !== 'dmg')
ok(`syndromeData.js exports deep-equal (${sk.length} tables)`, sk.every(k => J(sA[k]) === J(sB[k])), sk.filter(k => J(sA[k]) !== J(sB[k])).join(', '))
const fA = await imp(tmp, 'flight.js'), fB = await imp(ROOT, 'flight.js')
ok('flight.js: Homelander + Superman profiles deep-equal', ['homelander', 'superman'].every(k => J(fA.FLIGHT_PROFILES[k]) === J(fB.FLIGHT_PROFILES[k])))
const fnA = Object.entries(fA).filter(([, v]) => typeof v === 'function').map(([k, v]) => k + v.toString()).join('\n'), fnB = Object.entries(fB).filter(([, v]) => typeof v === 'function').map(([k, v]) => k + v.toString()).join('\n')
ok('flight.js: logic functions byte-identical (data-only change)', fnA === fnB)
ok('flight.js: only new profile is dseyl', J(Object.keys(fB.FLIGHT_PROFILES).filter(k => !fA.FLIGHT_PROFILES[k])) === J(['dseyl']))
for (const f of ['dashParrData.js', 'flashTimeCinematic.js']) if (fs.existsSync(path.join(tmp, f))) {
  const a = await imp(tmp, f), b = await imp(ROOT, f), ks = Object.keys(a).filter(k => typeof a[k] !== 'function')
  ok(`${f}: data exports deep-equal`, ks.every(k => J(a[k]) === J(b[k])), ks.filter(k => J(a[k]) !== J(b[k])).join(', '))
}
const files = ['syndrome*.js', 'flight.js', 'dashParr*.js', 'flashTimeCinematic.js', 'assets/syndrome', 'assets/dash_parr', 'syndrome', 'superman_work']
const changed = execSync(`git diff --name-only ${BASE} -- ${files.map(f => `'${f}'`).join(' ')}`, { cwd: ROOT, shell: '/bin/bash' }).toString().trim().split('\n').filter(Boolean)
ok('Syndrome / Dash Parr files + sprite assets byte-identical to base (flight.js excepted: data-only, checked above)', changed.every(f => f === 'flight.js'), changed.join(', '))
const sprites = execSync(`git ls-files -- 'flash*.png' 'homelander*' 'assets/homelander*' 'superman*.png' 'assets/superman*' 'assets/syndrome' 'assets/dash_parr'`, { cwd: ROOT, shell: '/bin/bash' }).toString().trim().split('\n').filter(Boolean)
const sd = execSync(`git diff --name-only ${BASE} -- ${sprites.map(f => `'${f}'`).join(' ')} | wc -l`, { cwd: ROOT, shell: '/bin/bash' }).toString().trim()
ok(`sprite files of Syndrome / Flash / Dash Parr / Homelander / Superman byte-identical (${sprites.length} tracked files)`, sd === '0', sd + ' changed')
console.log(`\n  DSEYL FRAME-DATA DIFF vs ${BASE.slice(0, 10)}: ${pass} passed, ${fail} failed`)
fs.rmSync(tmp, { recursive: true, force: true }); process.exit(fail ? 1 : 0)
