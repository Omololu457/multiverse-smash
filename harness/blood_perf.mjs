// harness/blood_perf.mjs — MSV1-BLOOD performance: a 4-player FFA, every fighter held at TIER 4, real hits fed through
// bloodHit(), floor decal cap (64) reached; then 10 s measured with Blood Full / Low / Off (same match, same load).
//   node harness/blood_perf.mjs
// Measures main-thread CPU per rendered frame (CDP Performance TaskDuration / ScriptDuration deltas ÷ frames) and the
// rAF frame interval (mean / p95 / frames over 20 ms).
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.css': 'text/css', '.jpg': 'image/jpeg' }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? '/index.html' : u); if (!f.startsWith(ROOT)) return res.writeHead(403).end(); fs.readFile(f, (e, d) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.goto(`${base}/index.html?harness=1`, { waitUntil: 'load', timeout: 120000 })
await page.waitForFunction(() => window.__harness?.ffaStart && window.__harness.juice?.bloodFighter, null, { timeout: 30000 })
const KEYS = ['aoi_todo', 'goku', 'genos', 'madara']
await page.evaluate((keys) => window.__harness.ffaStart(4, keys, [], ['easy', 'easy', 'easy', 'easy']), KEYS)
await page.waitForTimeout(1500)
// hold every fighter at 8 % health (T4, never KO'd) and keep landing real hits (all damage types) on them
await page.evaluate(async () => {
  const H = window.__harness, B = await import('/battleBlood.js')
  H.juice.setBloodLevel('full')
  const T = ['slash', 'blunt', 'projectile', 'energy']
  let n = 0
  window.__perfHold = setInterval(() => {
    for (let i = 1; i <= 4; i++) {
      const f = H.juice.bloodFighter('f' + i); if (!f) continue
      f.health = Math.max(1, Math.round(f.maxHealth * 0.08))
      if (n % 30 === i) B.bloodHit({ target: f, attacker: null, x: f.x + f.w / 2, y: f.y + f.h * ((n * 7 + i * 13) % 100) / 100, damage: 40 + (n % 3) * 50, damageType: T[(n + i) % 4], frame: H.state().frame })
    }
    n++
  }, 16)
})
// fill the floor to the cap
let decals = 0
for (let i = 0; i < 60 && decals < 64; i++) { await page.waitForTimeout(500); decals = await page.evaluate(() => window.__harness.juice.blood().decals) }
console.log(`floor decals before measuring: ${decals} (cap 64)`)
const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable')
const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]))
async function measure(level, secs = 10) {
  await page.evaluate(l => window.__harness.juice.setBloodLevel(l), level)
  await page.waitForTimeout(1000)
  await page.evaluate(() => { window.__fi = []; let last = performance.now(); const tick = t => { window.__fi.push(t - last); last = t; if (window.__fi.length < 100000) window.__raf = requestAnimationFrame(tick) }; window.__raf = requestAnimationFrame(tick) })
  const a = await metric(); await page.waitForTimeout(secs * 1000); const b = await metric()
  const fi = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__fi.slice(1) })
  const st = await page.evaluate(() => { const s = window.__harness.juice.blood(); return { decals: s.decals, drops: s.drops, tiers: Object.values(s.slots).map(x => x.tier).join('') } })
  const sorted = [...fi].sort((x, y) => x - y), n = fi.length
  const r = { level, frames: n, cpuMsPerFrame: +((b.TaskDuration - a.TaskDuration) * 1000 / n).toFixed(3), scriptMsPerFrame: +((b.ScriptDuration - a.ScriptDuration) * 1000 / n).toFixed(3), meanFrameMs: +(fi.reduce((x, y) => x + y, 0) / n).toFixed(2), p95FrameMs: +sorted[Math.floor(n * 0.95)].toFixed(2), over20ms: fi.filter(x => x > 20).length, ...st }
  console.log(`  Blood ${level.padEnd(4)}: ${n} frames · CPU ${r.cpuMsPerFrame} ms/frame (script ${r.scriptMsPerFrame}) · frame mean ${r.meanFrameMs} ms p95 ${r.p95FrameMs} ms · >20 ms: ${r.over20ms} · decals ${st.decals} drops ${st.drops} tiers ${st.tiers}`)
  return r
}
const res = []
for (const lv of ['full', 'off', 'low', 'full']) res.push(await measure(lv))
const full = (res[0].cpuMsPerFrame + res[3].cpuMsPerFrame) / 2, off = res[1].cpuMsPerFrame
console.log(`\nBlood Full vs Off: ${(full - off).toFixed(3)} ms CPU per frame (${((full - off) / 16.67 * 100).toFixed(1)} % of a 60 fps frame)`)
fs.writeFileSync(path.join(ROOT, 'docs/msv1/blood/PERF.json'), JSON.stringify({ fighters: KEYS, runs: res, fullMinusOffMs: +(full - off).toFixed(3) }, null, 1))
if (errs.length) console.log('page errors:', errs.slice(0, 3))
await browser.close(); server.close()
