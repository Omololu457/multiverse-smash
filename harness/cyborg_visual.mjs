// harness/cyborg_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle):
// title → Play → VS → difficulty → DC → Cyborg (select detail) → skin (Disco Chrome) → CPU pick (Superman) → stage → match
// (intro) → moves in BOTH facings (J chain, Sonic Shot, held Cannon, Straight Missile, Missile Rack, Mega Punch, Sonic
// Recoil, Vent + Heat HUD, thruster, air slam, ultimate cut-in + scene) → profile → KO → victory → rematch.
// Screenshots → docs/cyborg/visual_*.png      node harness/cyborg_visual.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const HP = 1240
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], log = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, d) }
const shot = n => page.screenshot({ path: `docs/cyborg/visual_${n}.png` })
const S = () => page.evaluate(() => __harness.state())
async function click(re) { const r = await page.evaluate(src => { const re = new RegExp(src), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
    for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 90; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) } return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState()))); await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r }
async function findChar(key) { const seen = [], path = []; for (let row = 0; row < 6; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  for (const dir of path) { const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(60); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen } }
  return { seen, missing: true } }
const DC_CARD = [316, 338]   // "Dc" universe card on the universe grid (row 2, column 1, unscrolled)
const G = () => page.evaluate(() => { const H = __harness.cyborgTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), hud: H.hud(), proj: H.projectiles() } })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); await click('^easy$')
  await shot('02_universes'); await page.mouse.click(...DC_CARD); await page.waitForTimeout(600)
  const g = await findChar('cyborg'); log.roster = g.seen; ck('DC roster lists cyborg', !g.missing, JSON.stringify(g.seen)); await page.waitForTimeout(250)
  log.detail = await page.evaluate(() => __harness.selectDetail()); await shot('03_select_cyborg')
  ck(`select detail: Cyborg, HP ${HP}, DC`, log.detail?.key === 'cyborg' && log.detail.stats?.maxHealth === HP, JSON.stringify(log.detail))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  log.skinState = await page.evaluate(() => __harness.padMenuState()); await shot('04_skin_select')
  ck('skin select offers Default + 8 skins', log.skinState.gameState === 'selectSkin' && log.skinState.count >= 9, JSON.stringify(log.skinState))
  const sk = await page.evaluate(() => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 20 && __harness.padMenuState().idx !== 8; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } })
  await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('05_skin_hover'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  log.afterP1 = await S(); log.chosenSkin = await page.evaluate(() => __harness.session?.()?.p1Skin || null); await page.mouse.click(...DC_CARD); await page.waitForTimeout(500)
  if ((await S()).gameState === 'selectCharacter') { const k = await findChar('superman'); await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500); if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') await click('.*') }
  await page.waitForTimeout(500); log.preStage = await page.evaluate(() => __harness.padMenuState()); await shot('06_stage_select')
  if (log.preStage.gameState === 'selectStage') await click('.*')
  for (let i = 0; i < 40; i++) { const st = await page.evaluate(() => { const f = __harness.cyborgTest?.raw(); return !!f && (f._introPlaying || f.currentAction === 'intro' || f._lastSpriteAction === 'intro') }); if (st) { await page.waitForTimeout(150); await shot('07a_intro'); log.introSeen = true; break } await page.waitForTimeout(100) }
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(700)
  let s = await G(); log.match = { p1: s.a.key, skin: s.a.skin, tag: s.a.tag, p2: s.b.key }; await shot('07_match_start')
  log.tag = s.a.tag; ck('normal launch: Cyborg in a real match with a chosen (non-default) skin vs Superman', s.a.key === 'cyborg' && !!s.a.tag && s.a.skin?.startsWith('cy_') && s.b.key === 'superman', JSON.stringify(log.match))
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const place = (gap, flip, o = {}) => page.evaluate(([gap, flip, o]) => { __harness.setRoundTimer(5400); const H = __harness.cyborgTest, a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    a.energy = 100; a.health = a.maxHealth; b.health = b.maxHealth; b.vx = 0; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; a.hitstun = 0; b.hitstun = 0; b.attacking = false; b.currentAttack = null; b.isBlocking = false; b._forceGuard = false; b.attackCooldown = 9999
    H.setHeat(o.heat || 0) }, [gap, flip, o])
  const press = async (keys, wait, holdMs = 40) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(holdMs); for (const k of keys) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }
  let ultDone = 0
  for (const flip of [false, true]) { const f = flip ? 'L' : 'R', fw = flip ? 'a' : 'd', bk = flip ? 'd' : 'a'
    await place(80, flip); await page.waitForTimeout(200); await press(['j'], 110); await press(['j'], 150); await press(['j'], 140); await shot(`08_${f}_j3`); await page.waitForTimeout(500)
    await place(260, flip); await page.waitForTimeout(200); await press(['l'], 200); await shot(`09_${f}_sonic_shot`); await page.waitForTimeout(600)
    await place(320, flip); await page.waitForTimeout(200); await page.keyboard.down('l'); for (let i = 0; i < 60 && !((await G()).a.s?.stats?.pulses >= 2); i++) await page.waitForTimeout(25)
    await shot(`10_${f}_cannon`); await page.keyboard.up('l'); await page.waitForTimeout(700)   // held until pulses appear (headless fps < 60)
    s = await G(); ck(`real-time held Special → Sonic Cannon pulses (${f})`, s.a.s.stats.pulses >= 1, JSON.stringify({ p: s.a.s.stats.pulses, shots: s.a.s.stats.shots }))
    await place(420, flip); await page.waitForTimeout(200); await press([fw, 'l'], 380); await shot(`11_${f}_missile`); await page.waitForTimeout(900)
    await place(420, flip); await page.waitForTimeout(200); await press(['w', 'l'], 650); await shot(`12_${f}_rack`); await page.waitForTimeout(900)
    s = await G(); ck(`real-time Straight Missile + Missile Rack fired (${f})`, s.a.s.stats.missiles >= 1 && s.a.s.stats.rack >= 1, JSON.stringify(s.a.s.stats))
    await place(80, flip); await page.waitForTimeout(200); await press(['s', 'l'], 400); await shot(`13_${f}_mega_punch`); await page.waitForTimeout(700)
    await place(90, flip); await page.waitForTimeout(200); await press([bk, 'l'], 200); await shot(`14_${f}_recoil`); await page.waitForTimeout(600)
    await place(500, flip, { heat: 72 }); await page.waitForTimeout(150); await shot(`15_${f}_heat_warn`)
    s = await G(); ck(`HUD shows WARN at Heat ≥ 60 (${f})`, s.hud.state === 'WARN', JSON.stringify(s.hud))
    await page.keyboard.down('p'); await page.waitForTimeout(450); await shot(`16_${f}_vent`); await page.keyboard.up('p'); await page.waitForTimeout(400)
    s = await G(); ck(`real-time L2/P Vent cooled Heat (${f})`, s.a.s.stats.ventCooled > 0, JSON.stringify({ heat: s.a.s.heat, cooled: s.a.s.stats.ventCooled }))
    // OVERHEAT needs Heat to land EXACTLY on 100 (an emission that would pass 100 is refused instead); real-time cooling makes
    // that frame-exact, so the HUD capture sets the overheated state directly. The real path is proven in harness/cyborg.test.mjs.
    await place(500, flip, { heat: 100 }); await page.waitForTimeout(80); await press(['l'], 200); await shot(`17_${f}_overheat`)
    s = await G(); ck(`OVERHEAT HUD label + weapons locked (Special refused) (${f})`, s.hud.state === 'OVERHEAT' && !s.proj.length, JSON.stringify(s.hud)); await page.waitForTimeout(300)
    await place(500, flip); await page.waitForTimeout(200); await press(['w'], 150); await press(['w'], 60); await shot(`18_${f}_thruster`); await page.waitForTimeout(250); await press(['s', 'l'], 250); await shot(`19_${f}_slam`); await page.waitForTimeout(900)
    s = await G(); ck(`real-time thruster + air slam (${f})`, s.a.s.stats.dj >= 1 && s.a.s.stats.slams >= 1, JSON.stringify(s.a.s.stats))
    for (let i = 0; i < 60 && !((await G()).a.grounded && !(await G()).a.attack); i++) await page.waitForTimeout(50)   // the ultimate is grounded-only
    await place(85, flip); await page.waitForTimeout(250); await page.evaluate(() => { const b = __harness.cyborgTest.raw('p2'); b.hitstun = 45; b.isBlocking = false }); await press(['u'], 0)
    let ult = false; for (let i = 0; i < 60; i++) { await page.waitForTimeout(50); if ((await G()).ult.active) { ult = true; break } }
    if (ult) { await page.waitForTimeout(250); await shot(`20_${f}_ult_cutin`); await page.waitForTimeout(450); await shot(`21_${f}_ult_cannon`); await page.waitForTimeout(800); await shot(`22_${f}_ult_missiles`); await page.waitForTimeout(1300); await shot(`23_${f}_ult_mega`) }
    ck(`real-time ultimate captured the opener (${f})`, ult); for (let i = 0; i < 120 && (await G()).ult.active; i++) await page.waitForTimeout(100)
    s = await G(); ck(`ultimate completed, Heat 60 afterwards (${f})`, !s.ult.active && s.a.s.stats.ultDone > ultDone && s.hud.heat >= 55 && s.hud.heat <= 60, JSON.stringify({ st: s.a.s.stats.ultDone, hud: s.hud })); ultDone = s.a.s.stats.ultDone
  }
  // PROFILE: weapon-heavy frames + the ultimate vs an idle baseline (sim + render steps in this live page)
  log.profile = await page.evaluate(() => { const H = __harness.cyborgTest, a = H.raw(), b = H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const time = fn => { const t0 = performance.now(); fn(); return performance.now() - t0 }
    const setup = () => { a.x = 1300; b.x = 1700; b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null; a.hitstun = 0; a.health = a.maxHealth; b.health = b.maxHealth; a.energy = 100; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; H.setHeat(0) }
    setup(); const idle = time(() => step(600)) / 600
    const pass = () => { for (let i = 0; i < 6; i++) for (const k of ['cMissile', 'cRack', 'cSonic', 'cMega']) { setup(); H.move(k); step(70) } }
    pass(); const cache0 = H.fxCache(); const weapons = time(pass) / (6 * 4 * 70)
    setup(); b.x = 1390; H.move('cUltOpen'); const ultT = time(() => step(320)) / 320
    return { msPerFrameIdle: +idle.toFixed(3), msPerFrameWeapons: +weapons.toFixed(3), msPerFrameUlt: +ultT.toFixed(3), fxCacheBefore: cache0, fxCacheAfter: H.fxCache(), fxEntries: a._cyborg?.fx?.length || 0, live: a._cyborg?.live?.length || 0 } })
  ck('profile: second weapon pass adds no cached images; FX list stays bounded (≤ 8)', log.profile.fxCacheAfter === log.profile.fxCacheBefore && log.profile.fxEntries <= 8, JSON.stringify(log.profile))
  ck('profile: weapon / ultimate frames within 3x idle cost or under 8 ms', log.profile.msPerFrameWeapons < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.msPerFrameUlt < Math.max(8, log.profile.msPerFrameIdle * 3), JSON.stringify(log.profile))
  log.fps = await page.evaluate(async () => { let n = 0; const t0 = performance.now(); await new Promise(r => { const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else r() }; requestAnimationFrame(tick) }); return Math.round(n / ((performance.now() - t0) / 1000)) })
  ck('page keeps animating (rAF fps sample, headless)', log.fps >= 20, String(log.fps))
  for (let round = 0; round < 3; round++) {
    if ((await S()).gameState === 'victory') break
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
    await page.evaluate(() => { const a = __harness.cyborgTest.raw(), b = __harness.cyborgTest.raw('p2'); a.health = a.maxHealth; a.hitstun = 0; a.hitstop = 0; a.attackCooldown = 0; a.attacking = false; a.currentAttack = null; a.vx = 0; b.health = 1; b.x = a.x + 70 * (a.facing || 1); b.y = a.y; b.vx = 0; b.vy = 0; b.onGround = true; b.invulnTimer = 0; b.hitstun = 120; b.isBlocking = false; b.attacking = false; b.currentAttack = null; b._forceGuard = false })
    await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500); await shot(`24_ko_${round}`)
    await page.waitForFunction(() => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness.cyborgTest.raw('p2').health > 1), null, { timeout: 45000 })
  }
  ck('victory screen reached', (await S()).gameState === 'victory'); await page.waitForTimeout(900); await shot('25_victory')
  // defeat presentation: Cyborg KO'd → the supplied defeat (dissolve) frames + 'down' health icon
  await page.keyboard.press('r'); await page.waitForFunction(() => __harness.state().gameState === 'battle', null, { timeout: 30000 })
  s = await G()   // read at rematch start, before the live CPU can land a hit
  await page.waitForFunction(() => __harness.state().countdown <= 0, null, { timeout: 30000 }); await page.waitForTimeout(300); await shot('26_rematch')
  ck('rematch: Cyborg, same skin, Heat 0, full HP, no overheat / marks / projectiles', s.a.key === 'cyborg' && s.a.tag === log.tag && (s.a.s?.heat || 0) === 0 && !s.a.s?.ovh && !Object.keys(s.a.s?.marks || {}).length && s.proj.length === 0 && s.a.hp === HP, JSON.stringify({ tag: s.a.tag, hp: s.a.hp, heat: s.a.s?.heat }))
  await page.evaluate(() => { const a = __harness.cyborgTest.raw(), b = __harness.cyborgTest.raw('p2'); a.health = 1; a.hitstun = 0; a.isBlocking = false; a._forceGuard = false; a.invulnTimer = 0; b.x = a.x + 80 * (a.facing || 1); b.facing = -(a.facing || 1); b.attackCooldown = 0; b.attacking = false; b.currentAttack = null })
  for (let i = 0; i < 80 && (await G()).a.hp > 0; i++) await page.waitForTimeout(100)
  if ((await G()).a.hp <= 0) { await page.waitForTimeout(700); await shot('27_cyborg_defeat'); log.defeat = await page.evaluate(() => __harness.cyborgTest.state()?.action) }
  ck('no browser runtime errors', errors.length === 0, JSON.stringify(errors))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally { log.passes = pass; log.failures = fail; log.errors = errors; fs.writeFileSync('docs/cyborg/visual_results.json', JSON.stringify(log, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
