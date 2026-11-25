// menu_trim.test.mjs — owner 2026-11-24: "delete all of the codex and the entire story mode, also the controls tab button and
// replace it with controls.html". Checks: no STORY MODE / CODEX on the main or pause menu; one CONTROLS entry on each that
// navigates to controls.html; a match still plays and ends cleanly; no page errors.  Run: node harness/menu_trim.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0
const ck = (n, c, i = '') => { if (c) { pass++; console.log('PASS', n) } else { fail++; console.log('FAIL', n, i) } }
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
async function open() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&p1=luffy&p2=zoro`, { timeout: 120000 }); await page.waitForFunction(() => window.__harness?.ui, null, { timeout: 120000 })
  return page
}
try {
  let page = await open()
  const ids = await page.evaluate(() => { window.__harness.ui.goto('MAIN_MENU'); return window.__harness.ui.mainMenuRects().map(r => r.id) })
  ck('main menu has no STORY MODE', !ids.includes('story'), ids.join(','))
  ck('main menu has no CODEX', !ids.includes('codex'), ids.join(','))
  ck('main menu has exactly one CONTROLS (controlsLab) and no old HOW TO PLAY', ids.filter(i => i === 'controlsLab').length === 1 && !ids.includes('tutorial'), ids.join(','))
  ck('SETTINGS still there', ids.includes('settings'))
  for (const gone of ['playTutorial', 'academy', 'moveList', 'account', 'savefile']) ck(`main menu: ${gone} removed`, !ids.includes(gone), ids.join(','))
  const gp = await page.evaluate(async () => { const U = await import('./ui.js'); return U.getGameplaySelectRects(document.querySelector('canvas')).map(r => r.id) })
  ck('PLAY menu: Tournament + Combo Trials removed', !gp.includes('bracket') && !gp.includes('comboTrials') && gp.includes('vs'), gp.join(','))
  const { PAUSE_MENU_ITEMS } = await page.evaluate(async () => ({ PAUSE_MENU_ITEMS: (await import('./ui.js')).PAUSE_MENU_ITEMS }))
  ck('pause menu: no Codex / Move List / Combo Trials, Controls kept', !['codex', 'moveList', 'comboTrials'].some(i => PAUSE_MENU_ITEMS.includes(i)) && PAUSE_MENU_ITEMS.includes('controls'), PAUSE_MENU_ITEMS.join(','))
  ck('removed game states are gone', await page.evaluate(() => ['STORY_MODE', 'STORY_INTRO', 'CUTSCENE', 'CODEX'].every(s => window.__harness.ui.goto(s) !== s.toLowerCase())))
  // click CONTROLS on the main menu → controls.html
  await page.evaluate(() => window.__harness.ui.goto('MAIN_MENU'))
  const r = await page.evaluate(() => { const x = window.__harness.ui.mainMenuRects().find(r => r.id === 'controlsLab'); return x })
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'), b = c.getBoundingClientRect(); return { l: b.left, t: b.top, sx: b.width / c.width, sy: b.height / c.height, cw: c.width } })
  const dpr = await page.evaluate(() => (window.__harness.ui.canvasInfo().w))
  const k = box.sx * (box.cw / dpr)
  await Promise.all([page.waitForURL(/controls\.html/, { timeout: 30000 }).catch(() => {}), page.mouse.click(box.l + (r.x + r.w / 2) * k, box.t + (r.y + r.h / 2) * k)])
  ck('main-menu CONTROLS opens controls.html', /controls\.html/.test(page.url()), page.url())
  ck('controls.html has TUTORIAL / ACADEMY / COMBO TRIALS links', await page.evaluate(() => ['tutorial', 'academy', 'comboTrials'].every(k => !!document.querySelector(`#gameLinks a[href="index.html?open=${k}"]`))))
  await page.screenshot({ path: new URL('../docs/menu_trim_controls_header.png', import.meta.url).pathname, clip: { x: 0, y: 0, width: 1280, height: 120 } })
  await page.close()
  // deep links land on the right screens
  for (const [k, want] of [['tutorial', /tutorial/i], ['academy', /^academy$/], ['comboTrials', /combo/i]]) {
    const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } }); pg.on('pageerror', e => errors.push(`${k}: ${e.message}`))
    await pg.goto(`${server.base}/index.html?harness=1&open=${k}`, { timeout: 120000 })
    const st = await pg.waitForFunction(w => { const s = window.__harness?.ui?.state?.(); if (w.src === 'tutorial') return window.__harness?.tutorial?.info?.() ? 'tutorial:' + s : false; return s && new RegExp(w.src, w.flags).test(s) ? s : false }, { src: want.source, flags: want.flags }, { timeout: 60000 }).then(h => h.jsonValue()).catch(async () => 'timeout')
    ck(`index.html?open=${k} opens it`, st !== 'timeout', st)
    await pg.close()
  }
  // a match still runs and ends
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })   // same boot as the fighter tests: the harness steps the sim
  await page.goto(`${server.base}/index.html?harness=1&p1=luffy&p2=zoro&seed=5`, { timeout: 120000 }); await page.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 120000 })
  const m = await page.evaluate(() => { const T = window.__harness.luffyTest; window.__harness.bootSkin?.('default', 'default'); T.step(300); const hp0 = T.state('p2').health; window.__harness.forceP1MatchWin(); T.step(60); return { key: T.state('p1').key, hp0, v: window.__harness.ui.victoryLabel() } })
  ck('a match runs 300 frames and a P1 win reaches the victory screen', m.key === 'luffy' && m.hp0 > 0 && m.v.active === true, JSON.stringify(m))
  await page.close()
} catch (e) { fail++; console.log('FAIL exception', e.message) }
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close?.()
console.log(`MENU TRIM: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
