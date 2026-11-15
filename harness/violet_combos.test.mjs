// harness/violet_combos.test.mjs — Violet Parr PHASE 5: the four designed routes through REAL keyboard input (no state pokes
// mid-route). Scaling 85 % per hit (hit n deals 0.85^(n−1)), combo resets after 90 idle frames. Totals are asserted within
// ±20 % of the brief (the engine floors each hit and the 0.60 global scale applies per hit), and each route must connect
// every hit as ONE combo (the defender never leaves hitstun between hits).
//   1  Jab, Jab, Launcher, (jump-cancel) Air                 ≈ 93
//   2  Low, Heavy, Force Push                                ≈ 106
//   3  Field Trap, Heavy, Launcher, Force Ball (2 hits)       ≈ 124
//   4  Vanish → Heavy (ambush +20 %) → Force Push            ambush bonus once, Vanish ends
import { boot, ck, summary } from './violet_lib.mjs'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
// ROSTER PARITY boost (rosterParity.js) applied at combat.applyScaledDamage: melee dmg arrives pre-scaled + floored, so
// dealt = floor(old * boost); kit hits pass raw + scale, so dealt = floor(raw * boost * scale).
const BOOST = ROSTER_DAMAGE_BOOST.violet || 1
const mel = x => Math.floor(x * BOOST), kit = (raw, scale = 1) => Math.floor(raw * BOOST * scale)
const B = await boot('violet', 'violet'), { page, step, st, down, up, reset, wait } = B
const p2 = () => st('p2'), k = page.keyboard
const FW = 'd', BK = 'a', DN = 's'
async function press(keys, n = 1) { for (const x of keys) await k.down(x); await step(n); for (const x of keys) await k.up(x) }
async function motion(dirs, btn, per = 2) { for (const ks of dirs) await press(ks, per); await press([btn], 1) }
// Drive a route like a player hit-confirming: each step = [hits landed so far to wait for, extra frames, action()].
// Records every HP drop on P2; the route is BROKEN only if a hit lands after P2 was free (out of hitstun and not trapped).
async function route(steps, tail = 90) {
  const h0 = (await p2()).hp, drops = []; let last = h0, free = false, broke = false
  const sample = async () => { const b = await p2(), a = await st()
    if (b.hp < last) { if (free && drops.length) broke = true; drops.push(last - b.hp); last = b.hp; free = false }
    else if (drops.length && !(b.hitstun > 0) && a.s.trap?.st !== 'hold') free = true }
  for (const [need, wf, act] of steps) {
    for (let i = 0; i < 150 && drops.length < need; i++) { await step(1); await sample() }
    for (let i = 0; i < wf; i++) { await step(1); await sample() }
    await act(sample); await sample()
  }
  for (let i = 0; i < tail; i++) { await step(1); await sample() }
  return { drops, total: h0 - last, broke }
}
// design targets are pre-boost; scale them by the roster boost before the ±20 % tolerance
const within = (v, want) => v >= want * BOOST * 0.8 && v <= want * BOOST * 1.2
try {
  // 1 — Jab, Jab, Launcher, jump-cancel, Air
  await reset(56, false, { energy: 50 })
  // jump-cancel: hold Up through the Launcher's recovery until the hop happens, then Light on the way up
  const hop = async smp => { await down(['w']); for (let i = 0; i < 30 && !(await st()).s.stats.jumpCancels; i++) { await step(1); await smp() } await up(['w']) }
  let r = await route([[0, 0, () => press(['j'])], [1, 2, () => press(['j'])], [2, 2, () => press(['i'])], [3, 2, hop], [3, 1, () => press(['j'])]])
  ck(`Route 1 Jab Jab Launcher Air: 4 hits [${r.drops.join('+')}] = ${r.total} ≈ 93×${BOOST} ±20%`, r.drops.length === 4 && within(r.total, 93), r)
  ck('Route 1: one unbroken combo (defender never free between hits)', !r.broke, r)
  ck(`Route 1: per-hit 85% scaling (18, 15, 33, 18) x${BOOST} roster boost`, r.drops.join(',') === [18, 15, 33, 18].map(mel).join(','), r.drops)
  let a = await st(); ck('Route 1: Launcher jump-cancel used', a.s.stats.jumpCancels === 1, a.s.stats)

  // 2 — Low, Heavy, Force Push
  await reset(56, false, { energy: 50 })
  r = await route([[0, 0, async () => { await down([DN]); await step(1); await press(['j']); await up([DN]) }], [1, 2, () => press(['k'])],
    [2, 2, () => motion([[DN], [DN, FW], [FW]], 'l')]])
  ck(`Route 2 Low Heavy Force Push: 3 hits [${r.drops.join('+')}] = ${r.total} ≈ 106×${BOOST} ±20%`, r.drops.length === 3 && within(r.total, 106), r)
  ck('Route 2: one unbroken combo', !r.broke, r)

  // 3 — Field Trap, Heavy, Launcher, Force Ball
  await reset(70, false, { energy: 60 })
  const untilTrap = async smp => { for (let i = 0; i < 40 && (await st()).s.trap?.st !== 'hold'; i++) { await step(1); await smp() } await press(['k']) }
  r = await route([[0, 0, () => motion([[DN], [DN, BK], [BK]], 'l')], [0, 0, untilTrap], [1, 2, () => press(['i'])],
    [2, 2, async () => { await press([FW]); await step(1); await press([FW]); await press(['l']) }]])
  a = await st()
  ck(`Route 3 Trap Heavy Launcher Force Ball: 4 hits [${r.drops.join('+')}] = ${r.total} ≈ 124×${BOOST} ±20%`, r.drops.length === 4 && within(r.total, 124), r)
  ck('Route 3: the trap held the foe and the route never let them go', a.s.stats.traps === 1 && !r.broke, { traps: a.s.stats.traps, broke: r.broke })
  ck('Route 3: Force Ball connects twice on the launched foe', a.s.stats.ballHits === 2, a.s.stats)

  // 4 — Vanish → Heavy ambush → Force Push
  await reset(56, false, { energy: 60 })
  await press([DN], 2); await step(2); await press([DN], 2); await press(['l']); await step(26)
  a = await st(); ck('Route 4: Vanish active before the ambush', a.inv && a.dmgMul === 1.2, { inv: a.inv, mul: a.dmgMul })
  r = await route([[0, 0, () => press(['k'])], [1, 2, () => motion([[DN], [DN, FW], [FW]], 'l')]])
  a = await st()
  ck(`Route 4: Heavy ambush 52×1.2 = 62 (x${BOOST} = ${mel(62)}), then Force Push scaled ${kit(84, 0.6 * 0.85)} [${r.drops.join('+')}]`, r.drops.length === 2 && r.drops[0] === mel(62) && r.drops[1] === kit(84, 0.6 * 0.85), r)
  ck('Route 4: the bonus applies once and Vanish ends (ambush)', !a.inv && a.dmgMul === 1 && a.s.stats.ambushHits === 1 && a.s.stats.vanishEnds.ambush === 1, { inv: a.inv, mul: a.dmgMul, s: a.s.stats.vanishEnds })
  ck('Route 4: one unbroken combo', !r.broke, r)

  // combo reset: 90 frames without a hit → counter back to 0 and full damage again
  await reset(56, false, { energy: 50 }); await press(['j']); await step(30); a = await st()
  const c1 = a.combo; await step(95); a = await st()
  ck('combo resets after 90 frames (counter 0)', c1 === 1 && a.combo === 0, { c1, after: a.combo })
  { const h0 = (await p2()).hp; await press(['j']); await step(8); ck(`fresh hit after the reset deals full ${mel(18)} (18 x boost)`, h0 - (await p2()).hp === mel(18)) }
  // no jab loop: Jab → Jab → Jab only chains once
  await reset(56, false, { energy: 50 })
  r = await route([[0, 0, () => press(['j'])], [1, 2, () => press(['j'])], [2, 2, () => press(['j'])]], 40)
  a = await st(); ck('no infinite: Jab → Jab chains once (a third Jab is not a cancel)', a.s.stats.chains === 1 && r.drops.length === 2, { chains: a.s.stats.chains, drops: r.drops })
  ck('no page errors', B.errors.length === 0, B.errors.slice(0, 3))
} finally { await B.close() }
process.exit(summary('violet combos (phase 5)') ? 1 : 0)
