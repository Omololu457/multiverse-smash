// harness/buggy_render_check.mjs — Buggy the Clown RENDER CHECK (run before every Buggy commit).
//   node harness/buggy_render_check.mjs [phase]
// Boots the real game in Chromium, P1 = Buggy vs P2 = Zoro, starts a match and proves: no page error, no blank
// screen, both fighters + HUD render, every Buggy asset loads (no 404), masked body rows render. Later phases add
// scenario checks (parts, Festival, Buggy Ball, the Super, slash nullification vs Zoro). Screenshots →
// /tmp/ms-buggy-render/.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

const PHASE = Number(process.argv[2] || 99)
const OUT = '/tmp/ms-buggy-render'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }

const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname) })
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })   // drive frames manually (deterministic)

const P1 = 'buggy', P2 = 'zoro'
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const shot = name => page.screenshot({ path: path.join(OUT, name + '.png') })
const bs = (w = 'p1') => page.evaluate(w => __harness.buggyTest.state(w), w)
const ls = (w = 'p1') => page.evaluate(w => __harness.luffyTest.state(w), w)
const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
// Real keyboard motion input for P1 (a=left d=right s=down w=up, l=Special k=Heavy j=Light). null = neutral frame.
async function motion(seq, button) {   // seq items: a key, keys held together (diagonal), or null. ROLLED like a stick:
  let held = []                          // only the keys that change are pressed / released (no accidental double-tap dash)
  for (const k of seq) {
    const want = k == null ? [] : [].concat(k)
    for (const x of held) if (!want.includes(x)) await page.keyboard.up(x)
    for (const x of want) if (!held.includes(x)) await page.keyboard.down(x)
    held = want; await step(2)
  }
  for (const x of held) await page.keyboard.up(x)
  await tap([button])
}
const QCF = ['s', ['s', 'd'], 'd'], QCB = ['s', ['s', 'a'], 'a'], DD = ['s', null, 's'], FF = ['d', null, 'd']
const canvasStats = () => page.evaluate(() => {
  const c = document.querySelector('canvas'); const x = c.getContext('2d')
  const uniq = (sx, sy, w, h) => { const d = x.getImageData(sx, sy, w, h).data, s = new Set(); for (let i = 0; i < d.length; i += 16) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return s.size }
  return { play: uniq(0, c.height * 0.3, c.width, c.height * 0.6), hud: uniq(0, 0, c.width, Math.round(c.height * 0.16)) }
})
const parts = async () => (await bs()).parts
const call = (fn, ...a) => page.evaluate(([fn, a]) => __harness.buggyTest[fn](...a), [fn, a])
const fresh = async (p2dx = 260) => {
  await page.evaluate(() => __harness.buggyTest.reset())
  await page.evaluate(dx => { __harness.buggyTest.chop('p1', 100); __harness.luffyTest.set('p2', { x: __harness.p1().x + dx }) }, p2dx)
  await step(2)
}

try {
  await page.goto(`${server.base}/index.html?harness=1&p1=${P1}&p2=${P2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.buggyTest, null, { timeout: 30000 })
  check('game boots (harness up, no page error at boot)', errors.length === 0, errors[0] || '')
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 6; i++) { await step(5); await new Promise(r => setTimeout(r, 250)) }   // let sheets decode (real time)
  const a = await ls('p1'), b = await ls('p2')
  check(`P1 spawned as ${P1}`, a?.key === P1, a?.key)
  check(`P2 spawned as ${P2}`, b?.key === P2, b?.key)
  check('both fighters alive with HP', a?.health > 0 && b?.health > 0, `${a?.health}/${b?.health}`)
  check('P1 (Buggy) sprite drawn (real draw rect)', a?.draw?.w > 20 && a?.draw?.h > 20, JSON.stringify(a?.draw))
  check('P2 sprite drawn (real draw rect)', b?.draw?.w > 20 && b?.draw?.h > 20, JSON.stringify(b?.draw))
  const cs = await canvasStats()
  check('not a blank screen (play area has many colours)', cs.play > 40, `uniq=${cs.play}`)
  check('HUD strip renders (many colours)', cs.hud > 20, `uniq=${cs.hud}`)
  await shot(`p${PHASE}-00-match`)

  const assets = await page.evaluate(async () => {
    const m = await import('./buggySprites.js')
    const urls = [...Object.values(m.BUGGY_ANIM).map(a => a.sheet), ...Object.values(m.BUGGY_FX).map(f => f.sheet).filter(Boolean),
      ...Object.values(m.BUGGY_PARTS).flatMap(p => [p.idle.sheet, p.death.sheet])]
    return Promise.all([...new Set(urls)].map(u => fetch(u).then(r => [u, r.status])))
  })
  const bad = assets.filter(([, s]) => s !== 200)
  check(`all ${assets.length} Buggy sprite/FX/part sheets load`, bad.length === 0, bad.map(x => x.join(':')).join(', '))

  if (PHASE >= 2) {
    const s = await bs()
    check('Chop meter (maxEnergy 100, energyName Chop)', s.maxEnergy === 100 && s.energyName === 'Chop', JSON.stringify({ m: s.maxEnergy, n: s.energyName }))
    check('base stats: HP 950, speed 80 (5.0 px/f walk), dashSpeed 13, jumpPower 27', s.maxHealth === 950 && s.speed === 80 && s.dashSpeed === 13 && s.jumpForce === -27,
      JSON.stringify({ hp: s.maxHealth, sp: s.speed, d: s.dashSpeed, j: s.jumpForce }))
    check('Buggy idle uses his own sheet', /assets\/buggy\/idle\.png$/.test(s.idleSheet || '') && (await ls()).spriteAction === 'idle', s.idleSheet)
    check('HUD part pips: hand / foot / head all ready', s.pips && ['hand', 'foot', 'head'].every(k => s.pips[k].st === 'ready'), JSON.stringify(s.pips))
    await page.evaluate(() => __harness.buggyTest.chop('p1', 10)); await step(120)
    const s2 = await bs()
    check('passive Chop +1.5/s (≈ +3 over 2 s)', s2.energy >= 12.5 && s2.energy <= 13.5, s2.energy)
    for (const [m, nm] of [[1, 'head'], [2, 'hand'], [4, 'foot'], [3, 'head+hand']]) {   // masked body rows (render-only)
      await page.evaluate(m => __harness.buggyTest.set('p1', { mask: m, maskLock: true }), m); await step(2)
      const sm = await bs()
      check(`masked body row ${m} (${nm}) selected`, sm.idleSourceY === m * 112, sm.idleSourceY)
      await shot(`p${PHASE}-01-mask-${m}`)
    }
    await page.evaluate(() => __harness.buggyTest.set('p1', { mask: 0, maskLock: false })); await step(2)
  }

  if (PHASE >= 3) {
    // BARA BARA NO MI vs Zoro: P2 (Zoro) swings his real moves at an idle Buggy.
    const swing = (key, extra = null) => page.evaluate(async ([key, extra]) => {
      const cb = await import('./combat.js'), zd = await import('./zoroData.js')
      const z = __harness.buggyTest.raw('p2'), b = __harness.buggyTest.raw('p1')
      z.x = b.x + 52; z.facing = -1; b.facing = 1; z.attacking = false; z.attackCooldown = 0; z.hitstun = 0; z.hitstop = 0
      const md = extra ? { ...extra } : zd.ZORO_MOVES[key]
      return cb.startMove(z, key, md)
    }, [key, extra])
    const settle = async () => { for (let i = 0; i < 40; i++) { await step(1); const z = await page.evaluate(() => __harness.buggyTest.raw('p2').attacking); if (!z) break } }
    await fresh(260); await page.evaluate(() => __harness.buggyTest.chop('p1', 10))
    let b0 = await bs()
    check('Zoro light starts (real ZORO_MOVES.light)', await swing('light'))
    let flashSeen = false
    for (let i = 0; i < 30; i++) { await step(1); const q = await bs(); if (q.b.nullFlash > 0 && !flashSeen) { flashSeen = true; await step(3); await shot(`p${PHASE}-02-nullify-zoro`) } if (!q.attacking && flashSeen) break }
    await settle()
    let b1 = await bs()
    check('slash NULLIFIED: zero damage from Zoro\'s sword', b1.health === b0.health && b1.b.nullTotal === 1, `hp ${b0.health}→${b1.health} nulls=${b1.b.nullTotal}`)
    check('nullify grants +6 Chop', b1.energy - b0.energy >= 6 && b1.energy - b0.energy <= 8, `${b0.energy}→${b1.energy}`)
    check('silhouette / split flash shown', flashSeen)
    check('no hitstun from a nullified slash', b1.hitstun === 0, b1.hitstun)
    // BLUNT still hurts (same Zoro frame data, tagged blunt explicitly)
    b0 = b1; await swing('probeBlunt', { damage: 40, startup: 3, active: 4, recovery: 8, rangeX: 90, rangeY: 80, hitstun: 12, damageType: 'blunt' }); await settle()
    b1 = await bs()
    check('blunt is NOT nullified', b1.health < b0.health && b1.b.nullTotal === 1, `hp ${b0.health}→${b1.health}`)
    // GRAB tag is never nullified either
    b0 = b1; await step(30); await swing('probeGrab', { damage: 30, startup: 3, active: 4, recovery: 8, rangeX: 90, rangeY: 80, hitstun: 12, damageType: 'grab' }); await settle()
    b1 = await bs(); check('grab-tagged is NOT nullified', b1.health < b0.health, `hp ${b0.health}→${b1.health}`)
    // PROJECTILES: a kunai (slash) passes through; a ki blast (energy) hurts.
    const shoot = type => page.evaluate(async type => {
      const ab = await import('./abilities.js'); const z = __harness.buggyTest.raw('p2'), b = __harness.buggyTest.raw('p1')
      z.x = b.x + 160; z.facing = -1
      return !!ab.spawnProjectile(z, type, { damage: 30, speed: 10, spawnX: b.x + 110, spawnY: b.y + 40, vx: -10, vy: 0 })
    }, type)
    await step(30); b0 = await bs(); await shoot('kakashiKunai'); await step(25); b1 = await bs()
    check('slash projectile (kunai) nullified', b1.health === b0.health && b1.b.nullTotal === 2, `hp ${b0.health}→${b1.health} nulls=${b1.b.nullTotal}`)
    await step(30); b0 = await bs(); await shoot('kiBlast'); await step(25); b1 = await bs()
    check('energy projectile (ki blast) is NOT nullified', b1.health < b0.health, `hp ${b0.health}→${b1.health}`)
    // CHOP STAGGER: 3 nullified slashes inside 5 s → 60-frame reassembly, cannot block, vulnerable.
    await fresh(260)
    for (let n = 0; n < 3; n++) { await swing(n === 1 ? 'zSlash' : 'light'); await settle(); await step(6) }
    let st = await bs()
    check('3 nullified slashes in 5 s → CHOP STAGGER', st.b.stagger > 0 && st.b.mask === 3, `stagger=${st.b.stagger} mask=${st.b.mask} nulls=${st.b.nullTotal}`)
    await page.keyboard.down('a'); await step(2)   // hold back = would block
    st = await bs(); check('cannot block while reassembling', !st.blocking, st.blocking)
    await shot(`p${PHASE}-03-chop-stagger`)
    b0 = st; await swing('light'); await settle(); b1 = await bs()
    await page.keyboard.up('a')
    check('slash LANDS during the reassembly window', b1.health < b0.health, `hp ${b0.health}→${b1.health}`)
    for (let i = 0; i < 70; i++) await step(1)
    st = await bs(); check('reassembly ends after 1 s (mask back to 0)', st.b.stagger === 0 && st.b.mask === 0, `stagger=${st.b.stagger} mask=${st.b.mask}`)
    // HAKI: once Zoro's Conqueror's Haki has fired his blades hit Buggy.
    await fresh(260)
    await page.evaluate(() => { const z = __harness.buggyTest.raw('p2'); z._zoro && (z._zoro.hakiUsed = true) })
    b0 = await bs(); await swing('light'); await settle(); b1 = await bs()
    check('Haki-imbued Zoro slash bypasses the immunity', b1.health < b0.health && b1.b.nullTotal === 0, `hp ${b0.health}→${b1.health}`)
  }

  if (PHASE >= 4) {
    // BODY PARTS as drones.js profiles.
    const T = () => page.evaluate(() => __harness.buggyTest)
    const zs = () => page.evaluate(() => { const z = __harness.buggyTest.raw('p2'); return { x: z.x, hp: z.health, en: z.energy, hitstop: z.hitstop || 0 } })
    await fresh(260)
    const z0 = await zs(), b0x = (await bs()).x
    check('Cannon: hand part launches (drone profile buggy_hand)', await call('hand'))
    let pk = await parts(); check('hand is a live drone with HP', pk.length === 1 && pk[0].type === 'buggy_hand' && pk[0].hp === 60, JSON.stringify(pk))
    await step(4); let sm = await bs()
    check('body masked while the hand is out (row 2)', sm.b.mask === 2 && sm.idleSourceY === 224, `mask=${sm.b.mask} sy=${sm.idleSourceY}`)
    await shot(`p${PHASE}-04-hand-flying`)
    for (let i = 0; i < 60; i++) { await step(1); const q = await parts(); if (q[0]?.state === 'hover') break }
    pk = await parts(); const z1 = await zs()
    check('hand hit the foe in flight (70, pierced through)', z1.hp < z0.hp, `zoro ${z0.hp}→${z1.hp}`)
    check('hand parks BEHIND the foe, hovering', pk[0]?.state === 'hover' && pk[0].x > z1.x + 48, JSON.stringify({ hand: pk[0]?.x, zoro: z1.x, st: pk[0]?.state }))
    check('hand flew ~60% of the screen (or to the wall)', Math.abs(pk[0].x - b0x) > 600, Math.round(Math.abs(pk[0].x - b0x)))
    await shot(`p${PHASE}-05-hand-parked`)
    check('Special again → stab from the hand', await call('stab'))
    for (let i = 0; i < 50; i++) await step(1)
    const z2 = await zs(); check('stab hits from behind (pincer)', z2.hp < z1.hp, `zoro ${z1.hp}→${z2.hp}`)
    for (let i = 0; i < 80; i++) await step(1)
    pk = await parts(); sm = await bs()
    check('hand flies home and re-attaches (mask 0)', pk.length === 0 && sm.b.mask === 0, `${pk.length} mask=${sm.b.mask}`)
    // LEGS planted + walking without them
    await fresh(400)
    check('Quick Escape legs plant', await call('legs'))
    const legs0 = (await parts())[0]
    await page.keyboard.down('a'); await step(30); await page.keyboard.up('a'); await step(1)
    const legs1 = (await parts())[0]; sm = await bs()
    check('legs stay planted while Buggy walks away', legs1 && Math.abs(legs1.x - legs0.x) < 3 && Math.abs(sm.x - legs0.x) > 60, JSON.stringify({ l0: legs0.x, l1: legs1?.x, b: sm.x }))
    check('masked body row 4 on WALK/idle frames', sm.b.mask === 4, sm.b.mask)
    await step(25); await page.keyboard.down('d'); await step(8)   // walk back toward the planted legs (no double-tap dash)
    sm = await bs(); check('walking with the legs off uses the masked WALK row', /walk/.test(sm.action || '') && sm.b.mask === 4, `${sm.action} mask=${sm.b.mask}`)
    await shot(`p${PHASE}-06-walk-no-legs`); await page.keyboard.up('d'); await step(2)
    // HEAD + the 2-part cap (a 3rd part retires the oldest)
    check('Lookout head detaches', await call('head')); await step(20)
    sm = await bs(); check('two parts out → mask 5 (head+legs)', sm.b.mask === 5, sm.b.mask)
    await shot(`p${PHASE}-07-head-and-legs`)
    await call('hand'); await step(2)
    pk = await parts(); const liveN = pk.filter(p => !p.retiring && !p.dying).length
    check('3rd part retires the oldest (max 2 out)', liveN === 2 && pk.some(p => p.type === 'buggy_foot' && p.retiring), JSON.stringify(pk.map(p => [p.type, p.retiring])))
    for (let i = 0; i < 80; i++) await step(1)
    check('retired legs fly HOME (not off-screen)', !(await parts()).some(p => p.type === 'buggy_foot'))
    // A broken part snaps back: 25 chip + 6 s cooldown, greyed pip
    sm = await bs(); const hp0 = sm.health
    await call('hitPart', 'buggy_head', 999); await step(2)
    sm = await bs()
    check('part at 0 HP → 25 chip damage to Buggy', hp0 - sm.health === 25, `${hp0}→${sm.health}`)
    check('pip greys out on cooldown', sm.pips.head.st === 'cd', JSON.stringify(sm.pips.head))
    await shot(`p${PHASE}-08-head-broken-pip`)
    check('head cannot redeploy during the 6 s cooldown', !(await call('head')))
    for (let i = 0; i < 365; i++) await step(1)
    sm = await bs(); check('cooldown ends after 360 f (pip ready)', sm.pips.head.st === 'ready', JSON.stringify(sm.pips.head))
    // RECALL: double-tap Special
    await fresh(500); await page.evaluate(() => __harness.buggyTest.chop('p1', 20))
    await call('hand'); await call('legs'); await step(70)
    const e0 = (await bs()).energy
    await tap(['l'], 2); await step(2); await tap(['l'], 2); await step(2)
    sm = await bs(); pk = sm.parts
    check('double-tap Special → RECALL all parts', sm.b.recalls === 1 && pk.every(p => p.retiring === 'recall'), JSON.stringify({ r: sm.b.recalls, p: pk.map(p => p.retiring) }))
    check('recall refunds ~30% of the parts\' Chop (scaled by HP)', sm.energy - e0 >= 9 && sm.energy - e0 <= 12, `${e0}→${sm.energy}`)
    // Opponent hitting a part: no meter, no hitstop, Buggy unhurt
    await fresh(140); for (let i = 0; i < 40; i++) await step(1)
    await call('head'); for (let i = 0; i < 25; i++) await step(1)
    await page.evaluate(() => { const z = __harness.buggyTest.raw('p2'); z.energy = 20 })
    const hd = (await parts())[0]
    await page.evaluate(async hx => { const cb = await import('./combat.js'); const z = __harness.buggyTest.raw('p2'), b = __harness.buggyTest.raw('p1')
      b.x = z.x - 400; z.x = hx - 60; z.facing = 1; z.attacking = false; z.attackCooldown = 0
      cb.startMove(z, 'probeUp', { damage: 30, startup: 2, active: 6, recovery: 6, rangeX: 120, rangeY: 200, hitstun: 10, damageType: 'blunt' }) }, hd.x)
    let hit = null, maxStop = 0
    for (let i = 0; i < 12; i++) { await step(1); const q = (await parts()).find(p => p.type === 'buggy_head'); const zz = await zs(); maxStop = Math.max(maxStop, zz.hitstop); if (q && q.hp < 50) { hit = q; } }
    const zz = await zs(); sm = await bs()
    check('opponent can hit a part (part loses HP)', !!hit, JSON.stringify(hit))
    check('hitting a part: no meter, no hitstop, no combo, Buggy unhurt', zz.en === 20 && maxStop === 0 && sm.health === sm.maxHealth, JSON.stringify({ en: zz.en, stop: maxStop, bhp: sm.health }))
    // AI hook: hash-decided ~25%, head prioritised
    await fresh(140); await call('head'); await call('hand'); await step(10)
    const ai = await page.evaluate(async () => {
      const dr = await import('./drones.js'); const z = __harness.buggyTest.raw('p2'), b = __harness.buggyTest.raw('p1')
      const hd = dr.getActiveDrones().find(d => d.type === 'buggy_head'), hn = dr.getActiveDrones().find(d => d.type === 'buggy_hand')
      hd.x = z.x + 40; hn.x = z.x + 60   // both in reach
      let picks = 0, head = 0; const seq = []
      for (let f = 0; f < 8000; f += 8) { const d = dr.aiPickDroneTarget(z, f, 170, { filter: p => p.aiPriority != null }); if (d) { picks++; if (d.type === 'buggy_head') head++ } seq.push(d ? d.type[6] : '.') }
      const again = []; for (let f = 0; f < 8000; f += 8) { const d = dr.aiPickDroneTarget(z, f, 170, { filter: p => p.aiPriority != null }); again.push(d ? d.type[6] : '.') }
      return { rate: picks / 1000, headShare: picks ? head / picks : 0, same: seq.join('') === again.join('') }
    })
    check('AI attacks parts ~25% of windows (hash-decided)', ai.rate > 0.18 && ai.rate < 0.32, ai.rate)
    check('AI prioritises the HEAD', ai.headShare === 1, ai.headShare)
    check('AI part choice is deterministic (same seed+frame → same pick)', ai.same)
  }

  if (PHASE >= 5) {
    // MOVESET — frame data table (brief) + real keyboard inputs.
    const fd = await page.evaluate(async () => {
      const { BUGGY_MOVES: M } = await import('./buggyData.js')
      const adv = k => M[k].blockstun - (M[k].active - 1 + M[k].recovery) - 2
      return { jab: [M.light.damage, M.light.startup, adv('light'), M.light.damageType], slash: [M.bSlash.damage, M.bSlash.startup, adv('bSlash')],
        carve: [M.heavy.damage, M.heavy.startup, adv('heavy'), M.heavy.launcher], low: [M.bLow.damage, M.bLow.startup, M.bLow.hitLevel],
        kick: [M.bKick.damage, M.bKick.startup, M.bKick.damageType], acro: [M.up.damage, M.up.startup, M.up.damageType], air: [M.air.damage, M.air.damageType],
        wake: [M.bWake.damage, M.bWake.invuln, adv('bWake')], costs: [M.bCannon.cost, M.bFestival.cost, M.bBall.cost, M.bEscape.cost, M.bFan.cost, M.bCape.cost, M.bSuper.cost],
        ball: [M.bBall.startup, M.bBall.damageType], esc: M.bEscape.invuln,
        superRaw: M.bSuper.bg.balls.length * M.bSuper.bg.ballDmg + M.bSuper.bg.stabs.length * M.bSuper.bg.stabDmg + M.bSuper.bg.rushDmg }
    })
    check('frame data matches the brief (jab 38/5f/+1 · slash 60/8f/−3 · carve 85/12f/−6 launch · low 45/7f · kick 55/8f · acro 75/10f · air 55 · wake 70/6inv/−12)',
      JSON.stringify([fd.jab, fd.slash, fd.carve, fd.low, fd.kick, fd.acro, fd.air, fd.wake]) === JSON.stringify([[38, 5, 1, 'slash'], [60, 8, -3], [85, 12, -6, true], [45, 7, 'low'], [55, 8, 'blunt'], [75, 10, 'blunt'], [55, 'slash'], [70, 6, -12]]), JSON.stringify(fd))
    check('costs: Cannon 18 · Festival 25 · Ball 22 · Escape 15 · Fan 12 · Cape 10 · Super 100', JSON.stringify(fd.costs) === '[18,25,22,15,12,10,100]', fd.costs)
    check('Buggy Ball 16f startup, blunt · Escape 20 invuln · Super 370 raw', fd.ball[0] === 16 && fd.ball[1] === 'blunt' && fd.esc === 20 && fd.superRaw === 370, JSON.stringify([fd.ball, fd.esc, fd.superRaw]))
    const mv = async () => (await bs()).move
    const zhp = () => page.evaluate(() => __harness.buggyTest.raw('p2').health)
    const seen = async (frames, pred) => { const out = new Set(); for (let i = 0; i < frames; i++) { await step(1); const q = await bs(); if (q.move) out.add(q.move); if (pred && pred(q)) break } return out }
    // Gatling L, L, H
    await fresh(70)
    await tap(['j']); await step(6); await tap(['j']); await step(9); await tap(['k'])
    let ms = await seen(40)
    check('gatling Jab → Knife slash → Heavy carve (L, L, H)', ms.has('bSlash') && ms.has('heavy'), [...ms].join(','))
    // Normals by input
    for (const [keys, want, nm] of [[['s', 'j'], 'bLow', 'Low knife ↓+L'], [['s', 'k'], 'bKick', 'Clown kick ↓+H'], [['i'], 'up', 'Acrobatic kick (Up-Attack)'], [['d', 'k'], 'bWake', 'Wake-up reversal →+H']]) {
      await fresh(300); for (const k of keys) await page.keyboard.down(k); await step(2); for (const k of keys) await page.keyboard.up(k)
      ms = await seen(6); check(`${nm} starts`, ms.has(want), [...ms].join(','))
    }
    // CANNON 236+A
    await fresh(260); await motion(QCF, 'l'); ms = await seen(14)
    let st = await bs()
    check('Chop-Chop Cannon (↓↘→+A): move + hand part, −18 Chop', ms.has('bCannon') && st.parts.some(p => p.type === 'buggy_hand') && st.energy <= 100 - 18 + 4, `${[...ms]} e=${st.energy}`)
    for (let i = 0; i < 60; i++) { await step(1); if ((await parts())[0]?.state === 'hover') break }
    await shot(`p${PHASE}-09-cannon-parked`)
    const hpS = await zhp(); await tap(['l']); await seen(45)
    check('A again while the hand hovers → STAB from the hand', (await zhp()) < hpS, `${hpS}→${await zhp()}`)
    // FESTIVAL 22+A
    await fresh(60); await motion(DD, 'l'); await seen(12); st = await bs()
    check('Festival (↓↓+A): 4 s orbit starts, −25 Chop', st.b.festival > 200 && st.energy <= 76, `fest=${st.b.festival} e=${st.energy}`)
    const fz0 = await zhp(); for (let i = 0; i < 60; i++) await step(1)
    check('Festival ticks 12 (slash) on the foe inside the ring', (await zhp()) < fz0, `${fz0}→${await zhp()}`)
    await shot(`p${PHASE}-10-festival`)
    const grabbed = await page.evaluate(async () => { const cb = await import('./combat.js'); const z = __harness.buggyTest.raw('p2'), b = __harness.buggyTest.raw('p1'); return cb.resolveGrab(z, b, {}, 400) })
    check('Festival: Buggy cannot be grabbed', grabbed === false)
    const x0 = (await bs()).x; await page.keyboard.down('a'); await step(20); await page.keyboard.up('a'); const x1 = (await bs()).x
    check('Festival: walks at 60% (5.0 → 3.0 px/f)', Math.abs((x0 - x1) / 20 - 3.0) < 0.35, ((x0 - x1) / 20).toFixed(2))
    // BUGGY BALL 214+A — arcs, explodes, hits OTG
    await fresh(260); await motion(QCB, 'l')
    let ballSeen = false; for (let i = 0; i < 30; i++) { await step(1); if ((await bs()).b.balls.length) { ballSeen = true; break } }
    check('Buggy Ball (↓↙←+A): an arcing ball after 16f', ballSeen)
    await step(6); await shot(`p${PHASE}-11-ball-flight`)
    const bz0 = await zhp(); let boomShot = false, boomAt = null
    for (let i = 0; i < 60; i++) { await step(1); const q = await bs(); if (q.b.booms.length && !boomShot) { boomShot = true; boomAt = { boom: q.b.booms[0], b: q.x, z: await page.evaluate(() => __harness.buggyTest.raw('p2').x) }; await shot(`p${PHASE}-12-ball-explosion`) } if (!q.b.balls.length && boomShot) break }
    check('Buggy Ball explodes on the foe (blunt, 95)', (await zhp()) < bz0, `${bz0}→${await zhp()} ${JSON.stringify(boomAt)}`)
    await fresh(260); await page.evaluate(() => { const z = __harness.buggyTest.raw('p2'); z.knockdownState = true })
    await motion(QCB, 'l'); const oz0 = await zhp(); for (let i = 0; i < 70; i++) await step(1)
    const oz1 = await zhp(); await page.evaluate(() => { const z = __harness.buggyTest.raw('p2'); z.knockdownState = false })
    check('Buggy Ball hits OTG (a knocked-down foe)', oz1 < oz0, `${oz0}→${oz1}`)
    // QUICK ESCAPE 236+B
    await fresh(200); const ex0 = (await bs()).x
    await motion(QCF, 'k'); let inv = 0; for (let i = 0; i < 4; i++) { await step(1); inv = Math.max(inv, (await bs()).invuln) }
    await seen(26); st = await bs()
    check('Quick Escape (↓↘→+B): legs stay planted, he reassembles ~25% screen away', (() => { const l = st.parts.find(p => p.type === 'buggy_foot'); return l && Math.abs(st.x + 24 - l.x) > 300 })(), `legs@${st.parts.find(p => p.type === 'buggy_foot')?.x} body@${st.x + 24} (start ${ex0})`)
    check('Quick Escape: invulnerable', inv >= 15, inv)
    await shot(`p${PHASE}-13-escape-legs`)
    // KNIFE FAN 66+A (pool cap 6)
    await fresh(500); await motion(FF, 'l'); await seen(12)
    let kn = (await bs()).projectiles.filter(p => p.kind === 'knife')
    check('Knife Fan (→→+A): 3 knives', kn.length === 3, kn.length)
    await shot(`p${PHASE}-14-knife-fan`)
    for (let r = 0; r < 3; r++) { await page.evaluate(() => { const b = __harness.buggyTest.raw('p1'); b.attackCooldown = 0 }); await step(12); await tap(['l']); await step(12) }
    kn = (await bs()).projectiles.filter(p => p.kind === 'knife')
    check('Knife Fan pool capped at 6', kn.length <= 6, kn.length)
    await fresh(140); const kz0 = await zhp(); await motion(FF, 'l'); await seen(30)
    check('Knife Fan hits (3 × 30, slash)', (await zhp()) < kz0, `${kz0}→${await zhp()}`)
    // CAPE FLOURISH 214+B vs a projectile (reflect inside the first 8 frames)
    await fresh(300); await motion(QCB, 'k'); await step(3)
    const cz0 = await zhp()
    await page.evaluate(async () => { const ab = await import('./abilities.js'); const z = __harness.buggyTest.raw('p2'), b = __harness.buggyTest.raw('p1')
      ab.spawnProjectile(z, 'kiBlast', { damage: 50, speed: 14, spawnX: b.x + 70, spawnY: b.y + 40, vx: -14, vy: 0 }) })
    for (let i = 0; i < 40; i++) await step(1)
    st = await bs()
    check('Cape Flourish (↓↙←+B) reflects a projectile for 40', st.health === st.maxHealth && (await zhp()) < cz0, `buggy ${st.health} zoro ${cz0}→${await zhp()}`)
    // ROLL (dash) = 8 invulnerable frames
    await fresh(300); await tap(['a']); await step(3); await tap(['a']); let rinv = 0
    for (let i = 0; i < 3; i++) { await step(1); rinv = Math.max(rinv, (await bs()).invuln) }
    check('Roll (dash): invulnerable frames', rinv >= 5 && rinv <= 8, rinv)
    // 85% combo scaling
    const sc = await page.evaluate(async () => { const cb = await import('./combat.js'); const b = __harness.buggyTest.raw('p1'); const c0 = b.comboCounter; b.comboCounter = 2; const v = cb.getComboScale(b); b.comboCounter = c0; return v })
    check('combo scaling 85% per hit (2 hits in → ×0.7225)', Math.abs(sc - 0.7225) < 1e-6, sc)
    // SUPER 236236+A
    await fresh(120); await call('head'); await step(4)
    const sz0 = await zhp(); await page.evaluate(() => __harness.buggyTest.chop('p1', 100))
    await motion([...QCF, ...QCF], 'l')
    ms = await seen(4); st = await bs()
    check('SUPER (↓↘→↓↘→+A): starts at 100 Chop, parts recalled', (ms.has('bSuper') || st.move === 'bSuper') && st.energy < 5, `${[...ms]} e=${st.energy}`)
    let sh = 0
    for (let i = 0; i < 140; i++) { await step(1); const q = await bs(); if ([24, 40, 60, 96].includes(i)) await shot(`p${PHASE}-15-super-${String(i).padStart(3, '0')}`); if (!q.move && i > 20) break }
    await step(2); st = await bs()
    const dealt = sz0 - (await zhp())
    check('Super lands: balls + stabs + knife-ball rush', st.b.superHit >= 6 && dealt > 120, `hits=${st.b.superHit} dmg=${dealt}`)
    check('Super: 3 s Chop lockout afterwards', st.b.lockout > 150 && st.parts.every(p => p.retiring || p.dying), `lockout=${st.b.lockout}`)
    const e0s = st.energy; for (let i = 0; i < 60; i++) await step(1)
    check('no Chop gain during the lockout', (await bs()).energy === e0s, `${e0s}→${(await bs()).energy}`)
  }

  if (PHASE >= 7) {
    // ── Phase 7: intro / wins / lose / idle ──
    const raw = (w = 'p1') => page.evaluate(w => { const b = __harness.buggyTest.raw(w); return { introT: b._bgIntroT, endT: b._bgEndT || 0, winVar: b._bgWinVar || 0,
      win: (b._skinAnim || b.animationData).win.sheet, skin: !!b._skinAnim } }, w)
    // IDLE > 10 s → the head lifts off and looks around (real sim idle timer, no input at all)
    await fresh(400); await step(640)
    let q = await bs()
    check('idle > 10 s: head lifts off + looks around (head-off body row 1)', q.b.lookT >= 0 && q.b.mask === 1 && q.idleSourceY > 0, `idleT=${q.b.idleT} lookT=${q.b.lookT} mask=${q.b.mask} srcY=${q.idleSourceY}`)
    await step(50); await shot(`p${PHASE}-16-idle-lookaround`)
    await tap(['d'], 2); q = await bs()
    check('any input snaps the head straight back on', q.b.lookT === -1 && q.b.idleT <= 2 && q.b.mask === 0, `lookT=${q.b.lookT} idleT=${q.b.idleT}`)
    // INTRO: the engine's _introPlaying flag on the intro strip → pieces assemble, then confetti
    await fresh(300)
    await page.evaluate(() => { const b = __harness.buggyTest.raw('p1'); b._introPlaying = true; b._introVariant = 'intro'; b._bgIntroOn = false; b._bgIntro0 = null; if (b.spriteHandler) { b.spriteHandler.frameIndex = 0; b.spriteHandler.frameTimer = 0 } })
    await step(1); await step(11); await shot(`p${PHASE}-17-intro-assemble`)   // the first draw starts the intro clock
    await step(34); await shot(`p${PHASE}-18-intro-confetti`)
    const ri = await raw()
    check('intro: pieces-assemble + confetti clock runs on the intro flag', ri.introT >= 40 && ri.introT <= 112, `introT=${ri.introT}`)
    await page.evaluate(() => { __harness.buggyTest.raw('p1')._introPlaying = false }); await step(80)
    check('intro FX ends on its own (112 frames)', (await raw()).introT === 112, (await raw()).introT)
    // WINS: variant 1 = portrait + head (win strip) · variant 2 = cape + knives fanned (win2 strip)
    for (const v of [1, 2]) {
      await page.evaluate(v => { const b = __harness.buggyTest.raw('p1'); b._forceAction = 'win'; b._bgWinVar = v; b._bgEndT = 0; b._bgEndFa = null }, v)
      await step(1); await step(25); const r = await raw()
      check(`win ${v}: ${v === 1 ? 'portrait + laughing head' : 'cape + knives fanned'} on the ${v === 2 ? 'win2' : 'win'} strip`, r.endT > 20 && r.win.endsWith(v === 2 ? '/win2.png' : '/win.png'), `${r.win} endT=${r.endT}`)
      await shot(`p${PHASE}-${19 + v}-win${v}`)
    }
    await page.evaluate(() => { const b = __harness.buggyTest.raw('p1'); b._forceAction = 'lose'; b._bgEndT = 0; b._bgEndFa = null }); await step(1); await step(39)
    let r = await raw()
    check('lose: lying + scattered pieces (whole-body lose strip)', r.endT > 30 && !r.skin, `endT=${r.endT}`)
    await shot(`p${PHASE}-22-lose`)
    await page.evaluate(() => { __harness.buggyTest.raw('p1')._forceAction = null }); await step(3); r = await raw()
    check('round-end pose cleared → presentation clocks reset', r.endT === 0 && r.winVar === 0, JSON.stringify(r))
    // the win variant is a pure hash of sim values (LAN-safe): stable for the same values, both poses reachable
    const vh = await page.evaluate(async () => { const m = await import('./buggyState.js'); const seen = new Set(); let stable = true
      for (let hp = 1; hp <= 40; hp++) { const a = { health: hp * 23, energy: hp % 100, _buggy: { tick: hp * 997 } }, b = { ...a }; const x = m.buggyWinVariant(a), y = m.buggyWinVariant(b); if (x !== y) stable = false; seen.add(x) }
      return { stable, both: seen.size === 2 } })
    check('win variant: deterministic hash, both poses reachable', vh.stable && vh.both, JSON.stringify(vh))
  }

  const other404 = [...new Set(missing.filter(m => !/buggy/i.test(m)))]
  if (other404.length) console.log(`  ℹ non-Buggy 404s (not part of this build): ${other404.slice(0, 6).join(', ')}${other404.length > 6 ? ' …' : ''}`)
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  const bMissing = missing.filter(m => /buggy/i.test(m))
  check('no Buggy 404s', bMissing.length === 0, bMissing.join(', '))
  const cs2 = await canvasStats()
  check('still not blank at the end', cs2.play > 40, `uniq=${cs2.play}`)
} catch (e) {
  check('render check ran to completion', false, e.message.split('\n')[0])
  if (errors.length) console.log('  page errors:', errors.slice(0, 4).join(' | '))
} finally {
  await browser.close(); server.close()
}
console.log(`\nBUGGY RENDER CHECK (phase ${PHASE}): ${PASS} passed, ${FAIL} failed  → screenshots in ${OUT}`)
process.exit(FAIL ? 1 : 0)
