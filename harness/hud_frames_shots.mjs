// hud_frames_shots.mjs — contact sheet of the universe-shaped HUD frames (hudFrames.js): one fighter per universe as P1,
// life at 62 % / energy at 70 %. Writes docs/ui/hud_frames/<key>.png (top-left HUD crop + energy crop). Look at them.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const KEYS = process.argv.slice(2).length ? process.argv.slice(2) : ['naruto', 'gojo', 'rengoku', 'goku', 'ichigo', 'mmpr_rangers', 'ben10', 'killua', 'luffy', 'superman', 'spiderman', 'mr_incredible', 'rick', 'jason', 'saitama', 'light', 'saiki', 'jesus', 'omololu', 'baki']
const OUT = new URL('../docs/ui/hud_frames/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
for (const k of KEYS) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } }); pg.on('pageerror', e => errors.push(`${k}: ${e.message}`))
  await pg.goto(`${server.base}/index.html?harness=1&p1=${k}&p2=luffy&seed=5`); await pg.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 90000 })
  await pg.evaluate(() => { __harness.bootSkin?.('default', 'default') }); await pg.waitForTimeout(2000)
  await pg.evaluate(() => { const p = __harness.gojoShinjukuTest.raw('p1'); p.health = p.maxHealth * 0.62; p.energy = (p.maxEnergy || 100) * 0.7 }); await pg.waitForTimeout(1500)
  await pg.screenshot({ path: `${OUT}${k}_top.png`, clip: { x: 0, y: 0, width: 440, height: 72 } })
  await pg.screenshot({ path: `${OUT}${k}_en.png`, clip: { x: 60, y: 646, width: 380, height: 64 } })
  await pg.close()
}
console.log('errors', JSON.stringify(errors)); await browser.close(); server.close?.(); process.exit(errors.length ? 1 : 0)
