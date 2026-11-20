// harness/blood_framedata_diff.mjs — MSV1-BLOOD: blood is purely visual. Frame data must be ZERO-diff for EVERY character.
//   node harness/blood_framedata_diff.mjs <baseTreeDir> <headTreeDir>
// Imports characters.js / skins.js / aliens.js / damageTags.js / damageTypes.js from both trees and compares every
// definition whole (attacks, specials, ults, stats, hitboxes, frame timings, animation tables, skins, alien kits),
// and checks the sim-side modules (combat / abilities / physics / ai / input / netcode / replay) are byte-identical.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const [A, B] = process.argv.slice(2).map(p => path.resolve(p))
let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d) } else { fail++; console.log('  ❌', n, d) } }
const strip = v => { if (Array.isArray(v)) return v.map(strip); if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) if (typeof v[k] !== 'function') o[k] = strip(v[k]); return o } return v }
const J = v => JSON.stringify(strip(v))
const imp = (d, f) => import(pathToFileURL(path.join(d, f)).href)
const ca = (await imp(A, 'characters.js')).characters, cb = (await imp(B, 'characters.js')).characters
const keys = Object.keys(ca), diff = keys.filter(k => J(ca[k]) !== J(cb[k]))
ok(`every character definition identical (${keys.length} characters: attacks / specials / ults / stats / hitboxes / timings / animations)`, !diff.length && Object.keys(cb).length === keys.length, diff.join(','))
for (const [f, label] of [['skins.js', 'skins'], ['aliens.js', 'Ben 10 alien kits'], ['damageTags.js', 'damage tags'], ['damageTypes.js', 'damage types']]) {
  if (!fs.existsSync(path.join(A, f))) continue
  const ma = await imp(A, f), mb = await imp(B, f), ex = Object.keys(ma).filter(k => J(ma[k]) !== J(mb[k]))
  ok(`${label} identical (${Object.keys(ma).length} exports)`, !ex.length, ex.join(','))
}
const SIM = ['combat.js', 'abilities.js', 'physics.js', 'ai.js', 'input.js', 'characters.js', 'netcode.js', 'replay.js', 'rng.js', 'stages.js', 'aliens.js', 'skins.js']
const changed = SIM.filter(f => fs.existsSync(path.join(A, f)) && fs.readFileSync(path.join(A, f), 'utf8') !== fs.readFileSync(path.join(B, f), 'utf8'))
ok('sim-side modules byte-identical (' + SIM.filter(f => fs.existsSync(path.join(A, f))).join(' ') + ')', !changed.length, changed.join(','))
console.log(`\nBLOOD FRAME-DATA DIFF: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
