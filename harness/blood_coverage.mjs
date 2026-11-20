// harness/blood_coverage.mjs — MSV1-BLOOD: every playable character in a REAL rendered CPU match at TIER 4: how many of
// the frames the game actually draws find a body map (exact sheet frame, recolour-canonical, or same-action fallback)
// vs unmapped (drawn without blood). Writes docs/msv1/blood/COVERAGE.json.   node harness/blood_coverage.mjs [secs=4]
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SECS = Number(process.argv[2] || 4)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.css': 'text/css', '.jpg': 'image/jpeg' }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? '/index.html' : u); if (!f.startsWith(ROOT)) return res.writeHead(403).end(); fs.readFile(f, (e, d) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null
const keys0 = fs.readdirSync(path.join(ROOT, 'data/bloodmaps')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort()
const keys = ONLY || keys0
const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.goto(`${base}/index.html?harness=1`, { waitUntil: 'load', timeout: 120000 })
await page.waitForFunction(() => window.__harness?.aiVsAi && window.__harness.juice?.bloodFighter, null, { timeout: 30000 })
const extra = {}
const out = {}; let tot = { frames: 0, painted: 0, unmapped: 0, fallback: 0, skipped: 0, loading: 0 }
for (const k of keys) {
  const s0 = await page.evaluate((k) => { const H = window.__harness; H.juice.setBloodLevel('full'); H.aiVsAi.start({ p1: k, p2: 'netero', matches: 1, speed: 1 }); H.skipToBattle?.(); clearInterval(window.__covHold); window.__covHold = setInterval(() => { const f = H.juice.bloodFighter('p1'); if (f) f.health = Math.max(1, Math.round(f.maxHealth * 0.08)) }, 16); return H.juice.blood().stats }, k)
  await page.waitForTimeout(SECS * 1000)
  const s1 = await page.evaluate(() => window.__harness.juice.blood().stats)
  if (process.env.ONLY) console.log((await page.evaluate(() => window.__harness.juice.blood().miss)).join('\n'))
  const d = { frames: s1.frames - s0.frames, painted: s1.painted - s0.painted, unmapped: s1.unmapped - s0.unmapped, fallback: s1.actionFallback - s0.actionFallback, skipped: s1.skipped - s0.skipped, loading: s1.loading - s0.loading }
  if (process.env.ONLY) console.log(JSON.stringify(await page.evaluate(() => ({ st: window.__harness.juice.blood(), g: window.__harness.state?.() && Object.keys(window.__harness.state()) }))).slice(0, 900))
  const miss = await page.evaluate(() => window.__harness.juice.blood().miss)
  for (const m of miss) { const [who, act, key] = m.split(' '); const [sheet, sx, sy, w, h, n] = key.split('|'); const owner = (who === 'ns_red' || who === 'ns_yellow') ? 'windrangers' : who; (extra[owner] ||= {})[key] = { sheet, sx: +sx, sy: +sy, w: +w, h: +h, n: +n, act, src: 'runtime' } }
  out[k] = d; for (const x in tot) tot[x] += d[x]
  const body = d.frames - d.skipped - d.loading, pct = body > 0 ? (100 * (body - d.unmapped) / body).toFixed(1) : '—'
  console.log(`  ${d.unmapped / Math.max(1, d.frames - d.skipped - d.loading) < 0.1 ? '✅' : '⚠️ '} ${k.padEnd(22)} drawn ${String(d.frames).padStart(4)} · mapped ${pct}% · same-action fallback ${d.fallback} · unmapped ${d.unmapped} · effect-strip skips ${d.skipped} · map loading ${d.loading}`)
}
console.log(`\nTOTAL: ${tot.frames} blood frames drawn (both fighters), mapped ${(100 * (tot.frames - tot.skipped - tot.loading - tot.unmapped) / (tot.frames - tot.skipped - tot.loading)).toFixed(2)} % of body frames, fallback ${tot.fallback}, unmapped ${tot.unmapped}, intentional effect-strip skips ${tot.skipped}, first frames before the map loaded ${tot.loading}`)
fs.writeFileSync(path.join(ROOT, 'docs/msv1/blood/COVERAGE.json'), JSON.stringify({ secsPerCharacter: SECS, total: tot, perCharacter: out }, null, 1))
const xp = path.join(ROOT, 'tools/bloodmap/extra_defs.json'); const prev = fs.existsSync(xp) ? JSON.parse(fs.readFileSync(xp, 'utf8')) : {}
for (const [k, v] of Object.entries(extra)) { const have = new Set((prev[k] || []).map(d => [d.sheet, d.sx, d.sy, d.w, d.h, d.n].join('|'))); prev[k] = [...(prev[k] || []), ...Object.values(v).filter(d => !have.has([d.sheet, d.sx, d.sy, d.w, d.h, d.n].join('|')))] }
fs.writeFileSync(xp, JSON.stringify(prev, null, 1)); console.log(`runtime-only strips recorded: ${Object.values(prev).reduce((a, v) => a + v.length, 0)} in tools/bloodmap/extra_defs.json`)
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5))
await browser.close(); server.close()
