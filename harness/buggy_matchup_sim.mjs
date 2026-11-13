// harness/buggy_matchup_sim.mjs — Buggy BALANCE_NOTES data: real AI-vs-AI spectator mode (__harness.aiVsAi), 'adaptive'
// CPU on both sides, 10 matches per side per opponent (sides swapped). REPORT ONLY (no asserts): CPU-vs-CPU mostly
// measures AI quality, so calibrate against another character:  node harness/buggy_matchup_sim.mjs [me] [opp,opp,…]
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true })
const out = {}
const ME = process.argv[2] || 'buggy'
for (const opp of (process.argv[3] || 'zoro,superman,homelander,green_arrow').split(',')) {
  let mw = 0, ml = 0, rw = 0, rl = 0, hpLeft = []
  for (const side of ['p1', 'p2']) {
    const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message))
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
    await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' })
    await page.waitForFunction(() => !!window.__harness?.aiVsAi)
    const x = await page.evaluate(([opp, side, ME]) => { const o = side === 'p1' ? { p1: ME, p2: opp } : { p1: opp, p2: ME }
      const r = __harness.aiVsAi.runToCompletion({ ...o, p1Diff: 'adaptive', p2Diff: 'adaptive', matches: 10 }); return JSON.parse(r.json) }, [opp, side, ME])
    const me = side, them = side === 'p1' ? 'p2' : 'p1'
    for (const m of x.matches) { if (m.outcome.winner === me) mw++; else if (m.outcome.winner === them) ml++
      for (const r of m.rounds) { if (r.winner === me) { rw++; hpLeft.push(r[me + 'Health']) } else if (r.winner === them) rl++ } }
    if (errs.length) console.log(opp, side, 'ERR', errs[0])
    await page.close()
  }
  out[opp] = { matches: `${mw}-${ml}`, rounds: `${rw}-${rl}`, roundPct: Math.round(100 * rw / (rw + rl)), avgHpOnWin: Math.round(hpLeft.reduce((a, b) => a + b, 0) / (hpLeft.length || 1)) }
  console.log(opp, JSON.stringify(out[opp]))
}
await browser.close(); server.close()
