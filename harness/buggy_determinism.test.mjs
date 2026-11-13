// harness/buggy_determinism.test.mjs — Buggy the Clown phase 11: determinism with TWO detached parts + the SUPER.
// The same scripted match (real keyboard for Buggy, Zoro slashes on a fixed frame schedule) runs twice in two fresh
// page loads with the same match seed. Every frame we digest the simulation state: both fighters (x, y, v, hp, Chop,
// move, combo), Buggy's whole sim state (f._buggy), every live part (position, velocity, HP, timers, attachment,
// behaviour data) and every Buggy ball. The two runs must match frame for frame.
// Also: Math.random is wrapped — any call whose stack comes from a buggy*.js file fails the test.
//     node harness/buggy_determinism.test.mjs
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
    const r = Math.random; window.__buggyRandom = []
    Math.random = function () { const st = new Error().stack || ''; if (/\/buggy[A-Za-z]*\.js/.test(st)) window.__buggyRandom.push(st.split('\n')[2] || st); return r.call(Math) }
  })
  await page.goto(`${server.base}/index.html?harness=1&p1=buggy&p2=zoro&seed=${seed}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.buggyTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  const step1 = () => page.evaluate(() => __harness.luffyTest.step(1))
  await step1(); await step1()
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.setDummyBehavior?.('stand'); __harness.buggyTest.reset(); __harness.buggyTest.chop('p1', 100)
    const b = __harness.buggyTest.raw('p1'), z = __harness.buggyTest.raw('p2'); b.x = 400; z.x = 640; b.facing = 1; z.facing = -1; b.comboCounter = 0; z.health = z.maxHealth; b.health = b.maxHealth })
  // Deterministic per-frame digest of the simulation state.
  const digest = () => page.evaluate(async () => {
    const { getActiveDrones } = await import('./drones.js')
    const r = v => typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v
    const f = w => { const x = __harness.buggyTest.raw(w); return [r(x.x), r(x.y), r(x.vx), r(x.vy), x.health, r(x.energy), x.currentMove || '', x.comboCounter || 0, x.hitstun || 0, x.facing] }
    const b = __harness.buggyTest.raw('p1')
    const parts = getActiveDrones().filter(d => d.profile?.buggyPart).map(d => [d.type, r(d.x), r(d.y), r(d.vx), r(d.vy), r(d.hp), d.dying ? 1 : 0, d._retiring || '', r(d.life ?? 0), JSON.stringify(d.data || {}, (k, v) => typeof v === 'number' ? r(v) : v)])
    return JSON.stringify([f('p1'), f('p2'), JSON.stringify(b._buggy || null, (k, v) => typeof v === 'number' ? r(v) : v), parts, b.attacking ? b.currentAttack?.name : ''])
  })
  const frames = [], partsSeen = { max: 0 }, superSeen = { on: false, hits: 0 }
  const tick = async () => { await step1(); const d = await digest(); frames.push(d); const j = JSON.parse(d); partsSeen.max = Math.max(partsSeen.max, j[3].filter(p => !p[6] && !p[7]).length); if (j[4] === 'bSuper') superSeen.on = true; const s = JSON.parse(j[2]); if (s) superSeen.hits = Math.max(superSeen.hits, s.superHit || 0) }
  const hold = async (keys, n) => { for (const k of keys) await page.keyboard.down(k); for (let i = 0; i < n; i++) await tick(); for (const k of keys) await page.keyboard.up(k) }
  const roll = async (seq, button) => { let held = []
    for (const k of seq) { const want = k == null ? [] : [].concat(k)
      for (const x of held) if (!want.includes(x)) await page.keyboard.up(x)
      for (const x of want) if (!held.includes(x)) await page.keyboard.down(x)
      held = want; await tick(); await tick() }
    await page.keyboard.down(button); await tick(); await page.keyboard.up(button); for (const x of held) await page.keyboard.up(x) }
  const zoroSlash = () => page.evaluate(async () => { const cb = await import('./combat.js'), zd = await import('./zoroData.js'); const z = __harness.buggyTest.raw('p2'); if (z.attacking || z.hitstun > 0) return; z.attackCooldown = 0; cb.startMove(z, 'light', zd.ZORO_MOVES.light) })

  for (let i = 0; i < 10; i++) await tick()
  await roll(['s', ['s', 'd'], 'd'], 'k')                 // ↓↘→+B = Quick Escape (part 1: the LEGS stay planted)
  for (let i = 0; i < 40; i++) await tick()
  await roll(['s', ['s', 'd'], 'd'], 'l')                 // ↓↘→+A = Chop-Chop Cannon (part 2: the HAND)
  for (let i = 0; i < 30; i++) { await tick(); if (i % 12 === 0) await zoroSlash() }   // Zoro swings into the parts / Buggy (nullifies)
  await page.evaluate(() => __harness.buggyTest.chop('p1', 100))
  for (let i = 0; i < 20; i++) await tick()
  // SUPER on the Ultimate button (brief: 236236+A or Ultimate). Not the rolled 236236: it presses → twice, and the
  // engine's shared double-tap dash detector reads WALL-CLOCK keydown times (performance.now), so a dash can trigger
  // differently from run to run — an input-layer artefact of the harness, not simulation state.
  await page.keyboard.down('u'); await tick(); await page.keyboard.up('u')   // SUPER (recalls both parts first)
  for (let i = 0; i < 150; i++) await tick()
  if (process.env.DBG) for (const i of [0, 12, 50, 100, 130, 160, 200, 240]) if (frames[i]) { const j = JSON.parse(frames[i]); console.log(i, JSON.stringify(j[0]), j[3].map(p => p[0] + ':' + p[7]).join(','), j[4]) }
  const rnd = await page.evaluate(() => window.__buggyRandom.slice(0, 3))
  await page.close()
  return { frames, partsSeen, superSeen, errors, rnd }
}

try {
  const A = await run(1234567), B = await run(1234567)
  check('scripted run reached 2 detached parts at once', A.partsSeen.max === 2, `max parts out = ${A.partsSeen.max}`)
  check('scripted run fired the SUPER and it landed', A.superSeen.on && A.superSeen.hits >= 6, `super=${A.superSeen.on} hits=${A.superSeen.hits}`)
  check('both runs simulated the same number of frames', A.frames.length === B.frames.length && A.frames.length > 250, `${A.frames.length} / ${B.frames.length}`)
  let first = -1; for (let i = 0; i < Math.min(A.frames.length, B.frames.length); i++) if (A.frames[i] !== B.frames[i]) { first = i; break }
  if (first >= 0 && process.env.DBG) { const a = JSON.parse(A.frames[first]), b = JSON.parse(B.frames[first]); for (let k = 0; k < a.length; k++) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { console.log('DIFF field', k); if (k === 2) { const x = JSON.parse(a[k]), y = JSON.parse(b[k]); for (const kk of Object.keys(x)) if (JSON.stringify(x[kk]) !== JSON.stringify(y[kk])) console.log('  _buggy.' + kk, JSON.stringify(x[kk]), '|', JSON.stringify(y[kk])) } else console.log('  A', JSON.stringify(a[k]), '\n  B', JSON.stringify(b[k])) }
    const p = JSON.parse(A.frames[first - 1]), q = JSON.parse(B.frames[first - 1]); console.log('prev p1', JSON.stringify(p[0]), JSON.stringify(q[0])) }
  check('frame-by-frame IDENTICAL sim state (fighters + Buggy state + every part + balls)', first === -1, first === -1 ? `${A.frames.length} frames` : `diverged at frame ${first}:\n    A ${A.frames[first].slice(0, 300)}\n    B ${B.frames[first].slice(0, 300)}`)
  check('no Math.random from any buggy*.js', A.rnd.length === 0 && B.rnd.length === 0, [...A.rnd, ...B.rnd].join(' | '))
  check('no page errors', A.errors.length === 0 && B.errors.length === 0, [...A.errors, ...B.errors].slice(0, 2).join(' | '))
} catch (e) {
  check('determinism test ran to completion', false, e.message.split('\n')[0])
} finally { await browser.close(); server.close() }
console.log(`\nBUGGY DETERMINISM: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
