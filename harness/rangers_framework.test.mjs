// harness/rangers_framework.test.mjs — rangers.js unit test (pure Node, mock fighters; no browser).
//   node harness/rangers_framework.test.mjs
// Proves the framework is profile-driven: a DUMMY second Ranger registered here (no new code) blinks, recharges,
// clamps, crosses up only when allowed, blinks in the air keeping momentum; judgment verdicts are pure and a
// Ranger opponent is always innocent.
import { registerRangerProfile, tickRanger, ensureRangerState, judgmentVerdict, judgmentAddHit, judgmentReady, judgmentBegin,
  isRanger, rangerHudState, refundBlink, startBlink, RANGER_SCREEN, rangerSealAbsorb, rangerBodyAlpha } from '../rangers.js'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const W = { stageWidth: () => 2000, frame: () => 0, seed: () => 1, attackBox: o => o._box || null, projectiles: () => [] }
const mk = (key, x, extra = {}) => ({ rosterKey: key, x, y: 400, w: 48, h: 94, vx: 0, vy: 0, facing: 1, health: 1000, maxHealth: 1000, onGround: true, ...extra })
registerRangerProfile('test_ranger', { badge: { color: '#2266ff', emblem: 'star' }, blink: { crossup: false, charges: 3, recharge: 60 } })
registerRangerProfile('test_judge', { blink: { crossup: true, faceLockOnCross: 8, dodge: { energy: 5, window: 20, dmgMul: 1.15 } }, judgment: {} })
const tap = (f, o, d, n = 0) => { const R = { [d]: true }; tickRanger(f, o, R, W); tickRanger(f, o, {}, W); tickRanger(f, o, R, W); tickRanger(f, o, {}, W); for (let i = 0; i < n; i++) tickRanger(f, o, {}, W) }
const run = (f, o, n) => { for (let i = 0; i < n; i++) tickRanger(f, o, {}, W) }

// dummy ranger: no crossup, 3 charges, 60f recharge — zero new code
{
  const a = mk('test_ranger', 300), b = mk('zoro', 1500)
  ensureRangerState(a)
  check('dummy profile: state created with 3 charges', a._ranger.charges === 3)
  tap(a, b, 'right'); const hud = rangerHudState(a)
  check('double-tap → blink started, 1 charge spent', !!a._ranger.blink && a._ranger.charges === 2, JSON.stringify(hud.pips))
  run(a, b, 12)
  check('blink travels 22% of the screen (282 px)', a.x === 300 + Math.round(RANGER_SCREEN * 0.22), a.x)
  check('blink over after 11 frames (3+5+3)', !a._ranger.blink)
  check('engine dash disabled for a Ranger (noDash)', a.noDash === true)
  run(a, b, 60); check('charge refilled after 60f', a._ranger.charges === 3)
  // clamp at the stage edge
  const c = mk('test_ranger', 1900), d = mk('zoro', 100); tap(c, d, 'right', 12)
  check('stage-edge clamp (right wall)', c.x === 2000 - 48, c.x)
  // no crossup → stops in front
  const e = mk('test_ranger', 500), g = mk('zoro', 650); tap(e, g, 'right', 12)
  check('no-crossup profile stops IN FRONT of the foe', e.x + 48 <= g.x && e.x > 500, `${e.x} vs foe ${g.x}`)
  // air blink keeps momentum
  const h = mk('test_ranger', 300, { onGround: false, vx: 4, vy: -6 }), i = mk('zoro', 1500)
  tap(h, i, 'right'); run(h, i, 7)
  check('air blink allowed, costs a charge', h._ranger.charges === 2)
  check('air blink restores momentum on arrival', h.vx === 4 && h.vy === -6, `${h.vx},${h.vy}`)
  // charges run out
  const k = mk('test_ranger', 100), l = mk('zoro', 1800)
  for (let n = 0; n < 4; n++) tap(k, l, 'right', 12)
  check('4th double-tap with 0 charges does NOT blink', k._ranger.blinks === 3, `blinks=${k._ranger.blinks}`)
  // refund in wind-up
  const m = mk('test_ranger', 300), o = mk('zoro', 1500); tap(m, o, 'right'); const ok = refundBlink(m)
  check('refundBlink during wind-up gives the charge back', ok && m._ranger.charges === 3 && !m._ranger.blink)
}
// crossup + phase step + invuln + dodge
{
  const a = mk('test_judge', 500), b = mk('zoro', 640, { facing: -1 })
  tap(a, b, 'right')
  run(a, b, 1); b._box = { x: 500, y: 400, w: 80, h: 90 }   // foe's live hitbox over where he stood
  let inv = 0; for (let n = 0; n < 5; n++) { run(a, b, 1); if (a.invulnTimer > 0) inv++ }
  check('travel frames invulnerable', inv === 5, inv)
  run(a, b, 6)
  check('crossup profile passes THROUGH the foe', a.x > b.x + 48, `${a.x} vs ${b.x}`)
  check('dodge detected (invuln overlapped a live hitbox) → buff', a._ranger.dodgeBuff > 0 && a._ranger.lastDodge === 1)
  check('PHASE STEP: foe keeps facing the wrong way', b.facing === -1 && a._ranger.faceLock > 0, a._ranger.faceLock)
  run(a, b, 10); check('face lock expires', a._ranger.faceLock === 0)
}
// judgment
{
  const j = mk('test_judge', 300), foe = mk('zoro', 600), rr = mk('omega_ranger', 600, { universe: 'power_rangers' })
  ensureRangerState(j)
  check('isRanger: omega_ranger (pre-framework Ranger) counts', isRanger(rr) && !isRanger(foe) && !isRanger(mk('krybot', 0, { universe: 'power_rangers' })))
  foe.health = 300; check('verdict GUILTY at 30% HP', judgmentVerdict(j, foe) === 'guilty')
  foe.health = 301; check('verdict INNOCENT above 30%', judgmentVerdict(j, foe) === 'innocent')
  rr.health = 10; check('Ranger opponent ALWAYS innocent (even at 1% HP)', judgmentVerdict(j, rr) === 'innocent')
  for (let n = 0; n < 19; n++) judgmentAddHit(j); check('meter 19/20 not ready', !judgmentReady(j))
  judgmentAddHit(j); check('meter 20/20 ready', judgmentReady(j))
  foe.health = 250; judgmentBegin(j, foe)
  check('time freeze: target held 30 frames', foe.hitstop === 30)
  run(j, foe, 30)
  check('GUILTY → sealed', j._ranger.judg.contain > 0 && j._ranger.judg.verdict === 'guilty')
  check('containment card absorbs 50%', rangerSealAbsorb(foe, j) === 0.5)
  foe.x = 999; run(j, foe, 1); check('sealed target pinned + cannot act', foe.x === 600 && foe.hitstun > 0)
  run(j, foe, 200); check('released at the far side (45% of the screen away from the judge)', j._ranger.judg.contain === 0 && foe.x - j.x >= Math.round(RANGER_SCREEN * 0.45) - 48, foe.x)
  check('once per round: not ready again', !judgmentReady(j))
  // innocent path
  const j2 = mk('test_judge', 300), f2 = mk('zoro', 600); ensureRangerState(j2)
  for (let n = 0; n < 20; n++) judgmentAddHit(j2); judgmentBegin(j2, f2); run(j2, f2, 30)
  const evs = []; check('INNOCENT verdict', j2._ranger.judg.verdict === 'innocent')
  check('INNOCENT: meter stays full for a re-attempt', judgmentReady(j2) && j2._ranger.judg.hold > 0)
  run(j2, f2, 300); check('re-attempt window closes after 5 s → spent', !judgmentReady(j2) && j2._ranger.judg.meter === 0)
}
// determinism: identical inputs → identical state
{
  const sim = () => { const a = mk('test_judge', 400), b = mk('zoro', 900); const seq = ['right', '', 'right', '', '', 'left', '', 'left']; for (let n = 0; n < 200; n++) tickRanger(a, b, seq[n % 8] ? { [seq[n % 8]]: true } : {}, W); return JSON.stringify(a._ranger) + a.x }
  check('deterministic (same inputs → byte-identical state)', sim() === sim())
}
check('render alpha: 0 while travelling', (() => { const a = mk('test_ranger', 300), b = mk('zoro', 1500); tap(a, b, 'right'); run(a, b, 2); return rangerBodyAlpha(a) === 0 })())
console.log(`\n  RANGERS FRAMEWORK: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
