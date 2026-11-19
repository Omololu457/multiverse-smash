// harness/msv1_merge_framediff.mjs — MSV1-MERGE Phase 4 #2 + #5: frame data vs the merge's START commit.
//   node harness/msv1_merge_framediff.mjs [base] [head]   defaults: base = docs/msv1/MERGE_START_COMMIT.txt, head = HEAD
//  1. every character except the two forms: byte-identical whole definition (Ben 10 and every alien included)
//  2. the two forms (ns_red / ns_yellow): only `hidden` changed; each form's NINJA profile diffs zero vs its snapshot
//  3. the roster grew by exactly `windrangers`; skins / alien registry / Ben variant table / parity / Ranger profiles unchanged
//  4. shared files = base + exactly the hooks.py table; every other changed file is an MSV1 path
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || fs.readFileSync(path.join(ROOT, 'docs/msv1/MERGE_START_COMMIT.txt'), 'utf8').trim(), HEAD = process.argv[3] || 'HEAD'
const sh = c => execSync(c, { cwd: ROOT, shell: '/bin/bash', maxBuffer: 1 << 30 }).toString()
const tree = (rev, all = false) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'msv1m-fd-'))
  execSync(all ? `git archive ${rev} | tar -x -C ${d}` : `git archive ${rev} -- $(git ls-tree -r --name-only ${rev} | grep -E '\\.(js|mjs|json)$' | grep -vE '^assets/' | tr '\\n' ' ') | tar -x -C ${d}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash', maxBuffer: 1 << 30 })
  return d
}
const ta = tree(BASE), tb = tree(HEAD)
const strip = v => { if (Array.isArray(v)) return v.map(strip); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o } return v }
const J = v => JSON.stringify(strip(v))
const imp = (dir, f) => import(pathToFileURL(path.join(dir, f)))
let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d) } else { fail++; console.log('  ❌', n, d) } }
const FORMS = ['ns_red', 'ns_yellow']
try {
  const A = (await imp(ta, 'characters.js')).characters, B = (await imp(tb, 'characters.js')).characters
  const others = Object.keys(A).filter(k => !FORMS.includes(k))
  const whole = others.filter(k => J(A[k]) !== J(B[k]))
  ok(`every other character byte-identical (${others.length}, Ben 10 included)`, !whole.length && !!B.ben10 && J(A.ben10) === J(B.ben10), whole.join(','))
  for (const k of FORMS) {
    const a = strip(A[k]), b = strip(B[k]); const ch = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(x => J(a[x]) !== J(b[x]))
    ok(`${k}: only \`hidden\` changed (a form of the duo)`, J(ch) === '["hidden"]' && b.hidden === true, ch.join(','))
  }
  const added = Object.keys(B).filter(k => !A[k])
  ok('the roster grew by exactly windrangers', J(added) === '["windrangers"]', added.join(','))
  const sA = await imp(ta, 'skins.js'), sB = await imp(tb, 'skins.js')
  const sd = Object.keys(A).filter(k => J(sA.getSkins(k)) !== J(sB.getSkins(k)))
  ok('every skin of every existing character unchanged', !sd.length, sd.join(','))
  const rA = (await imp(ta, 'aliens.js')).BEN10_ALIEN_REGISTRY, rB = (await imp(tb, 'aliens.js')).BEN10_ALIEN_REGISTRY
  ok(`every Ben 10 alien registry entry unchanged (${rA.length})`, J(rA) === J(rB))
  const fA = await imp(ta, 'fighters.js'), fB = await imp(tb, 'fighters.js')
  ok('Ben variant stat table + TRANSFORM_ENERGY (the swap numbers) unchanged', J(fA.BEN10_VARIANT_STATS) === J(fB.BEN10_VARIANT_STATS) && J(fA.TRANSFORM_ENERGY) === J(fB.TRANSFORM_ENERGY))
  const pA = await imp(ta, 'rosterParity.js'), pB = await imp(tb, 'rosterParity.js')
  const par = Object.keys(A).filter(k => pA.rosterDamageBoost({ rosterKey: k }) !== pB.rosterDamageBoost({ rosterKey: k }))
  ok('roster damage parity unchanged for every existing character', !par.length, par.join(','))
  const gA = (await imp(ta, 'rangers.js')).RANGER_PROFILES, gB = (await imp(tb, 'rangers.js')).RANGER_PROFILES
  await imp(ta, 'spdRedData.js'); await imp(tb, 'spdRedData.js')
  const rd = Object.keys(gA).filter(k => J(gA[k]) !== J(gB[k]))
  ok('every rangers.js profile unchanged (incl. the two forms)', !rd.length, rd.join(','))
  // each form's full ninja snapshot (stats, moves, commands, supers, framework numbers) vs the Phase 0 snapshot
  const out = sh(`node ${path.join(tb, 'tools/msv1/merge_snapshot.mjs')} diff ${tb} 2>&1 || true`)
  ok('each form diffs ZERO vs MERGE_SNAPSHOT_SHANE / _DUSTIN', /SHANE \(ns_red\): \d+ fields, 0 differ/.test(out) && /DUSTIN \(ns_yellow\): \d+ fields, 0 differ/.test(out), out.trim().split('\n').slice(-2).join(' | '))
  // shared files == base + exactly the hook table committed in head
  const want = Object.fromEntries(sh(`H=$(mktemp -d)/hooks.py; git show ${HEAD}:tools/msv1/hooks.py > $H; MSV1_ROOT="${ROOT}" python3 $H blobs ${BASE}`).trim().split('\n').map(l => l.split(' ')))
  const mism = Object.keys(want).filter(f => sh(`git rev-parse ${HEAD}:${f}`).trim() !== want[f])
  ok(`shared files (${Object.keys(want).length}) = base + exactly the hooks.py table`, !mism.length, mism.join(','))
  const changed = sh(`git diff --name-only ${BASE} ${HEAD}`).trim().split('\n').filter(Boolean).filter(f => !want[f])
  const mine = f => /^(ninja\.js|ninjaCommand\.js|ns[A-Z][A-Za-z]*\.js|msv1Sprites\.js|assets\/(ns_red|ns_yellow|windrangers)\/|tools\/msv1\/|harness\/msv1|docs\/msv1\/)/.test(f)
  ok(`every other changed file is an MSV1 path (${changed.length})`, changed.every(mine), changed.filter(f => !mine(f)).join(','))
} catch (e) { fail++; console.log('  ❌ threw:', e.stack) }
fs.rmSync(ta, { recursive: true, force: true }); fs.rmSync(tb, { recursive: true, force: true })
console.log(`\nMSV1-MERGE FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
