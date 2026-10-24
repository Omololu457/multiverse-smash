/**
 * HOMELANDER secondary kit — Take A Ride (Fwd+Grab air-throw), Flex Parry (tap Block → i-frames + counter
 * window), Super Hearing (passive sonar ping + flex prime when the opponent winds up). Boots headless.
 * Keys: grab=o, block=;, light=j. Robust to CPU variance via retries. 0 JS errors.
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "homelander_work")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
const p1 = () => page.evaluate(() => window.__harness.flightProbe("p1"))
const p2 = () => page.evaluate(() => window.__harness.flightProbe("p2"))
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function hold(k, n) { await page.keyboard.down(k); await frames(n); await page.keyboard.up(k); await frames(2) }
async function approach(px) { for (let c = 0; c < 8; c++) { const a = await p1(), b = await p2(); if (Math.abs(a.x - b.x) <= px) break; await hold(b.x > a.x ? "d" : "a", 14) } }
async function actionable() { for (let w = 0; w < 24 && ((await p1()).hitstun > 0); w++) await frames(4) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=homelander&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start()); await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle()); await frames(20)

  // ── TAKE A RIDE (Fwd+Grab close → rise → slam) ──
  let ride = { fired: false, dmg: 0 }
  for (let attempt = 0; attempt < 6 && !(ride.fired && ride.dmg > 0); attempt++) {
    await actionable(); await approach(90)
    const a = await p1(), b = await p2(); const FWD = b.x > a.x ? "d" : "a"; const hp0 = b.health
    await page.keyboard.down(FWD); await page.keyboard.down("o"); await frames(3); await page.keyboard.up("o")
    let rose = false
    for (let i = 0; i < 10; i++) { const pp = await p1(); if (pp.hlRide) { ride.fired = true; if (pp.y < a.y - 25) rose = true } await frames(2) }
    await page.keyboard.up(FWD)
    for (let i = 0; i < 20 && (await p1()).hlRide; i++) await frames(3)
    ride.dmg = hp0 - (await p2()).health; ride.rose = rose
    if (ride.fired && ride.dmg > 0) { await page.screenshot({ path: path.join(OUT, "_kit_ride.png") }); break }
    await frames(70)
  }
  ok(ride.fired, "Take A Ride never fired (no _hlRide after Fwd+Grab)")
  ok(ride.rose, "Take A Ride did not lift Homelander off the ground")
  ok(ride.dmg > 60, `Take A Ride slam dealt too little (dmg=${ride.dmg}, expect ~130 pre-scale)`)

  await frames(30)

  // ── FLEX PARRY (tap Block → i-frames + counter window) ──
  await actionable()
  const beforeFlexCd = (await p1()).flexCd
  await page.keyboard.down(";"); await frames(2); await page.keyboard.up(";")
  await frames(2)
  const fx = await p1()
  ok(fx.invuln > 0, `Flex Parry gave no i-frames (invuln=${fx.invuln})`)
  ok(fx.flexCounter > 0, `Flex Parry opened no counter window (flexCounter=${fx.flexCounter})`)
  ok(fx.flexCd > beforeFlexCd, `Flex Parry cooldown not set (cd=${fx.flexCd})`)
  await page.screenshot({ path: path.join(OUT, "_kit_flex.png") })

  // ── SUPER HEARING (passive: opponent winds up → Homelander "hears" it) ──
  let heard = 0
  for (let i = 0; i < 60; i++) { await page.evaluate(() => window.__harness.p2Attack && window.__harness.p2Attack()); await frames(2); const h = (await p1()).heard; if (h > 0) { heard = h; break } }
  ok(heard > 0, `Super Hearing did not register the opponent's wind-up (heard=${heard})`)

  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)
  console.log("════════════════════════════════════════════")
  console.log(`  HOMELANDER KIT: ${passed} passed, ${failed} failed`)
  console.log(`  TakeARide fired=${ride.fired} rose=${ride.rose} dmg=${ride.dmg} | Flex invuln=${fx.invuln} counter=${fx.flexCounter} cd=${fx.flexCd} | SuperHearing heard=${heard}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) { console.log("HARNESS THREW:", String(e)); failed++ }
finally { await browser.close(); server.close(); process.exit(failed ? 1 : 0) }
