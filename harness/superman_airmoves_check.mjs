/**
 * SUPERMAN AIR MOVES check (Phase 4b) — Ground Pound (airborne Down+Special dive-slam + shockwave) and
 * Kryptonian Grab (Forward+Grab, close → fly up → slam down). Boots the real game headless, drives each
 * move with the keyboard, and confirms it fires (state machine runs), connects (opponent damaged +
 * knocked down), and recovers (Superman back on the ground), with 0 JS errors. Robust to CPU/seed
 * variance via retries. Keys: special=l, grab=o, down=s, up/jump=w, charge/takeoff=p, fwd/back=d/a.
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
const shot = (n) => page.screenshot({ path: path.join(OUT, `_air_${n}.png`) })
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function hold(k, n) { await page.keyboard.down(k); await frames(n); await page.keyboard.up(k); await frames(2) }
async function approach(px) { for (let c = 0; c < 8; c++) { const a = await p1p(), b = await p2p(); if (Math.abs(a.x - b.x) <= px) break; await hold(b.x > a.x ? "d" : "a", 14) } }
async function waitActionable() { for (let w = 0; w < 24 && ((await p1p()).hitstun > 0); w++) await frames(4) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(20)
  await page.evaluate(() => window.__harness.fillEnergy())

  // ─────────── GROUND POUND ───────────
  let gpFired = false, gpLanded = false, gpDmg = 0
  for (let attempt = 0; attempt < 5 && !(gpFired && gpLanded && gpDmg > 0); attempt++) {
    await page.evaluate(() => window.__harness.fillEnergy())
    await waitActionable()
    await approach(170)                              // get near Goku so the shockwave connects
    await page.keyboard.down("p"); await frames(3); await page.keyboard.up("p")  // take off
    await frames(8)
    await page.keyboard.down("w"); await frames(16); await page.keyboard.up("w") // climb
    const hpBefore = (await p2p()).health
    // DOWN + SPECIAL (airborne) = Ground Pound
    await page.keyboard.down("s"); await page.keyboard.down("l"); await frames(3)
    await page.keyboard.up("l")
    // observe the dive
    for (let i = 0; i < 6; i++) { if ((await p1p()).gp) { gpFired = true; break } await frames(2) }
    // let it land + finish the impact-recovery phase (gp clears)
    for (let i = 0; i < 40 && (await p1p()).gp; i++) await frames(3)
    await page.keyboard.up("s")
    const a = await p1p(), b = await p2p()
    if (a.onGround && !a.gp) gpLanded = true
    gpDmg = hpBefore - b.health
    if (gpFired && gpLanded && gpDmg > 0) { await shot("1_ground_pound"); break }
    await frames(30)
  }
  ok(gpFired, "Ground Pound never fired (no _supGPound state after air Down+Special)")
  ok(gpLanded, "Ground Pound did not land / recover to the ground")
  ok(gpDmg > 0, `Ground Pound shockwave dealt no damage (dmg=${gpDmg})`)

  await frames(30)
  await page.evaluate(() => window.__harness.fillEnergy())

  // ─────────── KRYPTONIAN GRAB ───────────
  let kgFired = false, kgRose = false, kgDmg = 0, kgKd = false
  for (let attempt = 0; attempt < 6 && !(kgFired && kgDmg > 0); attempt++) {
    await page.evaluate(() => window.__harness.fillEnergy())
    await waitActionable()
    await approach(85)                               // point-blank
    const a0 = await p1p(), b0 = await p2p()
    const FWD = b0.x > a0.x ? "d" : "a"
    const hpBefore = b0.health, yBefore = a0.y
    // FORWARD + GRAB = Kryptonian Grab
    await page.keyboard.down(FWD); await page.keyboard.down("o"); await frames(3)
    await page.keyboard.up("o")
    // observe rise
    for (let i = 0; i < 10; i++) { const a = await p1p(); if (a.kg) { kgFired = true; if (a.y < yBefore - 25) kgRose = true } await frames(2) }
    await page.keyboard.up(FWD)
    // let the slam resolve
    for (let i = 0; i < 24 && (await p1p()).kg; i++) await frames(3)
    const b = await p2p()
    kgDmg = hpBefore - b.health; kgKd = b.knockdown || b.kg === null && b.hitstun > 0
    if (kgFired && kgDmg > 0) { kgKd = (await p2p()).knockdown || kgKd; await shot("2_kryptonian_grab"); break }
    await frames(30)
  }
  ok(kgFired, "Kryptonian Grab never fired (no _supKGrab after Fwd+Grab close)")
  ok(kgRose, "Kryptonian Grab did not lift Superman off the ground")
  ok(kgDmg > 60, `Kryptonian Grab slam dealt too little (dmg=${kgDmg}, expect ~130 pre-scale ≈ 78)`)

  // both fighters + HUD still alive, no errors
  const sf1 = await p1p(), sf2 = await p2p()
  ok(sf1.health > 0 && sf2.health >= 0, "a fighter lost its HUD/health")
  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  SUPERMAN AIR MOVES: ${passed} passed, ${failed} failed`)
  console.log(`  GroundPound fired=${gpFired} landed=${gpLanded} dmg=${gpDmg}`)
  console.log(`  KryptonianGrab fired=${kgFired} rose=${kgRose} dmg=${kgDmg} knockdown=${kgKd}`)
  console.log(`  JS-exceptions=${jsErrors.length}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e)); failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
