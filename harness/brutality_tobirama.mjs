// harness/brutality_tobirama.mjs — Tobirama's 5 brutalities (opt-in gore roll-out).
// Verifies the per-move BLOW finishers + the Edo-Tensei TRAIT resolve to the right name/effect, the new
// gore renderers (watercut/crush/drag) run without error, and screenshots each. The Cinematic is covered by
// the existing brutality-cine harness (tobirama concept). Render-layer; determinism checked separately.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SHOTS = path.join(ROOT, "brutality_work", "shots"); fs.mkdirSync(SHOTS, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".m4a": "audio/mp4", ".ogg": "audio/ogg" }
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(String(e)))
let PASS = 0, FAIL = 0; const ok = (c, m) => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${m}`) }
const st = () => page.evaluate(() => window.__harness.state())
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness); await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())
  await page.evaluate(() => window.__harness.skipToBattle())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {})
  await wf(4)
  await page.evaluate(() => { window.__harness.brutality.setBrutality(true); window.__harness.brutality.setBlood(true) })

  console.log("\n── finisherFor: per-move BLOW resolution ──")
  for (const [move, name, gore] of [["heavy", "FLYING THUNDER GOD", "bisect"], ["tobiWaterSlash", "FLOWING WATER SLASH", "watercut"], ["tobiWaterDragon", "WATER DRAGON JUTSU", "crush"]]) {
    const r = await page.evaluate(m => window.__harness.brutality.finisherFor("tobirama", m), move)
    ok(r.name === name && r.gore === gore && !r.klassic, `${move} → ${name} (${gore})  [got ${r.name}/${r.gore}]`)
  }
  const other = await page.evaluate(() => window.__harness.brutality.finisherFor("tobirama", "tobiDarkness"))
  ok(other.klassic, `non-tabled move (tobiDarkness) → KLASSIC (routes to Cinematic instead)  [got ${other.name}]`)

  console.log("\n── live TRIGGER: each gore renderer runs + resolves (incl. TRAIT) ──")
  for (const [move, name, gore, edo] of [["heavy", "FLYING THUNDER GOD", "bisect", false], ["tobiWaterSlash", "FLOWING WATER SLASH", "watercut", false], ["tobiWaterDragon", "WATER DRAGON JUTSU", "crush", false], ["heavy", "REANIMATION", "drag", true]]) {
    const before = errs.length
    await page.evaluate(e => window.__harness.brutality.setEdoActive(e, "p1"), edo)
    const started = await page.evaluate(m => window.__harness.brutality.trigger("p1", true, m), move)
    await wf(2)
    const af = await page.evaluate(() => window.__harness.brutality.activeFinisher())
    ok(started && af && af.name === name && af.gore === gore, `${edo ? "EDO-active " : ""}${move} → ${name} (${gore})  [got ${af?.name}/${af?.gore}]`)
    await wf(8); await page.screenshot({ path: path.join(SHOTS, `tobi_${gore}${edo ? "_trait" : ""}.png`) })
    await page.waitForFunction(() => { const s = window.__harness.brutality.activeFinisher(); return !s }, null, { timeout: 8000, polling: 16 }).catch(() => {})
    ok(errs.length === before, `${gore}: 0 page errors  [${errs.slice(before, 1).join(" | ")}]`)
    await page.evaluate(() => window.__harness.brutality.setEdoActive(false, "p1"))
    // re-seat for the next trigger
    await page.evaluate(() => window.__harness.skipToBattle?.()); await wf(2)
    if (edo === false) { await page.evaluate(() => { const p2 = window.__harness.p2(); if (p2) p2.health = p2.maxHealth }) }
  }

  ok(errs.length === 0, `no page JS errors overall  [${errs.slice(0, 2).join(" | ")}]`)
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} brutality-tobirama: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
