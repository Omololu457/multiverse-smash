// harness/msv1.test.mjs — MSV1 gameplay checks (Shane ns_red / Dustin ns_yellow) on the REAL game loop.
//   node harness/msv1.test.mjs            Keys: a/d/s/w move, j Light, k Heavy, l Special, u Ultimate, p Charge ("Teleport"), ; block
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const SHOTS = 'docs/msv1/screenshots'; fs.mkdirSync(SHOTS, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
const section = t => console.log(`\n── MSV1 ${t} ──`)
const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const errors = []
let page
async function boot(p1, p2) {
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.ninjaTest, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 200)) }
}
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (w = 'p1') => page.evaluate(w => __harness.ninjaTest.state(w), w)
const call = (fn, ...a) => page.evaluate(([fn, a]) => __harness.ninjaTest[fn](...a), [fn, a])
const shot = name => page.screenshot({ path: `${SHOTS}/MSV1_${name}.png` })
const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
const dtap = async (k, gap = 3) => { await tap([k]); await step(gap); await tap([k]) }
async function motion(seq, button, gap = 2) {
  let held = []
  for (const k of seq) { const want = k == null ? [] : [].concat(k); for (const x of held) if (!want.includes(x)) await page.keyboard.up(x); for (const x of want) if (!held.includes(x)) await page.keyboard.down(x); held = want; await step(gap) }
  if (button) { for (const b of [].concat(button)) await page.keyboard.down(b); await step(1); for (const b of [].concat(button)) await page.keyboard.up(b) }
  for (const x of held) await page.keyboard.up(x)
}
async function fresh(dx = 300, o = {}) {
  await call('reset')
  await page.evaluate(([dx, o]) => {
    const T = __harness.ninjaTest, a = T.raw('p1'), z = T.raw('p2')
    a.x = o.ax ?? 900; z.x = a.x + dx; z.facing = dx > 0 ? -1 : 1; a.facing = dx > 0 ? 1 : -1
    for (const f of [a, z]) { f.invulnTimer = 0; f.knockdownState = false; f.hitstun = 0; f.blockstun = 0; f.health = f.maxHealth; f.vx = 0; f.vy = 0; f.comboCounter = 0; f.energy = o.energy ?? 0; f.attacking = false; f.currentAttack = null; f._forceGuard = !!o.guard }
  }, [dx, o])
  await step(3)
  await call('np', 'p1', o.np ?? 100); if (o.np2 != null) await call('np', 'p2', o.np2)
}
const settle = async (n = 90) => { for (let i = 0; i < n; i++) { await step(1); const s = await S(); if (!s.attacking && !(s.hitstun > 0) && !s.s?.streak && !s.s?.vanish) break } }
const hp = async (w = 'p2') => (await S(w)).health

const PHASES = (process.argv[2] || 'all')
try {
  await boot('ns_red', 'ns_yellow')
  const mods = fs.readdirSync('harness').filter(f => /^msv1_scen_.*\.mjs$/.test(f)).sort()
  const X = { step, S, call, shot, tap, dtap, motion, fresh, settle, hp, check, section, boot: async (a, b) => { await page.close(); await boot(a, b) }, get page() { return page } }
  for (const m of mods) { if (PHASES !== 'all' && !m.includes(PHASES)) continue; await (await import(`./${m}`)).run(X) }
} catch (e) { check('MSV1 test ran to completion', false, e.stack || e.message) }
check('MSV1 no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close?.()
console.log(`\n══════════════════════════════\n  MSV1 TEST: ${PASS} passed, ${FAIL} failed\n══════════════════════════════`)
process.exit(FAIL ? 1 : 0)
