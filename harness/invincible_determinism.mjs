// harness/invincible_determinism.mjs — MSV1-INVINCIBLE: Invincible (Mark Grayson) is deterministic.
// AI vs AI under a forced seed (vs Homelander, Satoru Gojo Shinjuku, Ryomen Sukuna Shinjuku): the same seed reproduces his
// full sim state (f._inv, minus render cues / fx / decals) bit-identically at every 30-f sample over 2400 frames; the CPU
// actually used his kit; no Math.random is reachable from invincible*.js (static scan + a runtime trap on Math.random).
//   node harness/invincible_determinism.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, d) }
const files = fs.readdirSync('.').filter(f => /^invincible\w*\.js$/.test(f))
const hits = files.filter(f => /Math\.random/.test(fs.readFileSync(f, 'utf8')))
ck(`no Math.random in ${files.length} invincible*.js modules`, hits.length === 0, hits.join(','))
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__invRandom = []
  Math.random = function () { const st = new Error().stack; if (/invincible\w*\.js/.test(st) && __invRandom.length < 5) __invRandom.push(st); return old() } })
await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.aiVsAi && window.__harness?.rng)
const run = (p2, seed, frames) => page.evaluate(([p2, s, n]) => {
  __harness.rng.forceSeed(s); __harness.aiVsAi.start({ p1: 'invincible', p2, matches: 1, speed: 1 })
  const T = __harness.invincibleTest, a = T.raw(); a.energy = a.maxEnergy * 0.6
  const used = {}, prev = {}, trail = []
  for (let i = 0; i < n; i += 30) { __harness.aiVsAi.step(30); const ss = T.raw()._inv
    if (ss) { trail.push(JSON.stringify({ ...ss, cues: undefined, fx: undefined, decal: undefined })); for (const k of ['jabs', 'ipunch', 'zips', 'nhb', 'tv', 'crash', 'skyward', 'booms', 'takeoffPush']) { const v = ss.stats[k] || 0; used[k] = (used[k] || 0) + Math.max(0, v - (v < (prev[k] || 0) ? 0 : (prev[k] || 0))); prev[k] = v } } }   // summed across rounds (stats reset per round)
  const f = T.raw(), o = T.raw('p2')
  return { inv: trail.length ? trail.join('|') : null, p1: [f.x, f.y, f.health, f.energy, f.rosterKey], p2: [o.x, o.y, o.health, o.energy, o.rosterKey], used }
}, [p2, seed, frames])
const H = s => crypto.createHash('sha256').update(s || '').digest('hex').slice(0, 16)
const report = {}
for (const p2 of (process.env.INV_P2S || 'homelander,gojo_shinjuku,sukuna_shinjuku').split(',')) {
  const r1 = await run(p2, 7319, 2400), r2 = await run(p2, 7319, 2400)
  report[p2] = { hash: H(r1.inv), used: r1.used, p1: r1.p1, p2: r1.p2 }
  ck(`vs ${p2}: P1 is invincible with sim state (sampled every 30 f)`, r1.p1[4] === 'invincible' && !!r1.inv, JSON.stringify(r1.p1))
  ck(`vs ${p2}: same seed → identical f._inv at every 30-f sample + fighter state after 2400 f`, r1.inv === r2.inv && JSON.stringify([r1.p1, r1.p2]) === JSON.stringify([r2.p1, r2.p2]), `${H(r1.inv)} vs ${H(r2.inv)}`)
  ck(`vs ${p2}: the CPU used his kit`, Object.values(r1.used).some(v => v > 0), JSON.stringify(r1.used))
}
const rnd = await page.evaluate(() => __invRandom.length); if (rnd) console.log(await page.evaluate(() => __invRandom[0].split('\n').slice(0, 8).join('\n')))
ck('runtime: Math.random never called from invincible*.js', rnd === 0, String(rnd))
ck('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
console.log(`\nINVINCIBLE DETERMINISM: ${pass} passed, ${fail} failed`)
fs.writeFileSync('docs/msv1/invincible/determinism_results.json', JSON.stringify({ pass, fail, report }, null, 1))
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
