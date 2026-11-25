// round_break_film.mjs <p1> <p2> <outdir> [everyFrames=12] [winner=p1] — real-time: start a VS match, end round 1 with a KO
// (forceP1Win / P1 KO) and film the ROUND BREAK (get up → hurt → dash / flyer lap → crash) as screenshots + a fighter log.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const [p1c = 'naruto', p2c = 'goku', out = 'harness/shots/round_break_film', every = '120', winner = 'p1'] = process.argv.slice(2); mkdirSync(out, { recursive: true })
const server = await serve(), errors = []
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] })
const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } }); pg.on('pageerror', e => errors.push(e.message))
await pg.goto(`${server.base}/index.html?harness=1&p1=${p1c}&p2=${p2c}`); await pg.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 90000 })
await pg.mouse.click(640, 360)
await pg.evaluate(() => { window.__harness.start({ mode: 'vs', difficulty: 'dummy' }); window.__harness.skipToBattle() })
await pg.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === 'battle' && s.countdown === 0 }, null, { timeout: 60000 })
await new Promise(r => setTimeout(r, 600))
await pg.evaluate(() => { const H = window.__harness, a = H.gojoShinjukuTest?.raw?.('p1'), b = H.gojoShinjukuTest?.raw?.('p2'); if (a && b) { a.x -= 380; b.x += 260 } })   // knock both off their marks so the trip home shows
await pg.evaluate(w => { const H = window.__harness; if (w === 'p1') H.forceP1Win(); else H.koP1() }, winner)
await pg.waitForFunction(() => window.__harness.state().gameState === 'roundBreak', null, { timeout: 20000 })
const log = [], t0 = Date.now(); let i = 0, lastFr = -99
while (Date.now() - t0 < 180000) {
  const s = await pg.evaluate(() => { const H = window.__harness, P = f => ({ x: Math.round(f.x), y: Math.round(f.y), kd: !!f.knockdownState, hs: f.hitstun | 0, dash: f.dashTimer | 0, gr: !!f.grounded }); const st = H.state(); return { g: st.gameState, fr: st.frame, a: P(H.p1()), b: P(H.p2()) } })
  log.push(s); if (s.g !== 'roundBreak') break
  if (s.fr - lastFr >= Number(every)) { lastFr = s.fr; await pg.screenshot({ path: `${out}/f${String(i++).padStart(3, '0')}.png` }) } else await new Promise(r => setTimeout(r, 15))
}
writeFileSync(`${out}/log.json`, JSON.stringify(log, null, 1)); console.log('shots', i, 'errors', JSON.stringify(errors), 'end', log.at(-1)?.g)
await browser.close(); server.close?.(); process.exit(0)
