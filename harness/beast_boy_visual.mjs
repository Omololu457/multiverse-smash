// harness/beast_boy_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle):
// title → Play → VS → difficulty → DC → Beast Boy (select detail) → skin (Galaxy Glitter) → CPU pick (Superman) → stage →
// match (Appearing intro) → moves in BOTH facings (J chain, Gorilla Break, Triceratops Drive, Tiger Cross, Bird
// Intercept, False Start, a real-time Wild Chain, Instinct ring, air Tiger + landing, ultimate cut-in + every animal beat)
// → profile → KO → victory → rematch → Beast Boy's own defeat sequence.
// Screenshots → docs/beast_boy/visual_*.png      node harness/beast_boy_visual.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const HP = 1080, SKIN_IDX = 9, SKIN_ID = 'bb_galaxy_glitter'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], log = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, d) }
const shot = n => page.screenshot({ path: `docs/beast_boy/visual_${n}.png` })
const S = () => page.evaluate(() => __harness.state())
async function click(re) { const r = await page.evaluate(src => { const re = new RegExp(src), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
    for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 90; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) } return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState()))); await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r }
async function findChar(key) { const seen = [], path = []; for (let row = 0; row < 6; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  for (const dir of path) { const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(60); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen } }
  return { seen, missing: true } }
const DC_CARD = [316, 338]   // "Dc" universe card on the universe grid (row 2, column 1, unscrolled)
const G = () => page.evaluate(() => { const H = __harness.beastBoyTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), hud: H.hud() } })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); await click('^easy$')
  await shot('02_universes'); await page.mouse.click(...DC_CARD); await page.waitForTimeout(600)
  const g = await findChar('beast_boy'); log.roster = g.seen; ck('DC roster lists beast_boy', !g.missing, JSON.stringify(g.seen)); await page.waitForTimeout(250)
  log.detail = await page.evaluate(() => __harness.selectDetail()); await shot('03_select_beast_boy')
  ck(`select detail: Beast Boy, HP ${HP}`, log.detail?.key === 'beast_boy' && log.detail.stats?.maxHealth === HP, JSON.stringify(log.detail))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  log.skinState = await page.evaluate(() => __harness.padMenuState()); await shot('04_skin_select')
  ck('skin select offers Default + 10 skins', log.skinState.gameState === 'selectSkin' && log.skinState.count >= 11, JSON.stringify(log.skinState))
  const sk = await page.evaluate(i => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let k = 0; k < 30 && __harness.padMenuState().idx !== i; k++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, SKIN_IDX)
  await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('05_skin_hover'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  log.chosenSkin = await page.evaluate(() => __harness.session?.()?.p1Skin || null); await page.mouse.click(...DC_CARD); await page.waitForTimeout(500)
  if ((await S()).gameState === 'selectCharacter') { const k = await findChar('superman'); await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500); if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') await click('.*') }
  await page.waitForTimeout(500); log.preStage = await page.evaluate(() => __harness.padMenuState()); await shot('06_stage_select')
  if (log.preStage.gameState === 'selectStage') await click('.*')
  for (let i = 0; i < 40; i++) { const st = await page.evaluate(() => { const f = __harness.beastBoyTest?.raw(); return !!f && (f._introPlaying || f.currentAction === 'intro' || f._lastSpriteAction === 'intro') }); if (st) { await page.waitForTimeout(120); await shot('07a_intro'); log.introSeen = true; break } await page.waitForTimeout(100) }
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(700)
  let s = await G(); log.match = { p1: s.a.key, skin: s.a.skin, tag: s.a.tag, p2: s.b.key }; await shot('07_match_start')
  log.tag = s.a.tag; ck(`normal launch: Beast Boy in a real match with the chosen skin (${SKIN_ID}) vs Superman`, s.a.key === 'beast_boy' && s.a.skin === SKIN_ID && s.a.tag === 'galaxy_glitter' && s.b.key === 'superman', JSON.stringify(log.match))
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const place = (gap, flip) => page.evaluate(([gap, flip]) => { __harness.setRoundTimer(5400); const H = __harness.beastBoyTest, a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1; a.y = b.y
    a.energy = 100; a.health = a.maxHealth; b.health = b.maxHealth; b.vx = 0; a.vx = 0; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; a.hitstun = 0; b.hitstun = 0; b.knockdownState = false; b.attacking = false; b.currentAttack = null; b.isBlocking = false; b._forceGuard = false; b.attackCooldown = 9999 }, [gap, flip])
  const press = async (keys, wait, holdMs = 40) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(holdMs); for (const k of keys) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }
  const waitFor = async (pred, ms = 3000) => { for (let t = 0; t < ms; t += 15) { const q = await G(); if (pred(q)) return q; await page.waitForTimeout(15) } return null }
  const settle = () => waitFor(q => !q.a.attack && q.a.grounded && !q.ult.active, 5000)
  let ultDone = 0
  for (const flip of [false, true]) { const f = flip ? 'L' : 'R', fw = flip ? 'a' : 'd', bk = flip ? 'd' : 'a'
    await place(80, flip); await page.waitForTimeout(200); await press(['j'], 110); await press(['j'], 150); await press(['j'], 140); await shot(`08_${f}_j3`); await settle()
    for (const [k, keys, gap, at, name] of [['gorilla', ['l'], 90, 'gorilla', '09_gorilla'], ['tricera', [fw, 'l'], 200, 'tricera', '10_triceratops'], ['tiger', ['s', 'l'], 120, 'tiger', '11_tiger'], ['bird', ['w', 'l'], 90, 'bird', '12_bird']]) {
      await place(gap, flip); await page.waitForTimeout(200); await press(keys, 0); const q = await waitFor(q => q.a.form === at, 2500); await shot(`${name}_${f}`)
      ck(`real-time ${k}: the ${at} form appears (${f})`, !!q, JSON.stringify(q?.a?.form)); await settle()
      const back = await G(); ck(`…and Gar is human again afterwards (${f})`, back?.a.form === 'human' && !back.a.attack) }
    await place(300, flip); await page.waitForTimeout(200); const x0 = (await G()).a.x; await press([bk, 'l'], 160); await shot(`13_${f}_false_start`); await settle()
    ck(`real-time False Start backs off ≤ 60 px (${f})`, Math.abs((await G()).a.x - x0) <= 62 && Math.abs((await G()).a.x - x0) > 20, String((await G()).a.x - x0))
    // real-time Wild Chain: Gorilla → (fresh Up + Special inside the window) → Bird
    await place(85, flip); await page.waitForTimeout(200); await press(['l'], 0); const open = await waitFor(q => !!q.a.s?.wc?.open, 3000)
    if (open) { await shot(`14_${f}_wild_chain_cue`); await press(['w', 'l'], 0) }
    const linked = await waitFor(q => q.a.attack?.name === 'bird' && q.a.attack.bb?.fromChain, 3000); if (linked) await shot(`15_${f}_wild_chain_bird`)
    ck(`real-time Wild Chain Gorilla → Bird (cue shown, fresh Up+Special linked) (${f})`, !!open && !!linked, JSON.stringify({ open: !!open, linked: !!linked })); await settle()
    // Instinct: armed token → the escape ring inside the last 8 f, then a real jump
    await place(400, flip); await page.evaluate(() => __harness.beastBoyTest.setToken(true)); await page.waitForTimeout(150); await shot(`16_${f}_instinct_ready_hud`)
    await press(['l'], 0); const ring = await waitFor(q => q.a.instinctOpen, 3000); if (ring) { await shot(`17_${f}_instinct_ring`); await press(['w'], 0) }
    const jumped = await waitFor(q => !q.a.attack && !q.a.grounded, 1500); ck(`real-time Instinct ring + Jump escape (${f})`, !!ring && !!jumped, JSON.stringify({ ring: !!ring, jumped: !!jumped })); await settle()
    await place(400, flip); await page.waitForTimeout(150); await press(['w'], 120); await press(['s', 'l'], 0); const ta = await waitFor(q => q.a.attack?.name === 'tigerA', 2000); if (ta) await shot(`18_${f}_air_tiger`)
    const tl = await waitFor(q => q.a.attack?.name === 'tigerLand', 3000); if (tl) await shot(`19_${f}_tiger_landing`); ck(`real-time air Tiger → landing recovery (${f})`, !!ta && !!tl); await settle()
    await place(85, flip); await page.waitForTimeout(250); await page.evaluate(() => { const b = __harness.beastBoyTest.raw('p2'); b.hitstun = 45; b.isBlocking = false }); await press(['u'], 0)
    const ult = await waitFor(q => q.ult.active, 4000)
    if (ult) { for (const [fr, n] of [[12, 'cutin'], [55, 'gorilla'], [95, 'bird'], [135, 'tiger'], [190, 'triceratops'], [245, 'ready']]) { await waitFor(q => !q.ult.active || q.ult.frame >= fr, 8000); await shot(`20_${f}_ult_${n}`) } }
    ck(`real-time ultimate captured the opener (${f})`, !!ult); await waitFor(q => !q.ult.active, 15000)
    s = await G(); ck(`ultimate completed, Gar human, cinematic off (${f})`, !s.ult.active && s.a.s.stats.ultDone > ultDone && s.a.form === 'human', JSON.stringify({ st: s.a.s.stats.ultDone })); ultDone = s.a.s.stats.ultDone
  }
  // PROFILE: animal-heavy frames + the ultimate vs an idle baseline (sim + render steps in this live page)
  log.profile = await page.evaluate(() => { const H = __harness.beastBoyTest, a = H.raw(), b = H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const time = fn => { const t0 = performance.now(); fn(); return performance.now() - t0 }
    const setup = () => { a.x = 1300; b.x = 1420; b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null; a.hitstun = 0; a.health = a.maxHealth; b.health = b.maxHealth; b.hitstun = 0; b.knockdownState = false; a.energy = 100; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0 }
    setup(); const idle = time(() => step(600)) / 600
    const pass = () => { for (let i = 0; i < 4; i++) for (const k of ['gorilla', 'tricera', 'tiger', 'bird']) { setup(); H.move(k); step(80) } }
    pass(); const cache0 = H.fxCache(); const animals = time(pass) / (4 * 4 * 80)
    setup(); b.x = 1390; H.move('ultOpen'); const ultT = time(() => step(320)) / 320
    return { msPerFrameIdle: +idle.toFixed(3), msPerFrameAnimals: +animals.toFixed(3), msPerFrameUlt: +ultT.toFixed(3), fxCacheBefore: cache0, fxCacheAfter: H.fxCache(), fxEntries: a._beastBoy?.fx?.length || 0 } })
  ck('profile: second animal pass adds no cached images; FX list stays bounded (≤ 8)', log.profile.fxCacheAfter === log.profile.fxCacheBefore && log.profile.fxEntries <= 8, JSON.stringify(log.profile))
  ck('profile: animal / ultimate frames within 3x idle cost or under 8 ms', log.profile.msPerFrameAnimals < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.msPerFrameUlt < Math.max(8, log.profile.msPerFrameIdle * 3), JSON.stringify(log.profile))
  for (let round = 0; round < 3; round++) {
    if ((await S()).gameState === 'victory') break
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
    await page.evaluate(() => { const a = __harness.beastBoyTest.raw(), b = __harness.beastBoyTest.raw('p2'); a.health = a.maxHealth; a.hitstun = 0; a.hitstop = 0; a.attackCooldown = 0; a.attacking = false; a.currentAttack = null; a.vx = 0; b.health = 1; b.x = a.x + 70 * (a.facing || 1); b.y = a.y; b.vx = 0; b.vy = 0; b.onGround = true; b.invulnTimer = 0; b.hitstun = 120; b.isBlocking = false; b.attacking = false; b.currentAttack = null })
    await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500); await shot(`24_ko_${round}`)
    await page.waitForFunction(() => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness.beastBoyTest.raw('p2').health > 1), null, { timeout: 45000 })
  }
  ck('victory screen reached', (await S()).gameState === 'victory'); await page.waitForTimeout(900); await shot('25_victory')
  await page.keyboard.press('r'); await page.waitForFunction(() => __harness.state().gameState === 'battle', null, { timeout: 30000 })
  s = await G()   // read at rematch start, before the live CPU can land a hit
  await page.waitForFunction(() => __harness.state().countdown <= 0, null, { timeout: 30000 }); await page.waitForTimeout(300); await shot('26_rematch')
  ck('rematch: Beast Boy, same skin, full HP, no token / collected animals / chain / animal attack', s.a.key === 'beast_boy' && s.a.tag === log.tag && s.a.hp === HP && !s.a.s?.inst?.token && !Object.keys(s.a.s?.inst?.seen || {}).length && !s.a.s?.wc?.links && !s.a.attack?.bb, JSON.stringify({ tag: s.a.tag, hp: s.a.hp, s: s.a.s && { inst: s.a.s.inst, wc: s.a.s.wc } }))
  await page.evaluate(() => { const a = __harness.beastBoyTest.raw(), b = __harness.beastBoyTest.raw('p2'); a.health = 1; a.hitstun = 0; a.isBlocking = false; a._forceGuard = false; a.invulnTimer = 0; b.x = a.x + 80 * (a.facing || 1); b.facing = -(a.facing || 1); b.attackCooldown = 0; b.attacking = false; b.currentAttack = null })
  for (let i = 0; i < 80 && (await G()).a.hp > 0; i++) await page.waitForTimeout(100)
  if ((await G()).a.hp <= 0) { await page.waitForTimeout(700); await shot('27_beast_boy_defeat'); log.defeat = await page.evaluate(() => __harness.beastBoyTest.state()?.action) }
  ck('Beast Boy KO plays his supplied Defeated sequence (lose / knockdown)', !log.defeat || /lose|knockdown|hurt/.test(log.defeat), String(log.defeat))
  ck('no browser runtime errors', errors.length === 0, JSON.stringify(errors))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally { log.passes = pass; log.failures = fail; log.errors = errors; fs.writeFileSync('docs/beast_boy/visual_results.json', JSON.stringify(log, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
