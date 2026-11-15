// harness/higuruma_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle), adapted from robin_visual.mjs:
// title → Play → VS → difficulty → Jujutsu Kaisen → Higuruma (select detail) → skin (Crimson Prosecutor) → CPU pick → stage →
// match (intro: the supplied turn / gavel-manifest frames + intro card) → moves in BOTH facings (small-gavel chain, extended
// lash, giant overhead, giant upswing, Extension of the Court, Cross-Examination, Rising Objection, Order in the Court,
// Objection counter, Case File → Precedent dash, shared double jump, Deadly Sentencing whiff / block / clean sequence) →
// profile → KO → victory → rematch → defeat → intro skip.        Screenshots → docs/higuruma/visual_*.png
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const HP = 1080
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], log = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const shot = n => page.screenshot({ path: `docs/higuruma/visual_${n}.png` })
const S = () => page.evaluate(() => __harness.state())
async function click(re) { const r = await page.evaluate(src => { const re = new RegExp(src, 'i'), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
    for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 90; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) } return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState()))); await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r }
async function findChar(key) { const seen = [], path = []; for (let row = 0; row < 6; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  for (const dir of path) { const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(60); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen } }
  return { seen, missing: true } }
const G = () => page.evaluate(() => { const H = __harness.higurumaTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), hud: H.hud() } })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); await click('^easy$')
  await shot('02_universes'); log.universe = await click('jujutsu'); await page.waitForTimeout(600)
  const g = await findChar('higuruma'); log.roster = g.seen; ck('Jujutsu Kaisen roster lists higuruma', !g.missing, JSON.stringify(g.seen)); await page.waitForTimeout(250)
  log.detail = await page.evaluate(() => __harness.selectDetail()); await shot('03_select_higuruma')
  ck(`select detail: Higuruma, HP ${HP}`, log.detail?.key === 'higuruma' && log.detail.stats?.maxHealth === HP, JSON.stringify(log.detail))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  log.skinState = await page.evaluate(() => __harness.padMenuState()); await shot('04_skin_select')
  ck('skin select offers Default + 10 skins', log.skinState.gameState === 'selectSkin' && log.skinState.count >= 11, JSON.stringify(log.skinState))
  const sk = await page.evaluate(() => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 20 && __harness.padMenuState().idx !== 3; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } })
  await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('05_skin_hover'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  log.chosenSkin = await page.evaluate(() => __harness.session?.()?.p1Skin || null)
  if ((await S()).gameState === 'selectUniverse' || (await page.evaluate(() => __harness.padMenuState())).gameState === 'selectUniverse') await click('jujutsu')
  if ((await S()).gameState === 'selectCharacter') { const k = await findChar('gojo'); if (!k.missing) { await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500) } else await click('.*'); if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') await click('.*') }
  await page.waitForTimeout(500); log.preStage = await page.evaluate(() => __harness.padMenuState()); await shot('06_stage_select')
  if (log.preStage.gameState === 'selectStage') await click('.*')
  for (let i = 0; i < 80; i++) { const st = await page.evaluate(() => { const f = __harness.higurumaTest?.raw(); return f ? { p: !!f._introPlaying, k: f._introRevealFrame || 0, act: f._lastSpriteAction } : null })
    if (st?.p && !log.introSeen) { log.introSeen = true; log.introActions = [] }
    if (st?.p) log.introActions.push(st.act)
    if (st?.p && st.k > 40) { await shot('07a_intro_card'); log.introCard = st; break } await page.waitForTimeout(60) }
  ck('intro plays the supplied turn / gavel-manifest frames with the intro card', log.introSeen && (log.introActions || []).some(a => a === 'intro' || a === 'introSettle') && !!log.introCard, JSON.stringify({ seen: log.introSeen, acts: [...new Set(log.introActions || [])], card: log.introCard }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(700)
  let s = await G(); log.match = { p1: s.a.key, skin: s.a.skin, tag: s.a.tag, p2: s.b.key }; await shot('07_match_start')
  log.tag = s.a.tag; ck('normal launch: Higuruma in a real match with a chosen (non-default) skin', s.a.key === 'higuruma' && !!s.a.tag && s.a.skin?.startsWith('hg_'), JSON.stringify(log.match))
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const place = (gap, flip, o = {}) => page.evaluate(([gap, flip, o]) => { const H = __harness.higurumaTest, a = H.raw(), b = H.raw('p2'); __harness.setRoundTimer(5400); b.vy = 0; b.vx = 0; b.isFlying = false; if (b._flight) b._flight.active = false
    a.x = 1300; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    a.energy = 100; a.health = a.maxHealth; b.health = b.maxHealth; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; a.hitstun = 0; a.hitstop = 0
    b.attacking = false; b.currentAttack = null; b.isBlocking = !!o.guard; b._forceGuard = !!o.guard; b.attackCooldown = o.free ? 0 : 9999; b.hitstun = o.free || o.guard ? 0 : 9999; b.y = a.y; b.onGround = true; b.grounded = true; b.knockdownState = false
    if (o.case) { H.setCase(o.case, o.token || 0) } }, [gap, flip, o])
  const press = async (keys, wait, holdMs = 40) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(holdMs); for (const k of keys) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }
  const ready = async () => { for (let i = 0; i < 160; i++) { const q = await G(); if (q.a.grounded && !q.a.attack && !q.ult.active) return; await page.waitForTimeout(40) } }
  const waitFor = async (pred, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const q = await G(); if (pred(q)) return q; await page.waitForTimeout(16) } return G() }
  let ultDone = 0
  for (const flip of [false, true]) { const f = flip ? 'L' : 'R', fw = flip ? 'a' : 'd', bk = flip ? 'd' : 'a'
    await ready(); await place(80, flip); await page.waitForTimeout(200); await press(['j'], 90); await press(['j'], 110); await press(['j'], 120); await shot(`08_${f}_small_chain`); await page.waitForTimeout(500)
    await ready(); await place(150, flip); await page.waitForTimeout(200); await press([fw, 'k'], 200); await shot(`09_${f}_extended_lash`); await page.waitForTimeout(500)
    await ready(); await place(90, flip); await page.waitForTimeout(200); await press(['k'], 330); await shot(`10_${f}_giant_overhead`); await page.waitForTimeout(500)
    await ready(); await place(90, flip); await page.waitForTimeout(200); await press(['s', 'k'], 300); await shot(`11_${f}_giant_upswing`); await page.waitForTimeout(500)
    await ready(); await place(200, flip); await page.waitForTimeout(200); await press(['l'], 200); await shot(`12_${f}_extension_of_the_court`); await page.waitForTimeout(500)
    await ready(); await place(140, flip); await page.waitForTimeout(200); await press([fw, 'l'], 380); await shot(`13_${f}_cross_examination`); await page.waitForTimeout(600)
    await ready(); await place(70, flip); await page.waitForTimeout(200); await press(['w', 'l'], 240); await shot(`14_${f}_rising_objection`); await page.waitForTimeout(800)
    await ready(); await place(80, flip); await page.waitForTimeout(200); await press(['s', 'l'], 420); await shot(`15_${f}_order_in_the_court`); await page.waitForTimeout(600)
    s = await G(); ck(`real-time specials: Extension / Cross / Rising / Order (${f})`, s.a.s.stats.ext >= 1 && s.a.s.stats.cross >= 1 && s.a.s.stats.rises >= 1 && s.a.s.stats.orders >= 1, JSON.stringify(s.a.s.stats))
    await ready(); await place(70, flip, { free: true }); await page.waitForTimeout(150); await press([bk, 'l'], 0)
    await page.evaluate(() => { const H = __harness.higurumaTest; H.raw('p2').attackCooldown = 0; H.move('light', 'p2') }); await page.waitForTimeout(150); await shot(`16_${f}_objection_counter`); await page.waitForTimeout(600)
    s = await G(); ck(`real-time Objection catches a frontal strike and counters (${f})`, s.a.s.stats.counters >= (flip ? 2 : 1), JSON.stringify(s.a.s.stats))
    await page.evaluate(() => { const b = __harness.higurumaTest.raw('p2'); b.attackCooldown = 9999 })
    await ready(); await place(90, flip, { case: { close: true, reach: true }, token: 0 }); await page.waitForTimeout(150); await press(['k'], 0)
    await waitFor(q => q.a.s.token === 1, 2500); await shot(`17_${f}_case_complete`)
    const pd = await waitFor(q => q.pd || !q.a.attack, 2500)
    await press([fw], 20, 30); await press([fw], 0, 30); await page.waitForTimeout(60); await shot(`18_${f}_precedent_dash`); await page.waitForTimeout(500)
    s = await G(); ck(`real-time Case File → Precedent dash cancel (${f})`, s.a.s.stats.tokens >= (flip ? 2 : 1) && s.a.s.stats.precedents >= (flip ? 2 : 1), JSON.stringify(s.a.s.stats))
    await ready(); await place(500, flip); await page.waitForTimeout(200); await press(['w'], 150); await press(['w'], 60); await shot(`19_${f}_double_jump`); await page.waitForTimeout(900)
    s = await G(); ck(`real-time shared double jump (${f})`, s.a.s.stats.dj >= 1, JSON.stringify({ dj: s.a.s.stats.dj }))
    await ready(); await place(90, flip, { guard: true }); await page.waitForTimeout(200); await press(['u'], 300); await shot(`20_${f}_ult_blocked`); await page.waitForTimeout(800)
    s = await G(); ck(`blocked opener → no cinematic (${f})`, !s.ult.active, JSON.stringify(s.ult))
    await ready(); await place(90, flip); await page.waitForTimeout(250); await press(['u'], 0)
    let ult = false; for (let i = 0; i < 80; i++) { await page.waitForTimeout(40); if ((await G()).ult.active) { ult = true; break } }
    if (ult) { for (const [beat, name] of [['convene', '21_ult_convene'], ['case', '22_ult_case_review'], ['confiscation', '23_ult_confiscation'], ['verdict', '24_ult_verdict'], ['sword', '25_ult_sword']]) {
      for (let i = 0; i < 200; i++) { const v = await page.evaluate(() => __harness.higurumaTest.ultView()); if (!v || v.beat === beat) break; await page.waitForTimeout(16) }
      await page.waitForTimeout(beat === 'sword' ? 300 : 150); await shot(`${name}_${f}`) } }
    ck(`real-time ultimate captured the opener (${f})`, ult); for (let i = 0; i < 120 && (await G()).ult.active; i++) await page.waitForTimeout(100)
    s = await G(); ck(`ultimate completed and state restored (${f})`, !s.ult.active && s.a.s.stats.ultDone > ultDone && !s.a.attack, JSON.stringify({ st: s.a.s.stats.ultDone })); ultDone = s.a.s.stats.ultDone
  }
  log.profile = await page.evaluate(() => { const H = __harness.higurumaTest, a = H.raw(), b = H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const time = fn => { const t0 = performance.now(); fn(); return performance.now() - t0 }
    const setup = () => { H.reset(); a.x = 1300; b.x = 1390; b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null; a.hitstun = 0; a.health = a.maxHealth; b.health = b.maxHealth; a.energy = 100; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0 }
    setup(); const idle = time(() => step(600)) / 600
    const run = () => { for (let i = 0; i < 6; i++) { setup(); H.move('hExt'); step(40); H.move('hCross'); step(60); H.move('hOrder'); step(70); H.move('heavy'); step(70) } }
    run(); const cache0 = H.fxCache(); const sp = time(run) / (6 * 240)
    setup(); H.move('ultOpen'); const ultT = time(() => step(320)) / 320
    return { msPerFrameIdle: +idle.toFixed(3), msPerFrameSpecials: +sp.toFixed(3), msPerFrameUlt: +ultT.toFixed(3), fxCacheBefore: cache0, fxCacheAfter: H.fxCache(), fxEntries: a._higuruma?.fx?.length || 0 } })
  ck('profile: second pass adds no cached images; FX list bounded (≤ 16)', log.profile.fxCacheAfter === log.profile.fxCacheBefore && log.profile.fxEntries <= 16, JSON.stringify(log.profile))
  ck('profile: specials / ultimate frames within 3x idle cost or under 8 ms', log.profile.msPerFrameSpecials < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.msPerFrameUlt < Math.max(8, log.profile.msPerFrameIdle * 3), JSON.stringify(log.profile))
  await page.evaluate(() => { __harness.higurumaTest.reset(); __harness.higurumaTest.raw('p2').hitstun = 0 })
  for (let round = 0; round < 3; round++) {
    if ((await S()).gameState === 'victory') break
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
    await page.evaluate(() => { const a = __harness.higurumaTest.raw(), b = __harness.higurumaTest.raw('p2'); a.health = a.maxHealth; a.hitstun = 0; a.hitstop = 0; a.attackCooldown = 0; a.attacking = false; a.currentAttack = null; a.vx = 0; b.health = 1; b.x = a.x + 70 * (a.facing || 1); b.y = a.y; b.vx = 0; b.vy = 0; b.onGround = true; b.invulnTimer = 0; b.hitstun = 120; b.isBlocking = false; b.attacking = false; b.currentAttack = null })
    await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500); await shot(`26_ko_${round}`)
    await page.waitForFunction(() => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness.higurumaTest.raw('p2').health > 1), null, { timeout: 45000 })
  }
  ck('victory screen reached', (await S()).gameState === 'victory'); await page.waitForTimeout(900); await shot('27_victory')
  log.victoryAction = await page.evaluate(() => __harness.higurumaTest.raw()._lastSpriteAction)
  ck('victory pose = the supplied back-turned gavel-dissolve frames (win)', log.victoryAction === 'win', String(log.victoryAction))
  await page.keyboard.press('r'); await page.waitForFunction(() => __harness.state().gameState === 'battle' || __harness.state().gameState === 'intro', null, { timeout: 30000 })
  s = await G()
  ck('rematch: Higuruma, same skin, full HP, empty case, no token, no cinematic', s.a.key === 'higuruma' && s.a.tag === log.tag && !s.a.s?.token && !s.a.s?.caseFile?.close && !s.ult.active && s.a.hp === HP, JSON.stringify({ tag: s.a.tag, hp: s.a.hp, s: s.a.s && { c: s.a.s.caseFile, t: s.a.s.token } }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(300); await shot('28_rematch')
  await page.evaluate(() => { const a = __harness.higurumaTest.raw(), b = __harness.higurumaTest.raw('p2'); a.health = 1; a.hitstun = 0; a.isBlocking = false; a._forceGuard = false; a.invulnTimer = 0; b.x = a.x + 80 * (a.facing || 1); b.facing = -(a.facing || 1); b.attackCooldown = 0; b.attacking = false; b.currentAttack = null })
  for (let i = 0; i < 80 && (await G()).a.hp > 0; i++) await page.waitForTimeout(100)
  if ((await G()).a.hp <= 0) { await page.waitForTimeout(700); await shot('29_higuruma_defeat'); log.defeat = await page.evaluate(() => __harness.higurumaTest.raw()._lastSpriteAction) }
  await page.goto(server.base + '/index.html?harness=1&p1=higuruma&p2=higuruma&seed=4242', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.higurumaTest)
  const skp = await page.evaluate(() => { __harness.start(); for (let i = 0; i < 30; i++) __harness.luffyTest.step(1); const a = __harness.higurumaTest.raw(), during = { intro: !!a._introPlaying, gs: __harness.state().gameState }
    __harness.skipToBattle(); __harness.luffyTest.step(2); const s = __harness.higurumaTest.state(); return { during, after: { intro: s.intro, hp: s.hp, atk: s.attack?.name || null, token: s.s?.token || 0 } } })
  ck('intro is skippable: skipToBattle clears the intro / card, no gameplay advantage', !skp.after.intro && !skp.after.atk && !skp.after.token && skp.after.hp === HP, JSON.stringify(skp))
  ck('no browser runtime errors', errors.length === 0, JSON.stringify(errors))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally { log.passes = pass; log.failures = fail; log.errors = errors; fs.writeFileSync('docs/higuruma/visual_results.json', JSON.stringify(log, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
