// harness/msv1_framedata_diff.mjs — MSV1: frame data must be ZERO-diff for EVERY existing character.
//   node harness/msv1_framedata_diff.mjs [base] [head]    defaults: base = 2f61c6294 (msv1 Phase 1, before any engine hook), head = HEAD
// base / head may be commits or tree ids. Only committed sources enter the diff (git archive), never the dirty worktree.
//  1. every pre-existing roster character: basic_attacks / specials / ultimate / stats / moves / combos / traits / animationData / sizes
//  2. every skin of every pre-existing character, every Ben 10 alien registry entry, Ben's variant table, every rangers.js profile
//  3. the roster grew by exactly ns_red + ns_yellow
//  4. shared-file changes are ONLY added lines, each one ninja-gated (MSV1 marker or a ninja symbol)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || '2f61c6294', HEAD = process.argv[3] || 'HEAD'
const sh = c => execSync(c, { cwd: ROOT, shell: '/bin/bash', maxBuffer: 1 << 30 }).toString()
const tree = rev => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'msv1-fd-'))
  execSync(`git archive ${rev} -- $(git ls-tree -r --name-only ${rev} | grep -E '\\.(js|mjs|json)$' | grep -vE '^(tools|docs|assets)/' | tr '\\n' ' ') | tar -x -C ${d}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash', maxBuffer: 1 << 30 })
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
  const diffs = []; let checked = 0
  for (const key of Object.keys(A)) {
    const a = A[key], b = B[key]
    if (!b) { diffs.push(`${key}: missing after`); continue }
    for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos', 'traits', 'animationData', 'width', 'height', 'speed', 'jumpForce', 'maxHealth', 'w', 'h', 'spriteScale']) { checked++; if (J(a?.[part] ?? null) !== J(b?.[part] ?? null)) diffs.push(`${key}.${part}`) }
  }
  ok(`MSV1 frame data / stats / traits / animation tables unchanged for all ${Object.keys(A).length} existing characters (${checked} blocks)`, !diffs.length, diffs.join(', '))
  const whole = Object.keys(A).filter(k => J(A[k]) !== J(B[k]))
  ok('MSV1 every existing character definition byte-identical (whole object)', !whole.length, whole.join(','))
  const added = Object.keys(B).filter(k => !A[k])
  ok('MSV1 roster grew by exactly ns_red + ns_yellow', J(added.sort()) === J(['ns_red', 'ns_yellow']), added.join(','))
  const sA = await imp(ta, 'skins.js'), sB = await imp(tb, 'skins.js')
  const sd = Object.keys(A).filter(k => J(sA.getSkins(k)) !== J(sB.getSkins(k)))
  ok('MSV1 every skin of every existing character unchanged', !sd.length, sd.join(','))
  const rA = (await imp(ta, 'aliens.js')).BEN10_ALIEN_REGISTRY, rB = (await imp(tb, 'aliens.js')).BEN10_ALIEN_REGISTRY
  ok(`MSV1 every Ben 10 alien registry entry unchanged (${rA.length})`, J(rA) === J(rB))
  const fA = await imp(ta, 'fighters.js'), fB = await imp(tb, 'fighters.js')
  ok('MSV1 Ben variant stat table unchanged', J(fA.BEN10_VARIANT_STATS) === J(fB.BEN10_VARIANT_STATS))
  const pA = await imp(ta, 'rosterParity.js'), pB = await imp(tb, 'rosterParity.js')
  const par = Object.keys(A).filter(k => pA.rosterDamageBoost({ rosterKey: k }) !== pB.rosterDamageBoost({ rosterKey: k }))
  ok('MSV1 roster damage parity unchanged for every existing character', !par.length, par.join(','))
  await imp(tb, 'nsData.js')   // registers the ninja Ranger profiles
  const gA = (await imp(ta, 'rangers.js')).RANGER_PROFILES, gB = (await imp(tb, 'rangers.js')).RANGER_PROFILES
  await imp(ta, 'spdRedData.js'); await imp(tb, 'spdRedData.js')
  const rd = Object.keys(gA).filter(k => J(gA[k]) !== J(gB[k]))
  ok(`MSV1 every pre-existing rangers.js profile unchanged (${Object.keys(gA).join(',')})`, !rd.length, rd.join(','))
  // shared files at head == base + EXACTLY the hook table (tools/msv1/hooks.py re-applied to base reproduces every blob)
  const want = Object.fromEntries(sh(`python3 tools/msv1/hooks.py blobs ${BASE}`).trim().split('\n').map(l => l.split(' ')))
  const mism = Object.keys(want).filter(f => sh(`git rev-parse ${HEAD}:${f}`).trim() !== want[f])
  ok(`MSV1 shared files (${Object.keys(want).length}) = base + exactly the hooks.py table, nothing else`, !mism.length, mism.join(','))
  const others = sh(`git diff --name-only ${BASE} ${HEAD}`).trim().split('\n').filter(Boolean).filter(f => !want[f])
  const mine = f => /^(ninja\.js|ninjaCommand\.js|ns[A-Z][A-Za-z]*\.js|msv1Sprites\.js|assets\/ns_(red|yellow)\/|tools\/msv1\/|harness\/msv1|docs\/msv1\/)/.test(f)
  ok(`MSV1 every other changed file is an MSV1-owned path (${others.length})`, others.every(mine), others.filter(f => !mine(f)).join(','))
  // every hook in the table is ninja-gated: its inserted text names a ninja symbol / key
  const hk = sh(`python3 -c "import sys; sys.path.insert(0,'tools/msv1'); import hooks, json; print(json.dumps([[h[0], h[2]] for h in hooks.HOOKS]))"`)
  const ung = JSON.parse(hk).filter(([, t]) => !/isNinja|ninja|Ninja|NINJA|_msv1|ns_red|ns_yellow|NS_|nsData|nsKit|nsFx|nsSound|nsHarness|MSV1/.test(t))
  ok(`MSV1 all ${JSON.parse(hk).length} hooks are ninja-gated (no-op for every other fighter)`, !ung.length, ung.map(x => x[0]).join(','))
} catch (e) { fail++; console.log('  ❌ threw:', e.stack) }
fs.rmSync(ta, { recursive: true, force: true }); fs.rmSync(tb, { recursive: true, force: true })
console.log(`\nMSV1 FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
