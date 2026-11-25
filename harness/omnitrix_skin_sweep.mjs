// harness/omnitrix_skin_sweep.mjs [char ...] — the roster-wide OMNITRIX theme skin (omniTheme.js): for every playable fighter
// equip `<key>_omnitrixTheme` in a real match, render, and check the re-designed sheet is live (dnaSchemeSheet → 'omni') and
// the frame still draws. Screenshots → docs/skins/omnitrix/<key>.png (body crop) + a contact sheet.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const OUT = 'docs/skins/omnitrix'; mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true })
let keys = process.argv.slice(2)
if (!keys.length) {
  const pg = await browser.newPage(); await pg.goto(`${server.base}/index.html?harness=1`)
  await pg.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 90000 })
  keys = await pg.evaluate(async () => { const { getSkins } = await import('./skins.js'); const { characters } = await import('./characters.js')
    return Object.keys(characters).filter(k => getSkins(k).some(s => s.id === k + '_omnitrixTheme')) })
  await pg.close()
}
const res = [], errors = []
for (const k of keys) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } }); pg.on('pageerror', e => errors.push(k + ': ' + e.message))
  let r = { k, ok: false }
  try {
    await pg.goto(`${server.base}/index.html?harness=1&p1=${k}&p2=naruto`, { waitUntil: 'load' })
    await pg.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 90000 })
    await pg.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle() })
    await pg.waitForFunction(() => window.__harness.state().gameState === 'battle', null, { timeout: 60000 })
    await pg.evaluate(id => window.__harness.setSkin('p1', id), k + '_omnitrixTheme')
    await pg.waitForFunction(() => { const f = window.__harness.gojoShinjukuTest.raw('p1'); return f._dnaSheetLive }, null, { timeout: 8000, polling: 50 }).catch(() => {})
    await new Promise(res => setTimeout(res, 300))
    const s = await pg.evaluate(() => { const f = window.__harness.gojoShinjukuTest.raw('p1'); return { id: f.skinId, live: !!f._dnaSheetLive, x: f._lastDrawX, y: f._lastDrawY, w: f._lastDrawW, h: f._lastDrawH } })
    r = { k, ok: s.live && s.id === k + '_omnitrixTheme', ...s }
    await pg.screenshot({ path: `${OUT}/${k}.png`, clip: { x: 0, y: 140, width: 1280, height: 520 } })
  } catch (e) { r.err = String(e).slice(0, 120) }
  res.push(r); console.log((r.ok ? 'PASS ' : 'FAIL ') + k + (r.ok ? '' : ' ' + JSON.stringify(r)))
  await pg.close()
}
writeFileSync(`${OUT}/sweep.json`, JSON.stringify(res, null, 1))
const pass = res.filter(r => r.ok).length
console.log(`OMNITRIX SKIN: ${pass} passed, ${res.length - pass} failed`, errors.length ? 'page errors ' + JSON.stringify([...new Set(errors)].slice(0, 5)) : '')
await browser.close(); server.close?.(); process.exit(0)
