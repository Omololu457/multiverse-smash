// harness/msv2_framediff.mjs — MSv2 NINJA STORM RANGERS Phase 10: frame data vs the build's START commit.
//   node harness/msv2_framediff.mjs [base] [head]   defaults: base = docs/ninja_storm_rangers/START_COMMIT.txt, head = the branch
//  1. every existing character: byte-identical whole definition (S.P.D. Red, the MSV1 forms, windrangers, Ben 10 …)
//  2. the roster grew by exactly ONE key: ninja_storm_rangers
//  3. skins / kits / roster parity / every rangers.js profile (S.P.D. Red's Blink numbers) / Ben's swap numbers unchanged
//  4. MSV1's form snapshots (Shane / Dustin) diff ZERO
//  5. shared files = base + exactly the tools/msv2/hooks.py table; every other changed file is an MSv2 path
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GIT = process.env.MSV2_GIT || ROOT   // the repo (an exported test tree has no .git: point MSV2_GIT at the clone)
const BASE = process.argv[2] || fs.readFileSync(path.join(ROOT, 'docs/ninja_storm_rangers/START_COMMIT.txt'), 'utf8').trim()
const HEAD = process.argv[3] || 'feat/msv2-ninja-storm-wind-rangers'
const sh = c => execSync(c, { cwd: GIT, shell: '/bin/bash', maxBuffer: 1 << 30 }).toString()
const tree = rev => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'msv2-fd-'))
  execSync(`git archive ${rev} -- $(git ls-tree -r --name-only ${rev} | grep -E '\\.(js|mjs|json)$' | grep -vE '^assets/' | tr '\\n' ' ') | tar -x -C ${d}`, { cwd: GIT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash', maxBuffer: 1 << 30 })
  return d
}
const ta = tree(BASE), tb = tree(HEAD)
const strip = v => { if (Array.isArray(v)) return v.map(strip); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o } return v }
const J = v => JSON.stringify(strip(v))
const imp = (dir, f) => import(pathToFileURL(path.join(dir, f)))
let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d) } else { fail++; console.log('  ❌', n, d) } }
try {
  const A = (await imp(ta, 'characters.js')).characters, B = (await imp(tb, 'characters.js')).characters
  const keys = Object.keys(A)
  const diff = keys.filter(k => J(A[k]) !== J(B[k]))
  ok(`every existing character byte-identical (${keys.length}: S.P.D. Red, ns_red / ns_yellow, windrangers, Ben 10 …)`, !diff.length && J(A.spd_red) === J(B.spd_red), diff.join(','))
  const added = Object.keys(B).filter(k => !A[k])
  ok('the roster grew by exactly ONE fighter: ninja_storm_rangers', J(added) === '["ninja_storm_rangers"]', added.join(','))
  const sA = await imp(ta, 'skins.js'), sB = await imp(tb, 'skins.js')
  const sd = keys.filter(k => J(sA.getSkins(k)) !== J(sB.getSkins(k)))
  ok('every skin of every existing character unchanged', !sd.length, sd.join(','))
  const kA = (await imp(ta, 'kits.js')).KITS, kB = (await imp(tb, 'kits.js')).KITS
  const kd = Object.keys(kA).filter(k => J(kA[k]) !== J(kB[k]))
  ok(`every existing move list unchanged (${Object.keys(kA).length})`, !kd.length && J(Object.keys(kB).filter(k => !kA[k])) === '["ninja_storm_rangers"]', kd.join(','))
  const pA = await imp(ta, 'rosterParity.js'), pB = await imp(tb, 'rosterParity.js')
  const par = keys.filter(k => pA.rosterDamageBoost({ rosterKey: k }) !== pB.rosterDamageBoost({ rosterKey: k }))
  ok('roster damage parity unchanged for every existing character', !par.length, par.join(','))
  const gA = (await imp(ta, 'rangers.js')).RANGER_PROFILES, gB = (await imp(tb, 'rangers.js')).RANGER_PROFILES
  await imp(ta, 'spdRedData.js'); await imp(tb, 'spdRedData.js')
  const rd = Object.keys(gA).filter(k => J(gA[k]) !== J(gB[k]))
  ok(`every rangers.js profile unchanged (${Object.keys(gA).length}; S.P.D. Red's Blink: 22% · 2 charges · 90 f · 3/5/3)`, !rd.length && J(gA.spd_red?.blink) === J(gB.spd_red?.blink), rd.join(','))
  const rB = await imp(tb, 'rangers.js')
  ok('rangers.js blinkParams(S.P.D. Red) returns his own frozen Blink object (no override)', rB.blinkParams({ rosterKey: 'spd_red' }, gB.spd_red) === gB.spd_red.blink)
  const fA = await imp(ta, 'fighters.js'), fB = await imp(tb, 'fighters.js')
  ok('Ben 10 TRANSFORM_ENERGY (swap cost / lockout) unchanged', J(fA.TRANSFORM_ENERGY) === J(fB.TRANSFORM_ENERGY))
  const out = sh(`node ${path.join(tb, 'tools/msv1/merge_snapshot.mjs')} diff ${tb} 2>&1 || true`)
  ok('MSV1 Shane / Dustin forms diff ZERO vs their snapshots', /SHANE \(ns_red\): \d+ fields, 0 differ/.test(out) && /DUSTIN \(ns_yellow\): \d+ fields, 0 differ/.test(out), out.trim().split('\n').slice(-2).join(' | '))
  // shared files == base + exactly the hook table committed in head
  const want = Object.fromEntries(sh(`H=$(mktemp -d)/hooks.py; git show ${HEAD}:tools/msv2/hooks.py > $H; MSV2_ROOT="${GIT}" python3 $H blobs ${BASE}`).trim().split('\n').map(l => l.split(' ')))
  const mism = Object.keys(want).filter(f => sh(`git rev-parse ${HEAD}:${f}`).trim() !== want[f])
  ok(`shared files (${Object.keys(want).length}) = base + exactly the hooks.py table`, !mism.length, mism.join(','))
  const changed = sh(`git diff --name-only ${BASE} ${HEAD}`).trim().split('\n').filter(Boolean).filter(f => !want[f])
  const mine = f => /^(ninjaAcademy\.js|ninjaStorm[A-Za-z]*\.js|assets\/ninja_storm\/|assets\/incoming\/ninja_storm\/|tools\/ninja_storm_build\/|tools\/msv2\/|harness\/msv2|docs\/ninja_storm_rangers\/|docs\/ninja_academy\/|CREDITS\.md)/.test(f)
  ok(`every other changed file is an MSv2 path (${changed.length})`, changed.every(mine), changed.filter(f => !mine(f)).join(','))
} catch (e) { fail++; console.log('  ❌ threw:', e.stack) }
fs.rmSync(ta, { recursive: true, force: true }); fs.rmSync(tb, { recursive: true, force: true })
console.log(`\nMSv2 FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
