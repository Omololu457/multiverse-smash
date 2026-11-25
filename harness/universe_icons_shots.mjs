// universe_icons_shots.mjs — Universe Select: the grid, then each universe HOVERED (mouse) mid-animation, cropped to its tile.
// Writes docs/ui/universe_icons/. Look at them.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const OUT = new URL('../docs/ui/universe_icons/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } }); pg.on('pageerror', e => errors.push(e.message))
await pg.goto(`${server.base}/index.html?harness=1`); await pg.waitForFunction(() => window.__harness?.ui, null, { timeout: 90000 })
await pg.evaluate(() => window.__harness.ui.goto('SELECT_UNIVERSE')); await pg.waitForTimeout(800)
await pg.screenshot({ path: `${OUT}grid_top.png` })
const cols = [320, 644, 968], rows = [205, 339, 473, 600]
let k = 0
for (let pass = 0; pass < 3; pass++) {
  for (const y of rows) for (const x of cols) {
    await pg.mouse.move(x, y); for (const d of [500, 400]) { await pg.waitForTimeout(d); await pg.screenshot({ path: `${OUT}hover_${pass}_${k}_${d}.png`, clip: { x: x - 160, y: y - 62, width: 320, height: 124 } }) }
    k++
  }
  if (pass < 2) { await pg.mouse.move(640, 400); await pg.mouse.wheel(0, 540); await pg.waitForTimeout(700); await pg.screenshot({ path: `${OUT}grid_${pass + 1}.png` }) }
}
console.log('errors', JSON.stringify(errors)); await browser.close(); server.close?.(); process.exit(errors.length ? 1 : 0)
