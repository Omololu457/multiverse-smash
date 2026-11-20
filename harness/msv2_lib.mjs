// harness/msv2_lib.mjs — shared driver for the MSv2 NINJA STORM RANGERS harnesses (real game loop, real key input).
// Keys: a/d/s/w move, j Light, k Heavy, l Special, o Grab, ; Block, u Ultimate (P1 default binds).
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

export function reporter(title) {
  const R = { pass: 0, fail: 0, title }
  R.check = (n, c, d = '') => { (c ? R.pass++ : R.fail++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
  R.section = t => console.log(`\n── ${title} ${t} ──`)
  R.done = () => { console.log(`\n════════════════════════════════════════\n  ${title}: ${R.pass} passed, ${R.fail} failed\n════════════════════════════════════════`); process.exitCode = R.fail ? 1 : 0 }
  return R
}

export async function launch() {
  const server = await serve()
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
  const D = { server, browser, page: null, errors: [] }
  D.boot = async (p1, p2, o = {}) => {
    if (D.page) await D.page.close()
    const page = D.page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    page.on('pageerror', e => D.errors.push(e.message))
    if (!o.raf) await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
    await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
    await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.nsrTest, null, { timeout: 30000 })
    await page.evaluate(o => { if (o.seed != null) __harness.rng.forceSeed(o.seed); __harness.start({ p1Skin: o.p1Skin, p2Skin: o.p2Skin, mode: o.mode, difficulty: o.difficulty }); __harness.skipToBattle() }, o)
    await D.step(2)
    await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
    for (let i = 0; i < 4; i++) { await D.step(5); await new Promise(r => setTimeout(r, 150)) }
  }
  D.step = n => D.page.evaluate(n => __harness.luffyTest.step(n), n)
  D.S = (w = 'p1') => D.page.evaluate(w => __harness.nsrTest.state(w), w)
  D.call = (fn, ...a) => D.page.evaluate(([fn, a]) => __harness.nsrTest[fn](...a), [fn, a])
  D.down = k => D.page.keyboard.down(k)
  D.up = k => D.page.keyboard.up(k)
  D.tap = async (keys, frames = 1) => { keys = [].concat(keys); for (const k of keys) await D.page.keyboard.down(k); await D.step(frames); for (const k of keys) await D.page.keyboard.up(k) }
  // a motion: each entry held 2 frames (null = neutral), then the button
  D.motion = async (seq, button) => {
    let held = []
    for (const k of seq) { const w = k == null ? [] : [].concat(k); for (const x of held) if (!w.includes(x)) await D.up(x); for (const x of w) if (!held.includes(x)) await D.down(x); held = w; await D.step(2) }
    if (button) { for (const b of [].concat(button)) await D.down(b); await D.step(1); for (const b of [].concat(button)) await D.up(b) }
    for (const x of held) await D.up(x)
  }
  // the STANCE DIAL: ↓, release, ↓ (within 16 f), then ONE button (Light → Red, Heavy → Yellow)
  D.dial = async (button, gap = 2) => { await D.tap('s'); await D.step(gap); await D.tap('s'); await D.step(1); await D.tap(button) }
  D.fresh = async (dx = 300, o = {}) => {
    await D.call('reset')
    await D.page.evaluate(([dx, o]) => {
      const T = __harness.nsrTest, a = T.raw('p1'), z = T.raw('p2')
      a.x = o.ax ?? 900; z.x = a.x + dx; z.facing = dx > 0 ? -1 : 1; a.facing = dx > 0 ? 1 : -1
      for (const f of [a, z]) { f.invulnTimer = 0; f.knockdownState = false; f.hitstun = 0; f.blockstun = 0; f.health = f.maxHealth; f.vx = 0; f.vy = 0; f.comboCounter = 0; f.energy = o.energy ?? 100; f.attacking = false; f.currentAttack = null; f.currentMove = null; f.isBlocking = false; f.attackCooldown = 0 }
    }, [dx, o])
    await D.step(3)
  }
  D.settle = async (n = 150) => { for (let i = 0; i < n; i++) { await D.step(1); const s = await D.S(); if (!s.attacking && !(s.hitstun > 0) && !s.r?.blink) break } }
  D.until = async (pred, max = 120) => { for (let i = 0; i < max; i++) { const s = await D.S(); if (pred(s)) return s; await D.step(1) } return null }
  D.close = async () => { await browser.close(); server.close?.() }
  return D
}
