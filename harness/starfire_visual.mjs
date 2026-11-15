// harness/starfire_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle):
// title → Play → VS → difficulty → DC → Starfire (select detail) → skin (5th card) → CPU pick (Superman) → stage → match
// (intro) → moves in BOTH facings with real keys (J chain, heavy, low, launcher, Starbolt, Orbital Star, STAR SIGHT, Solar
// Rush, Skybreak, double jump, Comet Shot, Air Star Sight, L2 levitation, ultimate cut-in + scene) → eye-laser CLOSE-UPS
// facing right AND left (crop centred on the live eye anchors) → profile → KO → victory → rematch → defeat.
// The close-ups are placed with the harness and stepped to the active frame (frame-exact), then cropped around the eye
// origins mapped through the canvas transform recorded when her body sprite was drawn (no canvas pixel readback).
// Screenshots → docs/starfire/visual_*.png      node harness/starfire_visual.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const HP = 1100
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], log = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, d) }
const shot = (n, clip) => page.screenshot({ path: `docs/starfire/visual_${n}.png`, ...(clip ? { clip } : {}) })
const S = () => page.evaluate(() => __harness.state())
await page.addInitScript(() => {   // test-only rAF hold: while __sfHold is set the live loop is parked so a stepped frame is what gets screenshotted
  const raf = window.requestAnimationFrame.bind(window), q = []
  window.requestAnimationFrame = cb => { if (window.__sfHold) { q.push(cb); return 0 } return raf(cb) }
  window.__sfRelease = () => { window.__sfHold = false; const l = q.splice(0); for (const cb of l) raf(cb) } })
await page.addInitScript(() => {   // record the canvas transform used for Starfire's body sprite (transform only — no pixel readback)
  const di = CanvasRenderingContext2D.prototype.drawImage
  CanvasRenderingContext2D.prototype.drawImage = function (im, ...r) {
    const src = im?.src || ''
    if (/\/assets\/starfire\/(skins\/[^/]+\/)?[A-Za-z0-9]+\.png/.test(src) && !/\/(fx|icons|cutscene)\//.test(src) && !/(portrait|credit_panel)\.png/.test(src) && r.length >= 8) { const t = this.getTransform(); window.__sfT = { a: t.a, b: t.b, c: t.c, d: t.d, e: t.e, f: t.f, dx: r[4], dy: r[5], dw: r[6], dh: r[7] } }
    return di.call(this, im, ...r) }
})
async function click(re) { const r = await page.evaluate(src => { const re = new RegExp(src), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
    for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 90; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) } return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState()))); await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r }
async function findChar(key) { const seen = [], path = []; for (let row = 0; row < 6; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  for (const dir of path) { const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(60); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen } }
  return { seen, missing: true } }
const DC_CARD = [316, 338]   // "Dc" universe card on the universe grid (row 2, column 1, unscrolled)
const G = () => page.evaluate(() => { const H = __harness.starfireTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), hud: H.hud(), proj: H.projectiles(), laser: H.laser() } })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); await click('^easy$')
  await shot('02_universes'); await page.mouse.click(...DC_CARD); await page.waitForTimeout(600)
  const g = await findChar('starfire'); log.roster = g.seen; ck('DC roster lists starfire', !g.missing, JSON.stringify(g.seen)); await page.waitForTimeout(250)
  log.detail = await page.evaluate(() => __harness.selectDetail()); await shot('03_select_starfire')
  ck(`select detail: Starfire, HP ${HP}, DC`, log.detail?.key === 'starfire' && log.detail.stats?.maxHealth === HP, JSON.stringify(log.detail))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  log.skinState = await page.evaluate(() => __harness.padMenuState()); await shot('04_skin_select')
  ck('skin select offers Default + 10 skins', log.skinState.gameState === 'selectSkin' && log.skinState.count >= 11, JSON.stringify(log.skinState))
  const sk = await page.evaluate(() => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 20 && __harness.padMenuState().idx !== 4; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } })
  await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('05_skin_hover'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  await page.mouse.click(...DC_CARD); await page.waitForTimeout(500)
  if ((await S()).gameState === 'selectCharacter') { const k = await findChar('superman'); await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500); if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') await click('.*') }
  await page.waitForTimeout(500); log.preStage = await page.evaluate(() => __harness.padMenuState()); await shot('06_stage_select')
  if (log.preStage.gameState === 'selectStage') await click('.*')
  for (let i = 0; i < 60; i++) { const st = await page.evaluate(() => { const f = __harness.starfireTest?.raw(); return !!f && (f._lastSpriteAction === 'intro' || f.currentAction === 'intro' || f._introPlaying) }); if (st) { await page.waitForTimeout(150); await shot('07a_intro'); log.introSeen = true; break } await page.waitForTimeout(80) }
  ck('intro (Appearing → levitate) plays on the normal launch path', !!log.introSeen)
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(700)
  let s = await G(); log.match = { p1: s.a.key, skin: s.a.skin, tag: s.a.tag, p2: s.b.key, stage: (await S()).stage || null }; await shot('07_match_start')
  log.tag = s.a.tag; ck('normal launch: Starfire in a real match with a chosen (non-default) skin vs Superman', s.a.key === 'starfire' && !!s.a.tag && s.a.skin?.startsWith('sf_') && s.b.key === 'superman', JSON.stringify(log.match))
  ck('after intro she is in idle (not stuck levitating)', s.a.action === 'idle' || s.a.action === 'walk', s.a.action)
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const place = (gap, flip) => page.evaluate(([gap, flip]) => { const _b = __harness.starfireTest.raw('p2'); _b.hitstun = 9999; _b.vy = 0; _b.vx = 0; _b.isFlying = false; if (_b._flight) _b._flight.active = false; __harness.setRoundTimer(5400); const H = __harness.starfireTest, a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    a.energy = 100; a.health = a.maxHealth; b.health = b.maxHealth; b.vx = 0; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; a.hitstun = 0; b.hitstun = 0; b.attacking = false; b.currentAttack = null; b.isBlocking = false; b._forceGuard = false; b.attackCooldown = 9999; b.hitstun = 9999; b.y = a.y; b.onGround = true; b.grounded = true }, [gap, flip])
  const press = async (keys, wait, holdMs = 40) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(holdMs); for (const k of keys) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }
  const ready = async () => { for (let i = 0; i < 160; i++) { const q = await G(); if (q.a.grounded && !q.a.attack && !q.a.s?.lev && !q.ult.active) return; await page.waitForTimeout(40) } }
  const settle = async () => { for (let i = 0; i < 120; i++) { const q = await G(); if (!q.a.attack) return; await page.waitForTimeout(30) } }
  const stats = async () => (await G()).a.s.stats
  let ultDone = 0
  for (const flip of [false, true]) { const f = flip ? 'L' : 'R', fw = flip ? 'a' : 'd', bk = flip ? 'd' : 'a'
    await ready(); await place(80, flip); await page.waitForTimeout(200); await press(['j'], 110); await press(['j'], 150); await press(['j'], 160); await shot(`08_${f}_j3`); await settle()
    await ready(); await place(90, flip); await page.waitForTimeout(150); await press(['k'], 260); await shot(`09_${f}_heavy`); await settle()
    await ready(); await place(80, flip); await page.waitForTimeout(150); await press(['s', 'j'], 160); await shot(`10_${f}_low`); await settle()
    await ready(); await place(80, flip); await page.waitForTimeout(150); await press(['i'], 260); await shot(`11_${f}_launcher`); await settle()
    let st0 = await stats()
    await ready(); await place(360, flip); await page.waitForTimeout(150); await press(['l'], 300); await shot(`12_${f}_starbolt`); await settle(); await page.waitForTimeout(500)
    const sight = async (name) => { await page.evaluate(() => { window.__sfSeen = 0; const w = () => { if (__harness.starfireTest.laser()?.segs?.length) window.__sfSeen++; if (window.__sfSeen < 999) requestAnimationFrame(w) }; requestAnimationFrame(w) })
      await press([bk, 'l'], 0); for (let i = 0; i < 80; i++) { if (await page.evaluate(() => window.__sfSeen > 0)) { await shot(name); break } await page.waitForTimeout(5) }
      const n = await page.evaluate(() => { const n = window.__sfSeen; window.__sfSeen = 999; return n }); await settle(); await page.waitForTimeout(300); return n }
    await ready(); await place(360, flip); await page.waitForTimeout(150); const seen = await sight(`13_${f}_star_sight`)
    await ready(); await place(420, flip); await page.waitForTimeout(150); await press(['s', 'l'], 420); await shot(`14_${f}_orbital_star`); await settle()
    const pr0 = (await stats()).prisms; await press([bk, 'l'], 0); let prismShot = false
    for (let i = 0; i < 80; i++) { if ((await stats()).prisms > pr0) { await shot(`15_${f}_prism_break`); prismShot = true; break } await page.waitForTimeout(5) }
    await settle(); await page.waitForTimeout(400)
    let st1 = await stats(); ck(`real-time Starbolt, Star Sight (beam drawn ${seen} rAF frames), Orbital Star, Star Sight through the orb → Prism Break (${f})`, st1.bolts > st0.bolts && st1.orbs > st0.orbs && st1.lasers >= st0.lasers + 2 && seen > 0 && st1.prisms > st0.prisms && prismShot, JSON.stringify({ b: st1.bolts, o: st1.orbs, l: st1.lasers, prisms: st1.prisms, seen }))
    await ready(); await place(320, flip); await page.waitForTimeout(150); await press([fw, 'l'], 160); await shot(`16_${f}_solar_rush`); await settle()
    await ready(); await place(90, flip); await page.waitForTimeout(150); await press(['w', 'l'], 260); await shot(`17_${f}_skybreak`); await page.waitForTimeout(900)
    st0 = st1; st1 = await stats(); ck(`real-time Solar Rush + Skybreak (${f})`, st1.rushes > st0.rushes && st1.skies > st0.skies, JSON.stringify({ r: st1.rushes, s: st1.skies }))
    await ready(); await place(500, flip); await page.waitForTimeout(200); const dj0 = (await stats()).dj; await press(['w'], 150, 70); await press(['w'], 60, 70)
    if ((await stats()).dj === dj0) { await ready(); await place(500, flip); await page.waitForTimeout(200); await press(['w'], 180, 90); await press(['w'], 60, 90); log[`djRetry${f}`] = true }   // wall-clock key timing in headless can merge the taps
    await shot(`18_${f}_double_jump`); await page.waitForTimeout(80)
    await press(['l'], 220); await shot(`19_${f}_comet_shot`); await page.waitForTimeout(900)
    await ready(); await place(500, flip); await page.waitForTimeout(200); await press(['w'], 260); await press([bk, 'l'], 300); await shot(`20_${f}_air_star_sight`); await page.waitForTimeout(900)
    await ready(); await place(500, flip); await page.waitForTimeout(200); await press(['w'], 250)
    await press(['p'], 400); await page.keyboard.down(fw); await page.waitForTimeout(400); await shot(`21_${f}_levitate`); await page.keyboard.up(fw); await press(['p'], 800)
    st0 = st1; st1 = await stats(); ck(`real-time double jump + Comet Shot + Air Star Sight + L2 levitation (${f})`, st1.dj > st0.dj && st1.comets > st0.comets && st1.airLasers > st0.airLasers && st1.lev > st0.lev, JSON.stringify({ dj: st1.dj, c: st1.comets, al: st1.airLasers, lev: st1.lev }))
    for (let i = 0; i < 60 && !((await G()).a.grounded); i++) await page.waitForTimeout(50)
    // ultimate from neutral (the Heavy / J3 cancel route is measured frame-exactly in starfire.test.mjs)
    await ready(); await place(240, flip); await page.waitForTimeout(250); await page.evaluate(() => { const b = __harness.starfireTest.raw('p2'); b.hitstun = 0; b.isBlocking = false; b.attackCooldown = 9999 })
    let ult = false, tries = 0   // the live CPU may guard / jump the opener; a whiff is a legal outcome, so retry (≤ 3)
    for (; tries < 3 && !ult; tries++) { if (tries) { await ready(); await place(240, flip); await page.waitForTimeout(250); await page.evaluate(() => { const b = __harness.starfireTest.raw('p2'); b.hitstun = 0; b.isBlocking = false; b.attackCooldown = 9999 }) }
      await press(['u'], 0, 60); for (let i = 0; i < 40; i++) { await page.waitForTimeout(50); if ((await G()).ult.active) { ult = true; break } } }
    log[`ultTries${f}`] = tries
    if (ult) { await page.waitForTimeout(250); await shot(`22_${f}_ult_cutin`); await page.waitForTimeout(1000); await shot(`23_${f}_ult_bolts`); await page.waitForTimeout(800); await shot(`24_${f}_ult_eyes`); await page.waitForTimeout(700); await shot(`25_${f}_ult_explode`) }
    ck(`real-time SUPERNOVA — EYES OF TAMARAN opener connected, cinematic ran (${f})`, ult, JSON.stringify({ tries, st: (await G()).a.s?.stats, rej: (await G()).a.s?.lastReject, e: (await G()).a.energy }))
    for (let i = 0; i < 120 && (await G()).ult.active; i++) await page.waitForTimeout(100)
    s = await G(); ck(`ultimate completed and state restored (${f})`, !s.ult.active && s.a.s.stats.ultDone > ultDone && !s.a.attack, JSON.stringify({ st: s.a.s.stats.ultDone })); ultDone = s.a.s.stats.ultDone
  }
  // ---- eye-laser close-ups: frame-exact (harness place + step), crop around her eye anchors, both facings ----
  log.closeups = []
  for (const flip of [false, true]) { const f = flip ? 'right_to_left' : 'left_to_right'
    for (const [mv, fr] of [['sfLaser', 13], ['sfLaser', 18]]) {
      await page.evaluate(() => { window.__sfHold = true }); await page.waitForTimeout(120)
      const r = await page.evaluate(([flip, mv, fr]) => { const H = __harness.starfireTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; const gap = fr > 15 ? -150 : 280;   // laser7 close-up: foe BEHIND her → nothing to hit, the beam runs its full length
        b.isFlying = false; if (b._flight) b._flight.active = false; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = -a.facing
        for (const q of [a, b]) { q.vx = q.vy = 0; q.hitstun = 0; q.blockstun = 0; q.hitstop = 0; q.attacking = false; q.currentAttack = null; q.attackCooldown = 0; q.knockdownState = false; q.isBlocking = false; q._forceGuard = false; q.y = a.y; q.onGround = q.grounded = true }
        a.health = a.maxHealth; b.health = b.maxHealth; b.attackCooldown = 9999; a.energy = 100; __harness.setRoundTimer(5400); __harness.luffyTest.step(1); a.facing = flip ? -1 : 1; const ok = H.move(mv), rej = a._starfire?.lastReject, tr = []; for (let i = 0; i <= fr; i++) { __harness.luffyTest.step(1); tr.push([a.currentAttack?.name, a.currentAttack?.timer, a.attacking ? 1 : 0, a.hitstop, a.hitstun, a._lastSpriteAction, a._sfPose, b.hitstun, b.isGrabbed ? 1 : 0, a.isGrabbed ? 1 : 0, __harness.state().gameState].join(':')) }
        const st = H.state(), L = H.laser(), T = window.__sfT, cv = document.querySelector('canvas'), bb = cv.getBoundingClientRect()
        const P = (x, y) => [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f], c0 = P(T.dx, T.dy), c1 = P(T.dx + T.dw, T.dy + T.dh), D = st.draw   // drawn rect (canvas) ↔ world draw rect (mirrored in place)
        const cL = Math.min(c0[0], c1[0]), cR = Math.max(c0[0], c1[0]), cT = Math.min(c0[1], c1[1]), cB = Math.max(c0[1], c1[1])
        const toPage = (x, y) => { const cx = cL + (x - D.x) / D.w * (cR - cL), cy = cT + (y - D.y) / D.h * (cB - cT); return [bb.left + cx * bb.width / cv.width, bb.top + cy * bb.height / cv.height] }
        const eyes = L?.eyes?.length ? L.eyes : H.eyeWorld(st.action, st.frame)
        return { tr, ok, rej, action: st.action, frame: st.frame, facing: st.facing, laser: L, eyes, draw: st.draw, pageEyes: (Array.isArray(eyes) ? eyes : []).map(e => toPage(e.x, e.y)) } }, [flip, mv, fr])
      const pe = r.pageEyes; const cx = pe.length ? pe.reduce((s, p) => s + p[0], 0) / pe.length : 640, cy = pe.length ? pe.reduce((s, p) => s + p[1], 0) / pe.length : 360
      const W = 360, H = 220, clip = { x: Math.max(0, Math.min(1280 - W, cx - (flip ? W * 0.72 : W * 0.28))), y: Math.max(0, Math.min(720 - H, cy - H * 0.45)), width: W, height: H }
      const name = `eye_laser_${f}_${r.action}_${r.frame}`; await shot(name, clip); await page.screenshot({ path: `docs/starfire/visual_${name}_full.png` }); await page.evaluate(() => window.__sfRelease())
      log.closeups.push({ name, ...r, clip })
      const segs = r.laser?.segs || []
      ck(`close-up ${f} ${r.action}#${r.frame} (${fr > 15 ? 'unobstructed, foe behind' : 'hitting the foe'}): twin beams leave the eye origins in the facing direction`, segs.length >= 1 && segs.length <= 2 && pe.length === segs.length && segs.every((sg, i) => Math.abs(sg.x0 - r.eyes[i].x) < 0.01 && Math.abs(sg.y0 - r.eyes[i].y) < 0.01) && segs.every(sg => Math.sign(sg.x1 - sg.x0) === (flip ? -1 : 1)) && r.facing === (flip ? -1 : 1) && r.action === 'sfLaser', JSON.stringify({ ok: r.ok, rej: r.rej, act: r.action, fr: r.frame, n: segs.length, eyes: r.eyes }))
    }
  }
  await page.evaluate(() => { __harness.starfireTest.reset(); __harness.luffyTest.step(30) })
  await page.evaluate(() => { window.__sfHold = true }); await page.waitForTimeout(120)   // park the live loop: profile only the stepped frames
  log.profile = await page.evaluate(() => { const H = __harness.starfireTest, a = H.raw(), b = H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const time = fn => { const t0 = performance.now(); fn(); return performance.now() - t0 }
    const setup = () => { H.reset(); a.x = 1300; b.x = 1700; a.facing = 1; b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null; a.hitstun = 0; a.health = a.maxHealth; b.health = b.maxHealth; a.energy = 100; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0 }
    setup(); const idle = time(() => step(600)) / 600
    const pass = () => { for (let i = 0; i < 6; i++) { setup(); H.move('sfOrb'); step(40); a.energy = 100; H.move('sfLaser'); step(45); a.energy = 100; H.move('sfBolt'); step(40); a.energy = 100; H.move('sfRush'); step(45); a.energy = 100; H.move('sfSky'); step(80) } }
    pass(); pass(); const cache0 = H.fxCache(); const spells = time(pass) / (6 * 250); pass(); const cache2 = H.fxCache()
    setup(); b.x = 1400; H.move('heavy'); step(14); a.energy = 100; H.move('sfUltOpen'); const ultT = time(() => step(320)) / 320
    return { msPerFrameIdle: +idle.toFixed(3), msPerFrameSpecials: +spells.toFixed(3), msPerFrameUlt: +ultT.toFixed(3), fxCacheBefore: cache0, fxCacheAfter: H.fxCache(), fxCacheMid: cache2, fxEntries: a._starfire?.fx?.length || 0, live: a._starfire?.live?.length || 0 } })
  await page.evaluate(() => window.__sfRelease())
  ck('profile: URL-keyed image cache converges (specials pass after warm-up adds none; ultimate adds its fixed art; ≤ 400 total); FX list bounded (≤ 12)', log.profile.fxCacheMid === log.profile.fxCacheBefore && log.profile.fxCacheAfter <= 400 && log.profile.fxEntries <= 12, JSON.stringify(log.profile))
  ck('profile: special / ultimate frames within 3x idle cost or under 8 ms', log.profile.msPerFrameSpecials < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.msPerFrameUlt < Math.max(8, log.profile.msPerFrameIdle * 3), JSON.stringify(log.profile))
  log.fps = await page.evaluate(async () => { let n = 0; const t0 = performance.now(); await new Promise(r => { const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else r() }; requestAnimationFrame(tick) }); return Math.round(n / ((performance.now() - t0) / 1000)) })
  ck('page keeps animating (rAF fps sample, headless)', log.fps >= 20, String(log.fps))
  await page.evaluate(() => { __harness.starfireTest.reset(); __harness.starfireTest.raw('p2').hitstun = 0 })
  for (let round = 0; round < 3; round++) {
    if ((await S()).gameState === 'victory') break
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
    await page.evaluate(() => { const a = __harness.starfireTest.raw(), b = __harness.starfireTest.raw('p2'); a.health = a.maxHealth; a.hitstun = 0; a.hitstop = 0; a.attackCooldown = 0; a.attacking = false; a.currentAttack = null; a.vx = 0; b.health = 1; b.x = a.x + 70 * (a.facing || 1); b.y = a.y; b.vx = 0; b.vy = 0; b.onGround = true; b.invulnTimer = 0; b.hitstun = 120; b.isBlocking = false; b.attacking = false; b.currentAttack = null; b._forceGuard = false })
    await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500); await shot(`26_ko_${round}`)
    await page.waitForFunction(() => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness.starfireTest.raw('p2').health > 1), null, { timeout: 45000 })
  }
  ck('victory screen reached', (await S()).gameState === 'victory'); await page.waitForTimeout(900); await shot('27_victory')
  await page.keyboard.press('r'); await page.waitForFunction(() => __harness.state().gameState === 'battle', null, { timeout: 30000 })
  s = await G()   // read at rematch start, before the live CPU can land a hit
  await page.waitForFunction(() => __harness.state().countdown <= 0, null, { timeout: 30000 }); await page.waitForTimeout(300); await shot('28_rematch')
  ck('rematch: Starfire, same skin, full HP, no projectiles / levitation / ultimate / airtime flags', s.a.key === 'starfire' && s.a.tag === log.tag && !s.a.s?.lev && !(s.a.s?.live?.length) && s.proj.length === 0 && !s.ult.active && s.a.hp === HP, JSON.stringify({ tag: s.a.tag, hp: s.a.hp, lev: s.a.s?.lev, live: s.a.s?.live?.length }))
  await page.evaluate(() => { const a = __harness.starfireTest.raw(), b = __harness.starfireTest.raw('p2'); a.health = 1; a.hitstun = 0; a.isBlocking = false; a._forceGuard = false; a.invulnTimer = 0; b.x = a.x + 80 * (a.facing || 1); b.facing = -(a.facing || 1); b.attackCooldown = 0; b.attacking = false; b.currentAttack = null })
  for (let i = 0; i < 80 && (await G()).a.hp > 0; i++) await page.waitForTimeout(100)
  if ((await G()).a.hp <= 0) { await page.waitForTimeout(700); await shot('29_starfire_defeat'); log.defeat = await page.evaluate(() => __harness.starfireTest.state()?.action) }
  ck('no browser runtime errors', errors.length === 0, JSON.stringify(errors))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally { log.passes = pass; log.failures = fail; log.errors = errors; fs.writeFileSync('docs/starfire/visual_results.json', JSON.stringify(log, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
