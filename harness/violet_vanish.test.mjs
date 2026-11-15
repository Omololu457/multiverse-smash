// harness/violet_vanish.test.mjs — PHASE 3: VANISH through the real game and real keys (↓↓ + Special = S, S+L).
import { boot, ck, summary } from './violet_lib.mjs'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
const BOOST = ROSTER_DAMAGE_BOOST.violet || 1
const B = await boot('violet', 'violet')
const { step, st, S, reset, tap, down, up, page, wait } = B
const vanish = async () => { await tap(['s'], 2); await step(2); await down(['s']); await step(1); await tap(['l'], 1); await up(['s']); await step(1) }
const V = await S('H.data().vanish')
try {
  await reset(300, false, { energy: 50 }); let a0 = await st(); await vanish(); let a = await st()
  ck('↓↓+Special enters Vanish, costs 15', a.inv && Math.abs(a0.energy - a.energy - 15) < 0.6, { e0: a0.energy, e: a.energy, inv: a.inv })
  ck('fade-out plays the R7 strip (vanish) at 35% alpha', a.action === 'vanish' && a.alpha === 0.35, { act: a.action, alpha: a.alpha })
  await step(30); a = await st(); ck('then the R11 invisible stance', a.action === 'inv_idle' && a.alpha === 0.35, a.action)
  ck('ambush scalar armed while invisible (damageMultiplier 1.2)', a.dmgMul === 1.2, a.dmgMul)
  const e1 = a.energy; await step(60); a = await st(); ck('drains 6 / s while invisible (no regen)', Math.abs(e1 - a.energy - 6) < 0.05, { e1, e: a.energy })
  await down(['d']); await step(8); a = await st(); await up(['d']); ck('invisible walk = R11 strip', a.action === 'inv_walk', a.action)
  await down(['s']); await step(6); a = await st(); await up(['s']); ck('invisible crouch = R9 strip', a.action === 'inv_crouch', a.action)
  await step(20); await vanish(); a = await st()
  ck('↓↓+Special again reappears; 8 s cooldown starts', !a.inv && a.s.vanishCd >= V.cooldown - 2 && a.s.stats.vanishEnds.toggle === 1 && a.dmgMul === 1, { inv: a.inv, cd: a.s.vanishCd, ends: a.s.stats.vanishEnds })
  await step(2); a = await st(); ck('reappear plays the R12 strip at full alpha', a.action === 'reappear' && a.alpha === 1, { act: a.action, alpha: a.alpha })
  const e2 = a.energy; await vanish(); a = await st(); ck('cooldown: a second Vanish is refused, nothing spent', !a.inv && a.energy >= e2 && a.s.stats.rejects >= 1, { inv: a.inv, e2, e: a.energy })
  // timeout: 6 s max
  await reset(400, false, { energy: 100 }); await vanish(); for (let i = 0; i < 6; i++) await step(60); a = await st()
  ck('ends by itself after 6 s', !a.inv && a.s.stats.vanishEnds.timeout === 1, a.s.stats.vanishEnds)
  // empty
  await reset(400, false, { energy: 17 }); await vanish(); a = await wait(s => !s.inv, 200)
  ck('ends when the Force Field runs dry', !a.inv && a.s.stats.vanishEnds.empty === 1, a.s.stats.vanishEnds)
  // any hit taken ends it instantly
  await reset(70, false, { energy: 60 }); await vanish(); await page.evaluate(() => __harness.setDummyBehavior('combo')); a = await wait(s => !s.inv, 240); await page.evaluate(() => __harness.setDummyBehavior('stand'))
  ck('any hit taken ends it instantly', !a.inv && a.s.stats.vanishEnds.hitTaken === 1 && a.hitstun > 0, { ends: a.s.stats.vanishEnds, stun: a.hitstun })
  // ambush: Heavy while invisible = +20 % once, then Vanish ends; the next Heavy is normal
  await reset(70, false, { energy: 60 }); await vanish(); await step(4); let b0 = (await st('p2')).hp; await tap(['k'], 1); a = await wait(s => !s.attack, 60); let b1 = (await st('p2')).hp
  const amb = b0 - b1
  await reset(70, false, { energy: 60 }); b0 = (await st('p2')).hp; await tap(['k'], 1); a = await wait(s => !s.attack, 60); b1 = (await st('p2')).hp
  const plain = b0 - b1
  // combo-scaled melee dmg is floored upstream, then the roster boost is applied at the choke-point and floored again
  const PLAIN = Math.floor(Math.floor(87 * 0.6) * BOOST), AMB = Math.floor(Math.floor(87 * 0.6 * 1.2) * BOOST)
  ck(`ambush Heavy deals +20 % (${AMB} vs ${PLAIN}, roster boost x${BOOST}) and ends Vanish`, amb === AMB && plain === PLAIN, { amb, plain })
  await reset(70, false, { energy: 60 }); await vanish(); await step(4); await tap(['k'], 1); a = await wait(s => !s.attack, 60)
  ck('…the ambush hit ends Vanish (counted once)', !a.inv && a.s.stats.ambushHits === 1 && a.s.stats.vanishEnds.ambush === 1 && a.dmgMul === 1, { inv: a.inv, s: a.s.stats })
  // facing: the opponent does not auto-turn toward invisible Violet
  await reset(150, false, { energy: 60 }); await vanish(); await step(4)
  await page.evaluate(() => { const a = __harness.violetTest.raw(); a.x += 320 }); await step(3); let b = await st('p2')
  ck('opponent keeps its facing when invisible Violet crosses behind it', b.facing === -1, b.facing)
  await vanish(); await step(240); await vanish(); await step(2); await page.evaluate(() => { const a = __harness.violetTest.raw(); a._violet.vanishCd = 0 }); await vanish(); await step(3); b = await st('p2'); a = await st()
  await page.evaluate(() => { const H = __harness.violetTest; H.raw()._violet && (H.raw()._violet.vanishCd = 0) })
  await tap(['s'], 2); await step(2); await down(['s']); await step(1); await tap(['l'], 1); await up(['s']); await step(3); b = await st('p2'); a = await st()
  ck('once visible again the opponent auto-turns to face her', !a.inv && b.facing === 1, { inv: a.inv, facing: b.facing })
} catch (e) { ck('exception', false, e.stack) }
ck('no page errors', B.errors.length === 0, B.errors.slice(0, 3))
await B.close(); process.exit(summary('violet vanish (phase 3)') ? 1 : 0)
