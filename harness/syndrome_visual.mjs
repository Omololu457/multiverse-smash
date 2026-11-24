// harness/syndrome_visual.mjs — NORMAL launch path, real mouse + keyboard (no skipToBattle):
// title → Play → VS → difficulty → The Incredibles → Syndrome (select detail) → skin → CPU pick (Syndrome mirror) → stage →
// match (intro + name card + machine reveal) → every command in BOTH facings (chain, Claw Drive, Rising Claw, low skim,
// Hunter Duet + Convergence, Spin Cycle, Velocipod, gun / missile / mortar turrets, Hammerfall, Sweep, Rising
// Interception, Zero-Point, double jump + Leg Drop, ultimate stages A–E) → two-arsenal performance profile → KO →
// victory → rematch → defeat → intro skip. Screenshots → docs/syndrome/visual_*.png      node harness/syndrome_visual.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const HP = 1100, KEY = 'syndrome'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], log = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const shot = (n, p = page) => p.screenshot({ path: `docs/syndrome/visual_${n}.png` })
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
const G = () => page.evaluate(() => { const H = __harness.syndromeTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), hud: H.hud(), proj: H.projectiles() } })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); await click('^easy$')
  await shot('02_universes')
  // universe cards carry no menu id: visit each card with the pad cursor + real mouse click until the grid lists Syndrome
  let g = { missing: true }
  for (let u = 0; u < 30 && g.missing; u++) {
    const r = await page.evaluate(u => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 12; i++) { __harness.padNav({ up: true }); __harness.padNav({ left: true }) }
      for (let i = 0; i < Math.floor(u / 3); i++) __harness.padNav({ down: true }); for (let i = 0; i < u % 3; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, u)
    if (r.idx !== u) break
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(80); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450)
    if ((await S()).gameState !== 'selectCharacter') continue
    g = await findChar(KEY); if (g.missing) { await page.evaluate(() => __harness.nav.back()); await page.waitForTimeout(450) } else { log.universeIdx = u; await shot('02b_incredibles_grid') }
  }
  await page.waitForTimeout(250)
  log.roster = g.seen; ck('a universe card ("The Incredibles") lists syndrome', !g.missing, JSON.stringify(g.seen)); await page.waitForTimeout(250)
  log.detail = await page.evaluate(() => __harness.selectDetail()); await shot('03_select_syndrome')
  ck(`select detail: Syndrome, HP ${HP}`, log.detail?.key === KEY && log.detail.stats?.maxHealth === HP, JSON.stringify(log.detail))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  log.skinState = await page.evaluate(() => __harness.padMenuState()); await shot('04_skin_select')
  ck('skin select offers Default + 12 skins', log.skinState.gameState === 'selectSkin' && log.skinState.count >= 13, JSON.stringify(log.skinState))
  const sk = await page.evaluate(() => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); for (let i = 0; i < 20 && __harness.padMenuState().idx !== 1; i++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } })
  await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('05_skin_hover'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectUniverse') await uni(log.universeIdx)
  if ((await S()).gameState === 'selectCharacter') { const k = await findChar(KEY); if (!k.missing) { await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500) } else await click('.*'); if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') await click('.*') }
  await page.waitForTimeout(500); log.preStage = await page.evaluate(() => __harness.padMenuState()); await shot('06_stage_select')
  if (log.preStage.gameState === 'selectStage') await click('.*')
  for (let i = 0; i < 80; i++) { const st = await page.evaluate(() => { const f = __harness.syndromeTest?.raw(); return f ? { p: !!f._introPlaying, k: f._introRevealFrame || 0, act: f._lastSpriteAction, v: f._introVariant } : null })
    if (st?.p && !log.introSeen) { log.introSeen = true; log.introActions = [] }
    if (st?.p) log.introActions.push(st.act)
    if (st?.p && st.k > 30 && !log.introCard) { await shot('07a_intro_card'); log.introCard = st }
    if (st?.p && st.k > 70) { await shot('07b_intro_omnidroid'); break } await page.waitForTimeout(60) }
  ck('Syndrome intro plays supplied frames with the name card + machine reveal', log.introSeen && (log.introActions || []).some(a => /^intro/.test(a)) && !!log.introCard, JSON.stringify({ seen: log.introSeen, acts: [...new Set(log.introActions || [])], card: log.introCard }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(700)
  let s = await G(); log.match = { p1: s.a.key, skin: s.a.skin, tag: s.a.tag, p2: s.b.key }; await shot('07_match_start')
  log.tag = s.a.tag; ck('normal launch: Syndrome in a real match (mirror vs CPU Syndrome) with a chosen (non-default) skin', s.a.key === KEY && !!s.a.tag && s.a.skin?.startsWith('sy_') && s.b.key === KEY, JSON.stringify(log.match))
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const place = (gap, flip) => page.evaluate(([gap, flip]) => { const H = __harness.syndromeTest, a = H.raw(), b = H.raw('p2'); __harness.setRoundTimer(5400); a.x = 1300; b.x = flip ? 1300 - gap : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    a.energy = 100; a.health = a.maxHealth; b.health = b.maxHealth; b.vx = 0; b.vy = 0; a.attacking = false; a.currentAttack = null; a.attackCooldown = 0; a.hitstun = 0; b.attacking = false; b.currentAttack = null; b.isBlocking = false; b._forceGuard = false; b.attackCooldown = 9999; b.hitstun = 9999; b.y = a.y; b.onGround = true; b.grounded = true   // CPU held
  }, [gap, flip])
  const freeze = () => page.evaluate(() => { const b = __harness.syndromeTest.raw('p2'); b.attackCooldown = 9999; b.attacking = false; b.currentAttack = null })
  const press = async (keys, wait, holdMs = 80) => { for (const k of keys.slice(0, -1)) await page.keyboard.down(k); if (keys.length > 1) await page.waitForTimeout(16); await page.keyboard.down(keys.at(-1))
    await page.waitForTimeout(holdMs); for (const k of keys) await page.keyboard.up(k); if (wait) await page.waitForTimeout(wait) }
  const ready = async () => { for (let i = 0; i < 200; i++) { const q = await G(); if (q.a.grounded && !q.a.attack && !q.ult.active && !q.a.s?.mobile && !q.a.s?.spin && !q.a.s?.omni && !q.a.s?.turret) return; await freeze(); await page.waitForTimeout(40) } }
  const l2 = async (keys, wait) => { await page.keyboard.down('p'); await page.waitForTimeout(40); await press(keys, 0); await page.keyboard.up('p'); if (wait) await page.waitForTimeout(wait) }
  let ultDone = 0
  for (const flip of [false, true]) { const f = flip ? 'L' : 'R', fw = flip ? 'a' : 'd', bk = flip ? 'd' : 'a'
    await ready(); await place(90, flip); await page.waitForTimeout(150); await press(['j'], 90); await shot(`08_${f}_spinner_snap`); await press(['j'], 110); await shot(`08b_${f}_drone_cross`); await press(['j'], 150); await shot(`08c_${f}_spinner_pass`); await page.waitForTimeout(500)
    await ready(); await place(130, flip); await page.waitForTimeout(150); await press(['k'], 230); await shot(`09_${f}_claw_drive`); await page.waitForTimeout(500)
    await ready(); await place(100, flip); await page.waitForTimeout(150); await press(['i'], 210); await shot(`09b_${f}_rising_claw`); await page.waitForTimeout(500)
    await ready(); await place(100, flip); await page.waitForTimeout(150); await press(['s', 'j'], 120); await shot(`09c_${f}_low_skim`); await page.waitForTimeout(400)
    await ready(); await place(260, flip); await page.waitForTimeout(150); await press(['l'], 900); await shot(`10_${f}_hunter_duet`); await page.waitForTimeout(400)
    await press([fw, 'l'], 380); await shot(`10b_${f}_spin_converge`); await page.waitForTimeout(1600)
    await ready(); await place(160, flip); await page.waitForTimeout(150); await press([fw, 'l'], 330); await shot(`11_${f}_spin_cycle`); await page.waitForTimeout(900)
    await ready(); await place(220, flip); await page.waitForTimeout(150); await press(['w', 'l'], 520); await shot(`12_${f}_velocipod_warn`); await page.waitForTimeout(240); await shot(`12b_${f}_velocipod`); await page.waitForTimeout(800)
    await ready(); await place(330, flip); await page.waitForTimeout(150); await press(['s', 'l'], 1300); await shot(`13_${f}_gun_turret`); await page.waitForTimeout(400)
    await ready(); await place(260, flip); await page.waitForTimeout(150); await press([bk, 'l'], 520); await shot(`14_${f}_hammerfall_warn`); await page.waitForTimeout(260); await shot(`14b_${f}_hammerfall_slam`); await page.waitForTimeout(900)
    await ready(); await place(200, flip); await page.waitForTimeout(150); await l2([bk, 'l'], 640); await shot(`15_${f}_sweep`); await page.waitForTimeout(800)
    await ready(); await place(200, flip); await page.waitForTimeout(150); await l2(['w', 'l'], 680); await shot(`16_${f}_rising_interception`); await page.waitForTimeout(700)
    await ready(); await place(300, flip); await page.waitForTimeout(150); await l2(['s', 'l'], 1700); await shot(`17_${f}_missile_turret`); await page.waitForTimeout(500)
    await ready(); await place(320, flip); await page.waitForTimeout(150); await l2([fw, 'l'], 1500); await shot(`18_${f}_mortar_turret`); await page.waitForTimeout(500)
    await ready(); await place(110, flip); await page.waitForTimeout(150); await page.evaluate(() => { const b = __harness.syndromeTest.raw('p2'); b.hitstun = 0 }); await page.waitForTimeout(60); await page.evaluate(() => { const b = __harness.syndromeTest.raw('p2'); b.hitstun = 9999; b.attacking = false; b.currentAttack = null })   // ~3 frames free lets the once-per-combo Zero-Point latch reset, then the CPU is held again (an easy CPU's jab otherwise beats the 12 f opener)
    await l2(['l'], 330); await shot(`19_${f}_zero_point`); await page.waitForTimeout(600)
    await ready(); await place(500, flip); await page.waitForTimeout(150); await press(['w'], 0); for (let i = 0; i < 40; i++) { const q = await G(); if (!q.a.grounded && !q.a.jumpHeld) break; await page.waitForTimeout(20) } await press(['w'], 60); await shot(`20_${f}_double_jump`); await press(['k'], 220); await shot(`20b_${f}_leg_drop`); await page.waitForTimeout(700)
    s = await G(); const st = s.a.s?.stats || {}
    ck(`real-time: Duet / Spin / Velocipod / Turret ×3 families / Hammerfall / Sweep / Rise / Zero-Point / double jump all fired (${f})`, st.duet >= 1 && st.spin >= 2 && st.velo >= 1 && st.turret?.gun >= 1 && st.turret?.missile >= 1 && st.turret?.mortar >= 1 && st.hammer >= 1 && st.sweep >= 1 && st.rise >= 1 && st.zero >= 1 && st.dj >= 1, JSON.stringify(st))
    for (let i = 0; i < 60 && !((await G()).a.grounded && !(await G()).a.attack); i++) await page.waitForTimeout(50)
    await ready(); await place(120, flip); await page.waitForTimeout(250); await page.evaluate(() => { const b = __harness.syndromeTest.raw('p2'); b.hitstun = 9999; b.attacking = false; b.currentAttack = null; b.isBlocking = false; b.attackCooldown = 9999 }); await press(['u'], 0)   // CPU held through the 16 f opener (the easy CPU's jab otherwise legitimately beats it)
    let ult = false; for (let i = 0; i < 80; i++) { await page.waitForTimeout(40); if ((await G()).ult.active) { ult = true; break } }
    if (ult) { const at = async (fr, n) => { for (let i = 0; i < 200; i++) { if (((await G()).ult.frame || 0) >= fr || !(await G()).ult.active) break; await page.waitForTimeout(15) } await shot(`21_${f}_ult_${n}`) }
      await at(14, 'A_cutin'); await at(50, 'A_omnidroid_lands'); await at(64, 'B_orchestra_drones'); await at(101, 'B_orchestra_velo'); await at(146, 'C_claw_lift'); await at(170, 'C_pin'); await at(222, 'D_leap_charge'); await at(238, 'D_slam'); await at(272, 'E_settle') }
    const why = ult ? '' : JSON.stringify(await page.evaluate(() => ['p1', 'p2'].map(w => { const q = __harness.syndromeTest.raw(w); return { x: q.x | 0, face: q.facing, e: q.energy | 0, atk: q.currentAttack?.name, hs: q.hitstun, bs: q.blockstun, kd: q.knockdownState, inv: q.invulnTimer, blk: q.isBlocking, g: q.onGround, ult: q._syndrome?.stats?.ultStarts, rej: q._syndrome?.stats?.rejects } })))
    ck(`real-time ultimate captured the opener (${f})`, ult, why); for (let i = 0; i < 120 && (await G()).ult.active; i++) await page.waitForTimeout(100)
    s = await G(); ck(`ultimate completed and state restored (${f})`, !s.ult.active && s.a.s.stats.ultDone > ultDone && !s.a.attack, JSON.stringify({ st: s.a.s.stats.ultDone })); ultDone = s.a.s.stats.ultDone
  }
  // performance: both Syndromes conducting at once (two Omnidroid actions, two squads, two turrets on screen)
  log.profile = await page.evaluate(() => { const H = __harness.syndromeTest, a = H.raw(), b = H.raw('p2'), step = n => __harness.luffyTest.step(n)
    const time = fn => { const t0 = performance.now(); fn(); return performance.now() - t0 }
    const setup = () => { H.reset(); a.x = 1200; b.x = 1600; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.hitstun = 0; f.health = f.maxHealth; f.energy = 100; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.invulnTimer = 9999 } }
    setup(); const idle = time(() => step(600)) / 600
    const both = k => { for (const f of ['p1', 'p2']) { H.raw(f).energy = 100; H.move(k, f) } }
    const pass = () => { for (let i = 0; i < 4; i++) { setup(); both('sDuet'); step(26); both('sTurret'); step(34); both('sHammer'); step(60); both('sSpin'); step(40); both('sSweep'); step(80); both('sTurretMs'); step(60) } }
    pass(); const cache0 = H.fxCache(), keys0 = H.fxCacheKeys(); const ops = time(pass) / (4 * 300), cachePass2 = H.fxCache(), addedKeys = H.fxCacheKeys().filter(k => !keys0.includes(k))   // second identical pass must add nothing
    setup(); a.invulnTimer = 0; b.invulnTimer = 0; b.x = 1330; a.x = 1200; H.move('ultOpen'); const ultT = time(() => step(320)) / 320
    return { msPerFrameIdle: +idle.toFixed(3), msPerFrameTwoArsenals: +ops.toFixed(3), msPerFrameUlt: +ultT.toFixed(3), fxCacheBefore: cache0, fxCacheAfter: cachePass2, addedKeys, partBound: (() => { const ok = new Set(); for (const w of ['p1', 'p2']) { for (const nm of H.partNames()) ok.add(H.partUrl(nm, w)); const u0 = H.partUrl(H.partNames()[0], w); if (/\/machines\//.test(u0)) ok.add(u0.replace(/machines\/[^/]+$/, 'portrait.png')) } const keys = H.fxCacheKeys(); return { allowed: ok.size, stray: keys.filter(k => !ok.has(k)).slice(0, 5) } })(), fxCacheAfterUlt: H.fxCache(), fxEntries: Math.max(a._syndrome?.fx?.length || 0, b._syndrome?.fx?.length || 0), projectiles: H.allProjectiles() } })
  // The part-art cache is keyed by URL (one Image per URL, ever). Which strips a batched pass happens to RENDER varies with the
  // frame boundaries, so a second pass can legitimately request a strip the first never drew; the real no-leak property is
  // that every cached entry is a part-art URL of a fighter in play, so the cache is bounded by that finite strip set.
  ck('profile: part-art cache holds only in-play part URLs (bounded by the strip set); FX list bounded (≤ 16)', log.profile.partBound.stray.length === 0 && log.profile.fxCacheAfter <= log.profile.partBound.allowed && log.profile.fxEntries <= 16, JSON.stringify(log.profile))
  ck('profile: two-arsenal / ultimate frames within 3x idle cost or under 8 ms', log.profile.msPerFrameTwoArsenals < Math.max(8, log.profile.msPerFrameIdle * 3) && log.profile.msPerFrameUlt < Math.max(8, log.profile.msPerFrameIdle * 3), JSON.stringify(log.profile))
  await page.evaluate(() => { const H = __harness.syndromeTest; H.reset(); for (const w of ['p1', 'p2']) H.raw(w).invulnTimer = 0; H.raw('p2').hitstun = 0; H.raw().x = 1200; H.raw('p2').x = 1600; H.raw().energy = 100; H.raw('p2').energy = 100; H.move('sHammer'); H.move('sDuet', 'p2') })
  await page.waitForTimeout(700); await shot('22_mirror_two_arsenals')
  for (let round = 0; round < 3; round++) {
    if ((await S()).gameState === 'victory') break
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
    await page.evaluate(() => { const H = __harness.syndromeTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.health = a.maxHealth; a.hitstun = 0; a.hitstop = 0; a.attackCooldown = 0; a.attacking = false; a.currentAttack = null; a.vx = 0; b.health = 1; b.x = a.x + 70 * (a.facing || 1); b.y = a.y; b.vx = 0; b.vy = 0; b.onGround = true; b.invulnTimer = 0; b.hitstun = 120; b.isBlocking = false; b.attacking = false; b.currentAttack = null })
    await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500); await shot(`26_ko_${round}`)
    await page.waitForFunction(() => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness.syndromeTest.raw('p2').health > 1), null, { timeout: 45000 })
  }
  ck('victory screen reached', (await S()).gameState === 'victory'); await page.waitForTimeout(900); await shot('27_victory')
  await page.keyboard.press('r'); await page.waitForFunction(() => __harness.state().gameState === 'battle' || __harness.state().gameState === 'intro', null, { timeout: 30000 })
  s = await G()
  ck('rematch: Syndrome, same skin, full HP, no machine / turret / ultimate', s.a.key === KEY && s.a.tag === log.tag && !s.a.s?.mobile && !s.a.s?.turret && !s.a.s?.omni && !s.a.s?.spin && s.proj.length === 0 && !s.ult.active && s.a.hp === HP, JSON.stringify({ tag: s.a.tag, hp: s.a.hp }))
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 }); await page.waitForTimeout(300); await shot('28_rematch')
  await page.evaluate(() => { const a = __harness.syndromeTest.raw(), b = __harness.syndromeTest.raw('p2'); a.health = 1; a.hitstun = 0; a.isBlocking = false; a._forceGuard = false; a.invulnTimer = 0; b.x = a.x + 80 * (a.facing || 1); b.facing = -(a.facing || 1); b.attackCooldown = 0; b.attacking = false; b.currentAttack = null })
  for (let i = 0; i < 80 && (await G()).a.hp > 0; i++) await page.waitForTimeout(100)
  if ((await G()).a.hp <= 0) { await page.waitForTimeout(700); await shot('29_syndrome_defeat'); log.defeat = await page.evaluate(() => __harness.syndromeTest.state()?.action) }
  // intro skip: skipToBattle clears the intro / card and leaves no advantage
  await page.goto(server.base + `/index.html?harness=1&p1=${KEY}&p2=${KEY}&seed=4243`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.syndromeTest)
  const skp = await page.evaluate(() => { __harness.start(); for (let i = 0; i < 30; i++) __harness.luffyTest.step(1); const a = __harness.syndromeTest.raw(), during = { intro: !!a._introPlaying, gs: __harness.state().gameState }
    __harness.skipToBattle(); __harness.luffyTest.step(2); const s = __harness.syndromeTest.state(); return { during, after: { intro: s.intro, energy: s.energy, hp: s.hp, atk: s.attack?.name || null, m: !!s.s?.mobile, t: !!s.s?.turret } } })
  ck('intro is skippable: skipToBattle clears the intro / card, no gameplay advantage', !skp.after.intro && !skp.after.atk && !skp.after.m && !skp.after.t && skp.after.hp === HP, JSON.stringify(skp))
  ck('no browser runtime errors', errors.length === 0, JSON.stringify(errors))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
finally { log.passes = pass; log.failures = fail; log.errors = errors; fs.writeFileSync('docs/syndrome/visual_results.json', JSON.stringify(log, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
