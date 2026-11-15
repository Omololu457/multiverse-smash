// harness/megumi_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle):
// title → Play → VS → difficulty → Jujutsu Kaisen → Megumi (select detail) → skin (Infinity Frost) → CPU pick → stage →
// match (intro + "MEGUMI FUSHIGURO — TEN SHADOWS" card) → moves in BOTH facings (chain, sword arc, Divine Dog, Toad, Nue,
// Rabbit Escape + hop, Great Serpent, Max Elephant, Shadow Step, double jump, ultimate cut-in + domain) → profile → KO →
// victory → rematch → defeat → intro skip. Then the Mahoraga intro showcase (pool index forced on a harness page).
// Screenshots → docs/megumi/visual_*.png      node harness/megumi_visual.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const HP = 1000, KEY = 'megumi_fushiguro'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], log = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const shot = (n, p = page) => p.screenshot({ path: `docs/megumi/visual_${n}.png` })
const S = () => page.evaluate(() => __harness.state())
async function click(re) { const r = await page.evaluate(src => { const re = new RegExp(src), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
    for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 90; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) } return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState()))); await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r }
async function findChar(key) { const seen = [], path = []; for (let row = 0; row < 6; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  for (const dir of path) { const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(60); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen } }
  return { seen, missing: true } }
// universe cards carry no menu id and the grid (3 wide) does not wrap: reach card u by row / column, then real-click it
async function uni(u) { const r = await page.evaluate(u => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 12; i++) { __harness.padNav({ up: true }); __harness.padNav({ left: true }) }
    for (let i = 0; i < Math.floor(u / 3); i++) __harness.padNav({ down: true }); for (let i = 0; i < u % 3; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, u)
  await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(80); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r }
const JJK = 11   // "Jujutsu Kaisen" in the alphabetical card order (verified on screen: docs/megumi/visual_02_universes.png)
const G = () => page.evaluate(() => { const H = __harness.megumiTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), hud: H.hud(), proj: H.projectiles() } })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); await click('^easy$')
  await shot('02_universes')
  // universe cards carry no menu id: visit each card with the pad cursor + real mouse click until the grid lists Megumi
  let g = { missing: true }
  for (const u of [11, ...Array.from({ length: 24 }, (_, i) => i).filter(i => i !== 11)]) { if (!g.missing) break   // 11 = Jujutsu Kaisen (alphabetical card order); the rest are a fallback
    const r = await page.evaluate(u => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 12; i++) { __harness.padNav({ up: true }); __harness.padNav({ left: true }) }   // the universe grid is 3 wide and does not wrap
      for (let i = 0; i < Math.floor(u / 3); i++) __harness.padNav({ down: true }); for (let i = 0; i < u % 3; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, u)
    if (r.idx !== u) break
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(80); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450)
    if ((await S()).gameState !== 'selectCharacter') continue
    g = await findChar(KEY); if (g.missing) { await page.evaluate(() => __harness.nav.back()); await page.waitForTimeout(450) } else log.universeIdx = u
  }
  await page.waitForTimeout(250)
  log.roster = g.seen; ck('Jujutsu Kaisen roster lists megumi_fushiguro', !g.missing, JSON.stringify(g.seen)); await page.waitForTimeout(250)
  log.detail = await page.evaluate(() => __harness.selectDetail()); await shot('03_select_megumi')
  ck(`select detail: Megumi Fushiguro, HP ${HP}`, log.detail?.key === KEY && log.detail.stats?.maxHealth === HP, JSON.stringify(log.detail))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  log.skinState = await page.evaluate(() => __harness.padMenuState()); await shot('04_skin_select')
  ck('skin select offers Default + 10 skins', log.skinState.gameState === 'selectSkin' && log.skinState.count >= 11, JSON.stringify(log.skinState))
  const sk = await page.evaluate(() => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 20 && __harness.padMenuState().idx !== 3; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } })
  await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('05_skin_hover'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  if ((await S()).gameState === 'selectUniverse' || (await page.evaluate(() => __harness.padMenuState())).gameState === 'selectUniverse') await uni(JJK)
  if ((await S()).gameState === 'selectCharacter') { const k = await findChar('gojo'); if (!k.missing) { await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500) } else await click('.*'); if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') await click('.*') }
  await page.waitForTimeout(500); log.preStage = await page.evaluate(() => __harness.padMenuState()); await shot('06_stage_select')
  if (log.preStage.gameState === 'selectStage') await click('.*')
  for (let i = 0; i < 80; i++) { const st = await page.evaluate(() => { const f = __harness.megumiTest?.raw(); return f ? { p: !!f._introPlaying, k: f._introRevealFrame || 0, act: f._lastSpriteAction, v: f._introVariant } : null })
    if (st?.p && !log.introSeen) { log.introSeen = true; log.introActions = [] }
    if (st?.p) log.introActions.push(st.act)
    if (st?.p && st.k > 40) { await shot('07a_intro_card'); log.introCard = st; break } await page.waitForTimeout(60) }
  ck('Megumi intro plays supplied frames (sign or Mahoraga variant) with the name card', log.introSeen && (log.introActions || []).some(a => /^intro/.test(a)) && !!log.introCard, JSON.stringify({ seen: log.introSeen, acts: [...new Set(log.introActions || [])], card: log.introCard }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(700)
  let s = await G(); log.match = { p1: s.a.key, skin: s.a.skin, tag: s.a.tag, p2: s.b.key }; await shot('07_match_start')
  log.tag = s.a.tag; ck('normal launch: Megumi in a real match with a chosen (non-default) skin vs a CPU', s.a.key === KEY && !!s.a.tag && s.a.skin?.startsWith('mg_') && !!s.b.key, JSON.stringify(log.match))
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const place = (gap, flip) => page.evaluate(([gap, flip]) => { const H = __harness.megumiTest, a = H.raw(), b = H.raw('p2'); __harness.setRoundTimer(5400); a.x = 1300; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    a.energy = 100; a.health = a.maxHealth; b.health = b.maxHealth; b.vx = 0; b.vy = 0; b.isFlying = false; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; a.hitstun = 0; b.attacking = false; b.currentAttack = null; b.isBlocking = false; b._forceGuard = false; b.attackCooldown = 9999; b.hitstun = 9999; b.y = a.y; b.onGround = true; b.grounded = true   // CPU held (Robin's visual run does the same)
  }, [gap, flip])
  const freeze = () => page.evaluate(() => { const b = __harness.megumiTest.raw('p2'); b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null })
  const press = async (keys, wait, holdMs = 40) => { for (const k of keys.slice(0, -1)) await page.keyboard.down(k); if (keys.length > 1) await page.waitForTimeout(16); await page.keyboard.down(keys.at(-1));   // direction first, then the button (inside the 3 f Up grace)
    await page.waitForTimeout(holdMs); for (const k of keys) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }
  const ready = async () => { for (let i = 0; i < 120; i++) { const q = await G(); if (q.a.grounded && !q.a.attack && !q.ult.active && !q.a.s?.summon) return; await freeze(); await page.waitForTimeout(40) } }
  let ultDone = 0
  for (const flip of [false, true]) { const f = flip ? 'L' : 'R', fw = flip ? 'a' : 'd', bk = flip ? 'd' : 'a'
    await ready(); await place(80, flip); await page.waitForTimeout(150); await press(['j'], 110); await press(['j'], 130); await press(['j'], 160); await shot(`08_${f}_chain`); await page.waitForTimeout(500)
    await ready(); await place(110, flip); await page.waitForTimeout(150); await press(['k'], 230); await shot(`09_${f}_sword_arc`); await page.waitForTimeout(500)
    await ready(); await place(320, flip); await page.waitForTimeout(150); await press(['l'], 330); await shot(`10_${f}_divine_dog`); await page.waitForTimeout(700)
    await ready(); await place(170, flip); await page.waitForTimeout(150); await press([fw, 'l'], 330); await shot(`11_${f}_toad`); await page.waitForTimeout(700)
    await ready(); await place(120, flip); await page.waitForTimeout(150); await press(['w', 'l'], 380); await shot(`12_${f}_nue`); await page.waitForTimeout(700)
    await ready(); await place(300, flip); await page.waitForTimeout(150); await press(['s', 'l'], 300); await shot(`13_${f}_rabbits`); await press([bk], 160); await shot(`14_${f}_rabbit_hop`); await page.waitForTimeout(500)
    await ready(); await place(200, flip); await page.waitForTimeout(150); await press([bk, 'l'], 420); await shot(`15_${f}_serpent_warning`); await page.waitForTimeout(150); await shot(`16_${f}_serpent`); await page.waitForTimeout(600)
    await ready(); await place(260, flip); await page.waitForTimeout(150); await press(['s', 'k'], 500); await shot(`17_${f}_elephant_sign`); await page.waitForTimeout(400); await shot(`18_${f}_elephant_water`); await page.waitForTimeout(1200)
    await ready(); await place(500, flip); await page.waitForTimeout(150); await page.keyboard.down('p'); await page.waitForTimeout(50); await press([fw], 220); await page.keyboard.up('p'); await shot(`19_${f}_shadow_step`); await page.waitForTimeout(400)
    await ready(); await place(500, flip); await page.waitForTimeout(150); await press(['w'], 0); for (let i = 0; i < 40; i++) { const q = await G(); if (!q.a.grounded && !q.a.jumpHeld) break; await page.waitForTimeout(20) } await press(['w'], 60); await shot(`20_${f}_double_jump`)   // second press once airborne with the jump latch released; await page.waitForTimeout(900)
    s = await G(); const st = s.a.s?.stats || {}
    ck(`real-time: Dog / Toad / Nue / Rabbit+hop / Serpent / Elephant / Shadow Step / double jump all fired (${f})`, st.dog >= 1 && st.toad >= 1 && st.nue >= 1 && st.rabbit >= 1 && st.hops >= 1 && st.serpent >= 1 && st.elephant >= 1 && st.steps >= 1 && st.dj >= 1, JSON.stringify(st))
    for (let i = 0; i < 60 && !((await G()).a.grounded && !(await G()).a.attack); i++) await page.waitForTimeout(50)
    await ready(); await place(120, flip); await page.waitForTimeout(250); await page.evaluate(() => { const b = __harness.megumiTest.raw('p2'); b.hitstun = 60; b.isBlocking = false }); await press(['u'], 0)   // CPU held (as Robin's visual run does) so the live AI cannot step out of the lunge
    let ult = false; for (let i = 0; i < 80; i++) { await page.waitForTimeout(50); if ((await G()).ult.active) { ult = true; break } }
    if (ult) { await page.waitForTimeout(200); await shot(`21_${f}_ult_cutin`); await page.waitForTimeout(700); await shot(`22_${f}_ult_domain`); await page.waitForTimeout(500); await shot(`23_${f}_ult_totality`); await page.waitForTimeout(700); await shot(`24_${f}_ult_elephant`); await page.waitForTimeout(500); await shot(`25_${f}_ult_shadow`) }
    ck(`real-time ultimate captured the opener (${f})`, ult); for (let i = 0; i < 120 && (await G()).ult.active; i++) await page.waitForTimeout(100)
    s = await G(); ck(`ultimate completed and state restored (${f})`, !s.ult.active && s.a.s.stats.ultDone > ultDone && !s.a.attack, JSON.stringify({ st: s.a.s.stats.ultDone })); ultDone = s.a.s.stats.ultDone
  }
  log.profile = await page.evaluate(() => { const H = __harness.megumiTest, a = H.raw(), b = H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const time = fn => { const t0 = performance.now(); fn(); return performance.now() - t0 }
    const setup = () => { H.reset(); a.x = 1300; b.x = 1500; b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null; a.hitstun = 0; a.health = a.maxHealth; b.health = b.maxHealth; a.energy = 100; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0 }
    setup(); const idle = time(() => step(600)) / 600
    const pass = () => { for (let i = 0; i < 6; i++) { setup(); H.move('mDog'); step(60); a.energy = 100; H.move('mToad'); step(60); a.energy = 100; H.move('mNue'); step(60); a.energy = 100; H.move('mSerpent'); step(70); a.energy = 100; H.move('mElephant'); step(130) } }
    pass(); const cache0 = H.fxCache(); const sum = time(pass) / (6 * 380)
    setup(); b.x = 1410; H.move('ultOpen'); const ultT = time(() => step(320)) / 320
    return { msPerFrameIdle: +idle.toFixed(3), msPerFrameSummons: +sum.toFixed(3), msPerFrameUlt: +ultT.toFixed(3), fxCacheBefore: cache0, fxCacheAfter: H.fxCache(), fxEntries: a._megumi?.fx?.length || 0, ghosts: a._megumi?.ghosts?.length || 0, projectiles: H.allProjectiles() } })
  ck('profile: second summon pass adds no cached images; FX list (≤ 12) and echoes (≤ 4) bounded', log.profile.fxCacheAfter === log.profile.fxCacheBefore && log.profile.fxEntries <= 12 && log.profile.ghosts <= 4, JSON.stringify(log.profile))
  ck('profile: summon / ultimate frames within 3x idle cost or under 8 ms', log.profile.msPerFrameSummons < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.msPerFrameUlt < Math.max(8, log.profile.msPerFrameIdle * 3), JSON.stringify(log.profile))
  await page.evaluate(() => { __harness.megumiTest.reset(); __harness.megumiTest.raw('p2').hitstun = 0 })
  for (let round = 0; round < 3; round++) {
    if ((await S()).gameState === 'victory') break
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
    await page.evaluate(() => { const a = __harness.megumiTest.raw(), b = __harness.megumiTest.raw('p2'); a.health = a.maxHealth; a.hitstun = 0; a.hitstop = 0; a.attackCooldown = 0; a.attacking = false; a.currentAttack = null; a.vx = 0; b.health = 1; b.x = a.x + 70 * (a.facing || 1); b.y = a.y; b.vx = 0; b.vy = 0; b.onGround = true; b.invulnTimer = 0; b.hitstun = 120; b.isBlocking = false; b.attacking = false; b.currentAttack = null })
    await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500); await shot(`26_ko_${round}`)
    await page.waitForFunction(() => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness.megumiTest.raw('p2').health > 1), null, { timeout: 45000 })
  }
  ck('victory screen reached', (await S()).gameState === 'victory'); await page.waitForTimeout(900); await shot('27_victory')
  await page.keyboard.press('r'); await page.waitForFunction(() => __harness.state().gameState === 'battle' || __harness.state().gameState === 'intro', null, { timeout: 30000 })
  s = await G()
  ck('rematch: Megumi, same skin, full HP, no summon / rabbits / ultimate / stocks', s.a.key === KEY && s.a.tag === log.tag && !s.a.s?.summon && !s.a.s?.rabbits && !(s.a.s?.route?.stocks) && s.proj.length === 0 && !s.ult.active && s.a.hp === HP, JSON.stringify({ tag: s.a.tag, hp: s.a.hp, s: s.a.s && { summon: s.a.s.summon, stocks: s.a.s.route?.stocks } }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(300); await shot('28_rematch')
  await page.evaluate(() => { const a = __harness.megumiTest.raw(), b = __harness.megumiTest.raw('p2'); a.health = 1; a.hitstun = 0; a.isBlocking = false; a._forceGuard = false; a.invulnTimer = 0; b.x = a.x + 80 * (a.facing || 1); b.facing = -(a.facing || 1); b.attackCooldown = 0; b.attacking = false; b.currentAttack = null })
  for (let i = 0; i < 80 && (await G()).a.hp > 0; i++) await page.waitForTimeout(100)
  if ((await G()).a.hp <= 0) { await page.waitForTimeout(700); await shot('29_megumi_defeat'); log.defeat = await page.evaluate(() => __harness.megumiTest.state()?.action) }
  // intro skip: skipToBattle clears the intro / card and leaves no advantage
  await page.goto(server.base + `/index.html?harness=1&p1=${KEY}&p2=${KEY}&seed=4242`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.megumiTest)
  const skp = await page.evaluate(() => { __harness.start(); for (let i = 0; i < 30; i++) __harness.luffyTest.step(1); const a = __harness.megumiTest.raw(), during = { intro: !!a._introPlaying, gs: __harness.state().gameState }
    __harness.skipToBattle(); __harness.luffyTest.step(2); const s = __harness.megumiTest.state(); return { during, after: { intro: s.intro, energy: s.energy, hp: s.hp, atk: s.attack?.name || null, summon: !!s.s?.summon } } })
  ck('intro is skippable: skipToBattle clears the intro / card, no gameplay advantage', !skp.after.intro && !skp.after.atk && !skp.after.summon && skp.after.hp === HP, JSON.stringify(skp))
  // MAHORAGA intro showcase: the intro pool's second entry (forced here by pinning Math.random high during the pick)
  const mp = await browser.newPage({ viewport: { width: 1280, height: 720 } }); mp.on('pageerror', e => errors.push(e.message))
  await mp.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await mp.goto(server.base + `/index.html?harness=1&p1=${KEY}&p2=gojo&seed=777`, { waitUntil: 'load' }); await mp.waitForFunction(() => window.__harness?.megumiTest)
  await mp.evaluate(() => { const r = Math.random; Math.random = () => 0.99; __harness.start(); Math.random = r })
  const mh = []; for (let k = 0; k < 240; k += 4) { const st = await mp.evaluate(() => { __harness.luffyTest.step(4); const f = __harness.megumiTest.raw(); return { p: !!f._introPlaying, v: f._introVariant, k: f._introRevealFrame || 0, act: f._lastSpriteAction } }); mh.push(st)
    if (st.k >= 60 && st.k < 64) await shot('30_mahoraga_sign', mp); if (st.k >= 120 && st.k < 124) await shot('31_mahoraga_emerge', mp); if (st.k >= 180 && st.k < 184) await shot('32_mahoraga_slash', mp) }
  const drawn = await mp.evaluate(() => __harness.megumiTest.fxCache())
  log.mahoraga = mh.filter((_, i) => i % 6 === 0)
  ck('Mahoraga intro showcase: variant introMahoraga plays (presentation only), then the settle pose', mh.some(x => x.v === 'introMahoraga' && x.p) && mh.some(x => x.act === 'introMahoraga') && drawn > 0, JSON.stringify(log.mahoraga))
  await mp.close()
  ck('no browser runtime errors', errors.length === 0, JSON.stringify(errors))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally { log.passes = pass; log.failures = fail; log.errors = errors; fs.writeFileSync('docs/megumi/visual_results.json', JSON.stringify(log, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
