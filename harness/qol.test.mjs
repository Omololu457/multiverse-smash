// harness/qol.test.mjs — Phase 5 QoL: Settings → Anime FX (Off/Low/Full), the pause menu's Restart Match /
// Move List / Character Select, and the training dummy RECORD (F9) / PLAYBACK (F10). Real game, real keys.
//   node harness/qol.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d) } else { fail++; console.log('  ❌', n, d) } }
const J = o => JSON.stringify(o)
fs.mkdirSync('docs/qol', { recursive: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
await page.goto(server.base + '/index.html?harness=1&p1=naruto&p2=goku&seed=99', { waitUntil: 'load' })
await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 120000 })
await page.evaluate(async () => { window.__Q = { I: await import('./input.js'), JS: (await import('./juiceSettings.js')).juiceSettings, AJ: await import('./animeJuice.js'), SG: await import('./animeSignatures.js') } })

// ═══ A. ANIME FX setting ═══
const A = await page.evaluate(() => { const { JS, AJ, SG } = __Q; const prev = JS.animeFx; const r = {}
  JS.setAnimeFx('full'); JS.cycleAnimeFx(); r.cycle1 = JS.animeFx; JS.cycleAnimeFx(); r.cycle2 = JS.animeFx; JS.cycleAnimeFx(); r.cycle3 = JS.animeFx
  r.saved = localStorage.getItem('ms_anime_fx')
  const a = { x: 900, y: 300, w: 60, h: 100, facing: 1, rosterKey: 'naruto', currentMove: null }, b = { x: 1000, y: 300, w: 60, h: 100, facing: -1, rosterKey: 'goku', health: 500, maxHealth: 1000 }
  const sp = { x: 1020, y: 340, category: 'ultimate', damage: 200, moveName: 'ultimate', attackerSide: 'p1', blocked: false }
  for (const lvl of ['off', 'low', 'full']) { JS.setAnimeFx(lvl); AJ.animeJuiceReset(); AJ.animeJuiceOnSpark(sp, a, b, 5000 + lvl.length); const s = AJ.animeJuiceStatus(); r[lvl] = s.kinds.length + s.decalKinds.length }
  JS.setAnimeFx(prev); return r })
ok('A1 Anime FX cycles Off → Low → Full and is saved', A.cycle1 === 'off' && A.cycle2 === 'low' && A.cycle3 === 'full' && A.saved === 'full', J(A))
ok('A2 Anime FX OFF → an ultimate hit adds no anime fx; Low / Full do', A.off === 0 && A.low > 0 && A.full > 0, J(A))
const SF = await page.evaluate(() => { const { JS, SG } = __Q; const fx = SG.__animeSignaturesTest || null; return { hasLevel: typeof SG.sigLevel === 'function', low: (JS.setAnimeFx('low'), SG.sigLevel()), full: (JS.setAnimeFx('full'), SG.sigLevel()) } })
ok('A3 signature level follows the setting', SF.hasLevel && SF.low === 'low' && SF.full === 'full', J(SF))
await page.evaluate(() => { __harness.showSettings?.() })
const onSettings = await page.evaluate(() => __harness.state?.().gameState)
if (onSettings === 'settings') { await page.mouse.wheel(0, 2000); await page.waitForTimeout(300); await page.screenshot({ path: 'docs/qol/settings_anime_fx.png' }) }
ok('A4 Settings screen renders (screenshot docs/qol/settings_anime_fx.png)', onSettings === 'settings' || onSettings === undefined, String(onSettings))

// ═══ P. PAUSE: Move List (returns to pause) / Restart Match / Character Select ═══
await page.evaluate(() => __harness.bootVs()); await page.waitForTimeout(300)
await page.keyboard.press('Escape'); await page.waitForTimeout(150)
const walk = async item => { for (let i = 0; i < 14 && (await page.evaluate(() => __harness.pauseSel())).item !== item; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(40) } return (await page.evaluate(() => __harness.pauseSel())).item }
await page.screenshot({ path: 'docs/qol/pause_menu.png' })
// 2026-11-24 owner removed Move List + Combo Trials from the pause menu (Move List lives in the Controls Lab now).
ok('P1 pause menu no longer has Move List / Combo Trials', await page.evaluate(async () => { const { PAUSE_MENU_ITEMS: I } = await import('./ui.js'); return !I.includes('moveList') && !I.includes('comboTrials') && I.includes('restartMatch') && I.includes('charSelect') }))
// Restart Match
await page.evaluate(() => { const p = __harness.p1(); }); 
const rm0 = await page.evaluate(() => { const f = __harness.enochTest.raw(); f.health = 100; return f.health })
await walk('restartMatch'); await page.keyboard.press('Enter'); await page.waitForTimeout(200)
const rm = await page.evaluate(() => { const f = __harness.enochTest.raw(); return { gs: __harness.state().gameState, hp: f.health, max: f.maxHealth } })
ok('P3 Restart Match → back in battle with full health (rematch from round 1)', rm.gs === 'battle' && rm.hp === rm.max && rm0 === 100, J(rm))
await page.keyboard.press('Escape'); await page.waitForTimeout(150)
await walk('charSelect'); await page.keyboard.press('Enter'); await page.waitForTimeout(250)
const cs = await page.evaluate(() => __harness.state().gameState)
ok('P4 Character Select → the fighter-select flow (universe pick), mode kept', cs === 'selectUniverse' || cs === 'select_universe' || /universe/i.test(cs), cs)

// ═══ R. TRAINING dummy RECORD / PLAYBACK ═══
await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
const R = await page.evaluate(() => { window.requestAnimationFrame = () => 0; const { I } = __Q; const step = n => __harness.luffyTest.step(n)
  const a = __harness.enochTest.raw(), b = __harness.enochTest.raw('p2'); __harness.setDummyBehavior?.('stand')
  a.x = 700; b.x = 1100; a.facing = 1; b.facing = -1; step(2)
  const tap = k => { I.keys[k] = true; step(1); I.keys[k] = false; step(1) }
  tap('f9')                                                   // record: walk FORWARD (right) 40 frames
  I.writeRawControls(a, { right: true }); step(40); I.writeRawControls(a, {}); tap('f9')
  const x0 = b.x; tap('f10'); step(40); const x1 = b.x        // playback: the dummy walks FORWARD = toward P1 = left
  tap('f10'); step(20); const x2 = b.x; step(20); const x3 = b.x
  return { x0, x1, moved: x0 - x1, stoppedDrift: Math.abs(x3 - x2) } })
ok('R1 F9 records your inputs, F10 makes the dummy replay them turned to face you (walks toward P1)', R.moved > 20, J(R))
ok('R2 F10 again stops the playback', R.stoppedDrift < 2, J(R))
await page.evaluate(() => { const { I } = __Q; I.keys.f10 = true; __harness.luffyTest.step(1); I.keys.f10 = false; __harness.luffyTest.step(6) })
await page.screenshot({ path: 'docs/qol/training_record_playback.png' })
ok('Z no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close()
console.log(`\n  QOL: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
