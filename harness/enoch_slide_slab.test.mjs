// harness/enoch_slide_slab.test.mjs — Enoch's GROUND SLIDE (double-tap anywhere = a slide that turns the floor to ICE, FIRE when
// hot), his ICE FLOOR vs the opponent (health ticks away + they slide off), and the SOLID AIR SLABS (land on them; the
// opponent who lands is hurt + shoved off; jumping up into one = a head bonk). Real game, real inputs.
//   node harness/enoch_slide_slab.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 300 ? d.slice(0, 300) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const J = o => JSON.stringify(o)
fs.mkdirSync('docs/enoch/screenshots', { recursive: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
await page.goto(server.base + '/index.html?harness=1&p1=enoch&p2=naruto&seed=4242', { waitUntil: 'load' })
await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
await page.evaluate(async () => {
  const { writeRawControls } = await import('./input.js'); const PF = await import('./platforms.js'); const { camera } = await import('./camera.js')
  const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
  const hold = (f, r, n = 1) => { writeRawControls(f, r); step(n) }
  window.__E = { H, PF, step, hold, rel: f => writeRawControls(f, {}), st: () => H.raw()._enoch,
    setup: (ax = 1000, bx = 1200) => { H.reset(); camera.reset(); __harness.setDummyBehavior?.('stand'); const a = H.raw(), b = H.raw('p2')
      for (const f of [a, b]) { f.leftTapTime = f.rightTapTime = 0; f.health = f.maxHealth; f.vx = f.vy = 0; f.hitstun = 0; f.blockstun = 0; f.invulnTimer = 0; f.energy = 0
        f.knockdownState = false; f.hitstop = 0; f._supFrozen = 0; f.attackCooldown = 0; f.dashCooldown = 0; f.comboCounter = 0 }
      a.x = ax; b.x = bx; a.facing = ax < bx ? 1 : -1; b.facing = -a.facing; writeRawControls(a, {}); writeRawControls(b, {}); step(2); return { a, b } } }
})
// ═══ G. GROUND SLIDE ═══
const G = await page.evaluate(() => { const { H, step, hold, rel, setup, st } = __E; const r = {}
  for (const [name, th] of [['bal', 0], ['hot', 60]]) {
    const { a } = setup(600, 1800); H.setThermal(th); const x0 = a.x
    hold(a, { right: true, dash: true }); let glid = 0; for (let i = 0; i < 30; i++) { if (st().glide) glid++; hold(a, { right: true }) }; rel(a)
    r[name] = { dx: Math.round(a.x - x0), glid, type: st().stats.iceGlide ? 'ice' : st().stats.fireGlide ? 'fire' : null, slides: st().stats.groundSlides,
      floor: [...new Set(st().field.patches.filter(p => p.x < a.x + 40 && p.x + p.width > x0).map(p => p.type))] }
  }
  return r })
ok('G1 double-tap and KEEP HOLDING on plain ground = the dash turns into a SLIDE that turns the floor to ICE', G.bal.slides === 1 && G.bal.type === 'ice' && G.bal.glid >= 14 && G.bal.dx > 150 && G.bal.floor.includes('ice'), J(G.bal))
ok('G2 hot: the same double-tap = a FIRE slide, the floor turns to FIRE', G.hot.type === 'fire' && G.hot.floor.includes('fire') && G.hot.dx > 150, J(G.hot))
// ═══ D. THE DASH IS BACK ═══
const D = await page.evaluate(() => { const { H, step, hold, rel, setup, st } = __E
  const { a } = setup(600, 1800); H.setThermal(0); const x0 = a.x, d0 = st().stats.iceDash
  hold(a, { right: true, dash: true }); const dt = a.dashTimer; rel(a); let glid = 0; for (let i = 0; i < 30; i++) { if (st().glide) glid++; step(1) }
  return { dashTimer: dt, iceDash: st().stats.iceDash - d0, glid, slides: st().stats.groundSlides, dx: Math.round(a.x - x0), ice: st().field.patches.some(p => p.type === 'ice') } })
ok('D1 a quick double-tap is his DASH again (no slide), leaving a streak of ice', D.dashTimer > 0 && D.iceDash === 1 && D.glid === 0 && D.slides === 0 && D.dx > 60 && D.ice, J(D))
// ═══ FL. FLOW: cancels ═══
const FL = await page.evaluate(() => { const { H, step, hold, rel, setup, st } = __E; const r = {}
  const tap = (f, k, n = 1) => { hold(f, k); rel(f); step(n) }
  const name = () => H.state().attack?.name
  // buffered chain: Light pressed again EARLY (during the jab) still comes out as the Straight
  let { a, b } = setup(1000, 1080); H.setThermal(0); tap(a, { light: true }, 2); tap(a, { light: true }); let seen = new Set(); for (let i = 0; i < 30; i++) { if (name()) seen.add(name()); step(1) }
  r.buffer = [...seen]
  // jump cancel on hit
  ;({ a, b } = setup(1000, 1080)); tap(a, { light: true }); let k = 0; while (!st().stats.clean && k++ < 20) step(1); hold(a, { jump: true, up: true }); hold(a, {}); step(14)
  r.jump = { jc: st().stats.jumpCancels || 0, air: !(a.onGround || a.grounded), vy: Math.round(a.vy) }
  // air attack → Special = the meteor
  ;({ a, b } = setup(1000, 1090)); hold(a, { jump: true, up: true }); hold(a, {}); step(6); tap(a, { light: true }); k = 0; while (!st().stats.clean && k++ < 25) step(1); tap(a, { special: true }); r.airMeteor = { name: name(), clean: st().stats.clean }
  // dash cancel on hit
  ;({ a, b } = setup(1000, 1080)); tap(a, { light: true }); k = 0; while (!st().stats.clean && k++ < 20) step(1); hold(a, { left: true, dash: true }); rel(a); let dt = 0; for (let i = 0; i < 16 && !dt; i++) { step(1); dt = a.dashTimer || 0 }
  r.dash = { dc: st().stats.dashCancels || 0, dashTimer: dt, attacking: !!a.attacking }
  return r })
ok('FL1 a press made early is BUFFERED: Jab → Straight comes out even pressed during the jab', FL.buffer.includes('jab') && FL.buffer.includes('straight'), J(FL.buffer))
ok('FL2 JUMP CANCEL: a normal that hits → Jump goes straight into the air', FL.jump.jc === 1 && FL.jump.air, J(FL.jump))
ok('FL3 air attack → Special = the METEOR', /eteor/.test(FL.airMeteor.name || ''), J(FL.airMeteor))
ok('FL4 DASH CANCEL: a normal that hits → double-tap = the dash', FL.dash.dc === 1 && !FL.dash.attacking && FL.dash.dashTimer > 0, J(FL.dash))
// ═══ F. HIS ICE FLOOR vs the opponent ═══
const F = await page.evaluate(() => { const { H, step, setup, st } = __E
  const { a, b } = setup(400, 1200); H.setThermal(0); H.patch({ type: 'ice', cx: b.x + b.w / 2 + 40, width: 240 }); b.invulnTimer = 0
  const hp0 = b.health, x0 = b.x; step(90)
  return { lost: Math.round(hp0 - b.health), moved: Math.round(b.x - x0), hits: st().stats.iceFloorHits } })
ok('F1 the opponent on his ICE loses health and SLIDES off toward the edge (Frozone, an ice-skater, is immune)', F.lost > 0 && F.hits >= 2 && Math.abs(F.moved) >= 60, J(F))
// ═══ S. SOLID AIR SLABS ═══
const S = await page.evaluate(() => { const { H, PF, step, hold, rel, setup, st } = __E; const r = {}
  let { a, b } = setup(500, 1700); H.setThermal(0)
  hold(a, { jump: true, up: true }); for (let i = 0; i < 7; i++) hold(a, {})
  hold(a, { right: true, dash: true }); let k = 0; while (st().aslide && k++ < 40) hold(a, { right: true }); rel(a)
  const q = st().rails[st().rails.length - 1], p = PF.getPlatforms().find(pp => pp.id === q?.pid)
  r.slab = p ? { x: Math.round(p.x), w: Math.round(p.w), top: Math.round(p.topY), owner: p.owner } : null
  if (!p) return r
  const mid = p.x + p.w / 2
  // he lands on it
  for (let i = 0; i < 80; i++) step(1); a.x = mid - a.w / 2 - 30; a.y = p.topY - a.h - 50; a.vy = 0; a.vx = 0; for (let i = 0; i < 40; i++) step(1)
  r.enoch = { feet: Math.round(a.y + a.h), top: Math.round(p.topY), onIt: a._floorPlatformId === p.id }
  a.x = 200; a.y = (a.groundY ?? 600) - a.h; step(20)
  // the opponent drops onto it: hurt + shoved off
  b.x = mid - b.w / 2; b.y = p.topY - b.h - 40; b.vy = 0; b.vx = 0; b.onGround = false; b.grounded = false; const hp0 = b.health
  let off = null; for (let i = 0; i < 50; i++) { step(1); if (off == null && st().stats.slabShoves > 0) off = i }
  r.foe = { lost: Math.round(hp0 - b.health), shoves: st().stats.slabShoves, offX: b.x + b.w < p.x || b.x > p.x + p.w, onIt: b._floorPlatformId === p.id, at: off }
  // the opponent jumps up into it from below: bonk (never ends up above it)
  for (let i = 0; i < 60; i++) step(1); b.x = mid - b.w / 2; b.y = (st().floor ?? 600) - b.h; b.vy = -24; b.onGround = false; b.grounded = false
  let minFeet = 9999; for (let i = 0; i < 40; i++) { step(1); if (b.x + b.w > p.x && b.x < p.x + p.w) minFeet = Math.min(minFeet, b.y + b.h) }
  r.bonk = { bonks: st().stats.slabBonks, minFeet: Math.round(minFeet), top: Math.round(p.topY) }
  // it lasts a while, then goes (the platform is removed with the slab)
  for (let i = 0; i < 480; i++) step(1); r.gone = !PF.getPlatforms().some(pp => pp.id === p.id)
  return r })
ok('S1 the air slide leaves a SOLID slab (a platform in the air)', !!S.slab && /^enochSlab:/.test(S.slab.owner) && S.slab.w >= 100, J(S.slab))
ok('S2 Enoch can LAND and stand on his slab', S.enoch && S.enoch.onIt && Math.abs(S.enoch.feet - S.enoch.top) <= 2, J(S.enoch))
ok('S3 the opponent who lands on it is HURT and SHOVED off', S.foe && S.foe.lost > 0 && S.foe.shoves >= 1 && S.foe.offX && !S.foe.onIt, J(S.foe))
ok('S4 jumping up into it from below = a head bonk (no passing through)', S.bonk && S.bonk.bonks >= 1 && S.bonk.minFeet > S.bonk.top, J(S.bonk))
ok('S5 the slab stops being solid when it melts away', S.gone === true, String(S.gone))
// screenshots
await page.evaluate(() => { const { H, step, hold, rel, setup } = __E; const { a } = setup(500, 1300); H.setThermal(0); hold(a, { right: true, dash: true }); rel(a); step(18) })
await page.screenshot({ path: 'docs/enoch/screenshots/ground_ice_slide.png' })
await page.evaluate(() => { const { H, step, hold, rel, setup } = __E; const { a } = setup(500, 1300); H.setThermal(60); hold(a, { right: true, dash: true }); rel(a); step(18) })
await page.screenshot({ path: 'docs/enoch/screenshots/ground_fire_slide.png' })
await page.evaluate(() => { const { H, step, hold, rel, setup, st } = __E; const { a, b } = setup(500, 1700); H.setThermal(0); hold(a, { jump: true, up: true }); for (let i = 0; i < 7; i++) hold(a, {})
  hold(a, { right: true, dash: true }); let k = 0; while (st().aslide && k++ < 40) hold(a, { right: true }); rel(a); step(40)
  const q = st().rails[st().rails.length - 1]; b.x = (q.x0 + q.x1) / 2 - b.w / 2; b.y = q.top - b.h - 60; b.vy = 0; b.onGround = false; step(8) })
await page.screenshot({ path: 'docs/enoch/screenshots/air_slab_solid.png' })
ok('R no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close()
console.log(`\n  ENOCH SLIDE + SLAB: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
