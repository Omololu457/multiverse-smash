// harness/screen_breaker.test.mjs — SCREEN BREAKER: in the match-end FINISH window, GRAB (O) then SPECIAL (L): the winner
// lifts the loser overhead and throws them at the camera; the body grows, smashes the screen, the glass cracks, it slides down.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".ogg": "audio/ogg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on("pageerror", e => errors.push(String(e)))
const sleep = t => new Promise(r => setTimeout(r, t))
const OUT = path.join(ROOT, "harness", "shots", "screen_breaker"); fs.mkdirSync(OUT, { recursive: true })
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "dummy" }); window.__harness.skipToBattle() })
  for (let r = 0; r < 2; r++) {
    await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" && s.countdown === 0 }, null, { timeout: 90000, polling: 50 })
    await page.evaluate(() => window.__harness.forceP1Win())
    if (r === 0) await page.waitForFunction(() => window.__harness.state().gameState === "roundBreak", null, { timeout: 30000, polling: 50 })
  }
  const fin = () => page.evaluate(async () => (await import("./fatalityCinematic.js")).fatalityStatus())
  const sb = () => page.evaluate(async () => (await import("./screenBreaker.js")).screenBreakerState())
  let w = null; for (let i = 0; i < 150 && !(w && w.phase === "window"); i++) { w = await fin(); await sleep(100) }
  check("the match-end KO opens the FINISH window", w?.phase === "window", JSON.stringify(w))
  await sleep(300); await page.screenshot({ path: path.join(OUT, "window.png") })
  await page.keyboard.down("KeyO"); await sleep(120); await page.keyboard.up("KeyO"); await sleep(80); await page.keyboard.down("KeyL"); await sleep(120); await page.keyboard.up("KeyL")
  const seen = new Set(); let maxScale = 1, crack = false, n = 0
  for (let i = 0; i < 400; i++) { const s = await sb(); if (!s.phase && seen.size) break; if (s.phase) { seen.add(s.phase); maxScale = Math.max(maxScale, s.scale); crack ||= s.crack
      if (s.t >= [10, 35, 55, 75, 88, 100, 140, 200][n]) await page.screenshot({ path: path.join(OUT, `sb${n++}.png`) }) } else if (i > 30) break; await sleep(40) }
  check("GRAB → SPECIAL performs the Screen Breaker", seen.has("run"), JSON.stringify([...seen]))
  check("the body is thrown at the camera (grows big) and cracks the screen", maxScale > 3 && crack, JSON.stringify({ maxScale, crack }))
  await page.waitForFunction(() => window.__harness.state().gameState === "victory", null, { timeout: 60000 }).then(() => true, () => false)
  check("then the victory screen", (await page.evaluate(() => window.__harness.state().gameState)) === "victory")
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`screen_breaker: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
