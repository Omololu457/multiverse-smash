// harness/spd_yellow_visual.mjs — S.P.D. Yellow, NORMAL launch path with the real mouse + keyboard (no skipToBattle):
// title -> Play -> VS -> difficulty -> Power Rangers -> S.P.D. Yellow -> skin (Starlight Glitter) -> CPU pick -> stage -> match ->
// real-time moves (pistol, long gun, duplicate, swap, echo, stance order, Intercept, blink, ultimate) -> PROFILE with glitter + clone +
// Megazord active -> KO -> victory -> rematch. Then deterministic frame captures (exact sim frames) for the gameplay contact sheet:
// docs/spd_yellow/frames/*.png -> tools/spd_yellow/gameplay_sheet.py -> docs/spd_yellow/gameplay_contact_sheet.png.
//   node harness/spd_yellow_visual.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const HP = 1100, OUT = 'docs/spd_yellow', FR = `${OUT}/frames`
fs.mkdirSync(FR, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], log = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const shot = n => page.screenshot({ path: `${OUT}/visual_${n}.png` })
const S = () => page.evaluate(() => __harness.state())
async function click(re) { const r = await page.evaluate(src => { const re = new RegExp(src), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
  for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 90; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) } return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState()))); await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r }
async function findChar(key) { const seen = [], path = []; for (let row = 0; row < 6; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  for (const dir of path) { const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(60); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen } }
  return { seen, missing: true } }
const G = () => page.evaluate(() => { const H = __harness.spdYellowTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), shots: H.shots() } })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); log.difficulty = await click('^dummy$').then(() => 'dummy', () => click('^easy$').then(() => 'easy'))   /* a passive CPU keeps the real-time checks about Yellow, not the AI */
  await page.mouse.move(1100, 580); await page.mouse.wheel(0, 640); await page.waitForTimeout(350); await shot('02_universes'); await page.mouse.click(960, 454); await page.waitForTimeout(600)
  const g = await findChar('spd_yellow'); log.roster = g.seen; ck('Power Rangers roster lists spd_yellow', !g.missing, JSON.stringify(g.seen)); await page.waitForTimeout(250)
  log.detail = await page.evaluate(() => __harness.selectDetail()); await shot('03_select_spd_yellow')
  ck(`select detail: S.P.D. Yellow, HP ${HP}`, log.detail?.key === 'spd_yellow' && log.detail.stats.maxHealth === HP, JSON.stringify(log.detail))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  log.skinState = await page.evaluate(() => __harness.padMenuState()); await shot('04_skin_select')
  ck('skin select offers Default + 8 skins', log.skinState.gameState === 'selectSkin' && log.skinState.count >= 9, JSON.stringify(log.skinState))
  // card rect for skin index 7 (Starlight Glitter) — same math as game.js getSkinSelectRects (cards carry no ids)
  const sk = await page.evaluate(idx => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), count = 9, gap = 24, topPad = 150, botPad = 40, sidePad = 40; let cardW = 180, cardH = 230
    const availW = cv.width - sidePad * 2, availH = cv.height - topPad - botPad; let cols = Math.max(1, Math.min(count, Math.floor((availW + gap) / (cardW + gap)))), rows = Math.ceil(count / cols)
    const maxH = (availH - (rows - 1) * gap) / rows; if (cardH > maxH) { const s = maxH / cardH; cardH = maxH; cardW = Math.round(cardW * s) }
    cols = Math.max(1, Math.min(count, Math.floor((availW + gap) / (cardW + gap)))); rows = Math.ceil(count / cols)
    const blockH = rows * cardH + (rows - 1) * gap, y0 = topPad + Math.max(0, (availH - blockH) / 2), row = Math.floor(idx / cols), col = idx % cols, inRow = Math.min(cols, count - row * cols)
    const x = cv.width / 2 - (inRow * cardW + (inRow - 1) * gap) / 2 + col * (cardW + gap) + cardW / 2, y = y0 + row * (cardH + gap) + cardH / 2
    return { cx: b.left + x * b.width / cv.width, cy: b.top + y * b.height / cv.height } }, 7)
  await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('05_skin_hover'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  await page.mouse.move(1100, 580); await page.mouse.wheel(0, 640); await page.waitForTimeout(300); await page.mouse.click(960, 454); await page.waitForTimeout(500)
  if ((await S()).gameState === 'selectCharacter') { const k = await findChar('mmpr_white'); await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500); if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') await click('.*') }
  await page.waitForTimeout(500); log.preStage = await page.evaluate(() => __harness.padMenuState()); await shot('06_stage_select')
  if (log.preStage.gameState === 'selectStage') await click('.*')
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(700)
  let s = await G(); log.match = { p1: s.a.key, skin: s.a.skin, tag: s.a.tag, p2: s.b.key }; await shot('07_match_start')
  ck('normal launch: S.P.D. Yellow in a real match with the chosen skin (Starlight Glitter)', s.a.key === 'spd_yellow' && s.a.tag === 'starlight', JSON.stringify(log.match))
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const place = (gap, flip) => page.evaluate(([gap, flip]) => { __harness.setRoundTimer(5400); const H = __harness.spdYellowTest, a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    a.energy = 100; a.health = a.maxHealth; b.health = b.maxHealth; b.vx = 0; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; a.hitstun = 0; b.hitstun = 0; b.attacking = false; b.currentAttack = null; b.attackCooldown = 9999; b.isBlocking = false; b._forceGuard = false; b.knockdownState = false; b.knockdownTimer = 0; b.invulnTimer = 0; b.juggleCount = 0; b.vy = 0; b.y = a.y; b.onGround = true; b.grounded = true; b.isGrabbed = false; a.knockdownState = false; a.invulnTimer = 0 }, [gap, flip])
  const free = async (max = 80) => { for (let i = 0; i < max; i++) { const q = await G(); if (!q.a.attack && !q.a.ranger?.blink && !(q.a.hitstun > 0)) return; await page.waitForTimeout(25) } }
  const holdFrames = async (keys, n) => { for (const k of keys) await page.keyboard.down(k); const c0 = await page.evaluate(() => __harness.spdYellowTest.raw()._spdYellow?.clock || 0); for (let i = 0; i < 200; i++) { if (((await page.evaluate(() => __harness.spdYellowTest.raw()._spdYellow?.clock || 0)) - c0) >= n) break; await page.waitForTimeout(10) } for (const k of keys) await page.keyboard.up(k) }
  const press = async (keys, wait, hold = 40) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(hold); for (const k of keys) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }
  for (const flip of [false, true]) { const f = flip ? 'L' : 'R', fw = flip ? 'a' : 'd', bk = flip ? 'd' : 'a'
    await place(260, flip); await page.waitForTimeout(200); await press(['l'], 120); await shot(`08_${f}_pistol`); await page.waitForTimeout(500)
    await place(300, flip); for (let i = 0; i < 40 && (await G()).shots.length; i++) await page.waitForTimeout(25); await free(); await holdFrames(['l'], 36); await page.waitForTimeout(60); await shot(`09_${f}_long_gun`); await page.waitForTimeout(700)
    s = await G(); ck(`real-time pistol + long gun fired (${f})`, s.a.s.stats.pistol >= 1 && s.a.s.stats.long >= 1, JSON.stringify(s.a.s.stats))
    await place(160, flip); await page.waitForTimeout(200); await press(['j'], 0); await free(); await press(['s', 'l'], 0); await free(); await page.waitForTimeout(100); await shot(`10_${f}_duplicate`)
    await press([fw, 'l'], 250); await shot(`11_${f}_swap`); await free()
    for (let t = 0; t < 3 && !((await G()).a.s.stats.echoes > (flip ? 1 : 0)); t++) { await page.evaluate(() => { const H = __harness.spdYellowTest, a = H.raw(), b = H.raw('p2'); b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null; a.hitstun = 0; a.energy = 100 }); await page.waitForTimeout(120); await press([bk, 'l'], 200) }   /* the live CPU can interrupt Z */
    await shot(`12_${f}_echo`); await page.waitForTimeout(600)
    s = await G(); ck(`real-time duplicate, swap and echo (${f})`, s.a.s.stats.clones >= 1 && s.a.s.stats.swaps >= 1 && s.a.s.stats.echoes >= 1, JSON.stringify(s.a.s.stats))
    await place(140, flip); await page.waitForTimeout(200); await press(['w', 'l'], 350); await shot(`13_${f}_intercept`); await page.waitForTimeout(900)
    await place(200, flip); await page.evaluate(() => __harness.spdYellowTest.setCoins(3)); await page.waitForTimeout(150); await press(['p', 'l'], 200); await shot(`14_${f}_stance_panel`)
    await press([fw], 120); await press([fw], 120); await press([';'], 300)
    s = await G(); ck(`real-time stance opens, selects, Guard closes (${f})`, s.a.s.stats.stanceOpens >= 1 && !s.a.s.stance, JSON.stringify(s.a.s.stats))
    for (let t = 0; t < 3; t++) { await place(600, flip); await page.waitForTimeout(300); await press([fw], 30); await press([fw], 30); await shot(`15_${f}_blink`); await page.waitForTimeout(600); if ((await G()).a.ranger?.blinks >= 1) break }
    s = await G(); ck(`double-tap blink fired in real time (${f})`, s.a.ranger?.blinks >= 1, JSON.stringify(s.a.ranger))
    await place(180, flip); await page.waitForTimeout(250); await page.evaluate(() => { const b = __harness.spdYellowTest.raw('p2'); b.hitstun = 60; b.isBlocking = false; b.vx = 0 }); await page.waitForTimeout(80); log[`ultPre_${f}`] = await page.evaluate(() => { const b = __harness.spdYellowTest.raw('p2'); return { kd: !!b.knockdownState, inv: b.invulnTimer, g: !!b.onGround, hs: b.hitstun, y: Math.round(b.y), x: Math.round(b.x) } }); await press(['u'], 0)
    let ult = false; for (let i = 0; i < 60; i++) { await page.waitForTimeout(50); if ((await G()).ult.active) { ult = true; break } }
    log[`ultTrace_${f}`] = []; if (ult) { for (let i = 0; i < 6; i++) { const q = await G(); log[`ultTrace_${f}`].push([q.ult.frame, q.ult.done, q.b.hp, (await S()).gameState]); await page.waitForTimeout(80) } await page.waitForTimeout(20); await shot(`16_${f}_ult_dups`); await page.waitForTimeout(1000); await shot(`17_${f}_ult_zord`); await page.waitForTimeout(1000); await shot(`18_${f}_ult_final`) }
    ck(`real-time ultimate captured the opener (${f})`, ult); for (let i = 0; i < 120 && (await G()).ult.active; i++) await page.waitForTimeout(100)
    s = await G(); ck(`ultimate ended cleanly (${f})`, !s.ult.active && s.a.s.stats.ultDone >= 1 && !s.a.attack, JSON.stringify({ st: s.a.s.stats.ultDone, wh: s.a.s.stats.ultWhiffs, gs: (await S()).gameState, round: (await S()).round, hp: [s.a.hp, s.b.hp], ultLog: log[`ultTrace_${f}`] }))
  }
  // PROFILE: glitter skin + live duplicate + Megazord + shots vs an idle baseline (sim + render in this page)
  log.profile = await page.evaluate(() => { const H = __harness.spdYellowTest, a = H.raw(), b = H.raw('p2'), step = () => __harness.luffyTest.step(1)
    const time = (fn, n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(i); return (performance.now() - t0) / n }
    const setup = () => { a.x = 1300; b.x = 1560; b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null; a.hitstun = 0; a.health = a.maxHealth; b.health = b.maxHealth; a.energy = 100; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; if (a._falcon) { a._falcon.pips = 2; a._falcon.lockout = 0; a._falcon.postUlt = 0 } }
    setup(); const idle = time(step, 300)
    let calls = 0; const busy = () => time(i => { const s = a._spdYellow
      if (i % 60 === 0) { setup(); if (s) { s.cloneCd = 0; if (s.clone) s.clone.life = 300 } if (!s?.clone) H.move('yClone') }
      if (i % 60 === 20) { a.attacking = false; a.currentAttack = null; if (H.move('yCall', 'p1', { kind: 'yIntercept' })) calls++ }
      if (i % 60 === 45) { a.attacking = false; a.currentAttack = null; H.move('yGun') }
      step() }, 600)
    busy(); busy(); const cache0 = H.fxCache(); const heavy = busy()   // 3rd pass measured: first-use image loads are not leaks
    setup(); b.x = 1500; a.energy = 100; H.move('yUltOpen'); const ultT = time(step, 260)
    return { skin: a.skinId, msPerFrameIdle: +idle.toFixed(3), msPerFrameGlitterCloneZord: +heavy.toFixed(3), msPerFrameUlt: +ultT.toFixed(3), calls, fxCacheBefore: cache0, fxCacheAfter: H.fxCache() } })
  ck('profile: glitter + clone + Megazord frames within 3x idle and under 8 ms; no cache growth on the 2nd pass', log.profile.skin === 'spd_yellow_starlight' && log.profile.calls >= 5 && log.profile.msPerFrameGlitterCloneZord < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.msPerFrameUlt < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.fxCacheAfter === log.profile.fxCacheBefore, JSON.stringify(log.profile))
  log.fps = await page.evaluate(async () => { let n = 0; const t0 = performance.now(); await new Promise(r => { const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else r() }; requestAnimationFrame(tick) }); return Math.round(n / ((performance.now() - t0) / 1000)) })
  ck('page keeps animating (rAF fps sample, headless)', log.fps >= 20, String(log.fps))
  for (let round = 0; round < 3; round++) {
    if ((await S()).gameState === 'victory') break
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
    await page.evaluate(() => { const a = __harness.spdYellowTest.raw(), b = __harness.spdYellowTest.raw('p2'); a.health = a.maxHealth; a.hitstun = 0; a.hitstop = 0; a.attackCooldown = 0; a.attacking = false; a.currentAttack = null; a.vx = 0; b.health = 1; b.x = a.x + 70 * (a.facing || 1); b.y = a.y; b.vx = 0; b.vy = 0; b.onGround = true; b.invulnTimer = 0; b.hitstun = 120; b.isBlocking = false; b.attacking = false; b.currentAttack = null; b._forceGuard = false })
    await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500); await shot(`19_ko_${round}`)
    await page.waitForFunction(() => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness.spdYellowTest.raw('p2').health > 1), null, { timeout: 45000 })
  }
  ck('victory screen reached', (await S()).gameState === 'victory'); await page.waitForTimeout(900); await shot('20_victory')
  await page.keyboard.press('r'); await page.waitForFunction(() => __harness.state().gameState === 'battle', null, { timeout: 30000 })
  s = await G()
  await page.waitForFunction(() => __harness.state().countdown <= 0, null, { timeout: 30000 }); await page.waitForTimeout(300); await shot('21_rematch')
  ck('rematch: Yellow, same skin, 0 coins, no clone / sortie / stance, full HP', s.a.key === 'spd_yellow' && s.a.tag === 'starlight' && (s.a.s?.coins ?? 0) === 0 && !s.a.s?.clone && !s.a.falcon?.sortie && !s.a.s?.stance && s.a.hp === HP && !s.ult.active, JSON.stringify({ tag: s.a.tag, hp: s.a.hp, s: s.a.s && { coins: s.a.s.coins, clone: s.a.s.clone } }))

  // ── DETERMINISTIC FRAME CAPTURES (exact sim frames; clip around the action) ──
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(server.base + '/index.html?harness=1&p1=spd_yellow&p2=mmpr_white&seed=4242', { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.spdYellowTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(3) }); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready); await page.waitForTimeout(250)
  const cap = async (name, setup, frames) => {
    for (const n of frames) {
      await page.evaluate(([setup, n]) => { const H = __harness.spdYellowTest; H.reset(); __harness.setDummyBehavior('stand'); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + 260; a.facing = 1; b.facing = -1
        for (const f of [a, b]) { f.energy = 100; f.health = f.maxHealth; f.attackCooldown = 0 } b.attackCooldown = 9999; __harness.luffyTest.step(1)
        const fn = new Function('H', 'a', 'b', 'step', setup); fn(H, a, b, k => { for (let i = 0; i < k; i++) __harness.luffyTest.step(1) })
        for (let i = 0; i < n; i++) __harness.luffyTest.step(1) }, [setup, n])
      await page.waitForTimeout(40); await page.evaluate(() => __harness.luffyTest.step(0))
      const box = await page.evaluate(() => { const H = __harness.spdYellowTest, a = H.raw(); return { x: a._lastDrawX, y: a._lastDrawY } })
      await page.screenshot({ path: `${FR}/${name}_${String(n).padStart(3, '0')}.png`, clip: { x: 260, y: 150, width: 760, height: 330 } })
    }
  }
  const HOLD = "const {writeRawControls}=window.__ymods; "
  await page.evaluate(async () => { window.__ymods = await import('./input.js') })
  await cap('pistol', "H.move('yGun'); a._spdYellow.gun.held=false", [4, 10, 13, 18])
  await cap('long_gun', HOLD + "H.move('yGun'); for(let i=0;i<34;i++){ writeRawControls(a,{special:true}); step(1) } writeRawControls(a,{})", [0, 2, 6, 12])
  await cap('blink', "const {writeRawControls}=window.__ymods; b.x=1900; writeRawControls(a,{right:true}); step(1); writeRawControls(a,{}); step(2); writeRawControls(a,{right:true}); step(1); writeRawControls(a,{})", [0, 3, 6, 9])
  await cap('duplicate', "H.move('yClone')", [8, 15, 30])
  await cap('swap', "H.move('yClone'); step(32); H.move('ySwap')", [6, 9, 12])
  await cap('coins', "H.award('melee'); step(4); H.award('gun')", [0, 4, 8, 12, 16, 30])
  await cap('zord_intercept', "H.move('yCall','p1',{kind:'yIntercept'})", [8, 26, 32, 40])
  await cap('zord_rising', "H.move('yCall','p1',{kind:'yRising'})", [8, 24, 30, 40])
  await cap('zord_sword', "b.x=1300+200; H.move('yCall','p1',{kind:'ySword'})", [10, 26, 34, 44])
  await cap('stance', "H.setCoins(2); H.stance()", [2])
  await cap('ult', "b.x=1300+200; H.move('yUltOpen'); step(22)", [20, 44, 80, 100, 124, 150, 172, 186])
  log.frames = fs.readdirSync(FR).length
  ck('deterministic frame captures written', log.frames >= 40, String(log.frames))
  ck('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 3)))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally { log.passes = pass; log.failures = fail; log.errors = errors; fs.writeFileSync(`${OUT}/visual_results.json`, JSON.stringify(log, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
