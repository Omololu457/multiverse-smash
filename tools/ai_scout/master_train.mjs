// tools/ai_scout/master_train.mjs — step 3 of the smarter CPU: AI-vs-AI SELF-PLAY training for the MASTER CPU.
// For every fighter, Master (starting from nothing — pure in-match learning) plays the Impossible AI across a pool of
// opponents (its mirror + a fixed set), on both sides. Every judged choice (aiMaster.js: damage dealt − taken per frame
// for each move, and for "let the Impossible AI play" per situation) is pooled, and written to aiMasterTuning.js as the
// fighter's STARTING knowledge. In a real match Master then starts from that and keeps adapting to the actual opponent.
//   node tools/ai_scout/master_train.mjs [--only key,key] [--matches 2] [--workers 6] [--opps naruto,goku,ichigo,batman]
// --style also picks a per-fighter STYLE preset (see STYLES) by self-play damage share — kept only when it beats the
// default by a clear margin (mirror evaluations are noisy). Merges into the existing aiMasterTuning.js.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"

const ROOT = path.resolve(".")
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }
const MATCHES = +arg("--matches", 2), WORKERS = +arg("--workers", 6), STYLE = process.argv.includes("--style")
const STYLE_MATCHES = +arg("--style-matches", 6), MARGIN = +arg("--margin", 0.03)
const OPPS = arg("--opps", "naruto,goku,ichigo,batman").split(",")
const OUT = path.join(ROOT, "aiMasterTuning.js")
// style presets: overrides of aiMaster.js MASTER
const STYLES = {
  pressure: { comboChance: 0.7, pokeChance: 0.5, zoneChance: 0.22, neutralEvery: 5 },
  patient: { comboChance: 0.28, pokeChance: 0.18, zoneChance: 0.08, neutralEvery: 14 },
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".json": "application/json", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".svg": "image/svg+xml" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const fp = path.join(ROOT, u === "/" ? "/index.html" : u); if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const BASE = `http://127.0.0.1:${server.address().port}/index.html`
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] })

const { AI_SCOUT } = await import(path.join(ROOT, "aiScoutData.js"))
const prevMod = await import(OUT + "?t=" + Date.now())
const prev = prevMod.AI_MASTER_TUNING
let keys = arg("--only", null)?.split(",") || Object.keys(AI_SCOUT.fighters)

// One page: `n` matches of key (Master, on `side`) vs opp (Impossible). tuning: the table Master starts from (null = none).
async function play(key, opp, side, n, tuning) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await ctx.newPage()
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
    try {
      const p1 = side === "p1" ? key : opp, p2 = side === "p1" ? opp : key
      await page.goto(`${BASE}?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "domcontentloaded", timeout: 240000 })
      await page.waitForFunction(() => window.__harness?.aiVsAi && window.__harness?.boot, null, { timeout: 240000 })
      return await page.evaluate(async ({ p1, p2, side, n, tuning }) => {
        const h = window.__harness; h.boot()
        const am = await import("./aiMaster.js"); am.setMasterTuning(tuning)
        const P = CanvasRenderingContext2D.prototype, big = c => c && c.width >= 640 && c.height >= 360
        for (const fn of ["drawImage", "fill", "stroke", "fillRect", "strokeRect", "fillText", "strokeText", "clearRect", "restore", "save", "putImageData", "clip"]) { const o = P[fn]; if (typeof o === "function") P[fn] = function (...a) { return big(this.canvas) ? undefined : o.apply(this, a) } }
        const other = side === "p1" ? "p2" : "p1"
        h.aiVsAi.start({ p1, p2, p1Diff: side === "p1" ? "master" : "impossible", p2Diff: side === "p2" ? "master" : "impossible", matches: n })
        const dmg = { p1: 0, p2: 0 }, last = {}
        for (let i = 0; i < 2000000 && !h.aiVsAi.state().finished; i++) {
          h.aiVsAi.step(1)
          for (const s of ["p1", "p2"]) { const hp = h.gojoShinjukuTest.raw(s)?.health; if (hp != null && last[s] != null && hp < last[s]) dmg[s] += last[s] - hp; last[s] = hp }
        }
        const w = h.aiVsAi.getExport().summary?.wins || {}
        return { won: w[side] || 0, lost: w[other] || 0, dealt: dmg[other], taken: dmg[side], samples: h.aiVsAi.masterStats()[side]?.samples || {} }
      }, { p1, p2, side, n, tuning })
    } catch (e) { if (attempt) return { error: String(e.message || e).slice(0, 160) } }
    finally { await ctx.close() }
  }
}

async function pool(jobs, fn) {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(WORKERS, jobs.length) }, async () => { while (next < jobs.length) { const j = jobs[next++]; await fn(j) } }))
}
const t0 = Date.now(), secs = () => Math.round((Date.now() - t0) / 1000)

// ── phase 1: learn starting payoffs ──
const acc = {}, out = { ...prev.fighters }
const jobs = []
for (const k of keys) [k, ...OPPS.filter(o => o !== k)].forEach((opp, i) => jobs.push({ k, opp, side: i % 2 ? "p2" : "p1" }))
let done = 0
await pool(jobs, async j => {
  const r = await play(j.k, j.opp, j.side, MATCHES, null)
  const A = acc[j.k] || (acc[j.k] = { samples: {}, won: 0, lost: 0, dealt: 0, taken: 0, errors: 0 })
  if (!r || r.error) { A.errors++; console.log(`  ${j.k} vs ${j.opp} ERROR ${r?.error}`); return }
  A.won += r.won; A.lost += r.lost; A.dealt += r.dealt; A.taken += r.taken
  for (const [key, [n, sum]] of Object.entries(r.samples)) { const S = A.samples[key] || (A.samples[key] = [0, 0]); S[0] += n; S[1] += sum }
  if (++done % 20 === 0) console.log(`  ${done}/${jobs.length} runs · ${secs()}s`)
})
const r3 = x => Math.round(x * 1000) / 1000
for (const k of keys) {
  const A = acc[k]; if (!A || !Object.keys(A.samples).length) continue
  const prior = {}, kind = {}
  for (const [key, [n, sum]] of Object.entries(A.samples)) {
    prior[key] = [n, r3(sum / n)]
    const why = key.split(":")[0]; if (why === "defer") continue
    const K = kind[why] || (kind[why] = [0, 0]); K[0] += n; K[1] += sum
  }
  for (const why of Object.keys(kind)) kind[why] = [kind[why][0], r3(kind[why][1] / kind[why][0])]
  out[k] = { ...(out[k]?.params ? { params: out[k].params } : {}), prior, kind, trained: { matches: A.won + A.lost, won: A.won, share: r3(A.dealt / Math.max(1, A.dealt + A.taken)) } }
}
console.log(`phase 1 (payoffs): ${Object.keys(acc).length} fighters · ${secs()}s`)

// ── phase 2 (optional): style preset per fighter, judged WITH the learned payoffs ──
if (STYLE) {
  const tableWith = (k, params) => ({ priorWeight: prev.priorWeight || 4, fighters: { ...out, [k]: { ...out[k], params } } })
  const sjobs = []
  for (const k of keys) if (out[k]) for (const name of ["default", ...Object.keys(STYLES)]) [k, ...OPPS.filter(o => o !== k)].forEach((opp, i) => sjobs.push({ k, name, opp, side: i % 2 ? "p2" : "p1" }))
  const sacc = {}
  let sd = 0
  await pool(sjobs, async j => {
    const r = await play(j.k, j.opp, j.side, Math.max(1, Math.round(STYLE_MATCHES / (OPPS.length + 1))) , tableWith(j.k, j.name === "default" ? undefined : STYLES[j.name]))
    const A = (sacc[j.k] ||= {})[j.name] ||= { dealt: 0, taken: 0, won: 0, lost: 0 }
    if (r && !r.error) { A.dealt += r.dealt; A.taken += r.taken; A.won += r.won; A.lost += r.lost }
    if (++sd % 40 === 0) console.log(`  style ${sd}/${sjobs.length} runs · ${secs()}s`)
  })
  for (const k of Object.keys(sacc)) {
    const share = n => { const A = sacc[k][n]; return A ? A.dealt / Math.max(1, A.dealt + A.taken) : 0 }
    let best = "default"
    for (const n of Object.keys(STYLES)) if (share(n) > share(best) + (best === "default" ? MARGIN : 0)) best = n
    if (best === "default") delete out[k].params; else out[k].params = STYLES[best]
    out[k].style = { pick: best, ...Object.fromEntries(["default", ...Object.keys(STYLES)].map(n => [n, r3(share(n))])) }
  }
  console.log(`phase 2 (style): picks ${JSON.stringify(Object.values(out).reduce((a, f) => (a[f.style?.pick || "default"] = (a[f.style?.pick || "default"] || 0) + 1, a), {}))} · ${secs()}s`)
}

const header = fs.readFileSync(OUT, "utf8").split("export const")[0]
const sorted = Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]]))
fs.writeFileSync(OUT, header + `export const AI_MASTER_TUNING = ${JSON.stringify({ version: (prev.version || 0) + 1, priorWeight: prev.priorWeight || 4, opps: OPPS, fighters: sorted })}\n`)
console.log(`wrote ${path.relative(ROOT, OUT)} · ${Object.keys(sorted).length} fighters · ${secs()}s`)
await browser.close(); server.close()
