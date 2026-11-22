// harness/aivsai_pick_flow.test.mjs — AI vs AI uses the REAL select screens: Gameplay Select → AI vs AI opens universe →
// character → skin for P1 and P2, then stage select, then the AI-vs-AI setup screen (difficulty / map / matches / speed /
// START). Fighter rows reopen the pick flow, the MAP row opens stage select, ◀▶ on MAP toggles picked ↔ rotate, START
// runs on the picked fighters + skins + map for every match. Real keys / clicks, real-time game loop.
//   node harness/aivsai_pick_flow.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
let pass = 0, fail = 0
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${c ? '' : d}`) }
const E = (fn, a) => page.evaluate(fn, a)
const wait = ms => new Promise(r => setTimeout(r, ms))
const state = () => E(() => __harness.ui.state())
async function untilState(want, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if ((await state()) === want) return true; await wait(60) } return false }
async function key(k) { await page.keyboard.down(k); await wait(70); await page.keyboard.up(k); await wait(160) }
// click the centre of a canvas-space rect
async function clickRect(r) {
  const box = await page.locator('canvas').first().boundingBox(), info = await E(() => __harness.ui.canvasInfo())
  await page.mouse.click(box.x + (r.x + r.w / 2) * box.width / info.w, box.y + (r.y + r.h / 2) * box.height / info.h); await wait(250)
}
// universe → character → skin with Enter (whatever card is highlighted), until we leave the pick screens for `side`
async function pickSide(nextState) {
  for (let i = 0; i < 40; i++) {
    const s = await state()
    if (s === nextState) return true
    if (s === 'selectUniverse' || s === 'selectCharacter' || s === 'selectSkin' || s === 'selectAliens' || s === 'selectEdoBackup') {
      const rs = (await E(() => __harness.aiVsAi.screenRects())).filter(r => r && !['back', 'navback', 'cancel'].includes(r.id))
      if (rs[0]) await clickRect(rs[0]); await wait(450)
    }
    else await wait(150)
  }
  return false
}
await page.goto(server.base + '/index.html?harness=1&seed=3')
await page.waitForFunction(() => window.__harness?.ui, null, { timeout: 30000 })
await wait(800)
await E(() => __harness.ui.goto('GAMEPLAY_SELECT')); await wait(300)
const gs = await E(() => __harness.ui.gameplaySelectRects())
await clickRect(gs.find(r => r.id === 'aivsai'))
ck('AI vs AI from Gameplay Select opens the REAL universe select (no setup-screen scroll first)', (await state()) === 'selectUniverse', await state())
// P1 picks; P2 picks; stage select appears
const p1ok = await pickSide('selectStage')
ck('P1 then P2 pick on universe → character → skin, then the MAP screen opens', p1ok && (await state()) === 'selectStage', await state())
const stages = await E(() => __harness.ui.currentHoverRects())
const stageIdx = Math.min(3, stages.length - 1)
await clickRect(stages[stageIdx])
ck('picking a map lands on the AI-vs-AI setup screen (not a match)', await untilState('aiVsAiSetup', 3000), await state())
let cfg = await E(() => __harness.aiVsAi.config?.() ?? null)
ck('setup shows the picked fighters, skins and map', !!cfg && !!cfg.p1Key && !!cfg.p2Key && !!cfg.stageName, JSON.stringify(cfg))
const firstStage = cfg?.stageName
// MAP row: ◀▶ toggles rotate ↔ picked
const rows = await E(() => __harness.aiVsAi.setupRects())
const mapRow = rows.findIndex(r => r.id === 'map')
await page.mouse.move(2, 2); await wait(150)   // park the pointer: hovering a setup row moves its cursor
await E(i => __harness.aiVsAi.setSel(i), mapRow)
await key('ArrowRight'); cfg = await E(() => __harness.aiVsAi.config())
ck('◀▶ on MAP switches to ROTATE (every map)', cfg.stageName === null, JSON.stringify(cfg.stageName))
await key('ArrowRight'); cfg = await E(() => __harness.aiVsAi.config())
ck('… and back to the picked map', cfg.stageName === firstStage, JSON.stringify(cfg.stageName))
// fighter rows: arrows no longer scroll the roster
const before = cfg.p1Key
await E(() => __harness.aiVsAi.setSel(0)); await key('ArrowRight'); await key('ArrowRight')
cfg = await E(() => __harness.aiVsAi.config())
ck('◀▶ on P1 FIGHTER no longer scrolls through the roster', cfg.p1Key === before, cfg.p1Key)
// MAP row click → stage select → a different map → back to setup
await clickRect(rows[mapRow])
ck('clicking MAP opens the map screen', (await state()) === 'selectStage', await state())
const st2 = await E(() => __harness.ui.currentHoverRects())
await clickRect(st2[0])
await untilState('aiVsAiSetup', 3000); cfg = await E(() => __harness.aiVsAi.config())
ck('… picking another map updates it and returns to setup, fighters kept', cfg.stageName && cfg.stageName !== firstStage && cfg.p1Key === before, JSON.stringify({ s: cfg.stageName, firstStage, p1: cfg.p1Key }))
// fighter row → full pick flow again
await clickRect(rows[0])
ck('clicking P1 FIGHTER reopens the character select flow', (await state()) === 'selectUniverse', await state())
await page.mouse.move(2, 2); await wait(150)
await page.keyboard.press('Escape'); await wait(400)
ck('Esc backs out to the setup screen with the picks intact', (await state()) === 'aiVsAiSetup' && (await E(() => __harness.aiVsAi.config())).p1Key === before, await state())
// START → the run uses picked fighters, skins and the picked map
await page.mouse.move(2, 2); await wait(150)
await E(() => __harness.aiVsAi.setSel(__harness.aiVsAi.setupRects().findIndex(r => r.id === 'speed'))); await key('ArrowLeft'); await key('ArrowLeft')   // slow it down a bit
await E(() => __harness.aiVsAi.setSel(__harness.aiVsAi.setupRects().findIndex(r => r.id === 'start'))); await key('Enter')
await wait(1500)
const run = await E(() => __harness.aiVsAi.live())
cfg = await E(() => __harness.aiVsAi.config())
ck('START runs AI vs AI on the picked fighters, skins and map', run.mode === 'aivsai' && run.p1 === cfg.p1Key && run.p2 === cfg.p2Key && run.stage === cfg.stageName && run.p1Skin === cfg.p1Skin && run.p2Skin === cfg.p2Skin, JSON.stringify({ run, cfg }))
ck('a normal VS match afterwards is NOT hijacked by the pick hook', await E(() => __harness.aiVsAi.pickMode() === null))
ck('no page errors', !errs.length, [...new Set(errs)].slice(0, 3).join(' | '))
console.log(`\n  AI VS AI PICK FLOW: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
