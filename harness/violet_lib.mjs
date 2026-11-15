// harness/violet_lib.mjs — shared driver for the Violet Parr harnesses: boots the REAL game (index.html?harness=1) and drives
// REAL keyboard input (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge, ; block, WASD; double-tap
// A / D = dash). Sim stepping uses the shared luffyTest.step (requestAnimationFrame disabled) — frame-exact.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
export async function boot(p1 = 'violet', p2 = 'violet', seed = 772211, opts = {}) {
  const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  if (!opts.raf) await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=${seed}${opts.query || ''}`); await page.waitForFunction(() => window.__harness?.violetTest, null, { timeout: 60000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.spriteReady().ready, null, { timeout: 60000 })
  const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
  const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.violetTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
  const st = (w = 'p1') => page.evaluate(w => __harness.violetTest.state(w), w)
  async function tap(ks, n = 1) { for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
  async function down(ks) { for (const k of ks) await page.keyboard.down(k) }
  async function up(ks) { for (const k of ks) await page.keyboard.up(k) }
  // motion input: sequence of key-sets, each held `per` frames, the LAST set includes the button (pressed together)
  async function motion(seq, per = 2) { for (const ks of seq) { await down(ks); await step(per); await up(ks.filter(k => !seq[seq.length - 1].includes(k) || ks === seq[seq.length - 1])) } await up(seq.flat()) }
  async function reset(gap = 90, flip = false, o = {}) {
    await page.evaluate(([gap, flip, o]) => { const H = __harness.violetTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); __harness.setRoundTimer?.(5400 * 4); const a = H.raw(), b = H.raw('p2')
      a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
        f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 }
      if (o.cpuFrozen) { b.attackCooldown = 99999 } }, [gap, flip, o]); await step(1)
  }
  async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await st(); if (pred(s)) return s; await step(1) } return st() }
  const guard = on => page.evaluate(on => { const b = __harness.violetTest.raw('p2'); b._forceGuard = on; __harness.setDummyBehavior(on ? 'block' : 'stand') }, on)
  return { server, browser, page, errors, step, S, st, tap, down, up, motion, reset, wait, guard,
    close: async () => { await browser.close(); server.close?.() } }
}
let _pass = 0, _fail = 0
export const ck = (n, c, d = '') => { c ? _pass++ : _fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (typeof d === 'string' ? d : JSON.stringify(d))) }
export const summary = name => { console.log(`\n${name}: ${_pass} passed, ${_fail} failed`); return _fail }
