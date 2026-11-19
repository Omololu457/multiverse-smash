// harness/ben10_themes_framedata_diff.mjs — Ben's 20 cosmetic THEMES must leave EVERY character's frame data unchanged.
//   node harness/ben10_themes_framedata_diff.mjs [baseCommit] [headCommit]   defaults: base = bb3e167d4 (main before themes), head = HEAD
// Both trees are exported with `git archive` (uncommitted work in the checkout never enters the diff) and compared:
//  1. every roster character: basic_attacks / specials / ultimate / stats / moves / combos / traits / animationData
//  2. every READY alien: its registry entry (tuning / moves / anim tables) and Ben's variant stat table
//  3. every skin of every character unchanged, except the 40 ADDED Ben theme skins, each of which carries exactly its
//     original appearance's animation map + scale (so under any theme the frame data is the original's)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || 'bb3e167d4', HEAD = process.argv[3] || 'HEAD'
const tree = rev => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-fd-')); execSync(`git archive ${rev} | tar -x -C ${d}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash', maxBuffer: 1 << 30 }); return d }
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
    for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos', 'traits', 'animationData']) { checked++; if (J(a?.[part] ?? null) !== J(b?.[part] ?? null)) diffs.push(`${key}.${part}`) }
  }
  ok(`frame data / stats / traits / animation tables unchanged for all ${Object.keys(A).length} characters (${checked} blocks)`, !diffs.length, diffs.join(', '))
  ok('no roster character added or removed (a skin is never a fighter)', Object.keys(A).length === Object.keys(B).length && Object.keys(B).every(k => A[k]))

  const rA = (await imp(ta, 'aliens.js')).BEN10_ALIEN_REGISTRY, rB = (await imp(tb, 'aliens.js')).BEN10_ALIEN_REGISTRY
  const ad = rA.filter((a, i) => J(a) !== J(rB[i])).map(a => a.poolKey)
  ok(`every Ben 10 alien registry entry unchanged (${rA.length}: tuning, moves, anim tables)`, rA.length === rB.length && !ad.length, ad.join(','))
  const fA = await imp(ta, 'fighters.js'), fB = await imp(tb, 'fighters.js')
  ok('Ben variant stat table unchanged', J(fA.BEN10_VARIANT_STATS) === J(fB.BEN10_VARIANT_STATS))

  const sA = await imp(ta, 'skins.js'), sB = await imp(tb, 'skins.js')
  const sd = []
  for (const key of Object.keys(A)) {
    const la = sA.getSkins(key), lb = sB.getSkins(key)
    const extra = lb.filter(s => !la.some(x => x.id === s.id))
    if (key === 'ben10') { if (extra.some(s => !s.benTheme)) sd.push('ben10: a non-theme skin was added') }
    else if (extra.length) sd.push(`${key}: +${extra.map(s => s.id)}`)
    for (const s of la) { const t = lb.find(x => x.id === s.id); if (!t || J(s) !== J(t)) sd.push(`${key}.${s.id}`) }
  }
  ok('every existing skin of every character unchanged (only the 40 Ben theme skins added)', !sd.length, sd.join(', '))
  const th = sB.getSkins('ben10').filter(s => s.benTheme)
  ok('40 theme skins', th.length === 40, String(th.length))
  const bad = th.filter(s => {
    const orig = sB.getSkin('ben10', s.benAppearance === 'classic' ? 'ben10Classic' : 'default')
    return J(s.animationData) !== J(orig.animationData) || s.spriteScale !== orig.spriteScale || s.benVariant !== orig.benVariant
  }).map(s => s.id)
  ok('each theme skin = its original appearance\'s animation map, scale and variant (frame data identical under every theme)', !bad.length, bad.join(','))
} catch (e) { fail++; console.log('  ❌ threw:', e.message) }
fs.rmSync(ta, { recursive: true, force: true }); fs.rmSync(tb, { recursive: true, force: true })
console.log(`\nBEN 10 THEMES FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
