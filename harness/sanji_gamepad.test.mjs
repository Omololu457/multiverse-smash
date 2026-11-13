// harness/sanji_gamepad.test.mjs — Sanji played on a CONTROLLER. Fakes navigator.getGamepads() with a standard-mapping
// pad (the layout PS5 / Xbox / generic pads normalise to), lets the game's OWN loop poll it, and checks every kind of
// Sanji input reaches his command layer: normals (+ held direction), Diable Jambe (R1 + Triangle), a motion special
// (↓↘→ + R1 on the d-pad AND on the stick), an air motion (Sky Walk), the super (R2), the launcher follow-jump on the
// X (jump) button, and that the keyboard still drives a keyboard-slot Sanji.
//   node harness/sanji_gamepad.test.mjs
// Standard mapping: 0=Cross(jump) 2=Square(Light) 3=Triangle(Heavy) 5=R1(Special) 7=R2(Ultimate) 12-15=D-pad U/D/L/R.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const server = await serve(), browser = await chromium.launch({ headless: true })
const B = { X: 0, SQUARE: 2, TRIANGLE: 3, R1: 5, R2: 7, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 }
async function session(withPad) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(server.base + '/index.html?harness=1&p1=sanji&p2=zoro', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.sanjiTest && !!window.__harness?.net)
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
  const st = () => page.evaluate(() => __harness.sanjiTest.state('p1'))
  const fresh = (dx = 96, heat = 100) => page.evaluate(([dx, heat]) => { const t = __harness.sanjiTest; t.reset(); t.heat('p1', heat)
    const a = t.raw('p1'), z = t.raw('p2'); z.x = a.x + dx; z.facing = -1; a.facing = 1; z.health = z.maxHealth; z.invulnTimer = 0; z.hitstun = 0 }, [dx, heat])
  // Hold buttons until a move starts (live loop timing), record every move seen, then release.
  async function press(btns, want, ms = 1500) {
    for (const b of btns) await setBtn(b, true)
    const seen = new Set(); const t0 = Date.now()
    while (Date.now() - t0 < ms) { const s = await st(); if (s.move) seen.add(s.move); if (want && seen.has(want)) break; await frames(1) }
    for (const b of btns) await setBtn(b, false)
    return [...seen]
  }
  async function settle() { for (let i = 0; i < 200; i++) { const s = await st(); if (!s.attacking && !s.s?.inSuper) break; await frames(1) } await frames(4) }
  async function roll(steps, btn, want) {   // a motion on the d-pad (arrays of held buttons) or the stick (axis pairs)
    for (const s of steps) { for (const b of [B.UP, B.DOWN, B.LEFT, B.RIGHT]) await setBtn(b, s.btns?.includes(b) || false); if (s.ax) { await setAxis(0, s.ax[0]); await setAxis(1, s.ax[1]) } await frames(2) }
    const seen = await press([btn, ...(steps[steps.length - 1].btns || [])], want)
    for (const b of [B.UP, B.DOWN, B.LEFT, B.RIGHT]) await setBtn(b, false); await setAxis(0, 0); await setAxis(1, 0)
    return seen
  }
  return { page, errors, frames, setBtn, setAxis, st, fresh, press, settle, roll }
}
try {
  const P = await session(true)
  await P.frames(6)
  const type = await P.page.evaluate(async () => (await import('./input.js')).inputSettings.p1Type)
  check('P1 auto-switched to controller (pad connected)', type === 'controller', type)
  await P.fresh(); let m = await P.press([B.SQUARE], 'sCollier'); check('Square = Collier (Light)', m.includes('sCollier'), m.join()); await P.settle()
  await P.fresh(); m = await P.press([B.TRIANGLE], 'sCotelette'); check('Triangle = Côtelette (Heavy)', m.includes('sCotelette'), m.join()); await P.settle()
  await P.fresh(); await P.setBtn(B.RIGHT, true); await P.frames(2); m = await P.press([B.SQUARE], 'sEpaule'); await P.setBtn(B.RIGHT, false)
  check('D-pad → + Square = Épaule (held direction)', m.includes('sEpaule'), m.join()); await P.settle()
  await P.fresh(); await P.setBtn(B.DOWN, true); await P.setBtn(B.RIGHT, true); await P.frames(2); m = await P.press([B.SQUARE], 'sGigot'); await P.setBtn(B.DOWN, false); await P.setBtn(B.RIGHT, false)
  check('D-pad ↘ + Square = Gigot', m.includes('sGigot'), m.join()); await P.settle()
  await P.fresh(96, 100); m = await P.press([B.R1, B.TRIANGLE], 'sIgnite')
  check('R1 + Triangle = DIABLE JAMBE ignite', m.includes('sIgnite'), m.join()); await P.frames(50)
  check('…and the leg is lit', (await P.st()).s.dj > 0, (await P.st()).s.dj); await P.settle()
  await P.fresh(140, 100); m = await P.roll([{ btns: [B.DOWN] }, { btns: [B.DOWN, B.RIGHT] }, { btns: [B.RIGHT] }], B.R1, 'sMouton')
  check('D-pad ↓↘→ + R1 = Mouton Shot', m.includes('sMouton'), m.join()); await P.settle()
  await P.fresh(140, 100); m = await P.roll([{ ax: [0, 1] }, { ax: [0.8, 0.8] }, { ax: [1, 0] }], B.R1, 'sMouton')
  check('Left STICK ↓↘→ + R1 = Mouton Shot', m.includes('sMouton'), m.join()); await P.settle()
  await P.fresh(600, 100); await P.setBtn(B.X, true); await P.frames(3); await P.setBtn(B.X, false); await P.frames(5)
  m = await P.roll([{ btns: [B.DOWN] }, { btns: [B.DOWN, B.RIGHT] }, { btns: [B.RIGHT] }], B.TRIANGLE, 'sSkyWalk')
  check('X jump, then air ↓↘→ + Triangle = Sky Walk', m.includes('sSkyWalk') && (await P.st()).s.skyWalks >= 1, m.join())
  for (let i = 0; i < 150; i++) { if ((await P.st()).onGround) break; await P.frames(1) } await P.settle()
  await P.fresh(90, 100); m = await P.press([B.R2], 'sPTKC'); check('R2 at 100 Heat = PARTY TABLE KICK COURSE', m.includes('sPTKC'), m.join()); await P.settle(); await P.frames(30)
  // Launcher follow-jump on the X button: Poitrine (← + Triangle) → X on hit.
  // ← and Triangle go down in the SAME poll (holding ← first would walk him out of range), then X the moment it connects.
  await P.fresh(70, 10)
  const z0 = (await P.page.evaluate(() => __harness.sanjiTest.raw('p2').health))
  await P.page.evaluate(([l, t]) => { for (const i of [l, t]) { __pad.buttons[i].pressed = true; __pad.buttons[i].value = 1 } }, [B.LEFT, B.TRIANGLE])
  m = []; let hit = false
  for (let i = 0; i < 60; i++) { const s = await P.st(); if (s.move && !m.includes(s.move)) m.push(s.move)
    if ((await P.page.evaluate(() => __harness.sanjiTest.raw('p2').health)) < z0) { hit = true; break } await P.frames(1) }
  await P.setBtn(B.LEFT, false); await P.setBtn(B.TRIANGLE, false)
  await P.setBtn(B.X, true); await P.frames(3); await P.setBtn(B.X, false)
  let rose = false; for (let i = 0; i < 20; i++) { const s = await P.st(); if (!s.onGround && s.vy < 0) { rose = s.vy > -20; break } await P.frames(1) }
  check('Poitrine hit → X = the low launcher follow-jump (not his full jump)', m.includes('sPoitrine') && hit && rose, `${m.join()} hit=${hit}`)
  check('no page errors (controller session)', P.errors.length === 0, P.errors.slice(0, 2).join(' | '))
  await P.page.close()
  // Keyboard slot (no pad): unchanged.
  const K = await session(false); await K.frames(6)
  await K.fresh(); await K.page.keyboard.down('j'); let seen = new Set(); for (let i = 0; i < 30; i++) { const s = await K.st(); if (s.move) seen.add(s.move); if (seen.has('sCollier')) break; await K.frames(1) } await K.page.keyboard.up('j')
  check('keyboard slot still plays Sanji (J = Collier)', seen.has('sCollier'), [...seen].join())
  check('no page errors (keyboard session)', K.errors.length === 0, K.errors.slice(0, 2).join(' | '))
} catch (e) { check('test ran to completion', false, e.stack || e.message) }
console.log(`\n════════════════════════════════════════\n  SANJI CONTROLLER: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(FAIL ? 1 : 0)
