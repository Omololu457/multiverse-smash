// harness/violet_determinism.mjs — Violet Parr: the same seed + the same input script → identical GAME_STATE, frame by frame
// (two fresh page loads), f._violet is plain JSON (finite numbers, exact round trip), and no Math.random is ever called
// from a violet*.js module (stack-trapped). The script exercises every Violet system present in this phase.
//   node harness/violet_determinism.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { ck, summary } from './violet_lib.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
const OWN = '\\/violet(State|Fx|Data|Kit|Skins|SkinTable|Sound|Sprites|Harness|View)?\\.js'
// [frame, key, down?] — P1 keyboard; P2 is the same-seed CPU (AI rolls ride the seeded match stream)
const S = []
const press = (f, keys, hold = 2) => { for (const k of keys) { S.push([f, k, true]); S.push([f + hold, k, false]) } }
let t = 10
const vanish = () => { press(t, ['s'], 2); press(t + 4, ['s'], 3); press(t + 5, ['l'], 1); t += 12 }
press(t, ['d'], 20); t += 30; press(t, ['j']); t += 14; press(t, ['j']); t += 20; press(t, ['k']); t += 40
press(t, ['s', 'j']); t += 30; press(t, ['i']); t += 40; press(t, ['w']); t += 10; press(t, ['j']); t += 50
vanish(); press(t, ['d'], 30); t += 40; press(t, ['k']); t += 50; vanish(); t += 30
press(t, ['l']); t += 40; press(t, ['s', 'l']); t += 40; press(t, ['d']); t += 3; press(t, ['d'], 25); t += 40
press(t, ['u']); t += 120
for (let i = 0; i < 6; i++) { press(t, ['j']); t += 12; press(t, ['k']); t += 30 }
const END = t + 60
async function run(seed) {
  const page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(own => { window.requestAnimationFrame = () => 0; const old = Math.random, re = new RegExp(own); window.__vRandom = []
    Math.random = function () { const st = new Error().stack; if (re.test(st) && __vRandom.length < 5) __vRandom.push(st); return old() } }, OWN)
  await page.goto(server.base + `/index.html?harness=1&p1=violet&p2=violet&seed=${seed}`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.violetTest)
  await page.evaluate(seed => { __harness.rng.forceSeed(seed); __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) }, seed)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready)
  await page.evaluate(() => __harness.setRoundTimer?.(99999))
  const trace = [await page.evaluate(() => 'seed ' + __harness.rng.seed())]; let si = 0
  const evs = [...S].sort((a, b) => a[0] - b[0])
  for (let f = 0; f <= END; f++) {
    while (si < evs.length && evs[si][0] === f) { const [, k, d] = evs[si++]; d ? await page.keyboard.down(k) : await page.keyboard.up(k) }
    await page.evaluate(() => __harness.luffyTest.step(1))
    if (f % 5 === 0) trace.push(await page.evaluate(() => { const H = __harness.violetTest, r = v => Math.round((v || 0) * 1e4) / 1e4
      return [H.raw(), H.raw('p2')].map(x => [r(x.x), r(x.y), x.health, r(x.energy), JSON.stringify(x._violet || null), JSON.stringify(x.currentAttack?.vi || null), x.currentAttack?.name || null, x.facing]).flat().join('|') }))
  }
  const purity = await page.evaluate(() => { const v = __harness.violetTest.raw()._violet; const j = JSON.stringify(v); let finite = true
    JSON.parse(j, (k, x) => { if (typeof x === 'number' && !Number.isFinite(x)) finite = false; return x }); return { exact: JSON.stringify(JSON.parse(j)) === j, finite, used: !!v } })
  const rnd = await page.evaluate(() => window.__vRandom)
  const stats = await page.evaluate(() => __harness.violetTest.state().s?.stats || null)
  await page.close(); return { trace, purity, rnd, stats }
}
try {
  const A = await run(424242), Bv = await run(424242)
  let first = -1; for (let i = 0; i < A.trace.length; i++) if (A.trace[i] !== Bv.trace[i]) { first = i * 5; break }
  ck(`same seed + same inputs → identical state for all ${A.trace.length} checkpoints (${END} frames)`, first < 0 && A.trace.length === Bv.trace.length, { firstDivergentFrame: first, a: A.trace[first / 5], b: Bv.trace[first / 5] })
  ck('the script exercised Violet systems', !!A.stats && A.stats.vanishes >= 1, A.stats)
  ck('f._violet is plain JSON (exact round trip, finite numbers)', A.purity.exact && A.purity.finite && A.purity.used, A.purity)
  ck('no Math.random from any violet*.js module', A.rnd.length === 0 && Bv.rnd.length === 0, A.rnd.slice(0, 2))
} catch (e) { ck('exception', false, e.stack) }
ck('no page errors', errors.length === 0, errors.slice(0, 3))
await browser.close(); server.close?.(); process.exit(summary('violet determinism') ? 1 : 0)
