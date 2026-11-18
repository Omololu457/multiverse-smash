// harness/bigchill_framedata_diff.mjs — adding the READY Big Chill (`bigchill`) must leave EVERY other character's frame data
// unchanged (Arcticguana's module gains only the shared-immunity helpers + an exported tickChill: its tuning exports stay equal).
//   node harness/bigchill_framedata_diff.mjs [baseCommit] [headCommit]    defaults: base = 0b010e6da (main before Big Chill), head = HEAD
// BOTH trees are exported with `git archive` to temp dirs (so uncommitted work in the checkout never enters the diff) and
// compared block-by-block:
//  1. every roster character: basic_attacks / specials / ultimate / stats / moves / combos / traits / animationData
//  2. every other Ben 10 alien pool entry (BEN10_ALIEN_POOL minus feedback_ov) + every other READY alien module's tuning / anims / FX
//  3. registry: no READY alien overwritten, placeholders unchanged; flight profiles of every existing flyer unchanged; skins unchanged
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || '0b010e6da', HEAD = process.argv[3] || 'HEAD'
const tree = rev => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-fd-')); execSync(`git archive ${rev} | tar -x -C ${d}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash', maxBuffer: 1 << 30 }); return d }
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
  ok('no roster character added or removed', Object.keys(A).length === Object.keys(B).length && Object.keys(B).every(k => A[k]))

  const fA = await imp(ta, 'fighters.js'), fB = await imp(tb, 'fighters.js')
  const NEW = ['bigchill']
  const pd = Object.keys(fA.BEN10_ALIEN_POOL).filter(k => !NEW.includes(k) && J(fA.BEN10_ALIEN_POOL[k]) !== J(fB.BEN10_ALIEN_POOL[k]))
  ok(`Ben 10 alien pool: every other form deep-equal (${Object.keys(fA.BEN10_ALIEN_POOL).length})`, !pd.length, pd.join(', '))
  for (const [file, label] of [['swampfire.js', 'Swampfire'], ['heatblast.js', 'Heatblast'], ['megawhatt.js', 'Megawhatt'], ['goop.js', 'Goop'], ['xlr8.js', 'XLR8'], ['eyeguy.js', 'Eyeguy'], ['ghostfreak.js', 'Ghostfreak'], ['diamondhead.js', 'Diamondhead'], ['alienx.js', 'Alien X'], ['brainstorm.js', 'Brainstorm'], ['terraspin.js', 'Terraspin'], ['wildvine.js', 'Wildvine'], ['jetray.js', 'Jetray'], ['upgrade.js', 'Upgrade'], ['humongousaur.js', 'Humongousaur'], ['feedback.js', 'Feedback'], ['arcticguana.js', 'Arcticguana'], ['benwolf.js', 'BenWolf']]) {
    const mA = await imp(ta, file), mB = await imp(tb, file), keys = Object.keys(mA).filter(k => /^[A-Z0-9_]+$/.test(k))
    const bad = keys.filter(k => J(mA[k]) !== J(mB[k]))
    ok(`${label} definition / anims / FX / tuning deep-equal (${keys.length} exports)`, !bad.length, bad.join(', '))
  }
  const alA = await imp(ta, 'aliens.js'), alB = await imp(tb, 'aliens.js')
  const rd = alA.BEN10_ALIEN_REGISTRY.filter(d => d.status === 'ready' && J(d) !== J(alB.BEN10_ALIEN_REGISTRY.find(x => x.id === d.id)))
  ok('registry: no READY alien overwritten', !rd.length, rd.map(d => d.id).join(', '))
  ok('registry: Big Chill (bigchill) is the only newly READY entry', alB.BEN10_ALIEN_REGISTRY.filter(d => d.status === 'ready' && !alA.BEN10_ALIEN_REGISTRY.some(x => x.id === d.id && x.status === 'ready')).map(d => d.id).join() === 'bigchill')
  ok('slot count unchanged (PICK FIVE)', alA.BEN10_SLOT_COUNT === alB.BEN10_SLOT_COUNT, `${alA.BEN10_SLOT_COUNT} → ${alB.BEN10_SLOT_COUNT}`)
  ok('experimental feedback untouched', J(alA.BEN10_ALIEN_REGISTRY.find(d => d.id === 'feedback')) === J(alB.BEN10_ALIEN_REGISTRY.find(d => d.id === 'feedback')) && J(fA.BEN10_ALIEN_POOL.feedback) === J(fB.BEN10_ALIEN_POOL.feedback))
  const phA = alA.BEN10_ALIEN_REGISTRY.filter(d => d.status !== 'ready').map(d => d.id).filter(id => !NEW.includes(id))
  ok('placeholders unchanged', phA.every(id => J(alA.BEN10_ALIEN_REGISTRY.find(d => d.id === id)) === J(alB.BEN10_ALIEN_REGISTRY.find(d => d.id === id))), phA.join(' '))
  const flA = await imp(ta, 'flight.js'), flB = await imp(tb, 'flight.js')
  const fd = Object.keys(flA.FLIGHT_PROFILES).filter(k => J(flA.FLIGHT_PROFILES[k]) !== J(flB.FLIGHT_PROFILES[k]))
  ok(`flight profiles of every existing flyer unchanged (${Object.keys(flA.FLIGHT_PROFILES).length})`, !fd.length, fd.join(', '))
  const kA = await imp(ta, 'skins.js'), kB = await imp(tb, 'skins.js')
  const skA = kA.SKINS || kA.skins || kA.default, skB = kB.SKINS || kB.skins || kB.default
  if (skA && skB) { const sd = Object.keys(skA).filter(k => J(skA[k]) !== J(skB[k])); ok('skins unchanged', !sd.length, sd.join(', ')) }
} finally { for (const d of [ta, tb]) fs.rmSync(d, { recursive: true, force: true }) }
console.log(`\nBIG CHILL FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
