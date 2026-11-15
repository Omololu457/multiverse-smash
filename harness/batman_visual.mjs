// harness/batman_visual.mjs — Batman (rebuilt) through the NORMAL launch path, real mouse + keyboard (no skipToBattle),
// adapted from higuruma_visual.mjs / cyborg_visual.mjs:
// title → Play → VS → difficulty → DC → Batman (select detail) → skin (White Knight) → CPU pick → stage → match (intro
// card) → moves in BOTH facings (Square chain, heavy, launcher, Batarang, Grapnel Breaker, Smoke, Rooftop, Gotham
// Airspace, Automaton + Carrier orders, counter, double jump) → KNIGHTFALL phases (strafe / ascent / space / reentry /
// impact) → profile → KO → victory → rematch → defeat → intro skip.        Screenshots → docs/batman/visual_*.png
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const HP = 1150, DC_CARD = [316, 338]
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], log = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const shot = n => page.screenshot({ path: `docs/batman/visual_${n}.png` })
const S = () => page.evaluate(() => __harness.state())
async function click(re) { const r = await page.evaluate(src => { const re = new RegExp(src, 'i'), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
    for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 90; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) } return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState()))); await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r }
async function findChar(key) { const seen = [], path = []; for (let row = 0; row < 6; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  for (const dir of path) { const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(60); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen } }
  return { seen, missing: true } }
const G = () => page.evaluate(() => { const H = __harness.batmanTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), hud: H.hud() } })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  log.lockedAtStart = await page.evaluate(() => __harness.charUnlocked('batman'))
  await page.evaluate(() => __harness.saveLoad.awardXp(4500)); log.unlockedAtLv10 = await page.evaluate(() => __harness.charUnlocked('batman'))
  ck('existing unlock gate kept: Batman locked on a fresh account, unlocked at account Lv10 (earned XP, not a dev code)', log.lockedAtStart === false && log.unlockedAtLv10 === true, JSON.stringify([log.lockedAtStart, log.unlockedAtLv10]))
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); await click('^easy$')
  await shot('02_universes'); await page.mouse.click(...DC_CARD); await page.waitForTimeout(600)
  const g = await findChar('batman'); log.roster = g.seen; ck('DC roster lists batman (dark_knight stays wiped)', !g.missing && !g.seen.includes('dark_knight'), JSON.stringify(g.seen)); await page.waitForTimeout(250)
  log.detail = await page.evaluate(() => __harness.selectDetail()); await shot('03_select_batman')
  ck(`select detail: Batman, HP ${HP}`, log.detail?.key === 'batman' && log.detail.stats?.maxHealth === HP, JSON.stringify(log.detail))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  log.skinState = await page.evaluate(() => __harness.padMenuState()); await shot('04_skin_select')
  ck('skin select offers Default + 10 skins', log.skinState.gameState === 'selectSkin' && log.skinState.count >= 11, JSON.stringify(log.skinState))
  const sk = await page.evaluate(() => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 20 && __harness.padMenuState().idx !== 3; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } })
  await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('05_skin_hover'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  log.chosenSkin = await page.evaluate(() => __harness.session?.()?.p1Skin || null)
  if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectUniverse') { await page.mouse.click(...DC_CARD); await page.waitForTimeout(500) }
  if ((await S()).gameState === 'selectCharacter') { const k = await findChar('superman'); if (!k.missing) { await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500) } else await click('.*'); if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') await click('.*') }
  await page.waitForTimeout(500); log.preStage = await page.evaluate(() => __harness.padMenuState()); await shot('06_stage_select')
  if (log.preStage.gameState === 'selectStage') await click('.*')
  for (let i = 0; i < 80; i++) { const st = await page.evaluate(() => { const f = __harness.batmanTest?.raw(); return f ? { p: !!f._introPlaying, k: f._introRevealFrame || 0, act: f._lastSpriteAction } : null })
    if (st?.p && !log.introSeen) { log.introSeen = true; log.introActions = [] }
    if (st?.p) log.introActions.push(st.act)
    if (st?.p && st.k > 40) { await shot('07a_intro_card'); log.introCard = st; break } await page.waitForTimeout(60) }
  ck('intro plays the supplied intro frames with the intro card', log.introSeen && (log.introActions || []).some(a => a === 'intro' || a === 'introSettle') && !!log.introCard, JSON.stringify({ seen: log.introSeen, acts: [...new Set(log.introActions || [])], card: log.introCard }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(700)
  let s = await G(); log.match = { p1: s.a.key, skin: s.a.skin, tag: s.a.tag, p2: s.b.key }; await shot('07_match_start')
  log.tag = s.a.tag; ck('normal launch: Batman in a real match with a chosen (non-default) skin', s.a.key === 'batman' && !!s.a.tag && s.a.skin?.startsWith('bm_'), JSON.stringify(log.match))
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const place = (gap, flip, o = {}) => page.evaluate(([gap, flip, o]) => { const H = __harness.batmanTest, a = H.raw(), b = H.raw('p2'); __harness.setRoundTimer(5400); b.vy = 0; b.vx = 0; b.isFlying = false; if (b._flight) b._flight.active = false
    a.x = 1300; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    a.energy = 100; a.health = a.maxHealth; b.health = b.maxHealth; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; a.hitstun = 0; a.hitstop = 0
    b.attacking = false; b.currentAttack = null; b.isBlocking = !!o.guard; b._forceGuard = !!o.guard; b.attackCooldown = o.free ? 0 : 9999; b.hitstun = o.free || o.guard ? 0 : 9999; b.y = a.y; b.onGround = true; b.grounded = true; b.knockdownState = false
    if (o.clearOps && a._batman) { a._batman.ops = []; a._batman.pay = []; a._batman.cd = {} } }, [gap, flip, o])
  const press = async (keys, wait, holdMs = 40) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(holdMs); for (const k of keys) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }
  const order = async (dir, wait) => { await page.keyboard.down('p'); await page.waitForTimeout(60); for (const k of [...dir, 'l']) await page.keyboard.down(k); await page.waitForTimeout(60); for (const k of [...dir, 'l', 'p']) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }
  const ready = async () => { for (let i = 0; i < 160; i++) { const q = await G(); if (q.a.grounded && !q.a.attack && !q.ult.active) return; await page.waitForTimeout(40) } }
  const opsDone = async () => { for (let i = 0; i < 300; i++) { const q = await G(); if (!(q.a.s?.ops?.length) && !(q.a.s?.pay?.length)) return; await page.waitForTimeout(50) } }
  let ultDone = 0
  for (const flip of [false, true]) { const f = flip ? 'L' : 'R', fw = flip ? 'a' : 'd', bk = flip ? 'd' : 'a'
    await ready(); await place(80, flip); await page.waitForTimeout(200); await press(['j'], 90); await press(['j'], 110); await press(['j'], 120); await shot(`08_${f}_square_chain`); await page.waitForTimeout(500)
    await ready(); await place(90, flip); await page.waitForTimeout(200); await press(['k'], 200); await shot(`09_${f}_heavy_kick`); await page.waitForTimeout(500)
    await ready(); await place(70, flip); await page.waitForTimeout(200); await press(['i'], 160); await shot(`10_${f}_launcher`); await page.waitForTimeout(700)
    await ready(); await place(300, flip); await page.waitForTimeout(200); await press(['l'], 260); await shot(`11_${f}_batarang`); await page.waitForTimeout(600)
    await ready(); await place(260, flip); await page.waitForTimeout(200); await press([fw, 'l'], 300); await shot(`12_${f}_grapnel_breaker`); await page.waitForTimeout(800)
    await ready(); await place(200, flip); await page.waitForTimeout(200); await press(['s', 'l'], 350); await shot(`13_${f}_smoke`); await page.waitForTimeout(600)
    await ready(); await place(70, flip); await page.waitForTimeout(200); await press(['w', 'l'], 260); await shot(`14_${f}_rooftop`); await page.waitForTimeout(900)
    s = await G(); const st = s.a.s.stats
    ck(`real-time gadgets: Batarang / Grapnel / Smoke / Rooftop (${f})`, st.batarangs >= (flip ? 2 : 1) && st.grapnels >= (flip ? 2 : 1) && st.smokes >= (flip ? 2 : 1) && st.rooftops >= (flip ? 2 : 1), JSON.stringify(st))
    await ready(); await place(80, flip, { free: true }); await page.waitForTimeout(150); await press([bk, 'k'], 0)
    await page.evaluate(() => { const b = __harness.batmanTest.raw('p2'); b.attackCooldown = 0; b.attacking = false; b._forceAttack = 'light' })
    await page.waitForTimeout(160); await shot(`15_${f}_counter`); await page.waitForTimeout(600)
    s = await G(); log[`counter_${f}`] = { counters: s.a.s.stats.counters, hits: s.a.s.stats.counterHits }
    await page.evaluate(() => { const b = __harness.batmanTest.raw('p2'); b.attackCooldown = 9999 })
    await ready(); await place(500, flip); await page.waitForTimeout(300); await press(['w'], 0); for (let i = 0; i < 40 && (await G()).a.grounded; i++) await page.waitForTimeout(16); await page.waitForTimeout(120); await press(['w'], 60); await shot(`16_${f}_double_jump`); await page.waitForTimeout(900)
    s = await G(); ck(`real-time shared double jump (${f})`, s.a.s.stats.dj >= (flip ? 2 : 1), JSON.stringify({ dj: s.a.s.stats.dj }))
    // support operations (one major op at a time)
    await ready(); await place(260, flip, { clearOps: true }); await page.waitForTimeout(200); await press([bk, 'l'], 1400); await shot(`17_${f}_gotham_airspace`); await opsDone()
    await ready(); await place(220, flip, { clearOps: true }); await page.waitForTimeout(200); await order([bk], 1300); await shot(`18_${f}_automaton`); await opsDone()
    await ready(); await place(260, flip, { clearOps: true }); await page.waitForTimeout(200); await order([fw], 1500); await shot(`19_${f}_carrier`); await opsDone()
    await ready(); await place(240, flip, { clearOps: true }); await page.waitForTimeout(200); await order(['w'], 1100); await shot(`20_${f}_skyhook`); await opsDone()
    await ready(); await place(240, flip, { clearOps: true }); await page.waitForTimeout(200); await order([], 1300); await shot(`21_${f}_interceptor`); await opsDone()
    await ready(); await place(200, flip, { clearOps: true }); await page.waitForTimeout(200); await order(['s'], 900); await shot(`22_${f}_capsule_cover`); await opsDone()
    s = await G(); const o = s.a.s.stats.orders || {}
    ck(`real-time keyboard orders launch every operation (${f})`, ['airspace', 'automaton', 'carrier', 'skyhook', 'interceptor', 'cover'].every(k => (o[k] || 0) >= (flip ? 2 : 1)), JSON.stringify(o))
    // KNIGHTFALL — blocked opener first, then the clean cinematic
    await ready(); await place(110, flip, { guard: true, clearOps: true }); await page.waitForTimeout(200); await press(['u'], 400); await shot(`23_${f}_ult_blocked`); await page.waitForTimeout(800)
    s = await G(); ck(`blocked opener → no cinematic (${f})`, !s.ult.active, JSON.stringify(s.ult))
    await ready(); await place(110, flip, { clearOps: true }); await page.waitForTimeout(250); await press(['u'], 0)
    let ult = false; for (let i = 0; i < 80; i++) { await page.waitForTimeout(40); if ((await G()).ult.active) { ult = true; break } }
    log[`ultPhases_${f}`] = []
    if (ult) for (const ph of ['strafe', 'ascent', 'space', 'reentry', 'impact']) {
      for (let i = 0; i < 300; i++) { const v = await page.evaluate(() => __harness.batmanTest.ultView()); if (!v || v.phase === ph) break; await page.waitForTimeout(12) }
      await page.waitForTimeout(ph === 'impact' ? 120 : 80); const v = await page.evaluate(() => __harness.batmanTest.ultView()); log[`ultPhases_${f}`].push({ want: ph, got: v?.phase, frame: v?.frame, ty: v?.ty, floor: v?.floor, plane: v?.plane && { x: Math.round(v.plane.x), y: Math.round(v.plane.y) } }); await shot(`24_ult_${ph}_${f}`) }
    if (!ult) log[`ultMiss_${f}`] = await page.evaluate(() => { const H = __harness.batmanTest, a = H.state(), b = H.raw('p2'); return { atk: a.attack, st: a.s.stats, e: a.energy, b: { x: b.x, y: b.y, blk: b.isBlocking, hs: b.hitstun, bs: b.blockstun, fly: b.isFlying, inv: b.invulnTimer, atk: b.currentAttack?.name } } })
    ck(`real-time KNIGHTFALL captured the opener (${f})`, ult, JSON.stringify(log[`ultMiss_${f}`]))
    ck(`KNIGHTFALL phases strafe → ascent → space → reentry → impact all seen (${f})`, log[`ultPhases_${f}`].map(p => p.got).join() === 'strafe,ascent,space,reentry,impact', JSON.stringify(log[`ultPhases_${f}`]))
    for (let i = 0; i < 120 && (await G()).ult.active; i++) await page.waitForTimeout(100)
    s = await G(); ck(`ultimate completed, target grounded, state restored (${f})`, !s.ult.active && s.a.s.stats.ultDone > ultDone && !s.a.attack && s.b.y <= s.a.y + 2, JSON.stringify({ done: s.a.s.stats.ultDone, by: s.b.y, ay: s.a.y })); ultDone = s.a.s.stats.ultDone
    await shot(`25_${f}_after_ult`)
  }
  log.profile = await page.evaluate(() => { const H = __harness.batmanTest, a = H.raw(), b = H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const time = fn => { const t0 = performance.now(); fn(); return performance.now() - t0 }
    const setup = () => { H.reset(); a.x = 1300; b.x = 1420; b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null; a.hitstun = 0; a.health = a.maxHealth; b.health = b.maxHealth; a.energy = 100; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0 }
    setup(); const idle = time(() => step(600)) / 600
    const run = () => { for (const op of ['cmdSky', 'cmdCarrier', 'cmdAuto']) { setup(); H.move(op); step(60); a.energy = 100; H.move('bBatarang'); step(40); H.move('bSmoke'); step(40); step(160) } }
    run(); const cache0 = H.fxCache(); const sp = time(run) / (3 * 300)
    setup(); b.x = a.x + 110; H.move('ultOpen'); const ultT = time(() => step(260)) / 260
    return { msPerFrameIdle: +idle.toFixed(3), msPerFrameOps: +sp.toFixed(3), msPerFrameUlt: +ultT.toFixed(3), fxCacheBefore: cache0, fxCacheAfter: H.fxCache(), fxEntries: a._batman?.fx?.length || 0 } })
  ck('profile: second pass adds no cached images; FX list bounded (≤ 24)', log.profile.fxCacheAfter === log.profile.fxCacheBefore && log.profile.fxEntries <= 24, JSON.stringify(log.profile))
  ck('profile: operations / ultimate frames within 3x idle cost or under 8 ms', log.profile.msPerFrameOps < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.msPerFrameUlt < Math.max(8, log.profile.msPerFrameIdle * 3), JSON.stringify(log.profile))
  await page.evaluate(() => { __harness.batmanTest.reset(); __harness.batmanTest.raw('p2').hitstun = 0 })
  for (let round = 0; round < 3; round++) {
    if ((await S()).gameState === 'victory') break
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
    await page.evaluate(() => { const a = __harness.batmanTest.raw(), b = __harness.batmanTest.raw('p2'); a.health = a.maxHealth; a.hitstun = 0; a.hitstop = 0; a.attackCooldown = 0; a.attacking = false; a.currentAttack = null; a.vx = 0; b.health = 1; b.x = a.x + 70 * (a.facing || 1); b.y = a.y; b.vx = 0; b.vy = 0; b.onGround = true; b.invulnTimer = 0; b.hitstun = 120; b.isBlocking = false; b.attacking = false; b.currentAttack = null })
    await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500); await shot(`26_ko_${round}`)
    await page.waitForFunction(() => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness.batmanTest.raw('p2').health > 1), null, { timeout: 45000 })
  }
  ck('victory screen reached', (await S()).gameState === 'victory'); await page.waitForTimeout(900); await shot('27_victory')
  log.victoryAction = await page.evaluate(() => __harness.batmanTest.raw()._lastSpriteAction)
  ck('victory pose = supplied win frames', log.victoryAction === 'win', String(log.victoryAction))
  await page.keyboard.press('r'); await page.waitForFunction(() => __harness.state().gameState === 'battle' || __harness.state().gameState === 'intro', null, { timeout: 30000 })
  s = await G()
  ck('rematch: Batman, same skin, full HP, no operations, no cinematic', s.a.key === 'batman' && s.a.tag === log.tag && !(s.a.s?.ops?.length) && !(s.a.s?.pay?.length) && !s.ult.active && s.a.hp === HP, JSON.stringify({ tag: s.a.tag, hp: s.a.hp, ops: s.a.s?.ops?.length }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(300); await shot('28_rematch')
  await page.evaluate(() => { const a = __harness.batmanTest.raw(), b = __harness.batmanTest.raw('p2'); a.health = 1; a.hitstun = 0; a.isBlocking = false; a._forceGuard = false; a.invulnTimer = 0; b.x = a.x + 80 * (a.facing || 1); b.facing = -(a.facing || 1); b.attackCooldown = 0; b.attacking = false; b.currentAttack = null })
  for (let i = 0; i < 80 && (await G()).a.hp > 0; i++) await page.waitForTimeout(100)
  if ((await G()).a.hp <= 0) { await page.waitForTimeout(700); await shot('29_batman_defeat'); log.defeat = await page.evaluate(() => __harness.batmanTest.raw()._lastSpriteAction) }
  await page.goto(server.base + '/index.html?harness=1&p1=batman&p2=batman&seed=4242', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.batmanTest)
  const skp = await page.evaluate(() => { __harness.start(); for (let i = 0; i < 30; i++) __harness.luffyTest.step(1); const a = __harness.batmanTest.raw(), during = { intro: !!a._introPlaying, gs: __harness.state().gameState }
    __harness.skipToBattle(); __harness.luffyTest.step(2); const s = __harness.batmanTest.state(); return { during, after: { intro: s.intro, hp: s.hp, atk: s.attack?.name || null, ops: s.s?.ops?.length || 0 } } })
  ck('intro is skippable: skipToBattle clears the intro / card, no gameplay advantage', !skp.after.intro && !skp.after.atk && !skp.after.ops && skp.after.hp === HP, JSON.stringify(skp))
  ck('no browser runtime errors', errors.length === 0, JSON.stringify(errors))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally { log.passes = pass; log.failures = fail; log.errors = errors; fs.writeFileSync('docs/batman/visual_results.json', JSON.stringify(log, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
