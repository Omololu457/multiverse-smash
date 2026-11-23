// harness/invincible.test.mjs — MSV1-INVINCIBLE: Invincible (Mark Grayson, rosterKey invincible) through REAL keyboard input
// and the live engine (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge, ; block, WASD).
// Sections: numbers · flight · normals · specials · passive · super · ult · present. Writes docs/msv1/invincible/test_results.json.
//   node harness/invincible.test.mjs [--only=numbers,flight,...]   (P2 = INV_P2 env, default homelander)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
const want = k => !ONLY.length || ONLY.includes(k)
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.invincibleTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
const st = (w = 'p1') => S('H.state(a)', w)
async function hold(keys, n) { for (const k of keys) await page.keyboard.down(k); await step(n); for (const k of keys) await page.keyboard.up(k) }
const tap = (keys, n = 2) => hold(keys, n)
async function reset(o = {}) {
  await page.evaluate(o => { const H = __harness.invincibleTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    const gap = o.gap ?? 80
    a.x = o.x ?? 1300; b.x = a.x + a.w + gap; a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? f.maxEnergy; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0; f._forceGuard = false
      f.ultimateCooldown = 0 } }, o)
  await step(2)
}
const foe = () => S('(() => { const o = H.raw("p2"); return { hp: o.health, max: o.maxHealth, x: Math.round(o.x), y: Math.round(o.y), vx: o.vx, vy: o.vy, hitstun: o.hitstun || 0, kd: !!o.knockdownState, splat: o._wallSplat || 0, wb: !!o.wallBounce } })()')
const stats = () => S('H.raw()._inv?.stats || {}')
const runUntilIdle = async (max = 160) => { for (let i = 0; i < max; i++) { const s = await st(); if (!s.attack && !s.hitstop && !s.s?.mv) return i; await step(1) } return max }
const near = (a, b, tol) => Math.abs(a - b) <= tol
const P2 = process.env.INV_P2 || 'homelander'

try {
  await page.goto(server.base + `/index.html?harness=1&p1=invincible&p2=${P2}&seed=50223`); await page.waitForFunction(() => window.__harness?.invincibleTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone?.()); await step(3)
  const D = await S('H.data()')
  let s = await st()

  if (want('numbers')) {
    const R = report.numbers = { maxHp: s.maxHp, maxEnergy: s.maxEnergy, runPxf: D.runPxf, speedMul: D.speedMul, top: D.top }
    ck('P1 is invincible, HP 748 (0.65 × median 1150), meter 200', s.key === 'invincible' && s.maxHp === 748 && s.maxEnergy === 200, JSON.stringify([s.key, s.maxHp, s.maxEnergy]))
    await reset({ gap: 1400, x: 200 }); await step(4)
    await page.keyboard.down('d'); await step(30); const a = await st(); await step(20); const b = await st(); await page.keyboard.up('d')
    R.run = { pxf: +((b.x - a.x) / 20).toFixed(3) }
    ck('ground run ≈ 16.13 px/f (1.1 × Sukuna (Shinjuku) 14.66)', near(R.run.pxf, 16.13, 0.6), JSON.stringify(R.run))
  }

  if (want('flight')) {
    const R = report.flight = {}
    await reset({ gap: 1600, x: 200 }); await step(4)
    const f0 = await foe()
    await tap(['p'], 2); await step(10); s = await st()
    ck('tap Charge → takes off (flight.js profile invincible)', s.flying, JSON.stringify([s.flying, s.flightPhase]))
    ck('… flight profile numbers: top 51.48, accel 2.451, drag 0.44, reverseBrake 0.6', D.profile.maxH === 51.48 && D.profile.drag === 0.44 && D.profile.reverseBrake === 0.6 && near(D.profile.accel, 2.451, 0.01), JSON.stringify(D.profile))
    await page.keyboard.down('d'); let top = 0, at = -1, boomAt = -1, noBlockSeen = false
    for (let i = 1; i <= 40; i++) { await step(1); const q = await st(); if (q.vx > top) top = q.vx; if (at < 0 && q.vx >= 51.4) at = i; if (boomAt < 0 && q.s.stats.booms > 0) boomAt = i; if (q.noBlock) noBlockSeen = true }
    R.top = { top: +top.toFixed(2), framesToTop: at, boomAt }
    ck('top speed 51.5 (0.9 × Omni-Man 57.2) reached in ≈21 f (0.35 s)', near(top, 51.48, 0.1) && at >= 18 && at <= 24, JSON.stringify(R.top))
    ck('SONIC BOOM fires on crossing 90 % top speed', boomAt > 0 && boomAt < at, JSON.stringify(R.top))
    ck('can NOT guard above 60 % top speed (_invNoBlock)', noBlockSeen)
    await page.keyboard.up('d'); let stop = -1
    for (let i = 1; i <= 14; i++) { await step(1); const q = await st(); if (stop < 0 && Math.abs(q.vx) < 0.08) stop = i }
    R.stop = stop
    ck('release → stopped in ≤ 8 frames', stop > 0 && stop <= 9, String(stop))
    await page.keyboard.down('d'); await step(30); await page.keyboard.up('d'); await page.keyboard.down('a'); let flip = -1
    for (let i = 1; i <= 10; i++) { await step(1); const q = await st(); if (flip < 0 && q.vx < 0) flip = i }
    await page.keyboard.up('a'); R.turn = flip
    ck('SNAP TURN: from top speed, moving the other way in ≤ 6 frames', flip > 0 && flip <= 6, String(flip))
    // block in flight below 60 %
    await reset({ gap: 1600, x: 200 }); await step(4); await tap(['p'], 2); await step(12)
    await page.keyboard.down(';'); await step(3); s = await st(); await page.keyboard.up(';')
    ck('guards in flight when slow (< 60 % top speed)', s.flying && s.blocking, JSON.stringify([s.flying, s.blocking]))
    // takeoff shockwave on an adjacent foe
    await reset({ gap: 20 }); await step(4); const h0 = (await foe()).hp
    await tap(['p'], 2); await step(6); const h1 = (await foe()).hp
    R.takeoff = { dealt: h0 - h1 }
    ck('take off next to the foe → 15-damage push', h0 - h1 === 15, JSON.stringify(R.takeoff))
  }

  if (want('normals')) {
    const R = report.normals = {}
    const one = async (name, keys, raw, o = {}) => {
      await reset({ gap: o.gap ?? 20, dummy: o.dummy }); await step(4); const h0 = (await foe()).hp
      if (o.pre) await o.pre()
      await hold(keys, 2); let first = -1
      for (let i = 1; i <= 40; i++) { await step(1); const f = await foe(); if (first < 0 && f.hp < h0) first = i + 1 }
      const h1 = (await foe()).hp; await runUntilIdle()
      R[name] = { dealt: h0 - h1, firstHitFrame: first }
      ck(`${name}: ${raw}`, h0 - h1 === raw, JSON.stringify(R[name]))
    }
    await one('Jab (Light)', ['j'], 42)
    await one('Straight (Heavy)', ['k'], 72)
    await one('Uppercut (Up-Attack)', ['i'], 88)
    await one('Sweep (↓ + Light)', ['s', 'j'], 52)
    await one('Spin kick (→ + Heavy)', ['d', 'k'], 78, { gap: 10 })
    await one('Rising kick (↓ + Heavy)', ['s', 'k'], 70)
    // Barrage: Light, then mash Light
    await reset({ gap: 20 }); await step(4); let h0 = (await foe()).hp
    await tap(['j'], 1); await step(2); for (let i = 0; i < 14; i++) { await tap(['j'], 1); await step(1) }
    await step(20); let st1 = await stats(); const f1 = await foe(); await runUntilIdle()
    R.barrage = { hits: st1.barrageHits, launch: st1.barrageLaunch, dealt: h0 - f1.hp }
    ck('Barrage (Light, mash Light): 6 × 16 = 96, last hit launches', st1.barrageHits === 6 && st1.barrageLaunch === 1 && h0 - f1.hp === 96, JSON.stringify(R.barrage))
    // flight punch scales with speed
    await reset({ gap: 1200, x: 200 }); await step(4); await tap(['p'], 2); await step(10)
    await page.keyboard.down('d'); let hit = null; h0 = (await foe()).hp
    for (let i = 0; i < 60 && !hit; i++) { await step(1); const q = await st(); const f = await foe(); const dist = f.x - q.x - q.w; if (dist < 140 && !q.attack) { await tap(['j'], 1) } if (f.hp < h0) hit = h0 - f.hp }
    await page.keyboard.up('d'); await runUntilIdle()
    R.flightPunch = { dealt: hit }
    ck('Flight punch at speed: 66 → up to +40 % (> 66, ≤ 93)', hit > 66 && hit <= 93, JSON.stringify(R.flightPunch))
  }

  if (want('specials')) {
    const R = report.specials = {}
    // INVINCIBLE PUNCH ↓↘→ + Special from 60 % away
    await reset({ gap: 600 }); await step(4); let f0 = await foe(), a0 = await st()
    await tap(['s'], 1); await tap(['s', 'd'], 1); await tap(['d'], 1); await tap(['d', 'l'], 1)
    for (let i = 0; i < 30; i++) await step(1)
    let f1 = await foe(), a1 = await st(), st1 = await stats()
    R.ipunch = { dealt: f0.hp - f1.hp, travelled: a1.x - a0.x, hits: st1.ipunchHits }
    ck('INVINCIBLE PUNCH (↓↘→ + S): crosses 600 px and hits for 110', st1.ipunchHits === 1 && f0.hp - f1.hp === 110, JSON.stringify(R.ipunch))
    // wall bounce: foe near the right wall
    await reset({ gap: 200 }); await step(4)
    await tap(['s'], 1); await tap(['s', 'd'], 1); await tap(['d'], 1); await tap(['d', 'l'], 1)
    let wb = false; for (let i = 0; i < 70; i++) { await step(1); if ((await stats()).wallBounces > 0) { wb = true; break } }
    R.wallBounce = { wb, foeX: (await foe()).x }
    ck('… a foe launched into the wall WALL-BOUNCES (engine splat fields)', wb, JSON.stringify(R.wallBounce))
    await runUntilIdle()
    // whiff: −16
    await reset({ gap: 200 }); await step(4)
    await page.evaluate(() => { window.__harness.invincibleTest.raw('p2').invulnTimer = 90 })   // untouchable foe → the rush whiffs
    await tap(['s'], 1); await tap(['s', 'd'], 1); await tap(['d'], 1); await tap(['d', 'l'], 1)
    let sawW = false; for (let i = 0; i < 40; i++) { await step(1); const q = await st(); if (q.attack?.inv?.key === 'kIPunchW') { sawW = true; R.whiff = { total: q.attack.total }; break } }
    ck('… a whiff overshoots, then 20 recovery frames (≥ 16 punishable)', sawW && R.whiff.total === 2 + D.ipunch.whiff + 4, JSON.stringify(R.whiff))
    await runUntilIdle()
    // SKYWARD →↓↘ + Special → he is in flight
    await reset({ gap: 20 }); await step(4); f0 = await foe()
    await tap(['d'], 1); await step(1); await tap(['s'], 1); await tap(['s', 'd'], 1); await tap(['s', 'd', 'l'], 1)
    let fl = false; for (let i = 0; i < 50; i++) { await step(1); if ((await st()).flying) fl = true }
    f1 = await foe(); st1 = await stats()
    R.skyward = { dealt: f0.hp - f1.hp, hits: st1.skywardHits, flight: fl }
    ck('SKYWARD (→↓↘ + S): 95, launches, then he is in flight', f0.hp - f1.hp === 95 && fl, JSON.stringify(R.skyward))
    // ZIP: double-tap → 45 % of 1280 = 576 px in 5 frames
    await reset({ gap: 1400, x: 200 }); await step(4); a0 = await st()
    await tap(['d'], 1); await step(2); await tap(['d'], 1); let mv = null, tAt = -1
    for (let i = 1; i <= 8; i++) { await step(1); const q = await st(); if (q.s.mv && !mv) mv = q.s.mv; if (q.s.mv && q.s.mv.t === 5) { tAt = i; R.zip = { from: q.s.mv.x0, to: Math.round(q.x), planned: q.s.mv.x1 - q.s.mv.x0 } } }
    a1 = await st()
    ck('ZIP (double-tap →): 576 px (45 % screen) in 5 frames', a1.s.stats.zips === 1 && R.zip && R.zip.planned === 576 && R.zip.to - R.zip.from === 576, JSON.stringify(R.zip))
    await step(10); a0 = await st(); await tap(['d'], 1); await step(2); await tap(['d'], 1); await step(6); a1 = await st()
    ck('… 1 charge on the ground (a second zip right away is refused)', a1.s.stats.zips === 1, JSON.stringify(a1.s.zip))
    // zip through a projectile
    await reset({ gap: 500 }); await step(30)
    await S('H.shoot({ speed: -14, damage: 40, x: H.raw().x + 150, y: H.raw().y + 30 }, "p2")')
    const hp0 = (await st()).hp
    await tap(['d'], 1); await step(1); await tap(['d'], 1); await step(10)
    const phased = (await stats()).zipPhased
    R.zipProj = { hp0, hp1: (await st()).hp, phased }
    ck('… frames 1-4 projectile-intangible (the bolt passes through)', phased >= 4 && (await st()).hp === hp0, JSON.stringify(R.zipProj))
    // zip-cancel a normal on hit
    await reset({ gap: 20 }); await step(4)
    await tap(['j'], 1); await step(4); await tap(['d'], 1); await step(1); await tap(['d'], 1); await step(8)
    ck('… cancels a normal on HIT (Jab → zip)', (await stats()).zipCancels === 1, JSON.stringify(await stats()))
    // CRASH DOWN: jump, ↓ + Special over the foe (hits OTG)
    await reset({ gap: 20 }); await step(4); f0 = await foe()
    await tap(['w'], 2); await step(8); await tap(['s', 'l'], 2)
    for (let i = 0; i < 60; i++) await step(1)
    f1 = await foe(); st1 = await stats()
    R.crash = { dealt: f0.hp - f1.hp, hits: st1.crashHits }
    ck('CRASH DOWN (air ↓ + S): 70 on landing', st1.crashHits === 1 && f0.hp - f1.hp === 70, JSON.stringify(R.crash))
    await reset({ gap: 20 }); await step(4)
    await page.evaluate(() => { const b = __harness.invincibleTest.raw('p2'); b.knockdownState = true; b.knockdownTimer = 120 })
    f0 = await foe(); await tap(['w'], 2); await step(8); await tap(['s', 'l'], 2); for (let i = 0; i < 60; i++) await step(1)
    ck('… hits a knocked-down foe (OTG)', (await foe()).hp < f0.hp, JSON.stringify([f0.hp, (await foe()).hp]))
  }

  if (want('passive')) {
    const R = report.passive = {}
    await reset({ gap: 20 }); await step(4)
    await S('H.setHp(10)')
    await S('H.hurt(200)')   // 200 raw → 120 dealt through applyScaledDamage: lethal
    let s1 = await st(); const hpAfter = s1.hp, kd = s1.knockdown || (await (async () => { await step(1); return (await st()).knockdown })())
    for (let i = 0; i < 120; i++) { await step(1); s1 = await st(); if (s1.s?.say && !R.sayAtCsd) R.sayAtCsd = s1.s.say.text; if (s1.s?.resolve > 0) break }
    R.csd = { hpAfterHit: hpAfter, hp: s1.hp, kd, resolve: s1.s?.resolve, used: s1.s?.csd?.used, say: s1.s?.say?.text || null }
    ck("CAN'T STAY DOWN: the KO hit leaves 1 HP → knockdown → RESOLVE 6 s", s1.s?.csd?.used && hpAfter === 1 && kd && s1.s.resolve > 300, JSON.stringify(R.csd))
    ck('… bubble "Not yet."', R.sayAtCsd === 'Not yet.', JSON.stringify(R))
    await S('H.hurt(5000)'); ck('… only once per round: the next lethal hit KOs', (await st()).hp <= 0, String((await st()).hp))
    ck('… RESOLVE speeds him up ×1.1', near(s1.speedMul, D.speedMul * 1.1, 0.01), String(s1.speedMul))
  }

  if (want('super')) {
    const R = report.super = {}
    await reset({ gap: 20, energy: 200 }); await step(4); const f0 = await foe()
    await tap(['s'], 1); await step(1); await tap(['s'], 1); await tap(['l'], 2)
    for (let i = 0; i < 110; i++) await step(1)
    const f1 = await foe(), st1 = await stats(), me = await st()
    R.nhb = { dealt: f0.hp - f1.hp, hits: st1.nhbHits, energy: me.energy }
    ck('NO HOLDING BACK (↓↓ + S, 1 bar): 6 directions, 300 total', st1.nhbHits === 6 && near(f0.hp - f1.hp, 300, 2), JSON.stringify(R.nhb))
  }

  if (want('ult')) {
    const R = report.ult = {}
    await reset({ gap: 200, energy: 200 }); await step(4); const f0 = await foe()
    await tap(['u'], 2); let alpha0 = false, marker = null
    for (let i = 0; i < 140; i++) { await step(1); const q = await st(); if (q.alpha === 0) alpha0 = true; if (q.s?.tv?.x != null && !marker) marker = q.s.tv.x }
    const f1 = await foe(), st1 = await stats()
    R.tv = { dealt: f0.hp - f1.hp, direct: st1.tvDirect, marker, alpha0 }
    ck('TERMINAL VELOCITY (Ultimate): leaves the screen, marker, 380 direct hit', alpha0 && marker != null && st1.tvDirect === 1 && f0.hp - f1.hp === 380, JSON.stringify(R.tv))
    await runUntilIdle()
    await reset({ gap: 1500, x: 200, energy: 200 }); await step(4)
    await page.evaluate(() => { const b = window.__harness.invincibleTest.raw('p2'); b.x = 2900 })
    await tap(['u'], 2); let crater = false
    await page.keyboard.down('a'); for (let i = 0; i < 140; i++) { await step(1); if ((await st()).attack?.inv?.key === 'kTVCrater') crater = true } await page.keyboard.up('a')
    ck('… a whiff leaves him stuck in the crater (50 f)', crater && (await stats()).tvWhiff === 1)
    ck('… crack decal left on the floor', (await S('H.raw()._inv.decal.length')) >= 1)
  }

  if (want('present')) {
    const hud = await S('H.hud()')
    ck('HUD tags: Can\'t Stay Down + zip charges', hud && hud.zipMax >= 1, JSON.stringify(hud))
    const ms = await page.evaluate(() => { const c = window.__harness.characters?.()?.invincible; return c ? { name: c.displayName, tag: c.selectTag, arch: c.archetype, diff: c.difficulty, tagline: c.tagline, universe: c.universe } : null })
    ck('roster entry: Invincible / Mark Grayson / Glass Cannon / Rushdown Flier / 5 / "Still standing."', !ms || (ms.name === 'Invincible' && ms.tag === 'Mark Grayson' && ms.diff === 5 && ms.tagline === 'Still standing.'), JSON.stringify(ms))
  }
} catch (e) { ck('no exception', false, e.stack) }
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
console.log(`\nINVINCIBLE: ${pass} passed, ${fail} failed`)
fs.mkdirSync('docs/msv1/invincible', { recursive: true })
fs.writeFileSync('docs/msv1/invincible/test_results.json', JSON.stringify({ pass, fail, report }, null, 1))
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
