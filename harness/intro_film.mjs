// intro_film.mjs <p1> <p2> <outdir> [every=15] — film the pre-match INTRO (harness.start()) as a frame strip + camera log.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const [p1c = 'naruto', p2c = 'goku', out = 'harness/shots/intro_film', every = '15'] = process.argv.slice(2); mkdirSync(out, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } }); pg.on('pageerror', e => errors.push(e.message))
await pg.goto(`${server.base}/index.html?harness=1&p1=${p1c}&p2=${p2c}`); await pg.waitForFunction(() => !!window.__harness?.start, null, { timeout: 90000 })
await pg.mouse.click(640, 360); await pg.evaluate(() => window.__harness.start())
await pg.evaluate(() => { window.__filmHold = true })
const log = []; let i = 0, f0 = await pg.evaluate(() => window.__harness.state().frame), next = f0
for (let n = 0; n < 1400; n++) {
  const s = await pg.evaluate(() => ({ ...window.__harness.introState(), cam: window.__harness.camera?.() ?? null, fr: window.__harness.state().frame }))
  if (s.fr >= next) { next = s.fr + Number(every); await pg.screenshot({ path: `${out}/f${String(i++).padStart(3, '0')}.png` }); log.push({ i: i - 1, ...s }) }
  if (s.gameState !== 'intro') break
  await pg.waitForFunction(a => window.__harness.state().frame > a, s.fr, { polling: 8, timeout: 5000 }).catch(() => {})
}
writeFileSync(`${out}/log.json`, JSON.stringify(log, null, 1)); console.log('frames', i, 'errors', JSON.stringify(errors))
await browser.close(); server.close?.(); process.exit(0)
