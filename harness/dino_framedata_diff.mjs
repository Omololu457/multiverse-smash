// harness/dino_framedata_diff.mjs — MSV1-DINO: frame data must be ZERO-diff for EVERY existing character (S.P.D. Red, every
// Ranger, Shane & Dustin, the NS Trio, Ben 10 …).
//   node harness/dino_framedata_diff.mjs [base] [head]    defaults: base = a71c422d9 (the parent of the first Dino commit), head = HEAD
// base / head may be commits or tree ids. Only committed sources enter the diff (git archive), never the dirty worktree.
//  1. every pre-existing roster character: basic_attacks / specials / ultimate / stats / moves / combos / traits / animationData / sizes
//  2. every skin of every pre-existing character, every Ben 10 alien registry entry, Ben's variant table, every rangers.js profile
//  3. the roster grew by exactly dinothunder + its four hidden forms
//  4. every shared file changed = base + exactly the tools/dino/hooks.py lines (MSV1-DINO marked / dino-gated)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || 'a71c422d9', HEAD = process.argv[3] || 'HEAD'
const sh = c => execSync(c, { cwd: ROOT, shell: '/bin/bash', maxBuffer: 1 << 30 }).toString()
const tree = rev => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'dino-fd-'))
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
  ok(`frame data / stats / traits / animation tables unchanged for all ${Object.keys(A).length} existing characters (${checked} blocks)`, !diffs.length, diffs.join(', '))
  const whole = Object.keys(A).filter(k => J(A[k]) !== J(B[k]))
  ok('every existing character definition byte-identical (whole object)', !whole.length, whole.join(','))
  const added = Object.keys(B).filter(k => !A[k])
  ok('roster grew by exactly dinothunder + dt_red / dt_blue / dt_yellow / dt_white', J(added.sort()) === J(['dinothunder', 'dt_blue', 'dt_red', 'dt_white', 'dt_yellow']), added.join(','))
  const sA = await imp(ta, 'skins.js'), sB = await imp(tb, 'skins.js')
  const sd = Object.keys(A).filter(k => J(sA.getSkins(k)) !== J(sB.getSkins(k)))
  ok('every skin of every existing character unchanged', !sd.length, sd.join(','))
  const rA = (await imp(ta, 'aliens.js')).BEN10_ALIEN_REGISTRY, rB = (await imp(tb, 'aliens.js')).BEN10_ALIEN_REGISTRY
  ok(`every Ben 10 alien registry entry unchanged (${rA.length})`, J(rA) === J(rB))
  const fA = await imp(ta, 'fighters.js'), fB = await imp(tb, 'fighters.js')
  ok('Ben variant stat table unchanged', J(fA.BEN10_VARIANT_STATS) === J(fB.BEN10_VARIANT_STATS))
  const pA = await imp(ta, 'rosterParity.js'), pB = await imp(tb, 'rosterParity.js')
  const par = Object.keys(A).filter(k => pA.rosterDamageBoost({ rosterKey: k }) !== pB.rosterDamageBoost({ rosterKey: k }))
  ok('roster damage parity unchanged for every existing character', !par.length, par.join(','))
  await imp(tb, 'nsData.js')   // registers the ninja Ranger profiles
  const gA = (await imp(ta, 'rangers.js')).RANGER_PROFILES, gB = (await imp(tb, 'rangers.js')).RANGER_PROFILES
  await imp(ta, 'spdRedData.js'); await imp(tb, 'spdRedData.js')
  const rd = Object.keys(gA).filter(k => J(gA[k]) !== J(gB[k]))
  ok(`every pre-existing rangers.js profile unchanged (${Object.keys(gA).join(',')})`, !rd.length, rd.join(','))
  // every shared file the Dino commits changed == base + EXACTLY the tools/dino/hooks.py table (as committed in head)
  const want = Object.fromEntries(sh(`H=$(mktemp -d); mkdir -p $H/tools/dino; git show ${HEAD}:tools/dino/hooks.py > $H/tools/dino/hooks.py; cd ${ROOT}; H=$H python3 - <<'PY'
import importlib.util, subprocess, os
spec = importlib.util.spec_from_file_location('h', os.environ['H'] + '/tools/dino/hooks.py'); h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
for f in h.FILES:
    src = subprocess.run(['git', 'show', '${BASE}:' + f], capture_output=True).stdout.decode()
    new, notes = h.apply(f, src)
    blob = subprocess.run(['git', 'hash-object', '--stdin'], input=new.encode(), capture_output=True).stdout.decode().strip()
    print(f, blob)
PY`).trim().split('\n').map(l => l.split(' ')))
  const changed = sh(`git diff --name-only ${BASE} ${HEAD}`).trim().split('\n').filter(Boolean)
  const hookedNow = Object.keys(want).filter(f => changed.includes(f))
  const mism = hookedNow.filter(f => sh(`git rev-parse ${HEAD}:${f}`).trim() !== want[f])
  ok(`shared files changed (${hookedNow.length}: ${hookedNow.join(' ')}) = base + exactly the hooks.py lines, nothing else`, !mism.length, mism.join(','))
  const others = changed.filter(f => !want[f] && f !== 'index.html')
  const mine = f => /^(dino[A-Za-z]*\.js|assets\/(dinothunder|dt_(red|blue|yellow|white)|incoming\/dinothunder)\/|tools\/(dino|dinoskins)\/|harness\/dino|docs\/msv1\/dino\/|updates\.TXT)/.test(f)
  ok(`every other changed file is a Dino-owned path (${others.length}; index.html = the version stamp)`, others.every(mine), others.filter(f => !mine(f)).join(','))
  const hk = sh(`git show ${HEAD}:tools/dino/hooks.py | python3 -c "import sys, json; src = sys.stdin.read(); ns = {'__name__': 'x', '__file__': 'tools/dino/hooks.py'}; exec(src.split('def apply')[0], ns); print(json.dumps([[h[0], h[2]] for h in ns['HOOKS']]))"`)
  const ung = JSON.parse(hk).filter(([, t]) => !/MSV1-DINO|dino|Dino|DINO|dt_(red|blue|yellow|white)|fixedReal/.test(t))
  ok(`all ${JSON.parse(hk).length} hooks are Dino-gated (no-op for every other fighter)`, !ung.length, ung.map(x => x[0]).join(','))
} catch (e) { fail++; console.log('  ❌ threw:', e.stack) }
fs.rmSync(ta, { recursive: true, force: true }); fs.rmSync(tb, { recursive: true, force: true })
console.log(`\nMSV1-DINO FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
