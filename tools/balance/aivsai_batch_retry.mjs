// (retry variant of aivsai_batch.mjs: a page that fails to load under machine load is retried up to 3× instead of dropping the games)
// AI-vs-AI balance batch: each CANDIDATE plays each REFERENCE (both "adaptive", sides swapped) for N matches through the
// real game sim (window.__harness.aiVsAi.runToCompletion). Reports win rate + average damage-dealt margin (mine − theirs) per candidate.
// Usage: node tools/balance/aivsai_batch.mjs out.json "cand1,cand2" ["ref1,ref2"] [matchesPerSide]
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".ogg": "audio/ogg" }
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u)
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) })
await new Promise(r => server.listen(0, "127.0.0.1", r))
const base = `http://127.0.0.1:${server.address().port}`
const [out = "aivsai_batch.json", candArg = "", refArg = "naruto,sasuke,ichigo,gojo,luffy,vegeta", nArg = "2"] = process.argv.slice(2)
const cands = candArg.split(",").filter(Boolean), refs = refArg.split(",").filter(Boolean), N = +nArg || 2
const browser = await chromium.launch({ headless: true })
const rows = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {}
for (const c of cands) {
  const r = rows[c] = { wins: 0, losses: 0, draws: 0, margin: 0, games: 0, vs: {} }
  for (const ref of refs) {
    if (ref === c) continue
    for (const side of ["p1", "p2"]) {
      for (let attempt = 0; attempt < 3; attempt++) {
      const page = await browser.newPage({ viewport: { width: 640, height: 360 } })
      let ok = false
      try {
        await page.goto(`${base}/index.html?harness=1&p1=${c}&p2=${ref}&seed=${(c.length * 31 + ref.length) | 0}`, { waitUntil: "load" })
        await page.waitForFunction(() => window.__harness?.aiVsAi, null, { timeout: 60000 })
        const res = await page.evaluate(({ p1, p2, n }) => { window.requestAnimationFrame = () => 0; const x = window.__harness.aiVsAi.runToCompletion({ p1, p2, p1Diff: "adaptive", p2Diff: "adaptive", matches: n, speed: 8 }, 600000); const log = JSON.parse(x.json)
          const dealt = f => Object.values(f?.damageByMove || {}).reduce((s, v) => s + (+v || 0), 0)
          return log.matches.map(m => ({ w: m.outcome?.winner, hp1: dealt(m.fighters?.p1), hp2: dealt(m.fighters?.p2), how: m.outcome?.method, frames: m.durationFrames })) },
          side === "p1" ? { p1: c, p2: ref, n: N } : { p1: ref, p2: c, n: N })
        for (const m of res) {
          const me = side, them = side === "p1" ? "p2" : "p1"
          r.games++; if (m.w === me) r.wins++; else if (m.w === them) r.losses++; else r.draws++
          const v = r.vs[ref] = r.vs[ref] || { w: 0, l: 0 }; if (m.w === me) v.w++; else if (m.w === them) v.l++
          if (m.hp1 != null && m.hp2 != null) r.margin += (me === "p1" ? m.hp1 - m.hp2 : m.hp2 - m.hp1)
        }
        ok = true
      } catch (e) { r.err = String(e).slice(0, 160) }
      await page.close().catch(() => {})
      if (ok) break
      }
    }
  }
  r.winRate = r.games ? +(r.wins / r.games).toFixed(3) : null; r.margin = r.games ? +(r.margin / r.games).toFixed(1) : null
  console.log(c, JSON.stringify({ winRate: r.winRate, w: r.wins, l: r.losses, d: r.draws, margin: r.margin, vs: r.vs, err: r.err }))
  fs.writeFileSync(out, JSON.stringify(rows, null, 1))
}
await browser.close(); server.close()
