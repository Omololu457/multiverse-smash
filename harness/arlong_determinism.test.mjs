// harness/arlong_determinism.test.mjs — Arlong phase 11: determinism with THREE water zones + the SUPER.
// The same scripted match (real keyboard for Arlong, Zoro slashes on a fixed frame schedule) runs twice in two fresh
// page loads with the same match seed. Every frame the simulation state is digested: both fighters (x, y, v, hp,
// Tide, move, combo, hitstun) and Arlong's whole sim state (f._arlong: zones, teeth, Kiribachi, shots, waves, flood,
// timers). The two runs must match frame for frame. Math.random is wrapped: any call from an arlong*.js file fails.
// Inputs use single presses (→+A, ←+A, ↓+A, Ultimate): the engine's shared double-tap dash detector reads
// wall-clock keydown times, so a rolled →→ could dash differently run to run (a harness input artefact).
//     node harness/arlong_determinism.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const server = await serve(), browser = await chromium.launch({ headless: true })

async function run(seed) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0
    const r = Math.random; window.__alRandom = []
    Math.random = function () { const st = new Error().stack || ''; if (/\/arlong[A-Za-z]*\.js/.test(st)) window.__alRandom.push(st.split('\n')[2] || st); return r.call(Math) }
  })
  await page.goto(`${server.base}/index.html?harness=1&p1=arlong&p2=zoro&seed=${seed}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.arlongTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  const step1 = () => page.evaluate(() => __harness.luffyTest.step(1))
  await step1(); await step1()
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.setDummyBehavior?.('stand'); __harness.arlongTest.reset(); __harness.arlongTest.tide('p1', 100)
    const a = __harness.arlongTest.raw('p1'), z = __harness.arlongTest.raw('p2'); a.x = 400; z.x = 760; a.facing = 1; z.facing = -1; a.comboCounter = 0; z.health = z.maxHealth; a.health = a.maxHealth })
  const digest = () => page.evaluate(() => {
    const r = v => typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v
    const f = w => { const x = __harness.arlongTest.raw(w); return [r(x.x), r(x.y), r(x.vx), r(x.vy), x.health, r(x.energy), x.currentMove || '', x.comboCounter || 0, x.hitstun || 0, x.facing, x.knockdownState ? 1 : 0] }
    const a = __harness.arlongTest.raw('p1')
    return JSON.stringify([f('p1'), f('p2'), JSON.stringify(a._arlong || null, (k, v) => typeof v === 'number' ? r(v) : v), a.attacking ? a.currentAttack?.name : ''])
  })
  const frames = [], seen = { zones: 0, flood: 0, super: false, blade: new Set() }
  const tick = async () => { await step1(); const d = await digest(); frames.push(d); const j = JSON.parse(d), s = JSON.parse(j[2])
    if (s) { seen.zones = Math.max(seen.zones, s.zones.length); seen.flood = Math.max(seen.flood, s.flood); seen.blade.add(s.blade.st) } if (j[3] === 'aSuper') seen.super = true }
  const press = async (dir, button) => { if (dir) await page.keyboard.down(dir); await page.keyboard.down(button); await tick(); await page.keyboard.up(button); if (dir) await page.keyboard.up(dir) }
  const zoroSlash = () => page.evaluate(async () => { const cb = await import('./combat.js'), zd = await import('./zoroData.js'); const z = __harness.arlongTest.raw('p2'); if (z.attacking || z.hitstun > 0 || z.knockdownState) return; z.attackCooldown = 0; cb.startMove(z, 'light', zd.ZORO_MOVES.light) })
  const wait = async (n, slash = 0) => { for (let i = 0; i < n; i++) { await tick(); if (slash && i % slash === 0) await zoroSlash() } }

  await wait(10)
  await press('d', 'l'); await wait(70)                               // →+A Shark On Darts: through Zoro → zone 1 where he stops
  await press(null, 'k'); await wait(40, 13)                           // a Kiribachi swing while Zoro swings back
  await page.evaluate(([ax, zx]) => { const a = __harness.arlongTest.raw('p1'), z = __harness.arlongTest.raw('p2'); a.x = ax; z.x = zx; a.facing = 1; z.facing = -1; a.vx = z.vx = 0 }, [300, 440])   // spread out: separate pools don't merge
  await page.evaluate(() => __harness.arlongTest.tide('p1', 100))
  await press('s', 'l'); await wait(50)                                // ↓+A Tidal Sweep → zone 2
  await page.evaluate(() => __harness.arlongTest.tide('p1', 100))
  await press(null, 'l'); await wait(60, 17)                           // neutral A (Tooth up close / Water Shot at range)
  await page.evaluate(() => __harness.arlongTest.tide('p1', 100))
  await page.evaluate(([ax, zx]) => { const a = __harness.arlongTest.raw('p1'), z = __harness.arlongTest.raw('p2'); a.x = ax; z.x = zx; a.facing = 1; z.facing = -1; a.vx = z.vx = 0 }, [1900, 2350])   // spread out: separate pools don't merge
  const back = await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'); return a.facing === 1 ? 'a' : 'd' })
  await press(back, 'l'); await wait(60)                               // ←+A Gosenmaigawara Seiken → zone 3 (in front)
  await page.evaluate(() => __harness.arlongTest.tide('p1', 100))
  await page.keyboard.down('u'); await tick(); await page.keyboard.up('u')   // SUPER: ARLONG PARK
  await wait(230)
  const rnd = await page.evaluate(() => window.__alRandom.slice(0, 3))
  await page.close()
  return { frames, seen, errors, rnd }
}

try {
  const A = await run(7654321), B = await run(7654321)
  check('scripted run reached 3 water zones at once', A.seen.zones === 3, `max zones = ${A.seen.zones}`)
  check('scripted run fired the SUPER (stage flooded)', A.seen.super && A.seen.flood > 0, `super=${A.seen.super} flood=${A.seen.flood}`)
  check('both runs simulated the same number of frames', A.frames.length === B.frames.length && A.frames.length > 500, `${A.frames.length} / ${B.frames.length}`)
  let first = -1; for (let i = 0; i < Math.min(A.frames.length, B.frames.length); i++) if (A.frames[i] !== B.frames[i]) { first = i; break }
  check('frame-by-frame IDENTICAL sim state (fighters + Arlong state: zones, teeth, blade, shots, waves, flood)', first === -1,
    first === -1 ? `${A.frames.length} frames` : `diverged at frame ${first}:\n    A ${A.frames[first].slice(0, 300)}\n    B ${B.frames[first].slice(0, 300)}`)
  check('no Math.random from any arlong*.js', A.rnd.length === 0 && B.rnd.length === 0, [...A.rnd, ...B.rnd].join(' | '))
  check('no page errors', A.errors.length === 0 && B.errors.length === 0, [...A.errors, ...B.errors].slice(0, 2).join(' | '))
} catch (e) { check('test ran to completion', false, e.stack || e.message) }
console.log(`\n════════════════════════════════════════\n  ARLONG DETERMINISM (3 zones + Super): ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(FAIL ? 1 : 0)
