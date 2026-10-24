/** SOLDIER BOY — gun muzzle check: fire SMG (Down+Special) and Rifle (Back+Special), screenshot the bullets. */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "soldier_boy_work")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(String(e)))
const state = () => page.evaluate(() => window.__harness.state())
const snap1 = () => page.evaluate(() => window.__harness.p1())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
const projCount = () => page.evaluate(() => (window.__harness.projectiles?.() || []).length).catch(() => -1)
try {
  await page.goto(`${base}/index.html?harness=1&p1=soldier_boy&p2=homelander`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start()); await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle()); await frames(20)
  await page.evaluate(() => window.__harness.fillEnergy())
  // SMG Barrage = Down + Special. Hold s, tap l, let a few bullets spawn, screenshot mid-burst.
  await page.keyboard.down("s"); await page.keyboard.down("l"); await frames(10)
  const s1 = await snap1()
  await page.screenshot({ path: path.join(OUT, "_gun_smg.png") })
  await page.keyboard.up("l"); await page.keyboard.up("s"); await frames(30)
  // Rifle = Back + Special. facing right → back is 'a'. fill energy, hold a, tap l.
  await page.evaluate(() => window.__harness.fillEnergy())
  const face = (await snap1()).facing || 1
  const back = face >= 0 ? "a" : "d"
  await page.keyboard.down(back); await page.keyboard.down("l"); await frames(24)
  await page.screenshot({ path: path.join(OUT, "_gun_rifle.png") })
  await page.keyboard.up("l"); await page.keyboard.up(back); await frames(6)
  console.log(`p1 x=${Math.round(s1.x)} w=${s1.w} facing=${s1.facing} ; errors=${errs.length}`)
  console.log("shots → soldier_boy_work/_gun_smg.png , _gun_rifle.png")
} catch (e) { console.log("THREW", String(e)) } finally { await browser.close(); server.close() }
