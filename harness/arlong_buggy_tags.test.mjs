// harness/arlong_buggy_tags.test.mjs — the matchup that proves the damageType system: Arlong (P1) vs Buggy (P2).
// Every Kiribachi (slash) move does NOTHING through Bara Bara no Mi; throwing the blade away swaps his normals to
// Fishman Karate (blunt), which hits Buggy normally. Real keyboard input, real game loop.
//   node harness/arlong_buggy_tags.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const as = () => page.evaluate(() => __harness.arlongTest.state('p1'))
const tap = async (keys) => { for (const k of keys) await page.keyboard.down(k); await step(1); for (const k of keys) await page.keyboard.up(k) }
async function motion(seq, button) { let held = []
  for (const k of seq) { const want = k == null ? [] : [].concat(k)
    for (const x of held) if (!want.includes(x)) await page.keyboard.up(x)
    for (const x of want) if (!held.includes(x)) await page.keyboard.down(x)
    held = want; await step(2) }
  for (const x of held) await page.keyboard.up(x); await tap([button]) }
const settle = async (n = 90) => { for (let i = 0; i < n; i++) { await step(1); const s = await as(); if (!s.attacking && s.a.blade.st !== 'flying' && !s.a.shots.length && !s.a.waves.length) break } await step(4) }
const fresh = async (dx = 110, keepBlade = false) => {
  await page.evaluate(([dx, keep]) => {
    const t = __harness.arlongTest, b = keep ? t.state('p1').a.blade : null
    t.reset(); t.tide('p1', 100)
    const a = t.raw('p1'), z = t.raw('p2'); z.x = a.x + dx; z.facing = -1; a.facing = 1; a.comboCounter = 0
    z.health = z.maxHealth; z.invulnTimer = 0; z.hitstun = 0; z.knockdownState = false
    if (z._buggy) { z._buggy.nullHits = []; z._buggy.stagger = 0 }
    if (b) t.set('p1', { blade: b })
  }, [dx, keepBlade]); await step(3) }
const hp = () => page.evaluate(() => __harness.arlongTest.raw('p2').health)
async function dealt(label, act, dx = 110, keepBlade = false) { await fresh(dx, keepBlade); const h0 = await hp(); const s0 = await as(); await act(); await settle(); const h1 = await hp(); return { d: +(h0 - h1).toFixed(1), move: s0.move } }
const F = ['d'], D = ['s'], DF = ['s', 'd']
try {
  await page.goto(server.base + '/index.html?harness=1&p1=arlong&p2=buggy', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.arlongTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() }); await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 }); await step(30)
  console.log('\n── Kiribachi (slash) through Bara Bara no Mi ──')
  let r = await dealt('swing', () => tap(['k'])); check('Kiribachi swing (slash): 0 damage on Buggy', r.d === 0, r.d)
  r = await dealt('arc', async () => { await page.keyboard.down('s'); await tap(['k']); await page.keyboard.up('s') }); check('Heavy saw arc (slash): 0 damage', r.d === 0, r.d)
  r = await dealt('low', async () => { await page.keyboard.down('s'); await tap(['j']); await page.keyboard.up('s') }); check('Low saw (slash): 0 damage', r.d === 0, r.d)
  r = await dealt('tidal', () => motion([D, null, D], 'l')); check('Tidal Sweep (slash): 0 damage', r.d === 0, r.d)
  r = await dealt('tooth', () => motion([D, DF, F], 'l')); check('Shark On Tooth (slash bite): 0 damage', r.d === 0, r.d)
  r = await dealt('throw', () => motion([D, DF, F], 'k'), 260); check('Kiribachi Throw (slash): 0 damage', r.d === 0, r.d)
  console.log('\n── Fishman Karate / water (blunt, projectile) hit him normally ──')
  r = await dealt('jab', () => tap(['j'])); check('Jab (blunt) damages Buggy', r.d > 20, r.d)
  r = await dealt('straight', async () => { await page.keyboard.down('d'); await tap(['j']); await page.keyboard.up('d') }); check('Fishman straight (blunt) damages Buggy', r.d > 30, r.d)
  r = await dealt('darts', () => motion([F, null, F], 'l'), 300); check('Shark On Darts (blunt) damages Buggy', r.d > 60, r.d)
  r = await dealt('seiken', () => motion([D, ['s', 'a'], ['a']], 'l'), 300); check('Gosenmaigawara Seiken (blunt) damages Buggy', r.d > 50, r.d)
  r = await dealt('shot', () => motion([D, ['s', 'a'], ['a']], 'k'), 400); check('Water Shot (projectile) damages Buggy', r.d > 20, r.d)
  console.log('\n── the counterplay: throw the blade away on purpose → pure Fishman Karate ──')
  await fresh(900); await motion([D, DF, F], 'k'); await settle(120)
  let s = await as(); check('blade thrown + planted far away', s.a.blade.st === 'planted' && s.hud.blade === false, s.a.blade.st)
  const blade = s.a.blade
  const kSwing = await dealt('kswing', () => tap(['k']), 110, true)
  check('blade gone: H = karate swing (blunt) and it DAMAGES Buggy', kSwing.d > 30, kSwing.d)
  const kArc = await dealt('karc', async () => { await page.keyboard.down('s'); await tap(['k']); await page.keyboard.up('s') }, 110, true)
  check('blade gone: ↓+H = karate arc (blunt) and it DAMAGES Buggy', kArc.d > 30, kArc.d)
  const kTidal = await dealt('ktidal', () => motion([D, null, D], 'l'), 110, true)
  check('blade gone: ↓↓+A = karate Tidal Sweep (blunt) and it DAMAGES Buggy', kTidal.d > 25, kTidal.d)
  const dead = await page.evaluate(async () => { const { resolveKey } = await import('./arlong.js'), { ARLONG_MOVES } = await import('./arlongData.js')
    const f = __harness.arlongTest.raw('p1'), bad = []
    for (const st of ['hand', 'planted', 'flying', 'recall']) for (const teeth of [0, 3]) { __harness.arlongTest.set('p1', { blade: { st, x: 0 }, teeth })
      for (const k of Object.keys(ARLONG_MOVES)) if (!ARLONG_MOVES[resolveKey(f, k)]) bad.push(st + ':' + teeth + ':' + k) }
    __harness.arlongTest.set('p1', { blade: { st: 'hand' }, teeth: 3 }); return bad })
  check('never a dead button: every move key resolves to a real move in every blade state × teeth 0/3', dead.length === 0, dead.join(','))
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
} catch (e) { check('test ran to completion', false, e.stack || e.message) }
console.log(`\n════════════════════════════════════════\n  ARLONG vs BUGGY damageType: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(FAIL ? 1 : 0)
