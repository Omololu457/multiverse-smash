// harness/omnitrix_select_shots.mjs [char ...] — the skin-select screen with the OMNITRIX skin hovered (its own card).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const OUT = 'docs/skins/omnitrix/select'; mkdirSync(OUT, { recursive: true })
const keys = process.argv.slice(2).length ? process.argv.slice(2) : ['naruto', 'goku', 'rick', 'tobirama', 'batman', 'mmpr_rangers']
const server = await serve(), browser = await chromium.launch(), pg = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; pg.on('pageerror', e => errors.push(e.message))
await pg.goto(`${server.base}/index.html?harness=1`); await pg.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 90000 })
let pass = 0
for (const k of keys) {
  const r = await pg.evaluate(k => { const s = window.__harness.showSkinSelect(k, 'p1', 0); const i = s.skins.findIndex(x => x.id === k + '_omnitrixTheme'); window.__harness.showSkinSelect(k, 'p1', i); return { i, n: s.skins.length } }, k)
  await new Promise(res => setTimeout(res, 900))
  const ready = await pg.evaluate(async k => { const { omniSkinCard } = await import('./omniTheme.js'); const { characters } = await import('./characters.js'); return !!omniSkinCard(k, characters[k]) }, k)
  await pg.screenshot({ path: `${OUT}/${k}.png` })
  if (r.i >= 0 && ready) pass++; else console.log('FAIL', k, r, ready)
}
console.log(`OMNITRIX SELECT: ${pass} passed, ${keys.length - pass} failed`, errors.length ? JSON.stringify(errors.slice(0, 3)) : '')
await browser.close(); server.close?.(); process.exit(0)
