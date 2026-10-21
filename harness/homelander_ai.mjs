/**
 * HOMELANDER CPU-AI CHECK — starts an AI-vs-AI match with the CPU controlling Homelander and verifies
 * the signature AI layer actually uses his kit (zones with Heat Vision / casts his specials / FLIGHT 37).
 * Uses the synchronous aiVsAi.step() clock (deterministic, no flaky real-time waits).
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const jsErrors = []
page.on("pageerror", e => jsErrors.push(String(e)))

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" })
  await page.waitForFunction(() => !!(window.__harness && window.__harness.aiVsAi), null, { timeout: 15000 })
  const started = await page.evaluate(() => window.__harness.aiVsAi.start({ p1: "homelander", p2: "batman", p1Diff: "impossible", p2Diff: "normal" }))
  ok(started && started.mode, `aiVsAi did not start (${JSON.stringify(started)})`)

  // Step the match and watch what the CPU-Homelander does with his kit.
  const seen = { heatVision: false, special: false, ult: false, anyMove: new Set() }
  for (let i = 0; i < 48; i++) {   // 48 × 20 = 960 frames
    const obs = await page.evaluate(() => {
      window.__harness.aiVsAi.step(20)
      const pr = window.__harness.flightProbe("p1") || {}
      const s = window.__harness.p1() || {}
      return { laserHeat: pr.laserHeat, hvActive: pr.hvActive, move: s.currentMove, cast: s.castMove, f37: !!(s.key && pr.rosterKey), spriteAction: s.spriteAction }
    })
    if (obs.hvActive || (obs.laserHeat != null && obs.laserHeat < 68)) seen.heatVision = true
    if (obs.cast === "hlClap") seen.special = true
    if (["hlSupersonic", "hlBarrage", "hlClap"].includes(obs.move)) { seen.special = true; seen.anyMove.add(obs.move) }
    if (obs.move === "ultSilhouette" || obs.cast === "ultSilhouette") seen.ult = true
  }

  ok(seen.heatVision || seen.special || seen.ult, "CPU-Homelander never used any signature move (Heat Vision / special / FLIGHT 37)")
  ok(seen.heatVision, "CPU-Homelander never fired Heat Vision (its primary zoning tool)")
  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  HOMELANDER CPU-AI: ${passed} passed, ${failed} failed`)
  console.log(`  used: heatVision=${seen.heatVision} special=${seen.special}${seen.anyMove.size ? " (" + [...seen.anyMove].join(",") + ")" : ""} flight37=${seen.ult}  JS-exceptions=${jsErrors.length}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 8).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e)); failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
