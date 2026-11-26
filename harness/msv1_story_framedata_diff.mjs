// harness/msv1_story_framedata_diff.mjs — MSV1-STORY: frame data must be ZERO-diff for EVERY character.
//   node harness/msv1_story_framedata_diff.mjs [base] [head]    defaults: base = docs/msv1/story/START_COMMIT.txt, head = HEAD
// base / head may be commits or tree ids (a tree id lets the check run on a not-yet-committed private-index tree).
// Only committed/written trees enter the diff (git archive), never the dirty worktree.
//  1. every roster character: basic_attacks / specials / ultimate / stats / moves / combos / traits / animationData / sizes
//  2. every skin, every Ben 10 alien registry entry, Ben's variant table, roster damage parity, every rangers.js profile
//  3. the roster is unchanged (story mode adds no fighter)
//  4. every changed hunk in a shared engine file (game.js / ui.js) is story-gated; every other changed file is a story-owned path
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || fs.readFileSync(path.join(ROOT, 'docs/msv1/story/START_COMMIT.txt'), 'utf8').trim(), HEAD = process.argv[3] || 'HEAD'
const sh = c => execSync(c, { cwd: ROOT, shell: '/bin/bash', maxBuffer: 1 << 30 }).toString()
const tree = rev => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'msv1-story-fd-'))
  execSync(`git archive ${rev} -- $(git ls-tree -r --name-only ${rev} | grep -E '\\.(js|mjs|json)$' | grep -vE '^(tools|docs|assets|legacy)/' | tr '\\n' ' ') | tar -x -C ${d}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash', maxBuffer: 1 << 30 })
  return d
}
const ta = tree(BASE), tb = tree(HEAD)
const strip = v => { if (Array.isArray(v)) return v.map(strip); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o } return v }
const J = v => JSON.stringify(strip(v))
const imp = (dir, f) => import(pathToFileURL(path.join(dir, f)))
const has = (dir, f) => fs.existsSync(path.join(dir, f))
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
  ok(`STORY frame data / stats / traits / animation tables unchanged for all ${Object.keys(A).length} characters (${checked} blocks)`, !diffs.length, diffs.join(', '))
  const whole = Object.keys(A).filter(k => J(A[k]) !== J(B[k]))
  ok('STORY every character definition byte-identical (whole object)', !whole.length, whole.join(','))
  ok('STORY roster unchanged (no fighter added or removed)', J(Object.keys(A).sort()) === J(Object.keys(B).sort()))
  const sA = await imp(ta, 'skins.js'), sB = await imp(tb, 'skins.js')
  const sd = Object.keys(A).filter(k => J(sA.getSkins(k)) !== J(sB.getSkins(k)))
  ok('STORY every skin of every character unchanged', !sd.length, sd.join(','))
  const rA = (await imp(ta, 'aliens.js')).BEN10_ALIEN_REGISTRY, rB = (await imp(tb, 'aliens.js')).BEN10_ALIEN_REGISTRY
  ok(`STORY every Ben 10 alien registry entry unchanged (${rA.length})`, J(rA) === J(rB))
  const fA = await imp(ta, 'fighters.js'), fB = await imp(tb, 'fighters.js')
  ok('STORY Ben variant stat table unchanged', J(fA.BEN10_VARIANT_STATS) === J(fB.BEN10_VARIANT_STATS))
  const pA = await imp(ta, 'rosterParity.js'), pB = await imp(tb, 'rosterParity.js')
  const par = Object.keys(A).filter(k => pA.rosterDamageBoost({ rosterKey: k }) !== pB.rosterDamageBoost({ rosterKey: k }))
  ok('STORY roster damage parity unchanged for every character', !par.length, par.join(','))
  for (const f of ['nsData.js', 'spdRedData.js']) { if (has(ta, f)) await imp(ta, f); if (has(tb, f)) await imp(tb, f) }
  const gA = (await imp(ta, 'rangers.js')).RANGER_PROFILES, gB = (await imp(tb, 'rangers.js')).RANGER_PROFILES
  const rd = Object.keys(gA).filter(k => J(gA[k]) !== J(gB[k]))
  ok(`STORY every rangers.js profile unchanged (${Object.keys(gA).length})`, !rd.length, rd.join(','))
  // changed files: story-owned paths, plus story-gated hunks in the shared engine files
  const changed = sh(`git diff --name-only ${BASE} ${HEAD}`).trim().split('\n').filter(Boolean)
  const SHARED = new Set(['game.js', 'ui.js', 'package.json', 'index.html', 'updates.TXT'])
  const mine = f => /^(storyEngine\.js|storyUI\.js|data\/story\/|tools\/story\/|docs\/story\/|docs\/msv1\/story\/|legacy\/story\/|harness\/msv1_story|harness\/story_)/.test(f)
  ok(`STORY every non-shared changed file is a story-owned path (${changed.filter(f => !SHARED.has(f)).length})`, changed.every(f => SHARED.has(f) || mine(f)), changed.filter(f => !SHARED.has(f) && !mine(f)).join(','))
  const bad = []
  for (const f of ['game.js', 'ui.js']) {
    if (!changed.includes(f)) continue
    const hunks = sh(`git diff -U0 ${BASE} ${HEAD} -- ${f}`).split(/\n(?=@@ )/).slice(1)
    for (const h of hunks) { const add = h.split('\n').filter(l => l.startsWith('+')).join('\n'); if (!/story|STORY|Story/.test(add)) bad.push(`${f} ${h.split('\n')[0]}`) }
  }
  ok('STORY every game.js / ui.js hunk is story-gated (names the story mode)', !bad.length, bad.join(' | '))
  if (changed.includes('package.json')) {
    const pj = sh(`git diff -U0 ${BASE} ${HEAD} -- package.json`).split('\n').filter(l => /^[+-][^+-]/.test(l))
    ok('STORY package.json only gains story test scripts', pj.every(l => l.startsWith('+') && /story/.test(l) || /^-\s*"test:[^"]+": .*",?$/.test(l) && pj.includes('+' + l.slice(1).replace(/",?$/, '",'))), pj.join(' ').slice(0, 300))
  }
} catch (e) { fail++; console.log('  ❌ threw:', e.stack) }
fs.rmSync(ta, { recursive: true, force: true }); fs.rmSync(tb, { recursive: true, force: true })
console.log(`\nMSV1-STORY FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
