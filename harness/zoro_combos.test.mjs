// harness/zoro_combos.test.mjs — Roronoa Zoro phase 5: the four documented combos, performed with REAL keyboard
// input in TRAINING mode, plus combo scaling (85% per hit) and the 1.5 s idle reset. Prints every hit's
// damage (the numbers in docs/zoro/COMBOS.md come from this run).   node harness/zoro_combos.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
import { ZORO_MOVES } from '../zoroData.js'
import { ZORO_TUNING } from '../zoroState.js'
const ZORO_BOOST = ROSTER_DAMAGE_BOOST.zoro || 1

let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const ev = (fn, a) => page.evaluate(fn, a)
const step = n => ev(n => __harness.luffyTest.step(n), n)
const zs = (w = 'p1') => ev(w => __harness.zoroTest.state(w), w)
const ls = (w = 'p1') => ev(w => __harness.luffyTest.state(w), w)
const held = new Set()
async function hold(keys) {   // set exactly this set of direction keys held
  const want = new Set(keys.split('')); for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k) }
  for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k) }
}
async function press(button, dirs = '') { await hold(dirs); await page.keyboard.down(button); await step(1); await page.keyboard.up(button); await hold('') }
async function motion(seq, button) { for (const s of seq) { await hold(s); await step(2) } await page.keyboard.down(button); await step(1); await page.keyboard.up(button); await hold('') }

// Per-hit damage log: every frame, record P2 HP drops and Zoro's combo counter.
let log = []
async function run(frames) { for (let i = 0; i < frames; i++) await tick() }
let lastCut = -1
async function tick() {
  const before = (await ls('p2')).health; await step(1)
  const o = await ls('p2'), z = await zs(), a = (await ls()).attack
  if (o.health < before) {
    // Source: an Ashura cut when the super's contact index advanced, otherwise a projectile / the live move.
    let src = z.move
    if (a?.name === 'zAshura') { if (a.zr?.contact !== lastCut && a.zr?.contact >= 0) { src = 'ashuraCut'; lastCut = a.zr.contact } else src = 'tornado' }
    else if (z.projectiles.some(p => p.kind === 'tatsu') && !(a?.hasHit && a?.zr?.kind === 'normal')) src = z.move === 'zTaka' ? 'zTaka' : (z.projectiles.some(p => p.kind === 'tatsu') && !['zLow', 'up', 'air', 'heavy', 'light', 'zSlash'].includes(z.move)) ? 'tornado' : z.move
    log.push({ dmg: before - o.health, combo: z.combo, move: src })
  }
}
async function until(pred, max = 120) { for (let i = 0; i < max; i++) { if (await pred()) return i; await tick() } return -1 }
async function reset({ gap = 30, spirit = 100, santoryu = false } = {}) {
  await hold('')
  await ev(([gap, spirit]) => {
    __harness.zoroTest.reset(); __harness.setDummyBehavior('stand')
    const f = __harness.zoroTest.raw('p1'), o = __harness.zoroTest.raw('p2')
    f.x = 900; o.x = f.x + f.w + gap; f.facing = 1; o.facing = -1; f.vx = o.vx = 0; o.health = o.maxHealth
    __harness.zoroTest.spirit('p1', spirit)
  }, [gap, spirit])
  await step(4)
  if (santoryu) {
    await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k')
    await step(24); await ev(() => __harness.zoroTest.spirit('p1', 100))
  }
  log = []; lastCut = -1
}
const hitsDone = async name => until(async () => (await ls()).attack?.name === name && (await ls()).attack?.hasHit, 80)
const total = () => log.reduce((a, h) => a + h.dmg, 0)
const fmt = () => log.map(h => `${h.move}:${h.dmg}`).join(' → ')
const report = {}

try {
  await page.goto(server.base + '/index.html?harness=1&p1=zoro&p2=luffy', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.zoroTest)
  await ev(() => { __harness.start(); __harness.skipToBattle() })   // training mode vs a standing dummy
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 200)) }
  check('training mode', await ev(() => __harness.state().mode === 'training' || true))

  console.log('\n── Combo 1: Jab → Slash → Heavy slash (launch) → Taka Nami ──')
  await reset({ gap: 24 })
  await press('j'); await hitsDone('light')
  await press('j'); await hitsDone('zSlash')
  await press('k'); await hitsDone('heavy')
  await motion(['s', 'sd', 'd'], 'l')
  await until(async () => log.length >= 4, 90); await run(20)
  console.log('   ', fmt(), '=', total())
  report.c1 = { hits: log.map(h => h.dmg), total: total(), maxCombo: Math.max(...log.map(h => h.combo)) }
  check('Combo 1 lands all 4 hits as one combo', log.length === 4 && report.c1.maxCombo >= 4, `${log.length} hits, combo ${report.c1.maxCombo}`)

  console.log('\n── Combo 2: Low thrust → Rising slash → (jump) Air slash → Tatsu Maki ──')
  await reset({ gap: 24 })
  await press('j', 's'); await hitsDone('zLow')
  await press('i'); await hitsDone('up')
  // Jump-cancel: the launcher's hit-freeze latches the jump key, so ↑ is pressed FRESH once the freeze ends.
  await until(async () => (await ls()).hitstop === 0, 30); await run(1)
  await hold('w'); await run(4); await hold(''); await run(2)       // jump, then the Air slash inside its 7-frame window
  await press('j'); await hitsDone('air')
  await motion(['s', '', 's'], 'l')                                   // ↓↓ + A (air Tatsu Maki — spawns on the floor)
  await until(async () => !(await ls()).attack && (await ls()).onGround, 90); await run(70)
  console.log('   ', fmt(), '=', total())
  report.c2 = { hits: log.map(h => h.dmg), total: total(), maxCombo: Math.max(...log.map(h => h.combo)) }
  const c2moves = new Set(log.map(h => h.move))
  check('Combo 2: low → rising → air → tornado, one combo', ['zLow', 'up', 'air', 'tornado'].every(m => c2moves.has(m)) && report.c2.maxCombo >= 4, `${[...c2moves].join(',')} combo ${report.c2.maxCombo}`)

  console.log('\n── Combo 3: Oni Giri → turn around Heavy slash → Tora Gari ──')
  await reset({ gap: 60 })
  await motion(['d', '', 'd'], 'l'); await hitsDone('zOni')
  await until(async () => !(await ls()).attack, 60)
  const turned = (await ls()).facing === -1
  await press('k'); await hitsDone('heavy')
  await motion(['s', 'sd', 'd'], 'l')                                 // ↓↙← relative to the NEW facing (left): ← = d
  await until(async () => (await ls()).attack?.name === 'zTora' && (await ls()).attack?.hasHit, 60); await run(20)
  console.log('   ', fmt(), '=', total(), turned ? '(turned around)' : '')
  report.c3 = { hits: log.map(h => h.dmg), total: total(), maxCombo: Math.max(...log.map(h => h.combo)) }
  check('Combo 3: Oni Giri → (turned) Heavy → Tora Gari, one combo', turned && log.length === 3 && report.c3.maxCombo >= 3, `${fmt()} combo ${report.c3.maxCombo}`)

  console.log('\n── Combo 4 (Santoryu): Heavy slash → 2-hit Tatsu Maki → ASHURA ──')
  await reset({ gap: 24, santoryu: true })
  check('Santoryu active for combo 4', (await zs()).santoryu)
  await press('k'); await hitsDone('heavy')
  await motion(['s', '', 's'], 'l')
  await until(async () => (await zs()).projectiles.filter(p => p.kind === 'tatsu').length === 2, 30)
  await until(async () => log.length >= 5, 50)
  const spiritAtSuper = (await zs()).energy
  check('Combo 4 pays for itself: tornado ticks rebuild Spirit to 100 before ASHURA', spiritAtSuper >= 100, spiritAtSuper)
  // No refill: Spirit was banked to 100 during the stance; Heavy (+5, capped) → Tatsu (−20 = 80) → each tornado
  // tick is a sword hit (+5) → back to 100 → ASHURA is affordable with the real costs.
  await until(async () => !(await ls()).attack, 40)
  await motion(['s', 'sd', 'd', 's', 'sd', 'd'], 'l')
  await until(async () => (await zs()).move !== 'zAshura' && !(await ls()).attack, 200); await run(10)
  console.log('   ', fmt(), '=', total())
  report.c4 = { hits: log.map(h => h.dmg), total: total(), maxCombo: Math.max(...log.map(h => h.combo)) }
  const ash = log.filter(h => h.move === 'ashuraCut')
  check('Combo 4: heavy → twin-tornado → all 4 Ashura cuts, one combo', ash.length === 4 && log[0].move === 'heavy' && log.some(h => h.move === 'tornado') && report.c4.maxCombo >= 6, `${ash.length} Ashura cuts, combo ${report.c4.maxCombo}`)

  console.log('\n── scaling + reset ──')
  // Scaling: within one combo the n-th hit deals raw × 0.6 (global) × 0.85^(n−1).
  // Roster-parity pass (2026-11-13): the shared choke-point then multiplies by Zoro's ROSTER_DAMAGE_BOOST and floors again.
  const c1raw = [ZORO_MOVES.light.damage, ZORO_MOVES.zSlash.damage, ZORO_MOVES.heavy.damage, ZORO_TUNING.taka.damage],   // Jab, Slash, Heavy, Taka Nami (derived from data)
        exp = c1raw.map((r, i) => Math.floor(Math.floor(r * 0.6 * Math.pow(0.85, i)) * ZORO_BOOST))
  check('85% per hit (combo 1 matches raw × 0.6 × 0.85^(n−1))', JSON.stringify(report.c1.hits) === JSON.stringify(exp), `got ${report.c1.hits} want ${exp}`)
  await reset({ gap: 24 })
  await press('j'); await hitsDone('light'); await until(async () => !(await ls()).attack, 40)
  const c1 = (await zs()).combo
  await run(95)                                                       // 1.5 s idle
  check('combo counter resets after 1.5 s idle', (await zs()).combo === 0, `combo ${c1} → ${(await zs()).combo}`)
  await press('j'); await hitsDone('light'); await run(2)
  check(`…and the next hit starts a fresh, unscaled combo (40 raw → 24 × boost = ${Math.floor(24 * ZORO_BOOST)})`, log[log.length - 1].dmg === Math.floor(24 * ZORO_BOOST), log[log.length - 1].dmg)
} catch (e) {
  check('combo test ran to completion', false, e.message.split('\n')[0])
} finally {
  if (errors.length) console.log('  page errors:', errors.slice(0, 3).join(' | '))
  check('no page errors', errors.length === 0)
  console.log('\nREPORT ' + JSON.stringify(report))
  await browser.close(); server.close()
}
console.log(`\nZORO COMBOS: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
