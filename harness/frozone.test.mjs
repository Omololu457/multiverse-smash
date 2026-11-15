// harness/frozone.test.mjs — Frozone (frozone): mechanics + MEASURED damage through REAL keyboard input and the actual
// movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge (L2), ; block,
// WASD). Covers identity, walk, ICE SKATE (profile, brake, air skate once / no altitude), the SHARED double jump, authored
// frame data, the chain and cancels, every special, Chill / Freeze / Shatter (duration, immunity, once-only, other-damage
// thaw, no refreeze inside one combo), Black Ice (Skate Switch, Frost Lance, patch races), the ultimate (connect / block /
// whiff / reset), KO cleanup and mirror facing. Writes docs/frozone/mechanics_results.json.   node harness/frozone.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { frozone as FZD, FLASH, RAIL, TRAIL, WALL, GLIDE } from '../frozoneData.js'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, movement: {}, ice: {}, ultimate: {}, misc: {} }; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = FZD.stats.maxHealth, BOOST = ROSTER_DAMAGE_BOOST.frozone || 1   // roster-parity pass 2026-11-15 (was 1050 / no boost)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.frozoneTest, b = H.raw('p2'); return { a: H.state(), b: H.state('p2'), stun: b.hitstun, block: b.blockstun, ult: H.ult(), proj: H.projectiles(), hud: H.hud() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.frozoneTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { await step(1); for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function reset(gap = 90, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.frozoneTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
}
async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const busy = q => q.a.attack || q.ult.active || q.proj.length || q.b.hitstun > 0
const idle = () => wait(q => !q.a.attack && q.a.grounded && !q.ult.active, 400)
const allIdle = () => wait(q => !busy(q) && q.a.grounded && q.b.grounded, 700)
const moveInfo = () => page.evaluate(() => { const a = __harness.frozoneTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })
async function measure(label, script, { gap = 90, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100, max = 700, setup = null } = {}) {
  await reset(gap, flip, { dummy, energy }); if (setup) await S(setup)
  let s = await state(); const e0 = s.a.energy, log = []
  let hp = s.b.hp, stun = s.stun, blk = 0, lastBs = s.block, frame = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs }); if (q.block > lastBs) blk++; hp = q.b.hp; stun = q.stun; lastBs = q.block } }
  const M = { watch, state, frame: () => frame,
    press: async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, mx = 120) => { for (let i = 0; i < mx; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() } }
  await script(M)
  for (let j = 0; j < max; j++) { const q = await state(); if (!busy(q)) break; await watch(1) }
  s = await state()
  const hitLog = log.filter(x => !x.blocked), firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), hitFrames: hitLog.map(x => x.f), blockedEvents: blk,
    chip: log.filter(x => x.blocked).reduce((t, x) => t + x.d, 0), damage: HP - s.b.hp, energySpent: +(e0 - s.a.energy).toFixed(2),
    trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, gap, flip, note, stats: s.a.s?.stats || null }
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1}` : hitLog.length ? 'single hit' : 'no hit'
  report.routes.push(r); return r
}
const clean = q => q.a.attack?.fz?.clean
const live = st => Math.floor(Math.floor(st * 0.6) * BOOST)   // shared GLOBAL_DAMAGE_SCALE on an unscaled first hit, then the roster-parity boost

try {
  await page.goto(server.base + '/index.html?harness=1&p1=frozone&p2=frozone&seed=880311'); await page.waitForFunction(() => window.__harness?.frozoneTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r, m
  const D = await S('H.data()')
  // ── identity ──
  ck(`both slots frozone, HP ${HP}, energy max 100`, s.a.key === 'frozone' && s.a.maxHp === HP && s.b.maxHp === HP && await S('H.raw().maxEnergy') === 100, JSON.stringify([s.a.key, s.a.maxHp]))
  ck('maxJumps 2 (the shared double jump)', s.a.maxJumps === 2, `${s.a.maxJumps}`)
  ck('universe the_incredibles', await S("H.raw().universe || H.raw().characterData?.universe || null") === 'the_incredibles', await S("H.raw().universe || H.raw().characterData?.universe || null"))
  // ── walk ──
  await reset(400); await page.keyboard.down('d'); await step(12); const vxw = (await state()).a.vx; await page.keyboard.up('d'); await step(10)
  const rawSp = await S('H.raw().speed'), formula = Math.min(9.5, Math.max(4.5, 4.5 + (rawSp - 78) / 20 * 5)); report.movement = { walkVx: vxw, liveSpeedStat: rawSp, formula }
  ck('walk = the shared physics formula', Math.abs(vxw - formula) < 0.01, `${vxw} vs ${formula}`)
  // ── ICE FLASH (ground double-tap): instant teleport + persistent trail + slice (2026-11-15) ──
  const dtap = async k => { await tap([k], 1); await step(2); await tap([k], 1) }
  await reset(600); s = await state(); const flX0 = s.a.x
  await dtap('d'); s = await state()
  ck('Ice Flash: one double-tap teleports ~FLASH.dist in a single frame', s.a.s.stats.flashes === 1 && Math.abs(s.a.x - flX0 - FLASH.dist) < 30, JSON.stringify({ d: s.a.x - flX0, n: s.a.s.stats.flashes }))
  ck('Ice Flash leaves an ice trail on the floor', s.a.s.ice.some(q => q.kind === 'trail' && Math.abs(q.x1 - q.x0) > 200), JSON.stringify(s.a.s.ice))
  ck('Ice Flash has NO cooldown (owner request)', s.a.dashCooldown === 0, `${s.a.dashCooldown}`)
  await step(FLASH.lag + 1); await dtap('d'); s = await state(); ck('he can flash again as soon as the arrival slide ends', s.a.s.stats.flashes === 2, `${s.a.s.stats.flashes}`)
  await step(TRAIL.life - 30); s = await state(); ck('the trail is still there ~1.2 s later (skill window)', s.a.s.ice.some(q => q.kind === 'trail'))
  await step(40); s = await state(); ck('…and melts after TRAIL.life', !s.a.s.ice.some(q => q.kind === 'trail'), JSON.stringify(s.a.s.ice))
  report.movement.flash = { dist: FLASH.dist }
  r = await measure('Ice Flash slice (through the foe)', async M => { await dtap('d'); await M.watch(20) }, { gap: 120 })
  s = await state()
  ck('Ice Flash passes THROUGH the opponent and ends clear of their body', s.a.x > s.b.x + s.b.w - 1, JSON.stringify({ a: s.a.x, b: s.b.x }))
  ck(`the slice lands a beat later: one hit = ${live(FLASH.raw)}`, r.hits.length === 1 && r.hits[0] === live(FLASH.raw) && r.stats.slices === 1, JSON.stringify(r))
  ck('the slice is a Frozone ice hit (adds one Chill pip)', r.stats.chill === 1, JSON.stringify(r.stats))
  r = await measure('Ice Flash slice vs guard', async M => { await dtap('d'); await M.watch(20) }, { gap: 120, dummy: 'block' })
  ck('a guarding opponent blocks the slice (no clean damage)', r.hits.length === 0, JSON.stringify(r))
  await allIdle()
  // ── ICE RAIL (air double-tap) ──
  await reset(700); await page.keyboard.down('w'); await step(2); await page.keyboard.up('w'); await step(6)
  s = await state(); const ry0 = s.a.y, rx0 = s.a.x
  await dtap('d'); const rys = [], rxs = []; for (let i = 0; i < 8; i++) { const q = await state(); rys.push(+q.a.y.toFixed(1)); rxs.push(Math.round(q.a.x)); await step(1) }
  s = await state()
  ck('Ice Rail: an air double-tap builds a rail and he grinds it', s.a.s.stats.rails === 1 && rxs[7] - rxs[0] > 70, JSON.stringify({ rails: s.a.s.stats.rails, rxs }))
  ck('a level rail holds his height while grinding', Math.max(...rys) - Math.min(...rys) < 3, JSON.stringify(rys))
  s = await wait(q => !q.a.s.ride && !q.a.s.stream, 40); ck('released Forward: the stream stops after its minimum and he carries momentum', !s.a.s.stream && Math.abs(s.a.vx) > 3, JSON.stringify({ vx: s.a.vx }))
  ck('the rail stays after the ride', s.a.s.ice.some(q => q.kind === 'rail'))
  await dtap('d'); s = await state(); ck('one NEW rail per airtime', s.a.s.stats.rails === 1, `${s.a.s.stats.rails}`)
  // re-ride: drop him back onto the live rail from above
  const rl = s.a.s.ice.find(q => q.kind === 'rail')
  await S(`(H.raw().x = ${(rl.x0 + rl.x1) / 2} - H.raw().w / 2, H.raw().y = ${rl.y0} - H.raw().h - 30, H.raw().vy = 2, H.raw().vx = 0, H.raw().onGround = false, H.raw().grounded = false, H.raw()._frozone.prevFeet = null)`)
  s = await wait(q => !!q.a.s.ride, 20); ck('landing on a live rail from above catches it (re-ride)', s.a.s.stats.reRides === 1 && !!s.a.s.ride, JSON.stringify(s.a.s.stats))
  await allIdle(); s = await state()
  await step(RAIL.life + 10); s = await state(); ck('rails melt after RAIL.life', !s.a.s.ice.some(q => q.kind === 'rail'), JSON.stringify(s.a.s.ice))
  // rising rail (Up held) and diving rail (Down held)
  await reset(700); await page.keyboard.down('w'); await step(8); const yr0 = (await state()).a.y; await dtap('d'); await step(8); s = await state(); await page.keyboard.up('w')
  ck('Up held: the rail RISES (he climbs while grinding)', s.a.y < yr0 - 40 && s.a.s.ice.some(q => q.kind === 'rail' && q.y1 < q.y0), JSON.stringify({ yr0, y: s.a.y }))
  await allIdle()
  await reset(700); await tap(['w'], 2); await step(10); await page.keyboard.down('s'); await dtap('d'); await page.keyboard.up('s'); s = await state()
  ck('Down held: the rail DIVES (ends on the floor)', s.a.s.ice.some(q => q.kind === 'rail' && q.y1 > q.y0), JSON.stringify(s.a.s.ice))
  await allIdle()
  // during a stream Up STEERS (keyboard Up = Jump): no hop, and the air jump is NOT burned
  await reset(700); await tap(['w'], 2); await step(6); const jcS = (await state()).a.jumpCount; await dtap('d'); await page.keyboard.down('d'); await step(4); await tap(['w'], 6); await step(1); s = await state(); await page.keyboard.up('d')
  ck('mid-stream Up steers the ice upward and never spends the air jump', !!s.a.s.stream && s.a.jumpCount === jcS && s.a.s.ice.some(q => q.kind === 'rail' && q.y1 < q.y0 - 10), JSON.stringify({ st: !!s.a.s.stream, jc: [jcS, s.a.jumpCount] }))
  await allIdle()
  // rail hop on a RE-RIDE: Jump pops him off
  await reset(700); await tap(['w'], 2); await step(6); await dtap('d'); s = await wait(q => !q.a.s.stream, 30); const rh = s.a.s.ice.find(q => q.kind === 'rail')
  await S(`(H.raw().x = ${(rh.x0 + rh.x1) / 2 - 40} - H.raw().w / 2, H.raw().y = ${rh.y0} - H.raw().h - 20, H.raw().vy = 2, H.raw().vx = 0, H.raw().onGround = false, H.raw().grounded = false, H.raw()._frozone.prevFeet = null)`)
  s = await wait(q => !!q.a.s.ride, 20); await step(2); await tap(['w'], 1); await step(1); s = await state()
  ck('Jump while re-riding a rail hops him off upward', s.a.s.stats.railHops === 1 && !s.a.s.ride && s.a.vy < 0, JSON.stringify({ hops: s.a.s.stats.railHops, vy: s.a.vy }))
  await allIdle()
  // CONTINUOUS ICE STREAM: holding Forward keeps the ice pouring (up to RAIL.stream ticks), steerable mid-air
  await reset(1200); await page.keyboard.down('w'); await step(2); await page.keyboard.up('w'); await step(6); const sx0 = (await state()).a.x
  await dtap('d'); await page.keyboard.down('d'); let sk = 0; for (; sk < 140; sk++) { await step(1); if (!(await state()).a.s.stream) break }
  await page.keyboard.up('d'); s = await state()
  ck('holding Forward keeps the ice pouring for a while (stream ≫ a single rail)', sk > 40 && sk <= RAIL.stream + 2 && s.a.x - sx0 > 500, JSON.stringify({ frames: sk, dist: Math.round(s.a.x - sx0) }))
  ck('a stream is still ONE per airtime', s.a.s.stats.rails === 1, `${s.a.s.stats.rails}`)
  await allIdle()
  await reset(1200); await page.keyboard.down('w'); await step(2); await page.keyboard.up('w'); await step(6)
  await dtap('d'); await page.keyboard.down('d'); await step(10); await page.keyboard.down('w'); await step(10); await page.keyboard.up('w'); await step(4); await page.keyboard.down('s'); await step(8); await page.keyboard.up('s'); await page.keyboard.up('d'); s = await state()
  const segs = s.a.s.ice.filter(q => q.kind === 'rail')
  ck('steering mid-stream with Up / Down lays new rising / diving stretches', segs.length >= 3 && segs.some(q => q.y1 < q.y0 - 10) && segs.some(q => q.y1 > q.y0 + 10), JSON.stringify(segs.map(q => [q.x0, q.y0, q.x1, q.y1])))
  await allIdle()
  // grinding through the opponent slices once per rail
  // place the foe once he is airborne (the arena re-centres the pair on the first frames after a reset)
  r = await measure('Ice Rail grind through foe', async M => { await tap(['w'], 2); await M.watch(10); await S('(H.raw("p2").x = H.raw().x + 330, H.raw("p2").vx = 0)'); await page.keyboard.down('s'); await M.press(['d']); await M.watch(2); await page.keyboard.down('d'); await M.watch(45); await page.keyboard.up('d'); await page.keyboard.up('s'); await M.watch(20) })
  ck(`a diving rail through the foe slices once (${live(RAIL.raw)})`, r.stats.railHits === 1 && r.hits.length >= 1 && r.hits[0] === live(RAIL.raw), JSON.stringify(r))
  await allIdle()
  // ── ICE GLIDER (hold Jump while falling) ──
  const fallTime = async hold => { await reset(600); await page.keyboard.down('w'); await step(2); if (!hold) await page.keyboard.up('w'); let n = 0; for (; n < 300; n++) { await step(1); if ((await state()).a.grounded && n > 4) break } await page.keyboard.up('w'); return n }
  const tDrop = await fallTime(false), tGlide = await fallTime(true); s = await state()
  ck('Ice Glider: holding Jump while falling floats him (much longer airtime)', tGlide > tDrop * 1.6 && s.a.s.stats.glides >= 1, JSON.stringify({ tDrop, tGlide, glides: s.a.s.stats.glides }))
  await reset(600); await page.keyboard.down('w'); await step(30); const gv = []; for (let i = 0; i < 6; i++) { gv.push(+(await state()).a.vy.toFixed(2)); await step(1) } await page.keyboard.up('w')
  ck('gliding fall speed is capped', gv.every(v => v <= GLIDE.fall + 1.5), JSON.stringify(gv))
  await allIdle()
  // ── ICE WALL (Down + Heavy) ──
  await reset(400); await tap(['s', 'k'], 1); s = await wait(q => !!q.a.s?.wall, 30)
  ck('Down + Heavy raises an Ice Wall ahead (15 Frost)', !!s.a.s.wall && Math.abs(s.a.s.wall.x - (s.a.x + s.a.w / 2 + WALL.ahead)) < 4 && 100 - s.a.energy >= 13 && 100 - s.a.energy <= 15.01, JSON.stringify({ w: s.a.s.wall, e: s.a.energy }))
  await step(WALL.rise + 4); await S(`(H.raw('p2').x = ${s.a.s.wall.x} - 10)`); await step(1); s = await state()
  ck('the wall pushes the opponent out (no walking through it)', s.b.x >= s.a.s.wall.x + WALL.w / 2 - 1 || s.b.x + s.b.w <= s.a.s.wall.x - WALL.w / 2 + 1, JSON.stringify({ b: s.b.x, w: s.a.s.wall.x }))
  const hpW = s.a.hp; await S("(H.raw('p2').facing = -1, H.raw('p2').energy = 100)"); await S("H.move('fLance', 'p2')"); await step(40); s = await state()
  ck("the wall eats the opponent's projectile (wall HP −1, Frozone untouched)", s.a.s.stats.wallBlocks === 1 && s.a.hp === hpW && s.a.s.wall?.hp === WALL.hp - 1, JSON.stringify({ blocks: s.a.s.stats.wallBlocks, hp: [hpW, s.a.hp], wall: s.a.s.wall }))
  await step(WALL.life); s = await state(); ck('the wall melts after WALL.life', !s.a.s.wall)
  r = await measure('Ice Wall eruption under the foe', async M => { await M.press(['s', 'k']); await M.watch(30) }, { gap: WALL.ahead - 24 })
  ck(`the wall erupting under the opponent launches them (${live(WALL.raw)})`, r.hits.length === 1 && r.hits[0] === live(WALL.raw) && r.stats.wallLaunch === 1, JSON.stringify(r))
  await allIdle()
  // double jump: exactly 2
  await reset(400); await tap(['w'], 2); await step(10); const j1 = (await state()).a.jumpCount
  await tap(['w'], 2); await step(2); const j2 = (await state()).a.jumpCount
  await tap(['w'], 2); await step(2); s = await state(); const j3 = s.a.jumpCount
  ck('double jump: exactly 2 (third press does nothing)', j1 === 1 && j2 === 2 && j3 === 2 && s.a.s.stats.dj === 1, JSON.stringify([j1, j2, j3, s.a.s.stats.dj]))
  await tap(['j'], 1); await step(16); s = await state(); ck('air Light never refunds a jump', s.a.jumpCount === 2 || s.a.grounded, `${s.a.jumpCount}`)
  s = await wait(q => q.a.grounded, 200); ck('a genuine landing resets jumpCount', s.a.grounded && s.a.jumpCount === 0, `${s.a.jumpCount}`)
  await allIdle()
  // ── authored data ──
  const expect = { light: [5, 45], fL2: [6, 45], fL3: [8, 60], fLow: [7, 45], heavy: [13, 90], fLaunch: [12, 75], air: [6, 65], fDownAir: [12, 85],
    fRush: [22, 120], fRise: [8, 110], fBreaker: [18, 145], ultOpen: [14, 40] }
  for (const [k, [st, raw]] of Object.entries(expect)) { const md = D.moves[k]; ck(`${k}: ${st} f startup, stored ${raw}`, md.startup === st && md.damage === raw && md.recovery > 0 && md.active > 0 && md.blockstun > 0, JSON.stringify({ st: md.startup, d: md.damage })) }
  ck('Ice Lance stored 90, Frost Lance 105 (+15)', D.lance.raw === 90 && D.lance.frost.raw === 105)
  ck('costs: Lance 15 / Rush 20 / Rise 20 / Black Ice 18 / Breaker 25', D.moves.fLance.cost === 15 && D.moves.fRush.cost === 20 && D.moves.fRise.cost === 20 && D.moves.fBlackIce.cost === 18 && D.moves.fBreaker.cost === 25)
  ck('grab raw 45 (shared grab)', await S("H.raw().characterData?.basic_attacks?.grab?.damage ?? 45") === 45)
  const ultSum = D.ult.contacts.reduce((t, c) => t + c.raw, 0) + D.moves.ultOpen.damage
  ck('ultimate schedule = 40 + 3 × 40 + 250 = 410 raw', ultSum === 410 && D.ult.contacts.length === 4 && D.ult.contacts[3].raw === 250, `${ultSum}`)
  // ── normals through the real parser ──
  await reset(90); await tap(['j'], 1); m = await moveInfo(); report.moves.light = m
  ck('Light = jab, activeStart 5', m?.name === 'light' && m.activeStart === 5, JSON.stringify(m)); await idle()
  r = await measure('Light ×3 chain', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['j']); await M.until(q => q.a.attack?.name === 'fL2' && clean(q), 40); await M.press(['j']) })
  ck('Square chain: 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  ck(`first hit = floor(45 × 0.6) = ${live(45)}`, r.hits[0] === live(45), JSON.stringify(r.hits))
  r = await measure('Light retap without a hit', async M => { await M.press(['j']); await M.watch(4); await M.press(['j']) }, { gap: 500 })
  s = await state(); ck('chain needs a clean hit', r.hits.length === 0 && (s.a.attack?.name || 'light') !== 'fL2', JSON.stringify(r))
  await allIdle(); await reset(90); await tap(['s', 'j'], 1); m = await moveInfo(); ck('Down+Light = low ice sweep (hits low)', m?.name === 'fLow' && D.moves.fLow.hitLevel === 'low', JSON.stringify(m)); await idle()
  await tap(['k'], 1); m = await moveInfo(); ck('Heavy = 13 f crystalline strike', m?.name === 'heavy' && m.activeStart === 13, JSON.stringify(m)); await idle()
  await tap(['i'], 1); m = await moveInfo(); s = await state(); ck('Up-Attack = launcher (no jump)', m?.name === 'fLaunch' && s.a.grounded, JSON.stringify(m)); await idle()
  await tap(['w', 'k'], 1); m = await moveInfo(); ck('Up+Heavy = launcher', m?.name === 'fLaunch', JSON.stringify(m)); await idle()
  r = await measure('Heavy', async M => { await M.press(['k']) }, { gap: 110 }); ck(`Heavy lands ${live(90)} on a fresh foe`, r.hits[0] === live(90), JSON.stringify(r.hits))
  r = await measure('Low', async M => { await M.press(['s', 'j']) }, { gap: 110 }); ck(`Low lands ${live(45)}`, r.hits[0] === live(45), JSON.stringify(r.hits))
  r = await measure('Light → Heavy', async M => { await M.press(['j']); await M.until(clean, 30); await M.press(['k']) })
  ck('clean Light → Heavy cancels (true combo)', r.hits.length === 2 && r.trueCombo, JSON.stringify(r))
  r = await measure('Launcher', async M => { await M.press(['i']) }, { gap: 100 }); ck(`launcher lands ${live(75)}`, r.hits[0] === live(75), JSON.stringify(r.hits))
  r = await measure('Launcher → jump cancel → air Light', async M => { await M.press(['i']); await M.until(q => q.a.attack?.name === 'fLaunch' && q.a.attack.hasHit, 40); for (let i = 0; i < 30 && await S('H.raw().hitstop') > 0; i++) await M.watch(1); await M.press(['w'], 2); await M.watch(5); await M.press(['j']) }, { gap: 100 })
  ck('launcher hit → Jump cancels → air strike connects (true combo)', r.hits.length === 2 && r.trueCombo, JSON.stringify(r))
  ck(`air strike lands ${live(65)} raw-scaled`, r.hits[1] <= live(65) && r.hits[1] > 0, JSON.stringify(r.hits))
  await reset(400); await tap(['w'], 2); await step(5); await tap(['j'], 1); m = await moveInfo(); ck('air Light = air strike', m?.name === 'air', JSON.stringify(m)); await allIdle()
  await reset(400); await tap(['w'], 2); await step(5); await tap(['k'], 1); m = await moveInfo(); ck('air Heavy = down-air', m?.name === 'fDownAir', JSON.stringify(m)); await allIdle()
  await reset(400); await tap(['w'], 2); await step(5); await tap(['s', 'k'], 1); m = await moveInfo(); ck('air Down+Heavy = down-air', m?.name === 'fDownAir', JSON.stringify(m)); await allIdle()
  // ── specials ──
  const spec = async (label, keys, name, cost) => {
    await reset(300); const e0 = (await state()).a.energy; await tap(keys, 1); m = await moveInfo(); s = await state()
    ck(`${label} = ${name}, −${cost}`, m?.name === name && Math.abs(e0 - s.a.energy - cost) < 0.6, JSON.stringify({ m, e: e0 - s.a.energy })); report.moves[name] = { startup: m?.activeStart, cost }
    await allIdle()
  }
  await spec('R1', ['l'], 'fLance', 15); await spec('Fwd+R1', ['d', 'l'], 'fRush', 20); await spec('Back+R1', ['a', 'l'], 'fBreaker', 25); await spec('Down+R1', ['s', 'l'], 'fBlackIce', 18)
  await reset(300); const jr0 = (await state()).a.jumpCount; await tap(['w', 'l'], 1); m = await moveInfo(); s = await state()
  ck('Up+R1 = Rising Glacier (never a jump on the press)', m?.name === 'fRise' && s.a.jumpCount === jr0, JSON.stringify({ m, jc: s.a.jumpCount })); await allIdle()
  await reset(300, true); await tap(['a', 'l'], 1); m = await moveInfo(); ck('mirror: Fwd = toward the facing (facing left, A+R1 = Rush)', m?.name === 'fRush', JSON.stringify(m)); await allIdle()
  await reset(300); await S('H.setEnergy(10)'); s = await state(); const rj0 = s.a.s.stats.rejects; await tap(['l'], 1); s = await state()
  ck('not enough energy: rejected before spending', !s.a.attack && s.a.energy >= 9.9 && s.a.s.stats.rejects === rj0 + 1 && s.a.s.lastReject === 'energy', JSON.stringify({ a: s.a.attack, e: s.a.energy }))
  // Ice Lance both facings
  for (const flip of [false, true]) {
    r = await measure(`Ice Lance${flip ? ' (mirror)' : ''}`, async M => { await M.press(['l']); await M.until(q => !q.proj.length && !q.a.attack, 120) }, { gap: 280, flip })
    ck(`Ice Lance${flip ? ' mirrored' : ''}: one ${live(90)} contact + one Chill`, r.hits.length === 1 && r.hits[0] === live(90) && r.stats.chill === 1, JSON.stringify(r))
  }
  await reset(300); await tap(['l'], 1); s = await wait(q => q.proj.length > 0, 20); const lp = s.proj[0]
  ck('Lance spawns at the extended hand (ahead of the body front, near hand height)', lp && lp.x > s.a.x + s.a.w && lp.x < s.a.x + s.a.w + 70, JSON.stringify({ lp, ax: s.a.x }))
  report.moves.lanceSpawn = { lx: lp?.x, front: s.a.x + s.a.w, ly: lp?.y, feet: s.a.y + s.a.h }
  r = await measure('Ice Lance whiff range', async M => { await M.press(['l']); await M.until(q => !q.proj.length && !q.a.attack, 120) }, { gap: 900 })
  ck('Lance range is bounded (no hit at 900 px)', r.hits.length === 0, JSON.stringify(r))
  r = await measure('Ice Lance vs guard', async M => { await M.press(['l']); await M.until(q => !q.proj.length && !q.a.attack, 120) }, { gap: 280, dummy: 'block' })
  ck('blocked Lance: no Chill', r.hits.length === 0 && r.stats.chill === 0 && r.blockedEvents >= 1, JSON.stringify(r))
  // Glacier Rush
  r = await measure('Glacier Rush', async M => { await M.press(['d', 'l']) }, { gap: 220 })
  s = await state(); ck(`Glacier Rush: one ${live(120)} contact + one Chill`, r.hits.length === 1 && r.hits[0] === live(120) && r.stats.chill === 1, JSON.stringify(r))
  ck('Glacier Rush never passes through the opponent', s.a.x + s.a.w <= s.b.x + 1 || s.b.x > s.a.x, JSON.stringify({ a: s.a.x, b: s.b.x }))
  r = await measure('Glacier Rush point blank', async M => { await M.press(['d', 'l']); await M.watch(30) }, { gap: 62 }); s = await state()
  ck('point-blank Rush stops at the body (no cross-up)', s.a.x < s.b.x, JSON.stringify({ a: s.a.x, b: s.b.x }))
  // Rising Glacier
  r = await measure('Rising Glacier', async M => { await M.press(['w', 'l']) }, { gap: 100 }); ck(`Rising Glacier: one ${live(110)} contact`, r.hits.length === 1 && r.hits[0] === live(110), JSON.stringify(r))
  await reset(400); await tap(['w'], 2); await step(4); await tap(['w', 'l'], 1); m = await moveInfo(); s = await wait(q => !q.a.attack, 60); const jcR = s.a.jumpCount; report.movement.riseAir = { g: s.a.grounded, jc: jcR }
  await tap(['w', 'l'], 1); s = await state()
  ck('Rising Glacier: once per airtime (second air cast rejected)', m?.name === 'fRise' && s.a.s.lastReject === 'rise' && s.a.attack?.name !== 'fRise', JSON.stringify({ m, rej: s.a.s.lastReject }))
  ck('Rising Glacier never refunds a jump', jcR >= 1, `${jcR}`)
  await allIdle(); await reset(400); await tap(['w', 'l'], 1); await wait(q => q.a.grounded && !q.a.attack, 200); await step(2); await tap(['w', 'l'], 1); m = await moveInfo()
  ck('landing re-arms Rising Glacier', m?.name === 'fRise', JSON.stringify(m)); await allIdle()
  // Icebreaker
  r = await measure('Icebreaker', async M => { await M.press(['a', 'l']) }, { gap: 110 }); ck(`Icebreaker: one ${live(145)} contact (no Chill)`, r.hits.length === 1 && r.hits[0] === live(145) && r.stats.chill === 0, JSON.stringify(r))
  r = await measure('Icebreaker vs guard', async M => { await M.press(['a', 'l']) }, { gap: 110, dummy: 'block' }); ck('Icebreaker is guardable', r.hits.length === 0 && r.blockedEvents >= 1, JSON.stringify(r))
  // ── Black Ice ──
  await reset(500); await tap(['s', 'l'], 1); s = await wait(q => !!q.a.s?.patch, 30); const pt = s.a.s.patch
  ck('Black Ice: one patch ahead of him on the floor', pt && pt.x > s.a.x + s.a.w / 2 && Math.abs(pt.floor - (s.a.y + s.a.h)) < 2, JSON.stringify({ pt, ax: s.a.x }))
  await idle(); const eB = (await state()).a.energy; await tap(['s', 'l'], 1); s = await state()
  ck('second Black Ice while one is out: rejected before spending', s.a.s.lastReject === 'patch' && s.a.energy >= eB - 0.01 && !s.a.attack, JSON.stringify({ r: s.a.s.lastReject, e: [eB, s.a.energy] }))
  await S('(H.raw().x = 300)'); for (let i = 0; i < 9; i++) await step(50); s = await state()
  ck('patch melts after its fixed life', !s.a.s.patch && s.a.s.stats.patchMelt === 1, JSON.stringify(s.a.s.patch))
  r = await measure('Black Ice contact', async M => { await M.press(['s', 'l']); await M.until(q => !!q.a.s?.patch, 30); await M.watch(4); const p = (await state()).a.s.patch; await S(`(H.raw('p2').x = ${p.x} - 30)`); await M.watch(20) }, { gap: 400 })
  ck(`Black Ice: foe contact = one small ${live(30)} hit + one Chill, consumed`, r.hits.length === 1 && r.hits[0] === live(30) && r.stats.chill === 1 && r.stats.patchHits === 1, JSON.stringify(r))
  s = await state(); ck('…and the patch is gone', !s.a.s.patch)
  r = await measure('Black Ice vs jumping foe', async M => { await M.press(['s', 'l']); await M.until(q => !!q.a.s?.patch, 30); const p = (await state()).a.s.patch; await S(`(H.raw('p2').x = ${p.x} - 30, H.raw('p2').y -= 150, H.raw('p2').onGround = false, H.raw('p2').grounded = false, H.raw('p2').vy = -2)`); await M.watch(6) }, { gap: 400 })
  s = await state(); ck('an airborne foe does not trigger the patch', r.stats.patchHits === 0 && !!s.a.s.patch || r.stats.patchHits === 0, JSON.stringify(r.stats))
  await allIdle()
  // Skate Switch (2026-11-15: now on Ice Flash) — flashing across his own patch consumes it and refunds the flash cooldown
  await reset(600); await S("(H.raw('p2').x = 2400)"); await tap(['s', 'l'], 1); await wait(q => !!q.a.s?.patch && !q.a.attack, 60); await step(4)
  await tap(['d'], 1); await step(2); await tap(['d'], 1); s = await state()
  ck('Skate Switch: an Ice Flash across own patch consumes it once', s.a.s.stats.skateSwitch === 1 && !s.a.s.patch, JSON.stringify({ ss: s.a.s.stats.skateSwitch, fl: s.a.s.stats.flashes, x: s.a.x, cd: s.a.dashCooldown, p: s.a.s.patch, atk: s.a.attack?.name }))
  await step(FLASH.lag + 2); await tap(['d'], 1); await step(2); await tap(['d'], 1); s = await state(); ck('the chained second flash fires', s.a.s.stats.flashes === 2, `${s.a.s.stats.flashes}`)
  await allIdle()
  // Frost Lance
  r = await measure('Frost Lance (Lance through own patch)', async M => { await M.press(['s', 'l']); await M.until(q => !!q.a.s?.patch && !q.a.attack, 60); await M.watch(2); await M.press(['l']); await M.until(q => !q.proj.length && !q.a.attack, 120) }, { gap: 330 })
  ck(`Frost Lance: +15 raw (${live(105)}), one Chill, patch consumed once`, r.hits.length === 1 && r.hits[0] === live(105) && r.stats.frost === 1 && r.stats.chill === 1, JSON.stringify(r))
  // patch race: Lance and foe reach the patch on the same frame → atomic single use
  r = await measure('patch race (Lance + foe same frame)', async M => { await M.press(['s', 'l']); await M.until(q => !!q.a.s?.patch && !q.a.attack, 60); const p = (await state()).a.s.patch
    await S(`(H.raw('p2').x = ${p.x} - 30)`); await M.watch(0); await M.press(['l']); await M.watch(40) }, { gap: 400, setup: "(H.raw('p2').invulnTimer = 0)" })
  s = await state(); const st = s.a.s.stats; report.ice.race = st
  ck('patch race: consumed exactly once (frost + patchHits ≤ 1)', st.frost + st.patchHits + st.skateSwitch <= 1 && !s.a.s.patch, JSON.stringify({ f: st.frost, h: st.patchHits }))
  await allIdle()
  // ── Chill / Freeze / Shatter ──
  r = await measure('Freeze (3rd pip)', async M => { await M.press(['l']); await M.until(q => q.a.s?.freeze, 80); const q = await state(); report.ice.freezeAt = q.a.s.freeze }, { gap: 280, setup: 'H.chill(2)' })
  s = await state(); const fz = report.ice.freezeAt
  ck('third Chill pip freezes (pips consumed)', !!fz && r.stats.freezes === 1 && !s.a.s.chill[fz.side], JSON.stringify(r.stats))
  ck(`freeze lasts ${D.freeze.dur} ticks then expires`, fz && fz.until - fz.t0 === D.freeze.dur && (r.stats.thaw.expire || 0) === 1, JSON.stringify({ fz, thaw: r.stats.thaw }))
  // measured freeze duration (frames target is held with no movement)
  await reset(280); await S('H.chill(2)'); await tap(['l'], 1); s = await wait(q => q.a.s?.freeze, 80); let held = 0; const fx0 = s.b.x
  while (held < 60) { const q = await state(); if (!q.a.s?.freeze) break; if (Math.abs(q.b.x - fx0) > 0.5) break; held++; await step(1) }
  report.ice.heldFrames = held; ck('measured hold ≈ 24 ticks (23–25)', held >= 23 && held <= 25, `${held}`)
  s = await state(); const im = s.a.s.immune[fz?.side]; ck(`refreeze immunity window ${D.freeze.immunity} ticks after the freeze ends`, im && im - s.a.s.clock >= D.freeze.immunity - 3, JSON.stringify({ im, c: s.a.s.clock }))
  await S('H.chill(2)'); await allIdle(); await tap(['l'], 1); s = await wait(q => !q.proj.length && !q.a.attack, 100)
  ck('no freeze during immunity (pip skipped)', s.a.s.stats.freezes === 1 && s.a.s.stats.immuneSkips >= 1, JSON.stringify(s.a.s.stats))
  // Shatter: Heavy on a frozen target
  r = await measure('Freeze → Heavy SHATTER', async M => { await M.press(['l']); await M.until(q => q.a.s?.freeze, 80); await S("(H.raw().x = H.raw('p2').x - 110)"); await M.press(['k']); await M.until(q => !q.a.attack, 60) }, { gap: 280, setup: 'H.chill(2)' })
  report.ice.shatterHeavy = r
  ck('Heavy on a frozen foe: Shatter once (bonus lands on the same frame as the Heavy)', r.stats.shatters === 1 && r.hits.length === 2, JSON.stringify(r))
  const sh = r.hits[1] - live(90); report.ice.shatterBonus = sh
  ck(`shatter bonus = Heavy contact − ${live(90)} → (0, ${live(25)}] (normal combo scaling)`, sh > 0 && sh <= live(25), JSON.stringify(r.hits))
  r = await measure('Freeze → Icebreaker SHATTER', async M => { await M.press(['l']); await M.until(q => q.a.s?.freeze, 80); await S("(H.raw().x = H.raw('p2').x - 110)"); await M.press(['a', 'l']); await M.until(q => !q.a.attack, 80) }, { gap: 280, setup: 'H.chill(2)' })
  ck('Icebreaker on a frozen foe: Shatter once', r.stats.shatters === 1 && r.stats.freezes === 1, JSON.stringify(r))
  r = await measure('Freeze → Light (other damage thaws, no bonus)', async M => { await M.press(['l']); await M.until(q => q.a.s?.freeze, 80); await S("(H.raw().x = H.raw('p2').x - 80)"); await M.press(['j']); await M.until(q => !q.a.attack, 60) }, { gap: 280, setup: 'H.chill(2)' })
  ck('other damage thaws the freeze (no Shatter)', r.stats.shatters === 0 && (r.stats.thaw.hit || 0) + (r.stats.thaw.damage || 0) === 1, JSON.stringify(r.stats))
  r = await measure('Shatter twice?', async M => { await M.press(['l']); await M.until(q => q.a.s?.freeze, 80); await S("(H.raw().x = H.raw('p2').x - 110)"); await M.press(['k']); await M.until(q => !q.a.attack, 60); await M.press(['a', 'l']); await M.until(q => !q.a.attack, 80) }, { gap: 280, setup: 'H.chill(2)' })
  ck('Shatter happens once per freeze', r.stats.shatters === 1, JSON.stringify(r.stats))
  // no refreeze loop: one combo cannot freeze twice
  r = await measure('no refreeze in one combo', async M => { await S("H.raw('p2').hitstun = 200"); await M.press(['l']); await M.until(q => q.a.s?.freeze, 80); await S("(H.raw('p2').hitstun = 200, H.raw().energy = 100)"); await M.watch(40)
    await S("(H.raw()._frozone.immune = {}, H.chill(2))"); await M.press(['l']); await M.until(q => !q.proj.length && !q.a.attack, 100) }, { gap: 280, setup: 'H.chill(2)', kind: 'pressure' })
  ck('a second freeze inside one combo is refused (pips cap at 2)', r.stats.freezes === 1, JSON.stringify(r.stats))
  // pip expiry
  await reset(280); await S('H.chill(1)'); await step(250); s = await state(); ck('Chill pips expire', Object.keys(s.a.s.chill).length === 0, JSON.stringify(s.a.s.chill))
  // escape window: shared burst / grab releases (grab → thaw)
  await reset(100); await S('H.chill(2)'); await tap(['l'], 1); s = await wait(q => q.a.s?.freeze, 80)
  await S("(H.raw('p2').hitstun = 0)"); await step(2); s = await state(); ck('a shared escape (hitstun cleared) thaws at once', !s.a.s.freeze && (s.a.s.stats.thaw.escape || 0) === 1, JSON.stringify(s.a.s.stats.thaw))
  await allIdle()
  // ── ultimate ──
  await reset(900); await tap(['u'], 1); m = await moveInfo(); s = await state()
  ck('Ultimate = 14 f opener, −100', m?.name === 'ultOpen' && m.activeStart === 14 && s.a.energy < 1, JSON.stringify(m))
  s = await wait(q => !q.a.attack, 200); ck('a whiffed opener: miss, real recovery, no cinematic', !s.ult.active && s.a.s.stats.ultWhiffs === 1, JSON.stringify(s.a.s.stats))
  await reset(900, false, { energy: 50 }); await tap(['u'], 1); s = await state(); ck('no ultimate below 100 energy', !s.a.attack, JSON.stringify(s.a.attack))
  r = await measure('Ultimate vs guard', async M => { await M.press(['u']); await M.watch(80) }, { gap: 110, dummy: 'block' })
  s = await state(); ck('a blocked opener never starts the cinematic', s.a.s.stats.ultDone === 0 && r.hits.length === 0 && !s.ult.active, JSON.stringify(r))
  r = await measure('ABSOLUTE ZERO: CITY ON ICE', async M => { await M.press(['u']); await M.until(q => q.ult.active, 80); let mx = 0; while (mx++ < 400) { const q = await state(); if (!q.ult.active) break; await M.watch(1) } }, { gap: 110 })
  report.ultimate = r
  ck('confirmed ultimate: 5 contacts (opener + 3 passes + shatter), one cinematic', r.hits.length === 5 && r.stats.ultDone === 1, JSON.stringify(r))
  ck(`ultimate first contact ${live(40)}, final ${live(250)}, total = ${live(40) + 3 * live(40) + live(250)}`, r.hits[0] === live(40) && r.hits[4] === live(250) && r.damage === r.hits.reduce((t, h) => t + h, 0), JSON.stringify(r.hits))
  ck('no passive Shatter / Chill inside the cinematic', r.stats.shatters === 0 && r.stats.chill === 0)
  s = await state(); ck('after the ultimate: inactive, caster free and grounded, foe knocked down', !s.ult.active && !s.a.attack && s.a.grounded && (s.b.knockdown || s.b.hitstun > 0), JSON.stringify({ a: s.a.attack, g: s.a.grounded, kd: s.b.knockdown }))
  await reset(110); await tap(['u'], 1); await wait(q => q.ult.active, 80); await step(60); await S('H.reset()'); await step(1); s = await state()
  ck('reset mid-cinematic restores everything', !s.ult.active && !s.a.attack && s.b.hitstun === 0 && !s.proj.length, JSON.stringify({ u: s.ult, a: s.a.attack }))
  r = await measure('Heavy → Ultimate', async M => { await M.press(['k']); await M.until(clean, 40); await M.press(['u']); await M.until(q => q.ult.active, 80); let mx = 0; while (mx++ < 400) { const q = await state(); if (!q.ult.active) break; await M.watch(1) } }, { gap: 110 })
  ck('Heavy cancels into the Ultimate on a clean hit (6 contacts, scaled)', r.hits.length === 6 && r.stats.ultDone === 1 && r.trueCombo, JSON.stringify(r))
  r = await measure('ultimate on a frozen foe (no Shatter bonus)', async M => { await M.press(['l']); await M.until(q => q.a.s?.freeze, 80); await S("(H.raw().x = H.raw('p2').x - 110, H.raw().energy = 100)"); await M.press(['u']); await M.until(q => q.ult.active, 80); let mx = 0; while (mx++ < 400) { const q = await state(); if (!q.ult.active) break; await M.watch(1) } }, { gap: 280, setup: 'H.chill(2)' })
  ck('ultimate on a frozen foe: thaws, no Shatter bonus', r.stats.shatters === 0 && r.stats.ultDone === 1, JSON.stringify(r.stats))
  // mirror
  r = await measure('ultimate mirrored', async M => { await M.press(['u']); await M.until(q => q.ult.active, 80); let mx = 0; while (mx++ < 400) { const q = await state(); if (!q.ult.active) break; await M.watch(1) } }, { gap: 110, flip: true })
  ck('mirrored ultimate: same 5 contacts', r.hits.length === 5 && r.hits[4] === live(250), JSON.stringify(r.hits))
  // ── KO cleanup ──
  await reset(400); await tap(['s', 'l'], 1); await wait(q => !!q.a.s?.patch, 30); await idle(); await tap(['l'], 1); await wait(q => q.proj.length > 0, 20)
  await S('(H.raw().health = 0)'); await step(2); s = await state()
  ck('KO: no patch / projectile survives its owner', !s.a.s?.patch && !s.proj.length, JSON.stringify({ p: s.a.s?.patch, pr: s.proj }))
  await reset(400); s = await state(); ck('round reset clears every Frozone state', !s.a.s?.patch && !s.a.s?.freeze && !s.proj.length && Object.keys(s.a.s?.chill || {}).length === 0)
  // P2 KEYBOARD cannot be driven in the harness slot (AI-key-routed); slot-2 input is verified through the LAN
  // remote-input path in harness/frozone_determinism.mjs.
  report.misc.errors = errors.slice(0, 10)
} catch (e) { console.log('ERR', e.stack); fail++ }
ck('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '))
fs.writeFileSync('docs/frozone/mechanics_results.json', JSON.stringify(report, null, 1))
console.log(`\n${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
