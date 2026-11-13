// harness/zoro_buggy_gamepad.test.mjs — Zoro and Buggy played on a CONTROLLER. Fakes navigator.getGamepads() with a
// standard-mapping pad (the layout PS5 / Xbox / generic pads normalise to), lets the game's OWN loop poll it, and checks
// each command layer gets the pad: normals (+ held direction), motion specials on the d-pad AND the stick, Heavy-button
// motions, the super, Zoro's Santoryu chord (R1 + Triangle, also pressed a frame apart) → ASHURA, and that the keyboard
// still drives a keyboard-slot fighter.
//   node harness/zoro_buggy_gamepad.test.mjs
// Standard mapping: 0=Cross(jump) 2=Square(Light) 3=Triangle(Heavy) 5=R1(Special) 7=R2(Ultimate) 12-15=D-pad U/D/L/R.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const server = await serve(), browser = await chromium.launch({ headless: true })
const B = { X: 0, SQUARE: 2, TRIANGLE: 3, R1: 5, R2: 7, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 }
const QCF_PAD = [{ btns: [B.DOWN] }, { btns: [B.DOWN, B.RIGHT] }, { btns: [B.RIGHT] }]
const QCF_STICK = [{ ax: [0, 1] }, { ax: [0.8, 0.8] }, { ax: [1, 0] }]

async function session(p1, p2, api, withPad) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(api => !!window.__harness?.[api] && !!window.__harness?.net, api)
  await page.mouse.click(640, 360)
  if (withPad) await page.evaluate(() => {
    window.__pad = { index: 0, id: 'Fake DualSense (standard)', connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) }
    navigator.getGamepads = () => [window.__pad]
    window.dispatchEvent(new Event('gamepadconnected'))
    if (window.GamepadEvent) { try { window.dispatchEvent(new GamepadEvent('gamepadconnected', { gamepad: window.__pad })) } catch {} }
  })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  const frames = async n => { const s = await page.evaluate(() => __harness.net.frame()); await page.waitForFunction(([a, b]) => __harness.net.frame() >= a + b, [s, n], { timeout: 20000, polling: 8 }) }
  const setBtn = (i, v) => page.evaluate(([i, v]) => { __pad.buttons[i].pressed = v; __pad.buttons[i].value = v ? 1 : 0 }, [i, v])
  const setAxis = (i, v) => page.evaluate(([i, v]) => { __pad.axes[i] = v }, [i, v])
  const st = () => page.evaluate(api => __harness[api].state('p1'), api)
  const fresh = (dx = 110, meter = 100) => page.evaluate(([api, dx, meter]) => { const t = __harness[api]; t.reset()
    const a = t.raw('p1'), z = t.raw('p2'); a.energy = meter; z.x = a.x + dx; z.facing = -1; a.facing = 1; z.health = z.maxHealth; z.invulnTimer = 0; z.hitstun = 0 }, [api, dx, meter])
  async function press(btns, want, ms = 1500) {   // hold until the wanted move starts (live loop), record what was seen
    for (const b of btns) await setBtn(b, true)
    const seen = new Set(); const t0 = Date.now()
    while (Date.now() - t0 < ms) { const s = await st(); if (s.move) seen.add(s.move); if (want && seen.has(want)) break; await frames(1) }
    for (const b of btns) await setBtn(b, false)
    return [...seen]
  }
  async function settle() { for (let i = 0; i < 240; i++) { const s = await st(); if (!s.attacking) break; await frames(1) } await frames(4) }
  async function roll(steps, btn, want) {
    for (const s of steps) { for (const b of [B.UP, B.DOWN, B.LEFT, B.RIGHT]) await setBtn(b, s.btns?.includes(b) || false); if (s.ax) { await setAxis(0, s.ax[0]); await setAxis(1, s.ax[1]) } await frames(2) }
    const seen = await press([btn, ...(steps[steps.length - 1].btns || [])], want)
    for (const b of [B.UP, B.DOWN, B.LEFT, B.RIGHT]) await setBtn(b, false); await setAxis(0, 0); await setAxis(1, 0)
    return seen
  }
  async function held(dirs, btn, want) { for (const d of dirs) await setBtn(d, true); await frames(2); const m = await press([btn], want); for (const d of dirs) await setBtn(d, false); return m }
  return { page, errors, frames, setBtn, setAxis, st, fresh, press, settle, roll, held }
}
const keyboardStillWorks = async (p1, p2, api, want, name) => {
  const K = await session(p1, p2, api, false); await K.frames(6); await K.fresh()
  await K.page.keyboard.down('j'); const seen = new Set()
  for (let i = 0; i < 30; i++) { const s = await K.st(); if (s.move) seen.add(s.move); if (seen.has(want)) break; await K.frames(1) }
  await K.page.keyboard.up('j')
  check(`${name}: keyboard slot still plays (J = Light)`, seen.has(want), [...seen].join())
  check(`${name}: no page errors (keyboard session)`, K.errors.length === 0, K.errors.slice(0, 2).join(' | '))
  await K.page.close()
}

try {
  // ── ZORO ──
  console.log('ZORO')
  let Z = await session('zoro', 'buggy', 'zoroTest', true); await Z.frames(6)
  check('P1 auto-switched to controller', (await Z.page.evaluate(async () => (await import('./input.js')).inputSettings.p1Type)) === 'controller')
  await Z.fresh(); let m = await Z.press([B.SQUARE], 'light'); check('Square = Jab (Light)', m.includes('light'), m.join()); await Z.settle()
  await Z.fresh(); m = await Z.held([B.RIGHT], B.SQUARE, 'zSlash'); check('D-pad → + Square = Slash', m.includes('zSlash'), m.join()); await Z.settle()
  await Z.fresh(); m = await Z.held([B.DOWN], B.SQUARE, 'zLow'); check('D-pad ↓ + Square = Low thrust', m.includes('zLow'), m.join()); await Z.settle()
  await Z.fresh(); m = await Z.press([B.TRIANGLE], 'heavy'); check('Triangle = Heavy', m.includes('heavy'), m.join()); await Z.settle()
  await Z.fresh(400); m = await Z.roll(QCF_PAD, B.R1, 'zTaka'); check('D-pad ↓↘→ + R1 = Taka Nami', m.includes('zTaka'), m.join()); await Z.settle()
  await Z.fresh(400); m = await Z.roll(QCF_STICK, B.R1, 'zTaka'); check('Left STICK ↓↘→ + R1 = Taka Nami', m.includes('zTaka'), m.join()); await Z.settle()
  await Z.fresh(110); m = await Z.held([B.RIGHT], B.R1, 'zOni'); check('→ + R1 = Oni Giri', m.includes('zOni'), m.join()); await Z.settle()
  // Santoryu staggered first (R1 lands a frame early → it starts Taka Nami, which A+B cancels), then in the same poll.
  // In-page so the stagger is exactly ONE sim frame (a test round-trip lets ~4 frames pass, beyond the 3-frame chord window).
  await Z.fresh(400); await Z.page.evaluate(([r1, tri]) => new Promise(res => {
    const down = i => { __pad.buttons[i].pressed = true; __pad.buttons[i].value = 1 }
    down(r1); const f0 = __harness.net.frame(); const poll = () => { if (__harness.net.frame() >= f0 + 1) { down(tri); res() } else setTimeout(poll, 0) }; poll()
  }), [B.R1, B.TRIANGLE])
  for (let i = 0; i < 30 && !(await Z.st()).santoryu; i++) await Z.frames(1)
  const zs = await Z.st(); await Z.setBtn(B.R1, false); await Z.setBtn(B.TRIANGLE, false)
  check('R1 then Triangle a frame later = SANTORYU (cancels the special R1 started)', zs.santoryu, `${zs.move} energy ${zs.energy}`); await Z.settle()
  check('Zoro: no page errors (controller session 1)', Z.errors.length === 0, Z.errors.slice(0, 2).join(' | '))
  await Z.page.close()
  // A new match (no Santoryu cooldown left over) for the same-poll chord, then ASHURA while Santoryu is on.
  Z = await session('zoro', 'buggy', 'zoroTest', true); await Z.frames(6)
  await Z.fresh(400); await Z.page.evaluate(([a, b]) => { for (const i of [a, b]) { __pad.buttons[i].pressed = true; __pad.buttons[i].value = 1 } }, [B.R1, B.TRIANGLE])
  for (let i = 0; i < 30 && !(await Z.st()).santoryu; i++) await Z.frames(1)
  await Z.setBtn(B.R1, false); await Z.setBtn(B.TRIANGLE, false)
  check('R1 + Triangle together = SANTORYU', (await Z.st()).santoryu, (await Z.st()).move); await Z.settle()
  await Z.page.evaluate(() => { const a = __harness.zoroTest.raw('p1'); a.energy = 100; a.ultimateCooldown = 0; const z = __harness.zoroTest.raw('p2'); z.x = a.x + 100 * (a.facing || 1); z.health = z.maxHealth })
  m = await Z.press([B.R2], 'zAshura'); check('in Santoryu, R2 = ASHURA', m.includes('zAshura'), m.join())
  check('Zoro: no page errors (controller session)', Z.errors.length === 0, Z.errors.slice(0, 2).join(' | '))
  await Z.page.close()
  await keyboardStillWorks('zoro', 'buggy', 'zoroTest', 'light', 'Zoro')

  // ── BUGGY ──
  console.log('BUGGY')
  const G = await session('buggy', 'zoro', 'buggyTest', true); await G.frames(6)
  check('P1 auto-switched to controller', (await G.page.evaluate(async () => (await import('./input.js')).inputSettings.p1Type)) === 'controller')
  await G.fresh(); m = await G.press([B.SQUARE], 'light'); check('Square = Jab (Light)', m.includes('light'), m.join()); await G.settle()
  await G.fresh(); m = await G.held([B.RIGHT], B.SQUARE, 'bSlash'); check('D-pad → + Square = Slash', m.includes('bSlash'), m.join()); await G.settle()
  await G.fresh(); m = await G.held([B.DOWN], B.TRIANGLE, 'bKick'); check('D-pad ↓ + Triangle = Kick', m.includes('bKick'), m.join()); await G.settle()
  await G.fresh(); m = await G.press([B.TRIANGLE], 'heavy'); check('Triangle = Carve (Heavy)', m.includes('heavy'), m.join()); await G.settle()
  await G.fresh(400); m = await G.roll(QCF_PAD, B.R1, 'bCannon'); check('D-pad ↓↘→ + R1 = Cannon', m.includes('bCannon'), m.join()); await G.settle()
  await G.fresh(400); m = await G.roll(QCF_STICK, B.R1, 'bCannon'); check('Left STICK ↓↘→ + R1 = Cannon', m.includes('bCannon'), m.join()); await G.settle()
  await G.fresh(400); m = await G.roll(QCF_PAD, B.TRIANGLE, 'bEscape'); check('D-pad ↓↘→ + Triangle = Escape (Heavy motion)', m.includes('bEscape'), m.join()); await G.settle()
  await G.fresh(300); m = await G.press([B.R1], 'bFan'); check('R1 (neutral) = Knife Fan', m.includes('bFan'), m.join()); await G.settle()
  await G.fresh(140, 100); m = await G.press([B.R2], 'bSuper'); check('R2 at 100 Chop = BUGGY BALL BARRAGE', m.includes('bSuper'), m.join())
  check('Buggy: no page errors (controller session)', G.errors.length === 0, G.errors.slice(0, 2).join(' | '))
  await G.page.close()
  await keyboardStillWorks('buggy', 'zoro', 'buggyTest', 'light', 'Buggy')
} catch (e) { check('test ran to completion', false, e.stack || e.message) }
console.log(`\n════════════════════════════════════════\n  ZORO + BUGGY CONTROLLER: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(FAIL ? 1 : 0)
