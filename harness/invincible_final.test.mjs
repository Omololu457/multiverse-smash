// harness/invincible_final.test.mjs — MSV1-INVINCIBLE phase 6 final checks that no other suite covers:
//   1. every frame used + nothing lost to keying (tools/invincible/keycheck.py: every source pixel of every placed cell is in
//      its strip with the same colour, dark suit pixels counted; every sheet frame covered; strips = frames × cell, no empty)
//   2. ONE roster slot: `invincible` exactly once in characters, selectable, universe invincible, credits entry
//   3. the numbers: HP = round(0.65 × median HP of the rest of the roster), run speed, flight profile
//   node harness/invincible_final.test.mjs
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { characters, getSelectableRoster } from '../characters.js'
import { SOURCED_ART, attributionForCharacter } from '../credits.js'
import { FLIGHT_PROFILES } from '../flight.js'
import { MAX_HP, RUN_PXF, TOP } from '../invincibleData.js'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const R = {}
try {
  // ── 1. frames ──
  const K = JSON.parse(execFileSync('python3', ['tools/invincible/keycheck.py'], { encoding: 'utf8' }))
  R.keycheck = { cells: K.cells, srcPx: K.srcPx, kept: K.kept, lost: K.lost, changed: K.changed, darkSrc: K.darkSrc, darkKept: K.darkKept, sheetFrames: K.sheetFrames, derived: K.derived }
  R.strips = Object.fromEntries(Object.entries(K.strips).map(([k, v]) => [k, v.frames]))
  ck(`every sheet frame used (${K.sheetFrames} frames, none uncovered)`, K.sheetFrames > 0 && !K.uncovered.length, K.uncovered.join(','))
  ck(`every strip = frames × cell, no empty frame (${Object.keys(K.strips).length} strips)`, Object.values(K.strips).every(v => v.ok) && !K.emptyFrames.length, JSON.stringify(K.emptyFrames))
  ck(`keying lost nothing: ${K.kept}/${K.srcPx} source pixels kept with the same colour`, K.srcPx > 0 && K.kept === K.srcPx && !K.lost && !K.changed, JSON.stringify(K.lostAt))
  ck(`… dark suit pixels (navy 5 levels from the key): ${K.darkKept}/${K.darkSrc} kept`, K.darkSrc > 0 && K.darkKept === K.darkSrc)
  // ── 2. one roster slot ──
  const hits = Object.entries(characters).filter(([k, c]) => k === 'invincible' || c?.rosterKey === 'invincible')
  ck('ONE roster slot: invincible appears once in characters', hits.length === 1, JSON.stringify(hits.map(([k]) => k)))
  const sel = getSelectableRoster().filter(c => c.rosterKey === 'invincible')
  ck('… selectable once, universe "dc" (beside Omni-Man — the Invincible universe was folded into DC on owner request)', sel.length === 1 && sel[0].universe === 'dc', JSON.stringify(sel.map(c => [c.rosterKey, c.universe])))
  ck('… credits entry (JustOruma, assets/invincible/**)', !!SOURCED_ART.invincible && /JustOruma/.test(JSON.stringify(SOURCED_ART.invincible)) && !!attributionForCharacter('invincible'))
  // ── 3. numbers ──
  const hpOf = c => c?.stats?.maxHealth ?? c?.maxHealth
  const hp = getSelectableRoster().filter(c => c && c.rosterKey !== 'invincible' && Number.isFinite(hpOf(c))).map(hpOf).sort((a, b) => a - b)
  const med = hp.length % 2 ? hp[(hp.length - 1) / 2] : (hp[hp.length / 2 - 1] + hp[hp.length / 2]) / 2
  R.hp = { median: med, n: hp.length, invincible: MAX_HP, ratio: +(MAX_HP / med).toFixed(3) }
  ck(`health ${MAX_HP} = 65 % of the selectable-roster median ${med} (${hp.length} fighters, today) ±2 %`, Math.abs(MAX_HP / med - 0.65) <= 0.02, JSON.stringify(R.hp))
  const P = FLIGHT_PROFILES.invincible
  R.flight = { top: TOP, run: RUN_PXF, profile: P && { maxH: P.maxH, accel: P.accel, drag: P.drag, reverseBrake: P.reverseBrake } }
  const om = FLIGHT_PROFILES.omniman_viltrum || FLIGHT_PROFILES.omniman
  ck(`flight top ${TOP} = 0.9 × Omni-Man ${om?.maxH}`, !!om && Math.abs(TOP - 0.9 * om.maxH) < 0.6 && P.maxH === TOP, JSON.stringify(R.flight))
  ck(`ground run ${RUN_PXF} px/f`, Math.abs(RUN_PXF - 16.13) < 0.6, String(RUN_PXF))
} catch (e) { console.log('ERROR', e.stack); fail++ }
fs.writeFileSync('docs/msv1/invincible/final_results.json', JSON.stringify({ pass, fail, R }, null, 1))
console.log(`\n  INVINCIBLE FINAL CHECKS: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
