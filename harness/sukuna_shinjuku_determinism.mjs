// harness/sukuna_shinjuku_determinism.mjs — MSV1-SUKUNA: Ryomen Sukuna (Shinjuku) is deterministic.
// AI vs AI under a forced seed (vs Satoru Gojo Shinjuku, the old Sukuna, Enoch): the same seed reproduces his full sim
// state (f._sks, minus render cues / fx) bit-identically after 1800 frames; the CPU actually used his techniques;
// no Math.random is reachable from sukunaShinjuku*.js (static scan + a runtime trap on Math.random).
//   node harness/sukuna_shinjuku_determinism.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, d) }
const files = fs.readdirSync('.').filter(f => /^sukunaShinjuku\w*\.js$/.test(f))
const hits = files.filter(f => /Math\.random/.test(fs.readFileSync(f, 'utf8')))
ck(`no Math.random in ${files.length} sukunaShinjuku*.js modules`, hits.length === 0, hits.join(','))
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0; const old = Math.random; window.__sksRandom = []
  Math.random = function () { const st = new Error().stack; if (/sukunaShinjuku\w*\.js/.test(st) && __sksRandom.length < 5) __sksRandom.push(st); return old() } })
await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.aiVsAi && window.__harness?.rng)
const run = (p2, seed, frames) => page.evaluate(([p2, s, n]) => {
  __harness.rng.forceSeed(s); __harness.aiVsAi.start({ p1: 'sukuna_shinjuku', p2, matches: 1, speed: 1 })
  const T = __harness.sukunaShinjukuTest, a = T.raw(); a.energy = a.maxEnergy * 0.6
  const used = {}, trail = []
  for (let i = 0; i < n; i += 30) { __harness.aiVsAi.step(30); const st = T.raw()._sks?.stats; const ss = T.raw()._sks; if (ss) trail.push(JSON.stringify({ ...ss, cues: undefined, fx: undefined })); if (st) for (const k of ['cuts', 'cleaves', 'webs', 'fuga', 'amps', 'shrines', 'worlds', 'stopped']) used[k] = Math.max(used[k] || 0, st[k] || 0) }
  const f = T.raw(), o = T.raw('p2')
  const sks = trail.length ? trail.join('|') : null
  return { sks, p1: [f.x, f.y, f.health, f.energy, f.rosterKey], p2: [o.x, o.y, o.health, o.energy, o.rosterKey], used }
}, [p2, seed, frames])
const H = s => crypto.createHash('sha256').update(s || '').digest('hex').slice(0, 16)
const report = {}
for (const p2 of ['gojo_shinjuku', 'sukuna', 'enoch']) {
  const r1 = await run(p2, 7319, 1800), r2 = await run(p2, 7319, 1800)
  report[p2] = { hash: H(r1.sks), used: r1.used, p1: r1.p1, p2: r1.p2 }
  ck(`vs ${p2}: P1 is sukuna_shinjuku with sim state (sampled every 30 f)`, r1.p1[4] === 'sukuna_shinjuku' && !!r1.sks, JSON.stringify(r1.p1))
  ck(`vs ${p2}: same seed → identical f._sks at every 30-f sample + fighter state after 1800 f`, r1.sks === r2.sks && JSON.stringify([r1.p1, r1.p2]) === JSON.stringify([r2.p1, r2.p2]), `${H(r1.sks)} vs ${H(r2.sks)}`)
  ck(`vs ${p2}: the CPU used his techniques`, (r1.used.cuts || 0) + (r1.used.cleaves || 0) + (r1.used.webs || 0) + (r1.used.fuga || 0) + (r1.used.shrines || 0) > 0, JSON.stringify(r1.used))
}
const rnd = await page.evaluate(() => __sksRandom.length); if (rnd) console.log(await page.evaluate(() => __sksRandom[0].split('\n').slice(0, 8).join('\n')))
ck('runtime: Math.random never called from sukunaShinjuku*.js', rnd === 0, String(rnd))
ck('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
console.log(`\nSUKUNA_SHINJUKU DETERMINISM: ${pass} passed, ${fail} failed`)
fs.writeFileSync('docs/msv1/sukuna/determinism_results.json', JSON.stringify({ pass, fail, report }, null, 1))
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
