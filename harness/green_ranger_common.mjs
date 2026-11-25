// Shared helpers for harness/green_ranger*.mjs — real keyboard input through the actual command parser.
// P1 keys: J light, K heavy, I up-attack, L special, U ultimate, P charge (Dragon Call), ; block, WASD.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
export async function boot({ p2 = 'mmpr_black', query = '' } = {}) {
  const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()) })
  await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(server.base + `/index.html?harness=1&p1=green_ranger&p2=${p2}${query}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.greenRangerTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(2) })
  const G = {
    page, errors, server, browser,
    step: n => page.evaluate(n => { for (let k = 0; k < n; k++) { __harness.luffyTest.step(1); for (let i = 0; i < 400 && window.__dsPrerollStatus?.().active; i++) __harness.luffyTest.step(1) } }, n),   // frozen Ranger ult pre-roll frames don't count (wait only)
    st: (w = 'p1') => page.evaluate(w => __harness.greenRangerTest.state(w), w),
    both: () => page.evaluate(() => { const H = __harness.greenRangerTest, b = H.raw('p2'); return { a: H.state(), b: { hp: b.health, hitstun: b.hitstun || 0, blockstun: b.blockstun || 0, x: b.x, y: b.y, w: b.w, blocking: !!b.isBlocking, knockdown: !!b.knockdownState, grounded: !!(b.onGround || b.grounded), juggle: b.juggleCount || 0, attacking: !!b.attacking, atk: b.currentAttack?.name || null, vy: b.vy }, ult: H.ult() } }),
    async reset(gap = 72, { flip = false, energy = 100, dummy = 'stand', notes = 0, cooldown = 0 } = {}) {
      await page.evaluate(([gap, flip, energy, dummy, notes, cooldown]) => { const H = __harness.greenRangerTest; H.reset(); __harness.setDummyBehavior(dummy); const a = H.raw(), b = H.raw('p2')
        a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
        for (const f of [a, b]) { f.health = f.maxHealth; f.energy = energy; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
          f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 }
        H.set('p1', { notes, cooldown }) }, [gap, flip, energy, dummy, notes, cooldown]); await G.step(1)
    },
    async tap(keys, n = 1) { for (const k of keys) await page.keyboard.down(k); await G.step(n); for (const k of keys) await page.keyboard.up(k) },
    async hold(keys) { for (const k of keys) await page.keyboard.down(k) }, async release(keys) { for (const k of keys) await page.keyboard.up(k) },
    async until(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await G.both(); if (pred(s)) return s; await G.step(1) } return G.both() },
    async shot(path) { await page.screenshot({ path }) },
    close: async () => { await browser.close(); server.close?.() },
  }
  return G
}
