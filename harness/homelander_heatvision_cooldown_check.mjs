/**
 * HOMELANDER HEAT VISION cooldown check (2026-11-15 nerf): every beam is followed by a 1s re-fire cooldown
 * shown on his own laser bar (not the energy bar); emptying the heat bar overheats. Keys: special=l.
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "superman_work")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []
page.on("pageerror", e => jsErrors.push(String(e)))

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
const p1p = () => page.evaluate(() => window.__harness.flightProbe("p1"))
const p2p = () => page.evaluate(() => window.__harness.flightProbe("p2"))
const projCount = () => page.evaluate(() => window.__harness.projectiles().filter(p => /heatvision|solarbeam/.test(String(p.name))).length)
const shot = (n) => page.screenshot({ path: path.join(OUT, `_hv_${n}.png`) })
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=homelander&p2=superman`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start()); await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle()); await frames(20)
  const L = () => page.evaluate(() => window.__harness.laserProbe("p1"))
  // ── HOMELANDER: tap fires, release starts the 1s re-fire cooldown, re-press inside it does nothing ──
  const e0 = (await L()).energy
  await page.keyboard.down("l"); await frames(3); await page.keyboard.up("l"); await frames(2)
  const a = await L()
  ok(a.hl.active || a.hl.cd > 0, `Homelander tap did not fire Heat Vision (${JSON.stringify(a.hl)})`)
  await frames(14)
  const b = await L()
  ok(!b.hl.active && b.hl.cd > 0, `beam end should start the laser cooldown (${JSON.stringify(b.hl)})`)
  await page.keyboard.down("l"); await frames(3); await page.keyboard.up("l"); await frames(1)
  ok(!(await L()).hl.active, `re-fire inside the cooldown must do nothing`)
  ok((await L()).energy === e0 || (await L()).energy >= e0, `Heat Vision must not spend the energy bar`)
  await page.screenshot({ path: path.join(OUT, "_hv_cooldown_hud.png") })
  // ── hold until the heat bar empties → overheat lockout ──
  await frames(200)
  await page.keyboard.down("l"); await frames(110); await page.keyboard.up("l"); await frames(2)
  const c = await L()
  ok(c.hl.over > 0, `holding the beam until heat empties should overheat (${JSON.stringify(c.hl)})`)
  await page.screenshot({ path: path.join(OUT, "_hv_overheat_hud.png") })
  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)
  console.log(`  HOMELANDER HEAT VISION COOLDOWN: ${passed} passed, ${failed} failed  ${JSON.stringify({ b: b.hl, c: c.hl })}`)
  if (failed) fails.forEach(m => console.log("  ✗ " + m))
} catch (e) { console.log("HARNESS THREW:", String(e)); failed++ }
finally { await browser.close(); server.close(); process.exit(failed ? 1 : 0) }
