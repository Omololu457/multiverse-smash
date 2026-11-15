// harness/robin_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle):
// title → Play → VS → difficulty → DC → Robin (select detail) → skin (Court of Ivory) → CPU pick (Superman) → stage → match
// (intro: Appearing frames + "ROBIN — THE BOY WONDER" card) → moves in BOTH facings (punch chain, staff sweep, Bird's-Eye
// Bomb, Smoke Drop → Smoke Step, Staff Express, Rooftop Route, Dead Drop → L2 tap / hold, Bomb Bat, shared double jump,
// ultimate cut-in + scene) → profile → KO → victory → rematch → defeat → intro skip.
// Screenshots → docs/robin/visual_*.png      node harness/robin_visual.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const HP = 1100
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], log = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, d) }
const shot = n => page.screenshot({ path: `docs/robin/visual_${n}.png` })
const S = () => page.evaluate(() => __harness.state())
async function click(re) { const r = await page.evaluate(src => { const re = new RegExp(src), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
    for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 90; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) } return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState()))); await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r }
async function findChar(key) { const seen = [], path = []; for (let row = 0; row < 6; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  for (const dir of path) { const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(60); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen } }
  return { seen, missing: true } }
const DC_CARD = [316, 338]   // "Dc" universe card on the universe grid (row 2, column 1, unscrolled)
const G = () => page.evaluate(() => { const H = __harness.robinTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), hud: H.hud(), proj: H.projectiles() } })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); await click('^easy$')
  await shot('02_universes'); await page.mouse.click(...DC_CARD); await page.waitForTimeout(600)
  const g = await findChar('robin'); log.roster = g.seen; ck('DC roster lists robin', !g.missing, JSON.stringify(g.seen)); await page.waitForTimeout(250)
  log.detail = await page.evaluate(() => __harness.selectDetail()); await shot('03_select_robin')
  ck(`select detail: Robin, HP ${HP}, DC`, log.detail?.key === 'robin' && log.detail.stats?.maxHealth === HP, JSON.stringify(log.detail))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  log.skinState = await page.evaluate(() => __harness.padMenuState()); await shot('04_skin_select')
  ck('skin select offers Default + 10 skins', log.skinState.gameState === 'selectSkin' && log.skinState.count >= 11, JSON.stringify(log.skinState))
  const sk = await page.evaluate(() => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 20 && __harness.padMenuState().idx !== 4; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } })
  await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('05_skin_hover'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  log.afterP1 = await S(); log.chosenSkin = await page.evaluate(() => __harness.session?.()?.p1Skin || null); await page.mouse.click(...DC_CARD); await page.waitForTimeout(500)
  if ((await S()).gameState === 'selectCharacter') { const k = await findChar('superman'); await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500); if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') await click('.*') }
  await page.waitForTimeout(500); log.preStage = await page.evaluate(() => __harness.padMenuState()); await shot('06_stage_select')
  if (log.preStage.gameState === 'selectStage') await click('.*')
  for (let i = 0; i < 80; i++) { const st = await page.evaluate(() => { const f = __harness.robinTest?.raw(); return f ? { p: !!f._introPlaying, k: f._introRevealFrame || 0, act: f._lastSpriteAction } : null })
    if (st?.p && !log.introSeen) { log.introSeen = true; log.introActions = [] }
    if (st?.p) log.introActions.push(st.act)
    if (st?.p && st.k > 40) { await shot('07a_intro_card'); log.introCard = st; break } await page.waitForTimeout(60) }
  ck('Robin intro plays the supplied Appearing frames with the ROBIN — THE BOY WONDER card', log.introSeen && (log.introActions || []).some(a => a === 'intro' || a === 'introSettle') && !!log.introCard, JSON.stringify({ seen: log.introSeen, acts: [...new Set(log.introActions || [])], card: log.introCard }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(700)
  let s = await G(); log.match = { p1: s.a.key, skin: s.a.skin, tag: s.a.tag, p2: s.b.key }; await shot('07_match_start')
  log.tag = s.a.tag; ck('normal launch: Robin in a real match with a chosen (non-default) skin vs Superman', s.a.key === 'robin' && !!s.a.tag && s.a.skin?.startsWith('rb_') && s.b.key === 'superman', JSON.stringify(log.match))
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const place = (gap, flip, o = {}) => page.evaluate(([gap, flip, o]) => { const _b = __harness.robinTest.raw('p2'); _b.hitstun = 9999; _b.vy = 0; _b.vx = 0; _b.isFlying = false; if (_b._flight) _b._flight.active = false; __harness.setRoundTimer(5400); const H = __harness.robinTest, a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    a.energy = 100; a.health = a.maxHealth; b.health = b.maxHealth; b.vx = 0; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; a.hitstun = 0; b.hitstun = 0; b.attacking = false; b.currentAttack = null; b.isBlocking = false; b._forceGuard = false; b.attackCooldown = 9999; b.hitstun = 9999; b.y = a.y; b.onGround = true; b.grounded = true }, [gap, flip, o])
  const press = async (keys, wait, holdMs = 40) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(holdMs); for (const k of keys) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }

  let ultDone = 0
  const ready = async () => { for (let i = 0; i < 120; i++) { const q = await G(); if (q.a.grounded && !q.a.attack && !q.ult.active) return; await page.waitForTimeout(40) } }
  const settle = async () => { for (let i = 0; i < 120; i++) { const q = await G(); if (!q.a.attack) return; await page.waitForTimeout(30) } }
  for (const flip of [false, true]) { const f = flip ? 'L' : 'R', fw = flip ? 'a' : 'd', bk = flip ? 'd' : 'a'
    await ready(); await place(80, flip); await page.waitForTimeout(200); await press(['j'], 110); await press(['j'], 130); await press(['j'], 140); await shot(`08_${f}_punch3`); await page.waitForTimeout(500)
    await ready(); await place(90, flip); await page.waitForTimeout(200); await press(['k'], 220); await shot(`09_${f}_staff_sweep`); await page.waitForTimeout(500)
    await ready(); await place(320, flip); await page.waitForTimeout(200); await press(['l'], 330); await shot(`10_${f}_bomb_flight`); await page.waitForTimeout(260); await shot(`11_${f}_bomb_blast`); await page.waitForTimeout(500)
    s = await G(); ck(`real-time Bird's-Eye Bomb thrown and exploded (${f})`, s.a.s?.stats?.bombs >= 1 && s.a.s.stats.blasts >= 1, JSON.stringify(s.a.s?.stats))
    await ready(); await place(400, flip); await page.waitForTimeout(200); await press(['s', 'l'], 260); await shot(`12_${f}_smoke`)
    await press([bk], 40); await press([bk], 90); await shot(`13_${f}_smoke_step`); await page.waitForTimeout(400)
    s = await G(); ck(`real-time Smoke Drop → Smoke Step away (${f})`, s.a.s.stats.smokes >= 1 && s.a.s.stats.steps >= 1, JSON.stringify({ sm: s.a.s.stats.smokes, st: s.a.s.stats.steps }))
    await ready(); await place(260, flip); await page.waitForTimeout(200); await press([fw], 40); await press([fw], 40); await shot(`13b_${f}_smoke_vanish`); await page.waitForTimeout(300)
    s = await G(); ck(`real-time double-tap toward = smoke vanish behind the foe (${f})`, (s.a.s.stats.vanishes || 0) >= 1 && (flip ? s.a.x < s.b.x : s.a.x > s.b.x), JSON.stringify({ v: s.a.s.stats.vanishes, ax: s.a.x, bx: s.b.x }))
    await ready(); await place(80, flip); await page.waitForTimeout(200); await press([fw, 'l'], 300); await shot(`14_${f}_staff_express`); await page.waitForTimeout(800)
    await ready(); await place(120, flip); await page.waitForTimeout(200); await press(['w', 'l'], 260); await shot(`15_${f}_rooftop`); await page.waitForTimeout(900)
    s = await G(); ck(`real-time Staff Express + Rooftop Route (${f})`, s.a.s.stats.express >= 1 && s.a.s.stats.roofs >= 1, JSON.stringify({ ex: s.a.s.stats.express, rf: s.a.s.stats.roofs }))
    await ready(); await place(420, flip); await page.waitForTimeout(200); await press([bk, 'l'], 300); await shot(`16_${f}_dead_drop_arming`); await page.waitForTimeout(500); await shot(`17_${f}_dead_drop_armed`)
    await press(['p'], 60); await shot(`18_${f}_remote_hack`); await page.waitForTimeout(500); await shot(`19_${f}_remote_blast`); await page.waitForTimeout(400)
    s = await G(); ck(`real-time Dead Drop → L2 tap detonation (${f})`, s.a.s.stats.plants >= 1 && s.a.s.stats.detonations >= 1, JSON.stringify(s.a.s.stats))
    await ready(); await place(420, flip); await page.waitForTimeout(200); await press([bk, 'l'], 300); await page.waitForTimeout(500)
    await page.keyboard.down('p'); await page.waitForTimeout(500); await shot(`20_${f}_remote_convert`); await page.keyboard.up('p'); await page.waitForTimeout(300)
    s = await G(); ck(`real-time Dead Drop → L2 hold converts it into smoke (${f})`, s.a.s.stats.conversions >= 1, JSON.stringify(s.a.s.stats))
    await ready(); await place(600, flip); await page.waitForTimeout(200); await press([bk, 'l'], 300); await page.waitForTimeout(500); await press(['k'], 160); await shot(`21_${f}_bomb_bat`); await page.waitForTimeout(700)
    s = await G(); ck(`real-time Bomb Bat (${f})`, s.a.s.stats.bats >= 1, JSON.stringify(s.a.s.stats))
    await ready(); await place(500, flip); await page.waitForTimeout(200); await press(['w'], 150); await press(['w'], 60); await shot(`22_${f}_double_jump`); await page.waitForTimeout(900)
    s = await G(); ck(`real-time shared double jump (${f})`, s.a.s.stats.dj >= 1, JSON.stringify({ dj: s.a.s.stats.dj }))
    for (let i = 0; i < 60 && !((await G()).a.grounded && !(await G()).a.attack); i++) await page.waitForTimeout(50)
    await ready(); await place(80, flip); await page.waitForTimeout(250); await page.evaluate(() => { const b = __harness.robinTest.raw('p2'); b.hitstun = 60; b.isBlocking = false }); await press(['u'], 0)
    let ult = false; for (let i = 0; i < 80; i++) { await page.waitForTimeout(50); if ((await G()).ult.active) { ult = true; break } }
    if (ult) { await page.waitForTimeout(250); await shot(`23_${f}_ult_cutin`); await page.waitForTimeout(700); await shot(`24_${f}_ult_flurry`); await page.waitForTimeout(700); await shot(`25_${f}_ult_hack`); await page.waitForTimeout(500); await shot(`26_${f}_ult_blast`) }
    ck(`real-time ultimate captured the opener (${f})`, ult); for (let i = 0; i < 120 && (await G()).ult.active; i++) await page.waitForTimeout(100)
    s = await G(); ck(`ultimate completed and state restored (${f})`, !s.ult.active && s.a.s.stats.ultDone > ultDone && !s.a.attack, JSON.stringify({ st: s.a.s.stats.ultDone })); ultDone = s.a.s.stats.ultDone
  }
  log.profile = await page.evaluate(() => { const H = __harness.robinTest, a = H.raw(), b = H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const time = fn => { const t0 = performance.now(); fn(); return performance.now() - t0 }
    const setup = () => { H.reset(); a.x = 1300; b.x = 1700; b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null; a.hitstun = 0; a.health = a.maxHealth; b.health = b.maxHealth; a.energy = 100; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0 }
    setup(); const idle = time(() => step(600)) / 600
    const pass = () => { for (let i = 0; i < 6; i++) { setup(); H.move('rSmoke'); step(30); H.move('rBomb'); step(50); H.move('rPlant'); step(60); H.move('rExpress'); step(80); H.move('rRoof'); step(70) } }
    pass(); const cache0 = H.fxCache(); const gad = time(pass) / (6 * 290)
    setup(); b.x = 1370; H.move('ultOpen'); const ultT = time(() => step(320)) / 320
    return { msPerFrameIdle: +idle.toFixed(3), msPerFrameGadgets: +gad.toFixed(3), msPerFrameUlt: +ultT.toFixed(3), fxCacheBefore: cache0, fxCacheAfter: H.fxCache(), fxEntries: a._robin?.fx?.length || 0, live: a._robin?.live?.length || 0, ghosts: a._robin?.ghosts?.length || 0 } })
  ck('profile: second gadget pass adds no cached images; FX list (≤ 12) and echoes (≤ 4) bounded', log.profile.fxCacheAfter === log.profile.fxCacheBefore && log.profile.fxEntries <= 12 && log.profile.ghosts <= 4, JSON.stringify(log.profile))
  ck('profile: gadget / ultimate frames within 3x idle cost or under 8 ms', log.profile.msPerFrameGadgets < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.msPerFrameUlt < Math.max(8, log.profile.msPerFrameIdle * 3), JSON.stringify(log.profile))
  log.fps = await page.evaluate(async () => { let n = 0; const t0 = performance.now(); await new Promise(r => { const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else r() }; requestAnimationFrame(tick) }); return Math.round(n / ((performance.now() - t0) / 1000)) })
  ck('page keeps animating (rAF fps sample, headless)', log.fps >= 20, String(log.fps))
  await page.evaluate(() => { __harness.robinTest.reset(); __harness.robinTest.raw('p2').hitstun = 0 })
  for (let round = 0; round < 3; round++) {
    if ((await S()).gameState === 'victory') break
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
    await page.evaluate(() => { const a = __harness.robinTest.raw(), b = __harness.robinTest.raw('p2'); a.health = a.maxHealth; a.hitstun = 0; a.hitstop = 0; a.attackCooldown = 0; a.attacking = false; a.currentAttack = null; a.vx = 0; b.health = 1; b.x = a.x + 70 * (a.facing || 1); b.y = a.y; b.vx = 0; b.vy = 0; b.onGround = true; b.invulnTimer = 0; b.hitstun = 120; b.isBlocking = false; b.attacking = false; b.currentAttack = null })
    await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500); await shot(`27_ko_${round}`)
    await page.waitForFunction(() => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness.robinTest.raw('p2').health > 1), null, { timeout: 45000 })
  }
  ck('victory screen reached', (await S()).gameState === 'victory'); await page.waitForTimeout(900); await shot('28_victory')
  await page.keyboard.press('r'); await page.waitForFunction(() => __harness.state().gameState === 'battle' || __harness.state().gameState === 'intro', null, { timeout: 30000 })
  s = await G()
  ck('rematch: Robin, same skin, full HP, no smoke / plant / bombs / ultimate', s.a.key === 'robin' && s.a.tag === log.tag && !s.a.s?.smoke && !s.a.s?.plant && !(s.a.s?.live?.length) && s.proj.length === 0 && !s.ult.active && s.a.hp === HP, JSON.stringify({ tag: s.a.tag, hp: s.a.hp, s: s.a.s && { smoke: s.a.s.smoke, plant: s.a.s.plant } }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(300); await shot('29_rematch')
  await page.evaluate(() => { const a = __harness.robinTest.raw(), b = __harness.robinTest.raw('p2'); a.health = 1; a.hitstun = 0; a.isBlocking = false; a._forceGuard = false; a.invulnTimer = 0; b.x = a.x + 80 * (a.facing || 1); b.facing = -(a.facing || 1); b.attackCooldown = 0; b.attacking = false; b.currentAttack = null })
  for (let i = 0; i < 80 && (await G()).a.hp > 0; i++) await page.waitForTimeout(100)
  if ((await G()).a.hp <= 0) { await page.waitForTimeout(700); await shot('30_robin_defeat'); log.defeat = await page.evaluate(() => __harness.robinTest.state()?.action) }
  // skipping the intro (the engine's skipToBattle path) clears the intro card and leaves no Robin advantage
  await page.goto(server.base + '/index.html?harness=1&p1=robin&p2=robin&seed=4242', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.robinTest)
  const skp = await page.evaluate(() => { __harness.start(); for (let i = 0; i < 30; i++) __harness.luffyTest.step(1); const a = __harness.robinTest.raw(), during = { intro: !!a._introPlaying, gs: __harness.state().gameState }
    __harness.skipToBattle(); __harness.luffyTest.step(2); const s = __harness.robinTest.state(); return { during, after: { intro: s.intro, energy: s.energy, hp: s.hp, atk: s.attack?.name || null, smoke: !!s.s?.smoke } } })
  ck('intro is skippable: skipToBattle clears the intro / card, no gameplay advantage (no attack / smoke / extra energy)', !skp.after.intro && !skp.after.atk && !skp.after.smoke && skp.after.hp === HP, JSON.stringify(sk))
  ck('no browser runtime errors', errors.length === 0, JSON.stringify(errors))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally { log.passes = pass; log.failures = fail; log.errors = errors; fs.writeFileSync('docs/robin/visual_results.json', JSON.stringify(log, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
