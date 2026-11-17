// harness/heatblast_framedata_diff.mjs — adding Heatblast must leave EVERY other character's frame data unchanged.
//   node harness/heatblast_framedata_diff.mjs [baseCommit]      default base = 644f67f42 (main at branch start)
// The base tree is exported with `git archive` to a temp dir and compared block-by-block against this checkout:
//  1. every roster character: basic_attacks / specials / ultimate / stats / moves / combos / traits / animationData
//  2. every other Ben 10 alien pool entry (BEN10_ALIEN_POOL minus heatblast) + Swampfire's definition / anims / FX
//  3. skins table unchanged
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.argv[2] || '644f67f42'
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-fd-'))
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
const pd = Object.keys(fA.BEN10_ALIEN_POOL).filter(k => k !== 'heatblast' && J(fA.BEN10_ALIEN_POOL[k]) !== J(fB.BEN10_ALIEN_POOL[k]))
ok(`Ben 10 alien pool: every other form deep-equal (${Object.keys(fA.BEN10_ALIEN_POOL).length - 1})`, !pd.length, pd.join(', '))
const sA = await imp(tmp, 'swampfire.js'), sB = await imp(ROOT, 'swampfire.js')
ok('Swampfire definition / anims / FX deep-equal', J(sA.SWAMPFIRE) === J(sB.SWAMPFIRE) && J(sA.SWAMPFIRE_ANIM) === J(sB.SWAMPFIRE_ANIM) && J(sA.SWAMPFIRE_FX) === J(sB.SWAMPFIRE_FX))
const kA = await imp(tmp, 'skins.js'), kB = await imp(ROOT, 'skins.js')
const skA = kA.SKINS || kA.skins || kA.default, skB = kB.SKINS || kB.skins || kB.default
if (skA && skB) { const sd = Object.keys(skA).filter(k => J(skA[k]) !== J(skB[k])); ok('skins unchanged', !sd.length, sd.join(', ')) }
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`\nHEATBLAST FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
