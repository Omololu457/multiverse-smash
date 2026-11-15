// harness/batman_lib.mjs — shared driver for the Batman (rebuilt) harnesses: boots the REAL game (index.html?harness=1)
// and drives REAL keyboard input (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge, ; block,
// WASD; double-tap A / D = dash). Sim stepping uses the shared luffyTest.step (requestAnimationFrame disabled).
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
export async function boot(p1 = 'batman', p2 = 'batman', seed = 881402, opts = {}) {
  const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  if (!opts.raf) await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=${seed}${opts.query || ''}`); await page.waitForFunction(() => window.__harness?.batmanTest, null, { timeout: 60000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.spriteReady().ready, null, { timeout: 60000 })
  const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
  const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.batmanTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
  const state = () => page.evaluate(() => { const H = __harness.batmanTest, b = H.raw('p2'); return { a: H.state(), b: { hp: b.health, x: b.x, y: b.y, w: b.w, h: b.h, grounded: !!(b.onGround || b.grounded), knockdown: !!b.knockdownState, juggle: b.juggleCount || 0, key: b.rosterKey }, stun: b.hitstun || 0, block: b.blockstun || 0, ult: H.ult(), hud: H.hud() } })
  async function tap(ks, n = 1) { await step(1); for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
  async function hold(ks, fn) { for (const k of ks) await page.keyboard.down(k); try { return await fn() } finally { for (const k of ks) await page.keyboard.up(k) } }
  async function dtap(k) { await tap([k], 1); await step(1); await tap([k], 1) }
  async function reset(gap = 80, flip = false, o = {}) {
    await page.evaluate(([gap, flip, o]) => { const H = __harness.batmanTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
      a.x = flip ? 1300 + gap : 1300; b.x = flip ? 1300 : 1300 + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
        f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
  }
  async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
  const idle = () => wait(s => !s.a.attack && s.a.grounded && !s.ult.active && !s.a.hitstun && !(s.a.s?.ops?.length), 900)
  const guard = on => page.evaluate(on => { const b = __harness.batmanTest.raw('p2'); b._forceGuard = on; __harness.setDummyBehavior(on ? 'block' : 'stand') }, on)
  // run `fn` and log every HP drop of P2 (with hitstun-before for true-combo checks)
  async function track(fn, settle = 600) {
    let s = await state(); const hp0 = s.b.hp, e0 = s.a.energy, log = []; let hp = hp0, stun = s.stun, frame = 0, lastBs = s.block
    const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state(); if (q.b.hp < hp) log.push({ d: hp - q.b.hp, stunBefore: stun, f: frame, blocked: q.block > lastBs || q.block > 0 && stun === 0 }); hp = q.b.hp; stun = Math.max(q.stun, q.b.knockdown ? 1 : 0); lastBs = q.block } }
    const press = async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) }
    await fn({ watch, press, state })
    for (let j = 0; j < settle; j++) { const q = await state(); if (!q.a.attack && !q.ult.active && !(q.a.s?.ops?.length) && !(q.a.s?.pay?.length) && !q.a.s?.bat && !q.a.s?.hook) break; await watch(1) }
    s = await state()
    return { dmg: hp0 - s.b.hp, hits: log.map(x => x.d), log, energy: +(e0 - s.a.energy).toFixed(2), s }
  }
  return { server, browser, page, errors, step, S, state, tap, hold, dtap, reset, wait, idle, guard, track,
    close: async () => { await browser.close(); server.close?.() } }
}
