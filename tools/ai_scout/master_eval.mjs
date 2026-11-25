// tools/ai_scout/master_eval.mjs — does MASTER actually beat IMPOSSIBLE? Real AI-vs-AI runs (the game's own AI vs AI
// mode, stepped, drawing off as in scout.mjs), MIRROR matches so the fighter's strength cancels out, Master on P1 for
// half the matches and on P2 for the other half so side advantage cancels too.
//   node tools/ai_scout/master_eval.mjs [--only key,key] [--matches 4] [--workers 4] [--a master] [--b impossible] [--out f.json]
// Reports wins AND each side's share of all damage dealt (steadier than wins: mirror matches swing a lot). MASTER_LOG=1
// prints the Master layer's last 40 decisions per run. Use ≥ 10 matches per fighter — at 4 the noise is about ±7%.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"

const ROOT = path.resolve(".")
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d }
const MATCHES = +arg("--matches", 4), WORKERS = +arg("--workers", 4), A = arg("--a", "master"), B = arg("--b", "impossible")
const OUT = arg("--out", null)
const VS = arg("--vs", null)?.split(",") || null   // opponents (Impossible) instead of the mirror — e.g. ones the trainer never used
const NO_TUNE = process.argv.includes("--no-tune")
const PARAMS = arg("--params", null) ? JSON.parse(arg("--params")) : null   // one MASTER style for every fighter (implies --no-tune)   // Master without aiMasterTuning.js (pure in-match learning, as in step 2)
const DEFAULT = ["goku", "sasuke_adult", "naruto", "luffy", "zoro", "spd_red", "ben10", "ichigo", "batman", "spiderman", "gojo", "kakashi"]
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".json": "application/json", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".svg": "image/svg+xml" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const fp = path.join(ROOT, u === "/" ? "/index.html" : u); if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const BASE = `http://127.0.0.1:${server.address().port}/index.html`
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] })
let keys = arg("--only", null)?.split(",") || DEFAULT

// one run = `n` matches of key vs key, P1 = d1, P2 = d2
async function run(key, d1, d2, n, opp = key) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: false })
  const page = await ctx.newPage()
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  try {
    const k1 = d1 === A ? key : opp, k2 = d1 === A ? opp : key
    await page.goto(`${BASE}?harness=1&p1=${k1}&p2=${k2}`, { waitUntil: "domcontentloaded", timeout: 240000 })
    await page.waitForFunction(() => window.__harness?.aiVsAi && window.__harness?.boot, null, { timeout: 240000 })
    return await page.evaluate(async ({ k1, k2, d1, d2, n, noTune, params }) => {
      const h = window.__harness; h.boot()
      if (noTune || params) (await import("./aiMaster.js")).setMasterTuning(params ? { priorWeight: 0, params, fighters: {} } : null)
      const P = CanvasRenderingContext2D.prototype, big = c => c && c.width >= 640 && c.height >= 360
      for (const fn of ["drawImage", "fill", "stroke", "fillRect", "strokeRect", "fillText", "strokeText", "clearRect", "restore", "save", "putImageData", "clip"]) { const o = P[fn]; if (typeof o === "function") P[fn] = function (...a) { return big(this.canvas) ? undefined : o.apply(this, a) } }
      // stepped like runToCompletion, also counting every point of damage each side takes (a steadier signal than wins)
      h.aiVsAi.start({ p1: k1, p2: k2, p1Diff: d1, p2Diff: d2, matches: n })
      const dmg = { p1: 0, p2: 0 }, last = {}
      for (let i = 0; i < 2000000 && !h.aiVsAi.state().finished; i++) {
        h.aiVsAi.step(1)
        for (const s of ["p1", "p2"]) { const hp = h.gojoShinjukuTest.raw(s)?.health; if (hp != null && last[s] != null && hp < last[s]) dmg[s] += last[s] - hp; last[s] = hp }
      }
      const r = h.aiVsAi.getExport()
      return { finished: h.aiVsAi.state().finished, wins: r.summary?.wins || null, taken: dmg, stats: h.aiVsAi.masterStats(), log: h.aiVsAi.masterLog() }
    }, { k1, k2, d1, d2, n, noTune: NO_TUNE, params: PARAMS })
  } catch (e) { return { error: String(e.message || e).slice(0, 160) } }
  finally { await ctx.close() }
}

const jobs = []
for (const k of keys) for (const opp of VS || [k]) { jobs.push({ k, opp, side: "p1" }); jobs.push({ k, opp, side: "p2" }) }
const res = {}
let next = 0
const t0 = Date.now()
await Promise.all(Array.from({ length: Math.min(WORKERS, jobs.length) }, async () => {
  while (next < jobs.length) {
    const j = jobs[next++]
    const half = Math.max(1, Math.round(MATCHES / 2 / (VS ? VS.length : 1)))
    const r = j.side === "p1" ? await run(j.k, A, B, half, j.opp) : await run(j.k, B, A, half, j.opp)
    const R = res[j.k] || (res[j.k] = { aWins: 0, bWins: 0, draws: 0, matches: 0, aDealt: 0, bDealt: 0, stats: [], errors: [] })
    if (r.error || !r.wins) { R.errors.push(r.error || "no summary"); console.log(`${j.k} [${A} as ${j.side}] ERROR ${r.error}`); continue }
    const aw = j.side === "p1" ? r.wins.p1 || 0 : r.wins.p2 || 0, bw = j.side === "p1" ? r.wins.p2 || 0 : r.wins.p1 || 0
    const other = j.side === "p1" ? "p2" : "p1"; R.aDealt += r.taken[other]; R.bDealt += r.taken[j.side]
    R.aWins += aw; R.bWins += bw; R.draws += r.wins.draw || 0; R.matches += aw + bw + (r.wins.draw || 0)
    for (const st of [r.stats.p1, r.stats.p2]) if (st) delete st.samples   // (raw training samples: master_train.mjs)
    R.stats.push(j.side === "p1" ? r.stats.p1 : r.stats.p2)
    if (process.env.MASTER_LOG) console.log(`  log ${j.k} ${j.side}: ` + (j.side === 'p1' ? r.log.p1 : r.log.p2).join('  '))
    console.log(`${j.k.padEnd(16)} ${A} as ${j.side}: ${A} ${aw} – ${bw} ${B}  · ${Math.round((Date.now() - t0) / 1000)}s  layer ${JSON.stringify(j.side === "p1" ? r.stats.p1 : r.stats.p2)}`)
  }
}))
let aw = 0, bw = 0, dr = 0
let ad = 0, bd = 0
console.log(`\n${"fighter".padEnd(16)} ${A.padStart(7)} ${B.padStart(11)}  draws  ${A} damage share`)
for (const k of keys) { const R = res[k]; if (!R) continue; aw += R.aWins; bw += R.bWins; dr += R.draws; ad += R.aDealt; bd += R.bDealt; console.log(`${k.padEnd(16)} ${String(R.aWins).padStart(7)} ${String(R.bWins).padStart(11)}  ${String(R.draws).padStart(5)}  ${Math.round(R.aDealt / Math.max(1, R.aDealt + R.bDealt) * 100)}%${R.errors.length ? "  errors: " + R.errors.length : ""}`) }
const tot = aw + bw + dr
console.log(`\nTOTAL ${A} ${aw} – ${bw} ${B} (draws ${dr}) → ${A} wins ${tot ? Math.round(aw / tot * 100) : 0}% of ${tot} matches · deals ${Math.round(ad / Math.max(1, ad + bd) * 100)}% of all damage · ${Math.round((Date.now() - t0) / 1000)}s`)
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ a: A, b: B, matches: MATCHES, res, total: { aw, bw, dr, aDealt: ad, bDealt: bd } }, null, 1))
await browser.close(); server.close()
