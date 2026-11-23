// harness/omniman_viltrum_determinism.mjs — MSV1-OMNIMAN: Omni-Man (Viltrumite) is deterministic (LAN / replay safe).
// AI vs AI under a forced seed (vs Homelander, Satoru Gojo Shinjuku, Dseyl): the same seed reproduces his full sim state
// (f._omv minus render cues / fx, velocity, flight phase) bit-identically every 30 frames for 1800 frames; he actually
// fought (hits / flights); no Math.random is reachable from omnimanViltrum*.js (static scan + a runtime trap).
//   node harness/omniman_viltrum_determinism.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, d) }
const files = fs.readdirSync('.').filter(f => /^omnimanViltrum\w*\.js$/.test(f))
const hits = files.filter(f => /Math\.random/.test(fs.readFileSync(f, 'utf8')))
ck(`no Math.random in ${files.length} omnimanViltrum*.js modules`, hits.length === 0, hits.join(','))
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__omvRandom = []
  Math.random = function () { const st = new Error().stack; if (/omnimanViltrum\w*\.js/.test(st) && __omvRandom.length < 5) __omvRandom.push(st); return old() } })
await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.aiVsAi && window.__harness?.rng)
const run = (p2, seed, frames) => page.evaluate(([p2, s, n]) => {
  __harness.rng.forceSeed(s); __harness.aiVsAi.start({ p1: 'omniman_viltrum', p2, matches: 1, speed: 1 })
  const T = __harness.omnimanViltrumTest, a = T.raw(); a.energy = a.maxEnergy * 0.6
  const trail = [], used = {}   // stats reset with f._omv between rounds → keep the running max of each counter
  for (let i = 0; i < n; i += 30) { __harness.aiVsAi.step(30); const f = T.raw(), ss = f._omv
    if (ss) { trail.push(JSON.stringify([{ ...ss, cues: undefined, fx: undefined }, f.vx, f.vy, f.x, f.y, f._flightCtl?.phase || null]))
      for (const k of ['hits', 'takeoffs', 'booms', 'crashes', 'hardLands', 'topSpeed']) used[k] = Math.max(used[k] || 0, ss.stats[k] || 0) } }
  const f = T.raw(), o = T.raw('p2')
  return { omv: trail.length ? trail.join('|') : null, p1: [f.x, f.y, f.health, f.energy, f.rosterKey], p2: [o.x, o.y, o.health, o.energy, o.rosterKey], used }
}, [p2, seed, frames])
const H = s => crypto.createHash('sha256').update(s || '').digest('hex').slice(0, 16)
const report = {}
for (const p2 of ['homelander', 'gojo_shinjuku', 'dseyl']) {
  const r1 = await run(p2, 7319, 1800), r2 = await run(p2, 7319, 1800)
  report[p2] = { hash: H(r1.omv), used: r1.used, p1: r1.p1, p2: r1.p2 }
  ck(`vs ${p2}: P1 is omniman_viltrum with sim state (sampled every 30 f)`, r1.p1[4] === 'omniman_viltrum' && !!r1.omv, JSON.stringify(r1.p1))
  ck(`vs ${p2}: same seed → identical f._omv + velocity + flight phase at every 30-f sample, fighters after 1800 f`, r1.omv === r2.omv && JSON.stringify([r1.p1, r1.p2]) === JSON.stringify([r2.p1, r2.p2]), `${H(r1.omv)} vs ${H(r2.omv)}`)
  ck(`vs ${p2}: he fought (landed hits)`, r1.used.hits > 0, JSON.stringify(r1.used))
}
const rnd = await page.evaluate(() => __omvRandom.length); if (rnd) console.log(await page.evaluate(() => __omvRandom[0].split('\n').slice(0, 8).join('\n')))
ck('runtime: Math.random never called from omnimanViltrum*.js', rnd === 0, String(rnd))
ck('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
console.log(`\nOMNIMAN_VILTRUM DETERMINISM: ${pass} passed, ${fail} failed`)
fs.writeFileSync('docs/msv1/omniman/determinism_results.json', JSON.stringify({ pass, fail, report }, null, 1))
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
