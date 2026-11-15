// harness/violet_stats.test.mjs — PHASE 2: base stats + Force Field economy, through the real game and real keys.
import { boot, ck, summary } from './violet_lib.mjs'
import { violet as VDEF, WALK_SPEED_STAT } from '../violetData.js'
// walk px/f = physics.js tier formula on the stat (kept in sync with physics.js init)
const WALK_PX = Math.min(9.5, Math.max(4.5, 4.5 + (WALK_SPEED_STAT - 78) / 20 * 5))
const B = await boot('violet', 'violet')
const { step, st, S, reset, tap, down, up, page } = B
try {
  const d = await S('H.data()'); let a = await st()
  ck(`health ${VDEF.stats.maxHealth} (violetData) / maxEnergy 100 / energy name "Force Field"`, a.maxHp === VDEF.stats.maxHealth && a.maxEnergy === 100 && d.traits.energyName === 'Force Field' && d.traits.hasEnergy === true, { maxHp: a.maxHp, maxE: a.maxEnergy, t: d.traits })
  ck('jumpPower 29 (brief jumpForce 12) → jumpForce −29', a.jumpForce === -29, a.jumpForce)
  // walk speed = tier formula on WALK_SPEED_STAT
  await reset(600); await down(['d']); await step(12); a = await st(); await up(['d'])
  ck(`walk speed ${WALK_PX} px/f (stat ${WALK_SPEED_STAT})`, Math.abs(Math.abs(a.vx) - WALK_PX) < 1e-9 && !a.run, { vx: a.vx, run: a.run })
  // run 8.0 px/f: double tap forward, keep holding
  await reset(900); await tap(['d'], 2); await step(2); await down(['d']); await step(30); a = await st()
  ck('run speed 8.0 px/f after a dash with forward held (run anim)', Math.abs(Math.abs(a.vx) - 8) < 1e-9 && a.run && a.action === 'run', { vx: a.vx, run: a.run, act: a.action })
  await up(['d']); await step(3); a = await st(); ck('run ends when forward is released (back to walk speed stat)', !a.run && a.baseSpeed === WALK_SPEED_STAT, { run: a.run, bs: a.baseSpeed })
  // regen 5/s
  await reset(600, false, { energy: 0 }); await step(60); a = await st()
  ck('Force Field recharges 5 / s', Math.abs(a.energy - 5) < 0.2, a.energy)
  // +4 on hit landed
  await reset(70, false, { energy: 50 }); const e0 = (await st()).energy; await tap(['j'], 1); a = await B.wait(s => !s.attack, 40)
  const s1 = a.s.stats
  ck('+4 Force Field when her hit lands', s1.hitsLanded === 1 && s1.energyFromHits === 4 && a.energy - e0 - 4 > 0 && a.energy - e0 - 4 < 2.5, { e0, e: a.energy, s1 })
  // +4 not granted on a blocked hit
  await reset(70, false, { energy: 50 }); await B.guard(true); await step(2); await tap(['j'], 1); a = await B.wait(s => !s.attack, 40); await B.guard(false)
  ck('blocked hit grants nothing', a.s.stats.hitsLanded === 0, a.s.stats)
  // +3 on hit taken (P2 Violet jabs P1)
  await reset(70, false, { energy: 50 }); await page.evaluate(() => __harness.setDummyBehavior('combo')); a = await B.wait(s => s.s?.stats?.hitsTaken >= 1, 240); await page.evaluate(() => __harness.setDummyBehavior('stand'))
  ck('+3 Force Field when she takes a hit', a.s.stats.hitsTaken >= 1 && a.s.stats.energyFromHits === 3 * a.s.stats.hitsTaken, a.s.stats)
  // weight 0.8: knockback taken scaled ÷0.8 — compare P2 Violet knockback with the heavy's authored knockbackX
  await reset(80, false, { energy: 50 }); await tap(['k'], 1); let kb = null; for (let i = 0; i < 30 && kb == null; i++) { await step(1); const b = await st('p2'); if (b.hitstun > 0) kb = Math.abs(b.vx) }
  ck('weight 0.8: horizontal knockback taken is ÷0.8', kb != null && kb > 7, { kb })
} catch (e) { ck('exception', false, e.stack) }
ck('no page errors', B.errors.length === 0, B.errors.slice(0, 3))
await B.close(); process.exit(summary('violet stats (phase 2)') ? 1 : 0)
