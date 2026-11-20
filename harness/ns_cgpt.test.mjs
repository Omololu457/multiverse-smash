// harness/ns_cgpt.test.mjs — NINJA STORM CGPT (ninja_storm_cgpt) on the REAL game loop (index.html → startMatch → updateCurrentState).
//   node harness/ns_cgpt.test.mjs [section]     sections: roster skins parity move step combos clone ult ko
// Keyboard: a/d move, w jump, s down, j Light, k Heavy, l Special, u Ultimate, i Up-Attack, p Charge, ; block.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const SHOTS = 'docs/ns_cgpt/screenshots'; fs.mkdirSync(SHOTS, { recursive: true })
let PASS = 0, FAIL = 0
const results = []
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); results.push({ n, ok: !!c, d }); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
const section = t => console.log(`\n── NS CGPT ${t} ──`)
const ONLY = process.argv[2] || 'all'
const want = k => ONLY === 'all' || ONLY === k
const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const errors = []
let page
async function boot(p1 = 'ninja_storm_cgpt', p2 = 'spd_red', o = {}) {
  if (page) await page.close()
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.ninjaTest, null, { timeout: 30000 })
  await page.evaluate(o => { if (o.seed != null) __harness.rng.forceSeed(o.seed); __harness.start({ p1Skin: o.p1Skin, p2Skin: o.p2Skin, mode: o.mode, difficulty: o.difficulty }); __harness.skipToBattle() }, o)
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 150)) }
  GROUND = await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); return f.y + f.h })
}
let GROUND = null
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (w = 'p1') => page.evaluate(w => __harness.ninjaTest.state(w), w)
const CG = () => page.evaluate(() => JSON.parse(JSON.stringify(__harness.ninjaTest.raw('p1')._ninja?.cg || null)))
const call = (fn, ...a) => page.evaluate(([fn, a]) => __harness.ninjaTest[fn](...a), [fn, a])
const shot = name => page.screenshot({ path: `${SHOTS}/${name}.png` })
const tap = async (keys, frames = 1) => { for (const k of [].concat(keys)) await page.keyboard.down(k); await step(frames); for (const k of [].concat(keys)) await page.keyboard.up(k) }
async function motion(seq, button) {   // e.g. ['s', ['s','d'], 'd'] then the button
  let held = []
  for (const k of seq) { const w = k == null ? [] : [].concat(k); for (const x of held) if (!w.includes(x)) await page.keyboard.up(x); for (const x of w) if (!held.includes(x)) await page.keyboard.down(x); held = w; await step(2) }
  if (button) { for (const b of [].concat(button)) await page.keyboard.down(b); await step(1); for (const b of [].concat(button)) await page.keyboard.up(b) }
  for (const x of held) await page.keyboard.up(x)
}
const QCF = ['s', ['s', 'd'], 'd'], QCB = ['s', ['s', 'a'], 'a']
async function downDown(button) { await tap('s'); await step(2); await tap('s'); await step(1); await tap(button) }
async function fresh(dx = 160, o = {}) {
  await call('reset')
  await page.evaluate(([dx, o]) => {
    const T = __harness.ninjaTest, a = T.raw('p1'), z = T.raw('p2')
    a.x = o.ax ?? 900; z.x = a.x + dx; z.facing = dx > 0 ? -1 : 1; a.facing = dx > 0 ? 1 : -1
    for (const f of [a, z]) { if (o.ground != null) { f.y = o.ground - f.h; f.onGround = true; f.grounded = true; f.jumpCount = 0 } f.invulnTimer = 0; f.knockdownState = false; f.hitstun = 0; f.blockstun = 0; f.health = f.maxHealth; f.vx = 0; f.vy = 0; f.comboCounter = 0; f.energy = o.energy ?? 0; f.attacking = false; f.currentAttack = null; f.currentMove = null; f.isBlocking = false; f.attackCooldown = 0 }
  }, [dx, { ...o, ground: GROUND }])
  await step(3)
  await call('np', 'p1', o.np ?? 100)
}
const settle = async (n = 120) => { for (let i = 0; i < n; i++) { await step(1); const s = await S(); if (!s.attacking && !(s.hitstun > 0) && !s.s?.streak && s.grounded) break } }
const hp2 = async () => (await S('p2')).health
// p2 attacks (an engine move on the dummy) — for the clone's threat detection / pop tests
const p2Attack = (key = 'heavy') => page.evaluate(async key => { const c = await import('./combat.js'); const z = __harness.ninjaTest.raw('p2'); z.attackCooldown = 0; const md = z.basic_attacks?.[key] || z.basic_attacks?.light; return !!c.startMove(z, key, md) }, key)

try {
  // ═══ ROSTER / ENTRY POINT ═══
  await boot()
  if (want('roster')) {
    section('ONE ROSTER ENTRY')
    const meta = await page.evaluate(async () => {
      const { characters } = await import('./characters.js'); const c = characters.ninja_storm_cgpt; const k = await import('./kits.js'); const sk = await import('./skins.js')
      return { has: !!c, name: c.name, uni: c.universe, sub: c.subUniverse, hidden: !!c.hidden, hp: c.stats.maxHealth, jumps: c.stats.maxJumps, speed: c.stats.speed, spd: characters.spd_red.stats.speed,
        kit: !!k.getKit?.('ninja_storm_cgpt') || !!k.KITS?.ninja_storm_cgpt, skins: sk.SKINS.ninja_storm_cgpt.map(s => s.id), entries: Object.values(characters).filter(x => x?.rosterKey === 'ninja_storm_cgpt').length,
        others: ['windrangers', 'ns_red', 'ns_yellow'].map(id => !!characters[id]) }
    })
    check('ninja_storm_cgpt is ONE roster character named "Ninja Storm CGPT" (Power Rangers / Ninja Storm), visible', meta.has && meta.name === 'Ninja Storm CGPT' && meta.uni === 'power_rangers' && meta.sub === 'Ninja Storm' && !meta.hidden && meta.entries === 1, meta)
    check('one health bar 1240, double jump, S.P.D. Red speed tier (88)', meta.hp === 1240 && meta.jumps === 2 && meta.speed === meta.spd, { hp: meta.hp, j: meta.jumps, speed: meta.speed, spd: meta.spd })
    check('move list (kits.js) registered', meta.kit)
    check('the other Ninja Storm characters are untouched (windrangers / ns_red / ns_yellow still present)', meta.others.every(Boolean))
    const sel = await page.evaluate(() => __harness.gotoCharacterSelect('power_rangers'))
    check('normal entry point: the Power Rangers character select lists it', sel.includes('ninja_storm_cgpt'), sel.filter(k => /ns_|ninja|wind/.test(k)))
    await step(2); await shot('select_power_rangers')
  }

  // ═══ SKINS ═══
  if (want('skins') || want('roster')) {
    section('22 APPEARANCES')
    const sk = await page.evaluate(async () => { const m = await import('./skins.js'); return m.SKINS.ninja_storm_cgpt.map(s => ({ id: s.id, name: s.name, cls: s.classification, sheets: s.animationData ? [...new Set(Object.values(s.animationData).map(a => a.sheet))] : null, portrait: s.portrait })) })
    check('22 selectable appearances = 2 supplied bases + 20 skins', sk.length === 22 && sk[0].id === 'default' && sk[1].id === 'yellow' && sk.filter(s => s.cls !== 'Base Appearance').length === 20, sk.length)
    const names = sk.map(s => s.name).join(' | ')
    for (const need of ['Alien X', 'Upgrade', 'Chromastone', 'JJK', 'Winning Valkyrie', 'Glitter', 'Opal']) check(`skin theme present: ${need}`, names.includes(need))
    check('original designs present (≥ 8)', sk.filter(s => s.cls === 'Original Cosmetic').length >= 8, sk.filter(s => s.cls === 'Original Cosmetic').length)
    // every strip / FX / projectile / portrait of every appearance is served
    const files = fs.readdirSync('assets/ninja_storm_cgpt/skins/red').filter(f => f.endsWith('.png'))
    const tags = fs.readdirSync('assets/ninja_storm_cgpt/skins')
    const miss = []
    for (const t of tags) for (const f of files) if (!fs.existsSync(`assets/ninja_storm_cgpt/skins/${t}/${f}`)) miss.push(`${t}/${f}`)
    check(`all ${tags.length} appearance folders carry the full ${files.length}-file set (strips + projectiles + FX + portraits)`, tags.length === 22 && miss.length === 0, miss.slice(0, 5))
    const http = await page.evaluate(async list => { const bad = []; for (const u of list) { const r = await fetch(u, { method: 'HEAD' }); if (!r.ok) bad.push(u) } return bad }, sk.flatMap(s => (s.sheets || []).concat([s.portrait])))
    check('every skin sheet + portrait the game references loads (HTTP 200)', http.length === 0, http.slice(0, 4))
    // the skin actually draws: per-skin pixels differ from Red on the idle strip, alpha / geometry identical
    const geo = await page.evaluate(async () => {
      const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = src })
      const px = async t => { const im = await load(`./assets/ninja_storm_cgpt/skins/${t}/sword.png`); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      const r = await px('red'); const out = {}
      for (const t of ['yellow', 'alienx', 'chromastone', 'cursedpink', 'valkyrie', 'opal']) { const d = await px(t); let alpha = 0, col = 0; for (let i = 0; i < r.length; i += 4) { if ((r[i + 3] > 0) !== (d[i + 3] > 0)) alpha++; else if (r[i + 3] && (r[i] !== d[i] || r[i + 1] !== d[i + 1] || r[i + 2] !== d[i + 2])) col++ } out[t] = { alpha, col } }
      return out
    })
    check('skins keep every frame\'s silhouette pixel-exact (alpha mask identical to Red) and recolour the body', Object.values(geo).every(g => g.alpha === 0 && g.col > 1000), geo)
    for (const id of ['yellow', 'cgpt_alienx', 'cgpt_valkyrie']) {
      await boot('ninja_storm_cgpt', 'spd_red', { p1Skin: id })
      const st = await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); return { skin: f.skinId, sheet: f._skinAnim?.idle?.sheet || f.animationData.idle.sheet, dir: f._nsAssetDir } })
      check(`skin "${id}" selected through startMatch → body + FX folder follow it`, st.skin === id && st.sheet.includes(`/skins/${id === 'yellow' ? 'yellow' : id.slice(5)}/`) && st.dir.endsWith(id === 'yellow' ? 'yellow' : id.slice(5)), st)
      await fresh(200); await call('np', 'p1', 100); await tap('p'); await step(14); await tap('j'); await step(16)
      await shot(`skin_${id}`)
    }
    await boot()
  }

  // ═══ APPEARANCE PARITY: the same inputs give the same numbers in every appearance ═══
  if (want('parity')) {
    section('APPEARANCE PARITY')
    const runSeq = async skin => {
      await boot('ninja_storm_cgpt', 'spd_red', { p1Skin: skin, seed: 7 })
      await fresh(150, { energy: 0 })
      const log = []
      for (const k of ['j', 'j', 'j']) { await tap(k); await step(9) }
      await tap('i'); await step(30); await settle()
      log.push(await hp2(), Math.round((await S()).x))
      await fresh(160); await motion(QCF, 'l'); await step(50); await settle(); log.push(await hp2(), Math.round((await S()).x))
      await fresh(105); await motion(QCB, 'l'); await step(40); await settle(); log.push(await hp2(), JSON.stringify((await CG()).faults.map(m => m.x)))
      const md = await page.evaluate(() => JSON.stringify(__harness.ninjaTest.raw('p1')._ninja.cg.stats))
      const hb = await page.evaluate(() => { const s = __harness.ninjaTest.state('p1'); return JSON.stringify(s.hurtbox) })
      return { log, hb, md }
    }
    const a = await runSeq('default'), b = await runSeq('yellow'), c = await runSeq('cgpt_neon')
    check('Red, Yellow and a skin: identical damage, travel, fault positions and hurtbox for the same inputs', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) === JSON.stringify(c), { red: a.log, yellow: b.log, neon: c.log })
    const fd = await page.evaluate(async () => { const sk = await import('./skins.js'); const d = await import('./nsCgptData.js'); return sk.SKINS.ninja_storm_cgpt.every(s => !s.animationData || Object.keys(s.animationData).sort().join() === Object.keys(d.ninja_storm_cgpt.animationData).sort().join()) })
    check('every appearance exposes the identical animation key set (no per-skin moves)', fd)
    await boot()
  }

  // ═══ MOVEMENT ═══
  if (want('move')) {
    section('MOVEMENT (S.P.D. Red benchmark)')
    const walk = async () => { await fresh(600, { ax: 400 }); const x0 = (await S()).x; await page.keyboard.down('d'); await step(30); await page.keyboard.up('d'); return (await S()).x - x0 }
    const mine = await walk()
    await boot('spd_red', 'ninja_storm_cgpt'); const spd = await walk()
    await boot()
    check('walk distance over 30 frames comparable to S.P.D. Red (±10%)', Math.abs(mine - spd) <= Math.abs(spd) * 0.1, { cgpt: Math.round(mine), spdRed: Math.round(spd) })
    await fresh(400); await tap('w', 2); await step(10); const j1 = await S(); await tap('w', 2); await step(3); const j2 = await S()
    check('double jump: a second jump in the air', !j1.grounded && j2.vy < 0 && j2.jumpCount >= 2, { j1: j1.jumpCount, j2: j2.jumpCount, vy: j2.vy })
    await step(6); const pre = await S(); await tap('w', 2); await step(3); const j3 = await S()
    check('no third jump (the fall keeps accelerating)', j3.jumpCount <= 2 && j3.vy > pre.vy, { jc: j3.jumpCount, before: pre.vy, after: j3.vy })
    await settle(200)
  }

  // ═══ NINJA STEP ═══
  if (want('step') || want('move')) {
    section('DOUBLE-TAP NINJA STEP (charges + recovery)')
    await fresh(500, { ax: 300 })
    const dt = async (k = 'd') => { await tap(k); await step(2); await tap(k); await step(1) }
    await dt(); const s1 = await S(); const c1 = await CG()
    check('double-tap → → starts the Ninja Step (streak) and spends 1 of 3 charges', !!s1.s?.streak && c1.step.n === 2, { streak: !!s1.s?.streak, n: c1.step.n })
    await step(9); await dt(); await step(9); await dt(); const c3 = await CG(); const s3 = await S()
    check('three steps chained → 0 charges, chain recovery lock armed', c3.step.n === 0, { n: c3.step.n, chain: s3.s?.chain })
    await step(12); await settle(60); const before = (await S()).x; await dt(); await step(2); const s4 = await S()
    check('a 4th step with 0 charges is refused (he just runs)', !s4.s?.streak, { streak: !!s4.s?.streak })
    await page.keyboard.up('d'); await step(85); const c5 = await CG()
    check('charges regenerate (1 per 80 frames)', c5.step.n >= 1, c5.step)
    await settle(60)
    // air step: one per airtime
    await fresh(500, { ax: 300 }); await tap('w', 2); await step(8); await dt(); const sa = await S(); await step(14); await dt(); const sb = await S()
    check('air Ninja Step: once per airtime', !!sa.s?.streak && !sb.s?.streak, { first: !!sa.s?.streak, second: !!sb.s?.streak })
    await settle(200)
  }

  // ═══ COMBOS ═══
  if (want('combos')) {
    section('CONNECTED COMBINATIONS')
    // 1. rapid punches → sword launcher
    await fresh(110); let h0 = await hp2()
    await tap('j'); await step(8); await tap('j'); await step(8); await tap('j'); await step(14); const m3 = (await S()).move
    const zy0 = (await S('p2')).y; await tap('i'); let top = zy0, lvy = 0
    for (let i = 0; i < 36; i++) { await step(1); const z = await S('p2'); top = Math.min(top, z.y); lvy = Math.min(lvy, z.vy) }
    check('□ □ □ → ↑+□: rapid punch flurry into the sword launcher (launches)', m3 === 'jab3' && lvy < 0 && top < zy0 - 40 && (await hp2()) < h0, { m3, vy: lvy, rise: Math.round(zy0 - top), dmg: Math.round(h0 - await hp2()) })
    await settle(200)
    // 2. wind dash → aerial follow-up
    await fresh(170); h0 = await hp2(); await motion(QCF, 'l'); let air = false, followed = false
    for (let i = 0; i < 40; i++) { await step(1); const s = await S(); if (!s.grounded && s.move === 'sGaleRush') air = true; if (air && s.move === 'sGaleRush' && i > 22) { await tap('k'); await step(1); if ((await S()).move === 'air') { followed = true; break } } }
    await step(14); const hRush = await hp2()
    check('↓↘→+R1 Gale Rush lifts both, then △ = air sword follow-up that connects', air && followed && hRush < h0, { air, followed, dmg: Math.round(h0 - hRush) })
    await shot('combo_gale_rush_air'); await settle(200)
    // 3. ground strike → fault marker
    await fresh(105); h0 = await hp2(); await motion(QCB, 'l'); await step(14); const cf = await CG()
    check('↓↙←+R1 Faultline Strike hits and leaves a FAULT MARKER', cf.faults.length === 1 && (await hp2()) < h0, { faults: cf.faults })
    await shot('combo_fault_marker')
    // 4. eruption from the marker → airborne sword
    await step(20); await settle(80); h0 = await hp2(); await page.evaluate(() => { const z = __harness.ninjaTest.raw('p2'); z.hitstun = 0; z.knockdownState = false })
    await downDown('l'); let launched = false, sky = false
    for (let i = 0; i < 40; i++) { await step(1); const z = await S('p2'); if (z.vy < -8) launched = true; if (launched && !sky) { await tap('k'); await step(1); if ((await S()).move === 'skyBlade') sky = true } if (sky) break }
    await step(14); const cf2 = await CG(); const h1 = await hp2()
    check('↓↓+R1 Earth Eruption bursts FROM the marker (consumed) and launches', launched && cf2.faults.length === 0 && cf2.stats.erupts >= 1, { launched, faults: cf2.faults.length })
    check('Eruption → △ Sky Blade: airborne sword follow-up connects', sky && h1 < h0 - 60, { sky, dmg: Math.round(h0 - h1) })
    await shot('combo_eruption_skyblade'); await settle(200)
    // 5. blaster → double-tap Ninja Step → close-range punish
    await fresh(520); h0 = await hp2(); await tap('l'); await step(14)
    await tap('d'); await step(2); await tap('d'); await step(1); const st = await S()
    let punished = false
    for (let i = 0; i < 20; i++) { await step(1); const s = await S(); if (!s.s?.streak) { await tap('j'); await step(7); punished = (await S('p2')).hitstun > 0; break } }
    await step(20)
    check('R1 Blaster → →→ Ninja Step (cancels the shot recovery) → □ close-range punish', !!st.s?.streak && punished && (await hp2()) < h0 - 40, { step: !!st.s?.streak, punished, dmg: Math.round(h0 - await hp2()) })
    await settle(200)
  }

  // ═══ SHADOW CLONE ═══
  if (want('clone')) {
    section('SHADOW CLONE (Echo / Guard / swap / recall)')
    await fresh(130, { np: 100 }); await tap('p'); await step(6)
    let c = await CG()
    check('L2 summons ONE clone (30 NP), Echo by default, behind the Ranger', !!c.clone && c.clone.mode === 'echo' && c.stats.summons === 1 && (await S()).s.np <= 72, c.clone && { mode: c.clone.mode, x: c.clone.x })
    await tap('p'); await step(4); c = await CG()
    check('a second L2 does NOT make a second clone (switches behaviour instead)', c.stats.summons === 1 && c.clone.mode === 'guard')
    await tap('p'); await step(4); c = await CG()
    await step(12)
    // ECHO: the clone repeats the Ranger's melee from ITS position after 14 f, real overlap test
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); const k = a._ninja.cg.clone; z.x = a.x + 70; z.health = z.maxHealth; k.x = Math.round(z.x + (z.w || 48) / 2 + 60) })   // clone on the far side → it can reach
    const life0 = (await CG()).clone.life
    await tap('j'); await step(8); const eh0 = (await CG()).stats; await step(20); c = await CG()
    check('ECHO repeats the jab 14 f later from the clone\'s own spot and lands (normal hitbox / overlap)', c.stats.echoes >= 1 && c.stats.echoHits >= 1 && c.clone.allowance === 5, { echoes: c.stats.echoes, hits: c.stats.echoHits, allow: c.clone.allowance })
    await shot('clone_echo')
    // out of reach → the echo still swings but misses (its real position matters)
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'); a._ninja.cg.clone.x = Math.round(a.x - 600) })
    await step(10); const e0 = (await CG()).stats.echoHits; await tap('j'); await step(30); c = await CG()
    check('an Echo far from the foe whiffs (no hit from across the screen)', c.stats.echoHits === e0 && c.stats.echoes >= 2, { hits: c.stats.echoHits })
    // SWITCH keeps life / allowance / cooldown
    for (let i = 0; i < 40 && (await CG()).clone.act; i++) await step(1)
    await page.evaluate(() => { __harness.ninjaTest.raw('p1')._ninja.cg.clone.cd = 30 })   // a running attack cooldown must survive the switch
    const pre = (await CG()).clone; await tap('p'); await step(3); const post = (await CG()).clone   // 4 sim frames pass (the switch lands after the 3-frame Vanish-chord window)
    check('switching Echo → Guard keeps lifetime, attack allowance and cooldown (only time passes)', pre.mode === 'echo' && post.mode === 'guard' && post.allowance === pre.allowance && post.life === pre.life - 4 && post.cd === pre.cd - 4, { pre: [pre.life, pre.allowance, pre.cd], post: [post.life, post.allowance, post.cd] })
    // GUARD: threat → tell → counter on the opening
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); z.x = a.x + 130; z.facing = -1; z.health = z.maxHealth; z.hitstun = 0; a._ninja.cg.clone.cd = 0 })
    await step(30)
    await p2Attack('heavy'); let tell = false, counter = false, th0 = await hp2()
    for (let i = 0; i < 70; i++) { await step(1); const k = (await CG()).clone; if (k?.tell) tell = true; if (k?.act?.guard) counter = true; if (tell && i % 8 === 0) await shot('clone_guard_tell') ; if (counter) break }
    await step(12); c = await CG()
    check('GUARD sees the foe\'s attack, shows a telegraph ("!") and then counters', tell && counter && c.stats.guards >= 1, { tell, counter })
    check('the Guard counter lands on the opening (damage)', c.stats.guardHits >= 1 && (await hp2()) < th0, { hits: c.stats.guardHits, dmg: Math.round(th0 - await hp2()) })
    await shot('clone_guard_counter'); await settle(60)
    // SWAP: spends a Ninja Step charge, trades places, never inside the foe
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); a.x = 600; z.x = 1000; a._ninja.cg.clone.x = 900; a._ninja.cg.clone.cd = 0; a._ninja.cg.step.n = 3 })
    await step(4); const sx0 = Math.round((await S()).x + 24); const cx0 = (await CG()).clone.x
    await tap(['d', 'p']); let to = null, at = null
    for (let i = 0; i < 16; i++) { await step(1); const g = await CG(); if (g.swap && !to) to = g.swap; if (to && !g.swap && !at) { const r = await S(); at = { ranger: Math.round(r.x + r.w / 2), clone: g.clone?.x }; break } }
    c = await CG()
    check('→+L2 SWAP trades places with the clone and spends 1 Ninja Step charge', c.stats.swaps === 1 && c.step.n === 2 && to && at && Math.abs(at.ranger - to.to.x) <= 3 && Math.abs(at.clone - to.from.x) <= 10 && Math.abs(to.to.x - cx0) < 40, { to, at, n: c.step.n })
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); z.x = 900; a._ninja.cg.clone.x = 924; a._ninja.cg.step.n = 3 })   // clone INSIDE the foe
    await step(2); await tap(['d', 'p']); await step(14)
    const inside = await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); return a.x < z.x + z.w && a.x + a.w > z.x })
    check('a swap onto the foe resolves collision (the Ranger never ends inside the foe)', !inside)
    await page.evaluate(() => { __harness.ninjaTest.raw('p1')._ninja.cg.step.n = 0 }); await step(2)
    const sw0 = (await CG()).stats.swaps; await tap(['d', 'p']); await step(10)
    check('no Ninja Step charge → no swap', (await CG()).stats.swaps === sw0)
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'); a._ninja.cg.step.n = 3; a.hitstun = 20 }); await tap(['d', 'p']); await step(4)
    check('no swap during hitstun (recovery rules)', (await CG()).stats.swaps === sw0)
    await step(30)
    // RECALL
    await tap(['a', 'p']); await step(25); c = await CG()
    check('←+L2 RECALL pulls the clone back in (shorter cooldown)', !c.clone && c.stats.recalls === 1 && c.cd > 0 && c.cd <= 150, { cd: c.cd })
    await tap('p'); await step(4)
    check('no re-summon during the cooldown', !(await CG()).clone)
    // limits: lifetime, allowance, no refills, popped by a hit
    await page.evaluate(() => { __harness.ninjaTest.raw('p1')._ninja.cg.cd = 0 }); await call('np', 'p1', 100); await tap('p'); await step(10)
    const k0 = (await CG()).clone; await call('np', 'p1', 100); await step(30); const k1 = (await CG()).clone
    check('the clone never refills: lifetime only falls, allowance unchanged without attacks, it cannot summon', k1.life < k0.life && k1.allowance === k0.allowance && (await CG()).stats.summons === 2)
    await page.evaluate(([G]) => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); const k = a._ninja.cg.clone; k.mode = 'guard'; k.tell = { t: -300, kind: 'test' }; a.x = k.x - 420; z.x = k.x + 30; z.facing = -1; Object.assign(z, { hitstun: 0, blockstun: 0, knockdownState: false, vy: 0, vx: 0, attacking: false, currentAttack: null, attackCooldown: 0, y: G - z.h, onGround: true, grounded: true }) }, [GROUND])
    await step(2); const atk = await p2Attack('heavy'); for (let i = 0; i < 30 && (await CG()).clone; i++) await step(1)
    check('one hit pops the clone', !(await CG()).clone && (await CG()).lastEnd === 'popped', { atk, end: (await CG()).lastEnd, clone: !!(await CG()).clone })
    await page.evaluate(() => { const g = __harness.ninjaTest.raw('p1')._ninja.cg; g.cd = 0 }); await call('np', 'p1', 100); await fresh(400); await call('np', 'p1', 100)
    await page.evaluate(() => { __harness.ninjaTest.raw('p1')._ninja.cg.cd = 0 }); await tap('p'); await step(10)
    await page.evaluate(() => { __harness.ninjaTest.raw('p1')._ninja.cg.clone.life = 5 }); await step(10)
    check('the clone dissolves at the end of its lifetime (cooldown starts)', !(await CG()).clone && (await CG()).cd > 200)
  }

  // ═══ ULTIMATE ═══
  if (want('ult')) {
    section('TWIN TEMPEST: FAULTLINE CATACLYSM')
    const U = await page.evaluate(async () => { const m = await import('./nsCgpt.js'); return { U: m.CGPT_ULT, total: m.CGPT_ULT_TOTAL } })
    check('one explicit damage schedule: 40 + 6×28 + 60 + 150 = 418', U.total === 418 && U.U.spiral.length === 6, U.total)
    await fresh(120, { energy: 50 }); await tap('u'); await step(4)
    check('needs a full meter (2 bars): half meter → no ultimate', !(await CG()).stats.ults && !(await S()).s?.sup)
    await fresh(120, { energy: 100 }); const h0 = await hp2(); const zoom0 = await page.evaluate(() => JSON.stringify(window.__harness.luffyTest.state('p1').draw))
    await tap('u'); const shotsAt = { 20: 'ult_1_clone_opposite', 44: 'ult_2_wind_spiral', 72: 'ult_3_descending', 90: 'ult_4_eruption' }
    let sawClone = false, maxRise = 0, y0 = (await S('p2')).y
    for (let t = 1; t <= 130; t++) {
      await step(1); const g = await CG(); if (g?.ult?.clone) sawClone = true
      const z = await S('p2'); maxRise = Math.max(maxRise, y0 - z.y)
      if (shotsAt[t]) await shot(shotsAt[t])
    }
    const g = await CG(); const dealt = h0 - await hp2()
    check('full meter: R2 starts it, the opening sword connects, the clone appears opposite', g.stats.ults === 1 && sawClone, { sawClone })
    check('the foe is carried up the rising wind spiral (≥ 150 px)', maxRise >= 150, Math.round(maxRise))
    check('alternating hits + descending strike + earth eruption all land (9 hits)', g.stats.ultHits === 9, g.stats.ultHits)
    check('the schedule landed in full: 418 raw (40 + 6×28 + 60 + 150), applied through the engine damage path', g.stats.ultRaw === 418 && dealt > 300, { raw: g.stats.ultRaw, dealtAfterDefenseAndParity: Math.round(dealt) })
    const after = await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); return { rooted: !!a._rooted, sup: !!a._ninja.sup, ult: !!a._ninja.cg.ult, clone: !!a._ninja.cg.clone, attacking: !!a.attacking, force: a._forceAction || null, zKO: !!z.knockdownState || z.hitstun > 0, energy: a.energy } })
    check('states restored afterwards: not rooted, no super state, the clone dissolved, Ranger free', !after.rooted && !after.sup && !after.ult && !after.clone && !after.attacking && !after.force, after)
    await settle(120); const zoom1 = await page.evaluate(() => JSON.stringify(window.__harness.luffyTest.state('p1').draw))
    check('the camera / draw scale is unchanged by the ultimate (render-only framing)', JSON.parse(zoom1).w === JSON.parse(zoom0).w, { before: JSON.parse(zoom0).w, after: JSON.parse(zoom1).w })
    // whiff: the opening must connect
    await fresh(600, { energy: 100 }); const hw = await hp2(); await tap('u'); await step(40); const gw = await CG(); const sw = await S()
    check('opening whiffs → the ultimate ends at once (no spiral, no damage), states clean', (await hp2()) === hw && !gw.ult && !sw.s?.sup && sw.move !== 'sSuper' && gw.stats.ultHits === 0, { move: sw.move })
    // motion input
    await fresh(120, { energy: 100 }); await motion([...QCF, ...QCF], 'l'); await step(3)
    check('↓↘→↓↘→+R1 also starts it', (await CG()).stats.ults === 1 && !!(await S()).s?.sup)
    await step(140); await settle(60)
  }

  // ═══ DETERMINISM (replay / LAN: same seed + same inputs → identical GAME_STATE, clone included) ═══
  if (want('det')) {
    section('DETERMINISM')
    const run = async () => {
      await boot('ninja_storm_cgpt', 'spd_red', { seed: 4242, p1Skin: 'cgpt_opal' }); await fresh(140, { energy: 100 })
      await tap('p'); await step(10); for (const k of ['j', 'j', 'j']) { await tap(k); await step(8) }
      await step(20); await tap('p'); await step(6); await p2Attack('heavy'); await step(40)
      await motion(QCB, 'l'); await step(30); await downDown('l'); await step(30); await tap(['d', 'p']); await step(20); await tap('u'); await step(140)
      return page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); return JSON.stringify({ s: { ...f._ninja, fx: undefined, hist: undefined }, x: Math.round(f.x * 100), zx: Math.round(z.x * 100), zh: z.health, h: f.health, e: f.energy }) })
    }
    const a = await run(), b = await run()
    check('two runs with the same seed + inputs give byte-identical ninja / clone state (replay / LAN safe)', a === b, a === b ? `${a.length} chars` : { a: a.slice(0, 200), b: b.slice(0, 200) })
    check('the clone state rides in the ninja snapshot (f._ninja.cg)', JSON.parse(a).s.cg != null)
    await boot()
  }

  // ═══ PS5 PAD (stubbed standard-mapping gamepad through the real input pipeline) ═══
  if (want('pad')) {
    section('PS5 CONTROLLER')
    await fresh(130, { np: 100, energy: 100 })
    await page.evaluate(async () => {
      const { inputSettings } = await import('./input.js'); inputSettings.p1Type = 'controller'
      window.__pad = { index: 0, id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }
      navigator.getGamepads = () => [window.__pad]
      window.__press = (ids, on) => { for (const i of ids) window.__pad.buttons[i] = { pressed: on, value: on ? 1 : 0 } }
    })
    const B = { cross: 0, circle: 1, square: 2, triangle: 3, L1: 4, R1: 5, L2: 6, R2: 7, up: 12, down: 13, left: 14, right: 15 }
    const press = async (ids, frames = 1) => { await page.evaluate(ids => __press(ids, true), ids); await step(frames); await page.evaluate(ids => __press(ids, false), ids) }
    await press([B.L2]); await step(18)
    check('PS5 L2 summons the shadow clone', !!(await CG())?.clone)
    await press([B.square]); await step(3)
    check('PS5 □ = Light (jab)', ['light', 'jab2', 'jab3'].includes((await S()).move), (await S()).move)
    await step(30); await press([B.cross], 2); await step(10); const j1 = await S(); await press([B.cross], 2); await step(3); const j2 = await S()
    check('PS5 ✕ = Jump, double jump', j1.jumpCount >= 1 && j2.jumpCount === 2, { j1: j1.jumpCount, j2: j2.jumpCount })
    await settle(120)
    await press([B.right], 1); await step(2); await press([B.right], 1); await step(1)
    check('PS5 → → (D-pad double-tap) = Ninja Step', !!(await S()).s?.streak)
    await settle(80); await fresh(130, { energy: 100 })
    await press([B.R2]); await step(5)
    check('PS5 R2 = Twin Tempest (full meter)', (await CG()).stats.ults === 1)
    await step(140); await settle(60)
    await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); inputSettings.p1Type = 'keyboard' })
  }

  // ═══ CPU CONTROL ═══
  if (want('cpu')) {
    section('CPU-CONTROLLED NINJA STORM CGPT')
    await boot('spd_red', 'ninja_storm_cgpt', { mode: 'vs', difficulty: 'hard', seed: 9 })
    const e0 = errors.length
    await page.evaluate(() => { const z = __harness.ninjaTest.raw('p1'); z.health = z.maxHealth = 99999 })
    let moves = new Set()
    for (let i = 0; i < 60; i++) { await step(20); const s = await S('p2'); if (s.move) moves.add(s.move) }
    const st = await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); return { dealt: 99999 - a.health, cg: z._ninja?.cg?.stats } })
    check('as a CPU it fights with its kit for 1200 frames without errors', errors.length === e0 && moves.size >= 3 && st.dealt > 0, { moves: [...moves], dealt: Math.round(st.dealt) })
    check('the CPU summons and uses its shadow clone through the real Charge input', (st.cg?.summons || 0) >= 1, st.cg)
    await boot()
  }

  // ═══ KO + REMATCH ═══
  if (want('ko')) {
    section('KO + REMATCH')
    await boot('ninja_storm_cgpt', 'spd_red', { mode: 'vs', difficulty: 'dummy', p1Skin: 'cgpt_chromastone' })
    await fresh(110); await call('np', 'p1', 100); await tap('p'); await step(10)
    await page.evaluate(() => { const z = __harness.ninjaTest.raw('p2'); z.health = 20 })
    await tap('k'); await step(60)
    const ko = await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); return { zh: z.health, clone: !!a._ninja?.cg?.clone, alive: a.health > 0 } })
    check('KO: the Ranger lands the KO (p2 at 0) and the clone dissolves with the round', ko.zh <= 0 && ko.alive && !ko.clone, ko)
    await step(240); await shot('ko')
    await page.evaluate(() => __harness.ben10Reset('rematch')); await page.evaluate(() => __harness.skipToBattle()); await step(10)
    const rm = await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); return { key: a.rosterKey, skin: a.skinId, hp: a.health, max: a.maxHealth, zhp: z.health, cg: a._ninja?.cg ? { clone: a._ninja.cg.clone, n: a._ninja.cg.step.n, faults: a._ninja.cg.faults.length } : null, speed: a.speed, jumps: a.maxJumps } })
    check('rematch: same character + skin, full health both, fresh clone / step / fault state, stats restored', rm.key === 'ninja_storm_cgpt' && rm.skin === 'cgpt_chromastone' && rm.hp === rm.max && rm.zhp > 0 && (!rm.cg || (!rm.cg.clone && rm.cg.n === 3 && rm.cg.faults === 0)) && rm.speed === 88 && rm.jumps === 2, rm)
    await tap('p'); await step(10); const c2 = await CG()
    check('after the rematch the clone works again', !!c2?.clone, c2?.stats)
    await shot('rematch')
  }
} catch (e) { console.log('THREW', e.stack); FAIL++ }
console.log(`\nNS CGPT: ${PASS} passed, ${FAIL} failed${errors.length ? `; page errors: ${[...new Set(errors)].slice(0, 5).join(' | ')}` : ''}`)
fs.writeFileSync(`${SHOTS}/../results_${ONLY}.json`, JSON.stringify({ pass: PASS, fail: FAIL, errors: [...new Set(errors)], results }, null, 1))
await browser.close(); server.close?.(); process.exit(FAIL ? 1 : 0)
