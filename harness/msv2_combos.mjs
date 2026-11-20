// harness/msv2_combos.mjs — MSv2 NINJA STORM RANGERS Phase 5: combo routes measured on the REAL game loop with real
// key input (S.P.D. Red standing as the dummy). A route is a TRUE combo when the foe never leaves hitstun / knockdown
// between its first and last hit. Writes docs/ninja_storm_rangers/combos_measured.json (read by COMBOS.md).
//   node harness/msv2_combos.mjs
import fs from 'node:fs'
import { launch, reporter } from './msv2_lib.mjs'
const R = reporter('MSv2 COMBOS'), D = await launch()
const out = []
let log = null
async function watch(n) {
  for (let i = 0; i < n; i++) {
    await D.step(1)
    const z = await D.page.evaluate(() => { const z = __harness.nsrTest.raw('p2'), a = __harness.nsrTest.raw('p1'); return { hp: z.health, hs: (z.hitstun || 0) > 0 || !!z.knockdownState || (z.knockdownTimer || 0) > 0, combo: a.comboCounter || 0, airborne: !(z.onGround || z.grounded) } })
    if (log.prev != null && z.hp < log.prev) { log.hits++; if (log.first == null) log.first = log.t; log.last = log.t; if (log.first != null && log.gap) log.dropped = true }
    if (log.first != null && log.last === log.t) log.gap = false
    else if (log.first != null && !z.hs) log.gap = true
    log.prev = z.hp; log.t++; log.maxCombo = Math.max(log.maxCombo, z.combo)
  }
}
const tap = async (keys, after = 0) => { keys = [].concat(keys); for (const k of keys) await D.down(k); await watch(1); for (const k of keys) await D.up(k); if (after) await watch(after) }
const dial = async (btn, after = 0) => { await tap('s', 1); await tap('s', 0); await watch(1); await tap(btn, after) }
async function route(name, stance, setup, body, note = '') {
  await D.fresh(setup.dx ?? 70, { energy: setup.energy ?? 100 })
  if (stance === 'yellow') { await D.dial('k'); await D.step(35); await D.page.evaluate(e => { __harness.nsrTest.raw('p1').energy = e }, setup.energy ?? 100) }
  if (setup.pre) await setup.pre()
  await D.page.evaluate(() => { const z = __harness.nsrTest.raw('p2'); z.health = z.maxHealth; __harness.nsrTest.raw('p1').comboCounter = 0 })
  const h0 = (await D.S('p2')).health
  log = { hits: 0, prev: h0, t: 0, first: null, last: null, gap: false, dropped: false, maxCombo: 0 }
  await body()
  await watch(40)
  const dmg = h0 - (await D.S('p2')).health, s = await D.S()
  const r = { name, stance, hits: log.hits, damage: Math.round(dmg), trueCombo: log.hits > 1 && !log.dropped, endStance: s.stance, note }
  out.push(r)
  console.log(`  ${name.padEnd(46)} ${String(r.hits).padStart(2)} hits  ${String(r.damage).padStart(4)} dmg  ${r.trueCombo ? 'TRUE COMBO' : (log.hits > 1 ? 'dropped (gap)' : '')}  [${stance}→${r.endStance}]`)
  return r
}
try {
  await D.boot('ninja_storm_rangers', 'spd_red')
  R.section('RED stance (Shane)')
  const r1 = await route('Jab → Straight → Kick', 'red', {}, async () => { await tap('j', 6); await tap('j', 11); await tap('k') })
  const r2 = await route('Jab → Rising Kick (↑+H) launcher', 'red', {}, async () => { await tap('j', 6); await D.down('w'); await tap('k'); await D.up('w') })
  const r3 = await route('Jab → Straight → Crescent Blade (↓↘→+S)', 'red', {}, async () => { await tap('j', 6); await tap('j', 9); await D.motion(['s', ['s', 'd'], 'd'], 'l') })
  const r4 = await route('Low Kick → Kick', 'red', {}, async () => { await D.down('s'); await tap('j', 0); await D.up('s'); await watch(7); await tap('k') })
  const r5 = await route('Lightning: Jab → Straight → Kick (+15%)', 'red', { pre: async () => { await D.tap(['j', 'k', 'l']); await D.step(40); await D.page.evaluate(() => { const T = __harness.nsrTest, a = T.raw('p1'), z = T.raw('p2'); z.x = a.x + 70; z.vx = 0 }) } },
    async () => { await tap('j', 6); await tap('j', 11); await tap('k') })
  const r6 = await route('Shadow Clone → Jab → Straight → Kick (echoes)', 'red', { pre: async () => { await D.down('a'); await D.tap('l'); await D.up('a'); await D.step(20); await D.page.evaluate(() => { const T = __harness.nsrTest, a = T.raw('p1'), z = T.raw('p2'), c = a._academy.clone; z.x = a.x + 70; c.x = z.x + 60; c.dir = -1 }) } },
    async () => { await tap('j', 6); await tap('j', 11); await tap('k') })
  R.section('YELLOW stance (Dustin)')
  const y1 = await route('Tackle → Shoulder Check → Stomp Kick', 'yellow', {}, async () => { await tap('j', 6); await tap('j', 11); await tap('k') })
  const y2 = await route('Tackle → Low Sweep → Stomp Kick', 'yellow', {}, async () => { await tap('j', 6); await D.down('s'); await tap('j', 0); await D.up('s'); await watch(8); await tap('k') })
  const y3 = await route('Quake: Tackle → Shoulder Check → Stomp (kb ×1.6)', 'yellow', { pre: async () => { await D.tap(['j', 'k', 'l']); await D.step(40); await D.page.evaluate(() => { const T = __harness.nsrTest, a = T.raw('p1'), z = T.raw('p2'); z.x = a.x + 70; z.vx = 0 }) } },
    async () => { await tap('j', 6); await tap('j', 11); await tap('k') })
  const y4 = await route('Tackle → Earth Blade (↓↘→+S)', 'yellow', {}, async () => { await tap('j', 6); await D.motion(['s', ['s', 'd'], 'd'], 'l') })
  R.section('STANCE-SWAP combos')
  const s1 = await route('Red Rising Kick → ↓↓+H (Dustin) → jump → Air Stomp', 'red', {}, async () => {
    await D.down('w'); await tap('k', 0); await D.up('w'); await watch(9)         // launcher connects (f9) + its hitstop
    await dial('k', 0)                                                              // ↓↓+H: buffered through the hitstop, fires on its first free frame
    for (let n = 0; n < 20 && (await D.S()).stance !== 'yellow'; n++) await watch(1)
    await watch(1)                                                                  // Up released for one physics frame (a fresh jump press)
    await D.down('w'); await watch(2); await D.up('w'); await watch(3)              // jump after them (the window: air Light 2–4 f after the jump)
    await tap('j', 0)                                                               // Yellow Air Stomp
  }, 'launcher → swap → air finisher')
  const s2 = await route('Red Jab → Straight → ↓↓+H → Yellow Low Sweep', 'red', {}, async () => {
    await tap('j', 6); await tap('j', 9); await dial('k', 0); await D.down('s'); await tap('j', 0); await D.up('s')
  }, 'tag out of a connected normal')
  const s4 = await route('Red Rising Kick → ↓↓+H → jump → Rock Drop (air Heavy)', 'red', {}, async () => {
    await D.down('w'); await tap('k', 0); await D.up('w'); await watch(9)
    await dial('k', 0)
    for (let n = 0; n < 20 && (await D.S()).stance !== 'yellow'; n++) await watch(1)
    await watch(1)
    await D.down('w'); await watch(2); await D.up('w'); await watch(6)
    await tap('k', 0)
  }, 'launcher → swap → air finisher (wider window: 2–8 f)')
  const s3 = await route('Yellow Stomp → ↓↓+L (Shane) → Crescent Wave', 'yellow', { dx: 120 }, async () => {
    await tap('k', 12); await dial('j', 0); await D.motion(['s', ['s', 'a'], 'a'], 'l')
  }, 'knockdown → swap → projectile follow-up')
  R.check('Red gatling Jab → Straight → Kick is a true combo (3 hits)', r1.trueCombo && r1.hits === 3, r1)
  R.check('Red Jab → Rising Kick launches (2 hits)', r2.hits === 2 && r2.trueCombo, r2)
  R.check('Red normal → Crescent Blade cancel (5 hits)', r3.hits >= 4 && r3.trueCombo, r3)
  R.check('Lightning Mode string ≈ +15% over the plain string', Math.abs(r5.damage / r1.damage - 1.15) < 0.04, { plain: r1.damage, lightning: r5.damage })
  R.check('Shadow Clone echoes add hits (max 3 per combo)', r6.hits > r1.hits && r6.hits <= r1.hits + 3, r6)
  R.check('Yellow gatling (same numbers as Red: equal damage)', y1.trueCombo && y1.damage === r1.damage, { red: r1.damage, yellow: y1.damage })
  R.check('Yellow Tackle → Low Sweep → Stomp is a true combo', y2.trueCombo && y2.hits === 3, y2)
  R.check('STANCE-SWAP combo: Red launcher → swap → Yellow air finisher (true combo, ends in Yellow)', s1.trueCombo && s1.hits >= 2 && s1.endStance === 'yellow', s1)
  fs.writeFileSync('docs/ninja_storm_rangers/combos_measured.json', JSON.stringify(out, null, 1) + '\n')
  R.check('no page errors', D.errors.length === 0, D.errors.slice(0, 3))
} catch (e) { R.check('threw', false, e.stack) }
R.done(); await D.close()
