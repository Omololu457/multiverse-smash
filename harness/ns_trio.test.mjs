// harness/ns_trio.test.mjs — NS TRIO: Tori (Blue Wind) / Blake (Navy Thunder) / Cam (Green Samurai) as ONE fighter (ns_trio)
// on the REAL game loop. Real inputs only for the switch: hold Charge (P) + ↓↓ + J = next form, + K = previous form.
//   node harness/ns_trio.test.mjs [section]     Keys: a/d/s/w move, j Light, k Heavy, l Special, p Charge
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const SHOTS = 'docs/ns_trio/screenshots'; fs.mkdirSync(SHOTS, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
const section = t => console.log(`\n── NS TRIO ${t} ──`)
const ONLY = process.argv[2] || 'all'
const want = k => ONLY === 'all' || ONLY.split(',').includes(k)
const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const errors = []
let page
async function boot(p1, p2, o = {}) {
  if (page) await page.close()
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.ninjaTest, null, { timeout: 30000 })
  await page.evaluate(o => { __harness.rng.forceSeed(o.seed ?? 7); __harness.start({ p1Skin: o.p1Skin, p2Skin: o.p2Skin, mode: o.mode, difficulty: o.difficulty }); __harness.skipToBattle() }, o)
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 200)) }
}
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (w = 'p1') => page.evaluate(w => { const s = __harness.ninjaTest.state(w); const f = __harness.ninjaTest.raw(w); s.duo = f._duo ? JSON.parse(JSON.stringify(f._duo)) : null; s.maxJumps = f.maxJumps; s.name = f.name; s.sheet = f.animationData?.idle?.sheet; s.move = f.currentMove || null; return s }, w)
const call = (fn, ...a) => page.evaluate(([fn, a]) => __harness.ninjaTest[fn](...a), [fn, a])
const shot = name => page.screenshot({ path: `${SHOTS}/${name}.png` })
const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
// P S S J / P S S K: hold Charge, ↓, release, ↓, then the button
async function switchInput(btn = 'j', gap = 2) { await page.keyboard.down('p'); await step(1); await tap(['s']); await step(gap); await tap(['s']); await step(1); await tap([btn]); await step(1); await page.keyboard.up('p') }
async function fresh(dx = 400, o = {}) {
  await call('reset')
  await page.evaluate(([dx, o]) => {
    const T = __harness.ninjaTest, a = T.raw('p1'), z = T.raw('p2')
    a.x = o.ax ?? 900; z.x = a.x + dx; z.facing = -1; a.facing = 1
    for (const f of [a, z]) { f.invulnTimer = 0; f.knockdownState = false; f.hitstun = 0; f.blockstun = 0; f.health = f.maxHealth; f.vx = 0; f.vy = 0; f.energy = o.energy ?? 0; f.attacking = false; f.currentAttack = null; f.currentMove = null }
    if (a._duo) { a._duo.cd = 0; a._duo.want = 0; a._duo.armT = 0; a._duo.swap = null; a._duo.tag = null }
  }, [dx, o])
  await step(3)
  await call('np', 'p1', o.np ?? 100)
}
const settle = async (n = 120) => { for (let i = 0; i < n; i++) { await step(1); const s = await S(); if (!s.attacking && !(s.hitstun > 0) && !s.duo?.swap) break } }
async function untilSwap(max = 30) { for (let i = 0; i < max; i++) { const s = await S(); if (s.duo?.swap) return s; await step(1) } return null }
async function doSwitch(btn) { await fresh(500); await switchInput(btn); const sw = await untilSwap(); await settle(); await step(35); return { sw, s: await S() } }

try {
  await boot('ns_trio', 'spd_red')
  if (want('roster')) {
    section('ONE ROSTER ENTRY')
    const meta = await page.evaluate(async () => { const c = (await import('./characters.js')).characters
      return { uni: c.ns_trio.universe, sub: c.ns_trio.subUniverse, name: c.ns_trio.name, hid: ['ns_blue', 'ns_navy', 'ns_green'].map(k => !!c[k].hidden), vis: !c.ns_trio.hidden,
        hp: c.ns_trio.stats.maxHealth, forms: c.ns_trio.duoForms, wr: !c.windrangers.hidden } })
    check('ns_trio is ONE visible Power Rangers / Ninja Storm character; the three forms are hidden', meta.uni === 'power_rangers' && meta.sub === 'Ninja Storm' && meta.vis && meta.hid.every(Boolean), meta)
    check('forms Tori → Blake → Cam; shared health 1248; windrangers still listed', JSON.stringify(meta.forms) === '["ns_blue","ns_navy","ns_green"]' && meta.hp === 1248 && meta.wr, meta)
    const s0 = await S()
    check('starts as Tori (Blue Wind) on her own sheets', s0.key === 'ns_blue' && s0.duo?.form === 'ns_blue' && s0.sheet?.includes('/ns_blue/') && s0.maxHealth === 1248, { key: s0.key, sheet: s0.sheet })
    const sk = await page.evaluate(() => __harness.showSkinSelect('ns_trio', 'p1', 0))
    check('skin select: Start as Blue / Navy / Green', JSON.stringify(sk.skins.slice(0, 3).map(s => s.id)) === '["default","start_navy","start_green"]', sk.skins.slice(0, 3).map(s => s.name))
    await boot('ns_trio', 'spd_red')   // the skin-select screen left the battle
    await fresh(260); await step(20); await shot('form_tori')
  }

  if (want('switch')) {
    section('THE SWITCH (hold Charge + ↓↓ + J / K)')
    await fresh(500)
    const b = await S()
    await switchInput('j'); const sw = await untilSwap()
    check('P S S J starts the switch', !!sw?.duo?.swap, sw?.duo)
    const keys = []; for (let i = 0; i < 16; i++) { keys.push((await S()).key); if (i === 9) await shot('switch_smoke'); await step(1) }
    const a = await S()
    check('J: Tori → Blake (Navy Thunder) mid-smoke (frame ≈ 7)', b.key === 'ns_blue' && a.key === 'ns_navy' && keys.indexOf('ns_navy') >= 4 && keys.indexOf('ns_navy') <= 9 && a.sheet.includes('/ns_navy/'), keys.join(','))
    check('cost 15 NP + 30-frame lockout', Math.round(b.s.np - a.s.np) >= 13 && Math.round(b.s.np - a.s.np) <= 15 && a.duo.cd > 20 && a.duo.cd <= 30, [b.s.np, a.s.np, a.duo.cd])
    check('the J of the gesture never jabs (no Light move started)', !keys.length || !(await page.evaluate(() => __harness.ninjaTest.raw('p1')._ninja?.stats?.strikes > 1)), '')
    await step(35); await fresh(260); await step(20); await shot('form_blake')
    let r = await doSwitch('j')
    check('J again: Blake → Cam (Green Samurai)', r.s.key === 'ns_green' && r.s.maxJumps === 2 && r.s.sheet.includes('/ns_green/'), [r.s.key, r.s.maxJumps])
    await fresh(260); await step(20); await shot('form_cam')
    r = await doSwitch('j'); check('J again: Cam → Tori (wraps around)', r.s.key === 'ns_blue', r.s.key)
    r = await doSwitch('k'); check('P S S K: Tori → Cam (previous)', r.s.key === 'ns_green', r.s.key)
    r = await doSwitch('k'); check('K again: Cam → Blake', r.s.key === 'ns_navy', r.s.key)
    r = await doSwitch('k'); check('K again: Blake → Tori', r.s.key === 'ns_blue', r.s.key)
    // the K of the gesture never becomes a Heavy
    await fresh(500); await switchInput('k'); const mv = []; for (let i = 0; i < 6; i++) { mv.push((await S()).move); await step(1) }
    check('the K of the gesture never kicks (only the switch move runs)', mv.every(m => !m || m === 'nsSwap' || m === 'nsVanish' || m === 'nsVanishGone' || m === 'nsStreakStrike'), mv)
    await settle(); await step(35)
    // refusals
    await fresh(400); await page.evaluate(() => { __harness.ninjaTest.raw('p1').hitstun = 40 }); const k0 = (await S()).key; await switchInput('j'); await step(2)
    let s = await S(); check('refused in hitstun', !s.duo.swap && s.key === k0, s.duo.lastRefuse)
    await fresh(400, { np: 5 }); await switchInput('j'); await step(3); s = await S()
    check('refused without 15 Ninja Power', !s.duo.swap && s.key === k0, s.duo.lastRefuse)
    // without Charge: ↓↓ + J is NOT a switch
    await fresh(400); const n0 = (await S()).duo.swaps; await tap(['s']); await step(2); await tap(['s']); await step(1); await tap(['j']); await step(20); s = await S()
    check('↓↓ + J without Charge does not switch', s.key === k0 && s.duo.swaps === n0, [n0, s.duo.swaps])
  }

  if (want('carry')) {
    section('SHARED STATE')
    await fresh(400, { energy: 60 }); await page.evaluate(() => { __harness.ninjaTest.raw('p1').health = 900 })
    const b = await S(); await switchInput('j'); await untilSwap(); await settle(); const a = await S()
    check('health / meter / facing carry across the switch', a.health === 900 && Math.abs(a.energy - b.energy) < 4 && a.facing === b.facing, { hp: a.health, en: [b.energy, a.energy] })
    await boot('ns_trio', 'spd_red', { p1Skin: 'start_green' })
    check('Start as: Green (Cam) skin starts the round as Cam', (await S()).key === 'ns_green')
    await boot('ns_trio', 'spd_red', { p1Skin: 'start_navy' })
    check('Start as: Navy (Blake) skin starts the round as Blake', (await S()).key === 'ns_navy')
  }

  if (want('cpu')) {
    section('CPU + DETERMINISM + WINDRANGERS UNCHANGED')
    await boot('spd_red', 'ns_trio', { mode: 'vs', difficulty: 'impossible', seed: 3 })   // the CPU (P2) plays the trio
    const seen = new Set(); for (let i = 0; i < 60; i++) { await step(30); const s = await S('p2'); seen.add(s.key); if (s.health <= 0) break }
    const cs = await page.evaluate(() => __harness.ninjaTest.raw('p2')._duo?.cpuSwaps || 0)
    check('the CPU switches forms through the real input (Charge + ↓↓ + J/K)', cs > 0 && seen.size >= 2, { cpuSwaps: cs, forms: [...seen] })
    const run = async () => { await boot('spd_red', 'ns_trio', { mode: 'vs', difficulty: 'impossible', seed: 11 }); const out = []; for (let i = 0; i < 20; i++) { await step(30); const a = await S('p2'), z = await S(); out.push([a.key, a.x | 0, a.health, z.health]) } return JSON.stringify(out) }
    const r1 = await run(), r2 = await run()
    check('same seed → identical 600-frame CPU match (forms, x, health)', r1 === r2, r1 === r2 ? '' : [r1.slice(0, 120), r2.slice(0, 120)])
    await boot('windrangers', 'spd_red')
    await fresh(500); await page.keyboard.down('p'); await step(1); await tap(['s']); await step(2); await tap(['s']); await step(1); await tap(['j']); await step(1); await page.keyboard.up('p')
    await untilSwap(); await settle()
    check('windrangers: Charge + ↓↓ + J still swaps Shane → Dustin', (await S()).key === 'ns_yellow')
  }
  check('no page errors', errors.length === 0, errors.slice(0, 3))
} catch (e) { console.log('CRASH', e.stack); FAIL++ }
await browser.close(); server.close?.()
console.log(`\nNS TRIO: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
