// harness/incredibles_vo_framedata_diff.mjs — the Incredibles VO wiring is AUDIO ONLY: every character's frame data must be unchanged.
//   node harness/incredibles_vo_framedata_diff.mjs [baseCommit] [headCommit]   defaults: base = ecc4699b8 (origin/main before the VO), head = HEAD
// Only the JS / MJS / JSON sources of both trees are exported with `git archive` (uncommitted work never enters the diff) and compared:
//  1. every roster character: basic_attacks / specials / ultimate / stats / moves / combos / traits / animationData / hitbox sizes
//  2. every Ben 10 READY alien registry entry + Ben's variant stat table
//  3. every skin of every character
//  4. the set of files the head changed vs base is audio-only (VO modules, pools, hook lines, assets/audio, docs, tools, harness)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || 'ecc4699b8', HEAD = process.argv[3] || 'HEAD'
const sh = c => execSync(c, { cwd: ROOT, shell: '/bin/bash', maxBuffer: 1 << 30 }).toString()
const tree = rev => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'inc-fd-'))
  execSync(`git archive ${rev} -- $(git ls-tree -r --name-only ${rev} | grep -E '\\.(js|mjs|json)$' | grep -vE '^(tools|docs|assets)/' | tr '\\n' ' ') | tar -x -C ${d}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash', maxBuffer: 1 << 30 })
  return d
}
const ta = tree(BASE), tb = tree(HEAD)
const strip = v => {
  if (Array.isArray(v)) return v.map(strip)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o }
  return v
}
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
    for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos', 'traits', 'animationData', 'width', 'height', 'speed', 'jumpForce', 'maxHealth']) { checked++; if (J(a?.[part] ?? null) !== J(b?.[part] ?? null)) diffs.push(`${key}.${part}`) }
  }
  ok(`frame data / stats / traits / animation tables unchanged for all ${Object.keys(A).length} characters (${checked} blocks)`, !diffs.length, diffs.join(', '))
  ok('no roster character added or removed', Object.keys(A).length === Object.keys(B).length && Object.keys(B).every(k => A[k]))
  for (const k of ['dash_parr', 'elastigirl', 'frozone', 'mr_incredible', 'syndrome', 'violet']) ok(`${k}: whole definition identical`, J(A[k]) === J(B[k]))

  const rA = (await imp(ta, 'aliens.js')).BEN10_ALIEN_REGISTRY, rB = (await imp(tb, 'aliens.js')).BEN10_ALIEN_REGISTRY
  ok(`every Ben 10 alien registry entry unchanged (${rA.length})`, J(rA) === J(rB))
  const fA = await imp(ta, 'fighters.js'), fB = await imp(tb, 'fighters.js')
  ok('Ben variant stat table unchanged', J(fA.BEN10_VARIANT_STATS) === J(fB.BEN10_VARIANT_STATS))
  const sA = await imp(ta, 'skins.js'), sB = await imp(tb, 'skins.js')
  const sd = Object.keys(A).filter(k => J(sA.getSkins(k)) !== J(sB.getSkins(k)))
  ok('every skin of every character unchanged', !sd.length, sd.join(','))

  const changed = sh(`git diff --name-only ${BASE} ${HEAD}`).trim().split('\n').filter(Boolean)
  const allowed = f => /^(assets\/audio\/|docs\/incredibles\/|tools\/incredibles\/|harness\/incredibles_vo)/.test(f) || ['incrediblesVoiceMap.js', 'incrediblesVoicePools.js', 'combat.js', 'game.js'].includes(f)
  ok(`changed files are audio-only (${changed.length})`, changed.every(allowed), changed.filter(f => !allowed(f)).join(','))
  const d = sh(`git diff -U0 ${BASE} ${HEAD} -- combat.js game.js`).split('\n').filter(l => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l))
  const bad = d.filter(l => l.startsWith('-') || !/incredibles/i.test(l) && !/^\+\s*(\}|return|fighter\._introVoiceDone = true|if \(!unblocked \|\| !attacker\) return|else if .*comboCounter.*|else playIncrediblesVo.*)$/.test(l))
  ok(`combat.js / game.js: only ADDED Incredibles VO lines (${d.length} lines, 0 removed)`, !bad.length, bad.slice(0, 4).join(' | '))
} catch (e) { fail++; console.log('  ❌ threw:', e.message) }
fs.rmSync(ta, { recursive: true, force: true }); fs.rmSync(tb, { recursive: true, force: true })
console.log(`\nINCREDIBLES VO FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
