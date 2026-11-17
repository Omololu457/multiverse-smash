// harness/xlr8_framedata_diff.mjs — adding XLR8 must leave EVERY other character's frame data unchanged.
//   node harness/goop_framedata_diff.mjs [baseCommit]      default base = 50650a804 (main at branch start)
// The base tree is exported with `git archive` to a temp dir and compared block-by-block against this checkout:
//  1. every roster character: basic_attacks / specials / ultimate / stats / moves / combos / traits / animationData
//  2. every other Ben 10 alien pool entry (BEN10_ALIEN_POOL minus xlr8) + Swampfire's, Heatblast's, Megawhatt's and Goop's definitions / anims / FX
//  3. skins table unchanged
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || '50650a804'
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xl-fd-'))
execSync(`git archive ${BASE} | tar -x -C ${tmp}`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash', maxBuffer: 1 << 30 })
const strip = v => {
  if (Array.isArray(v)) return v.map(strip)
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o }
  return v
}
const J = v => JSON.stringify(strip(v))
const imp = (dir, f) => import(pathToFileURL(path.join(dir, f)))
let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d) } else { fail++; console.log('  ❌', n, d) } }

const A = (await imp(tmp, 'characters.js')).characters, B = (await imp(ROOT, 'characters.js')).characters
const diffs = []; let checked = 0
for (const key of Object.keys(A)) {
  const a = A[key], b = B[key]
  if (!b) { diffs.push(`${key}: missing after`); continue }
  for (const part of ['basic_attacks', 'specials', 'ultimate', 'stats', 'moves', 'combos', 'traits', 'animationData']) { checked++; if (J(a?.[part] ?? null) !== J(b?.[part] ?? null)) diffs.push(`${key}.${part}`) }
}
ok(`frame data / stats / traits / animation tables unchanged for all ${Object.keys(A).length} characters (${checked} blocks)`, !diffs.length, diffs.join(', '))
ok('no roster character added or removed', Object.keys(A).length === Object.keys(B).length && Object.keys(B).every(k => A[k]))

const fA = await imp(tmp, 'fighters.js'), fB = await imp(ROOT, 'fighters.js')
const pd = Object.keys(fA.BEN10_ALIEN_POOL).filter(k => k !== 'xlr8' && J(fA.BEN10_ALIEN_POOL[k]) !== J(fB.BEN10_ALIEN_POOL[k]))
ok(`Ben 10 alien pool: every other form deep-equal (${Object.keys(fA.BEN10_ALIEN_POOL).length - 1})`, !pd.length, pd.join(', '))
const sA = await imp(tmp, 'swampfire.js'), sB = await imp(ROOT, 'swampfire.js')
ok('Swampfire definition / anims / FX deep-equal', J(sA.SWAMPFIRE) === J(sB.SWAMPFIRE) && J(sA.SWAMPFIRE_ANIM) === J(sB.SWAMPFIRE_ANIM) && J(sA.SWAMPFIRE_FX) === J(sB.SWAMPFIRE_FX))
const hA = await imp(tmp, 'heatblast.js'), hB = await imp(ROOT, 'heatblast.js')
ok('Heatblast definition / anims / FX / tuning deep-equal', ['HEATBLAST', 'HEATBLAST_ANIM', 'HEATBLAST_BLUE_ANIM', 'HEATBLAST_FX', 'HB_HEAT', 'HB_SCORCH', 'HB_COST', 'HB_ULT', 'HB_FLIGHT'].every(k => J(hA[k]) === J(hB[k])))
const mA = await imp(tmp, 'megawhatt.js'), mB = await imp(ROOT, 'megawhatt.js')
ok('Megawhatt definition / anims / tuning deep-equal', Object.keys(mA).filter(k => /^[A-Z_]+$/.test(k)).every(k => J(mA[k]) === J(mB[k])), Object.keys(mA).filter(k => /^[A-Z_]+$/.test(k)).join(' '))
const gA = await imp(tmp, 'goop.js'), gB = await imp(ROOT, 'goop.js')
ok('Goop definition / anims / tuning deep-equal', Object.keys(gA).filter(k => /^[A-Z_]+$/.test(k)).every(k => J(gA[k]) === J(gB[k])), Object.keys(gA).filter(k => /^[A-Z_]+$/.test(k)).join(' '))
const alA = await imp(tmp, 'aliens.js'), alB = await imp(ROOT, 'aliens.js')
const rd = alA.BEN10_ALIEN_REGISTRY.filter(d => d.id !== 'xlr8' && (alA.BEN10_ALIEN_REGISTRY.find(x => x.id === d.id).status === 'ready') && J(d) !== J(alB.BEN10_ALIEN_REGISTRY.find(x => x.id === d.id)))
ok('registry: no READY alien overwritten (slot 5 was a placeholder)', !rd.length && alA.BEN10_ALIEN_REGISTRY.find(d => d.slot === 5 && d.status === 'ready') == null, rd.map(d => d.id).join(', '))
const flA = await imp(tmp, 'flight.js'), flB = await imp(ROOT, 'flight.js')
const fd = Object.keys(flA.FLIGHT_PROFILES).filter(k => J(flA.FLIGHT_PROFILES[k]) !== J(flB.FLIGHT_PROFILES[k]))
ok(`flight profiles of every existing flyer unchanged (${Object.keys(flA.FLIGHT_PROFILES).join(', ')})`, !fd.length, fd.join(', '))
const kA = await imp(tmp, 'skins.js'), kB = await imp(ROOT, 'skins.js')
const skA = kA.SKINS || kA.skins || kA.default, skB = kB.SKINS || kB.skins || kB.default
if (skA && skB) { const sd = Object.keys(skA).filter(k => J(skA[k]) !== J(skB[k])); ok('skins unchanged', !sd.length, sd.join(', ')) }
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`\nXLR8 FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
