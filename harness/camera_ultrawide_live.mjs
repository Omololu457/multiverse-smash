// harness/camera_ultrawide_live.mjs
// TRACK E live check: boot a real match in an ULTRAWIDE viewport (3440×1440) and confirm the live
// camera never lets the visible width exceed the world / reveal past worldWidth at the sides.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 3440, height: 1440 } })   // 21:9 ultrawide
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
function check(n, c, d = "") { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const state = () => page.evaluate(() => window.__harness.state())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=vegeta`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(1720, 720)
  await page.evaluate(() => window.__harness.boot())
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(60)   // let the camera settle at the wide viewport

  // Sample the camera across a few frames of movement and check the view never exceeds the world.
  let worst = { over: 0, left: 0, right: 0 }
  const cw = 3440
  for (let i = 0; i < 30; i++) {
    // nudge P1 to the far edge so the camera is pushed toward a boundary
    await page.keyboard.down("d"); await frames(3); await page.keyboard.up("d")
    const c = await page.evaluate(() => window.__harness.camera())
    const viewW = cw / c.zoom
    const left = c.x - viewW / 2, right = c.x + viewW / 2
    if (viewW - c.worldWidth > worst.over) worst = { over: viewW - c.worldWidth, left, right, world: c.worldWidth, zoom: c.zoom, viewW }
  }
  const c0 = await page.evaluate(() => window.__harness.camera())
  const viewW0 = cw / c0.zoom
  check("live ultrawide: visible width ≤ world (never wider than the world)", viewW0 <= c0.worldWidth + 1, `viewW=${viewW0.toFixed(0)} world=${c0.worldWidth} zoom=${c0.zoom.toFixed(3)}`)
  check("live ultrawide: min zoom raised to fill the width", c0.zoom >= cw / c0.worldWidth - 1e-3, `zoom=${c0.zoom.toFixed(3)} need≥${(cw / c0.worldWidth).toFixed(3)}`)
  check("across movement: view never exceeded the world width", worst.over <= 1, `worst overshoot=${worst.over.toFixed(1)} (${JSON.stringify(worst)})`)
  await page.screenshot({ path: path.join(OUT, "CAMERA_ultrawide.png") })
  check("no page JS errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} camera-ultrawide-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
