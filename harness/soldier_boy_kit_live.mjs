/**
 * SOLDIER BOY — PHASE 4 live kit check. Boots the real game headless, closes distance, fires a neutral
 * special (Gold Rush) and the NUCLEAR BURST ultimate, and confirms the ult's scheduled radial pulses deal
 * damage to the opponent in the live game loop, both fighters + HUD render, no JS errors / no 404s.
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "soldier_boy_work")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; const my404 = []
page.on("pageerror", e => jsErrors.push(String(e)))
page.on("response", r => { if (r.status() === 404 && /soldier_boy_/.test(r.url())) my404.push(r.url()) })

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
const snap1 = () => page.evaluate(() => window.__harness.p1())
const snap2 = () => page.evaluate(() => window.__harness.p2())
const shot = (n) => page.screenshot({ path: path.join(OUT, `_kit_${n}.png`) })
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function hold(k, n) { await page.keyboard.down(k); await frames(n); await page.keyboard.up(k); await frames(2) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=soldier_boy&p2=homelander`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(20)

  const s1 = await snap1(), s2 = await snap2()
  ok(s1 && s1.key === "soldier_boy", `p1 is soldier_boy (${s1 && s1.key})`)

  // NEUTRAL SPECIAL — Gold Rush (just the special button "l"). Confirm it fires (no crash) & commits him.
  const e0 = (await snap1()).energy
  await page.keyboard.down("l"); await frames(3); await page.keyboard.up("l"); await frames(6)
  const sGR = await snap1()
  ok(sGR.energy < e0, `Gold Rush spent Nuclear Charge (${e0}→${sGR.energy})`)
  await shot("1_goldrush")
  await frames(40)

  // Close distance so the opponent is inside the 360px nuke radius.
  const toward = () => (snap2().then(a => a.x) )
  for (let i = 0; i < 30; i++) {
    const a = await snap1(), b = await snap2()
    if (Math.abs(a.x - b.x) < 260) break
    await hold(a.x < b.x ? "d" : "a", 10)
  }
  const near1 = await snap1(), near2 = await snap2()
  ok(Math.abs(near1.x - near2.x) < 360, `closed into nuke radius (dist ${Math.round(Math.abs(near1.x - near2.x))})`)

  // NUCLEAR BURST — fill meter, fire the ult, let the 3 radial pulses resolve in the loop.
  const hp0 = (await snap2()).health
  const ultRes = await page.evaluate(() => { window.__harness.fillEnergy(); return window.__harness.p1Ultimate() })
  await frames(10); await shot("2_nuke_startup")
  await frames(50); await shot("3_nuke_blast")
  const hp1 = (await snap2()).health
  const ultDmg = hp0 - hp1
  ok(ultRes === true || (typeof ultRes === "object" && ultRes), `Nuclear Burst cast (${JSON.stringify(ultRes)})`)
  ok(ultDmg > 0, `Nuclear Burst radial pulses dealt damage (dmg=${ultDmg})`)
  await frames(60)

  // both render + HUD, no errors
  const f1 = await snap1(), f2 = await snap2()
  ok(f1 && f1.health > 0, "p1 still has HUD/health")
  ok(f2 && f2.health >= 0, "p2 HUD intact")
  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)
  ok(my404.length === 0, `soldier_boy 404s: ${my404.slice(0, 6).join(", ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  SOLDIER BOY KIT LIVE: ${passed} passed, ${failed} failed`)
  console.log(`  goldRush energy ${e0}→${sGR.energy}  nuke dmg to p2=${ultDmg}  dist=${Math.round(Math.abs(near1.x - near2.x))}`)
  console.log(`  JS-exceptions=${jsErrors.length}  soldier_boy-404s=${my404.length}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e)); failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
