/**
 * HOMELANDER RENDER CHECK (Phase 3) — boots the real game headless (Playwright), picks Homelander,
 * starts a match, takes off, flies (climb + cruise), lands, and confirms both fighters + the HUD
 * render with ZERO page errors. The flight laser (Heat Vision) is a kit-pass follow-up, so this
 * checks take-off / fly / land / render; it records the flight phase, pose, and resolved sprite
 * action so we know the FLIGHT MODULE (not a jump) is driving him. Screenshots → homelander_work/.
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
const jsErrors = []          // real JS exceptions (must be zero)
const my404 = []             // only MY homelander_* assets 404ing matter; pre-existing batman/etc. noise is ignored
page.on("pageerror", e => jsErrors.push(String(e)))
page.on("response", r => { if (r.status() === 404 && /homelander_/.test(r.url())) my404.push(r.url()) })

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
const probe = () => page.evaluate(() => window.__harness.flightProbe("p1"))
const snap1 = () => page.evaluate(() => window.__harness.p1())
const snap2 = () => page.evaluate(() => window.__harness.p2())
const shot = (n) => page.screenshot({ path: path.join(OUT, `_render_${n}.png`) })
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function hold(k, n) { await page.keyboard.down(k); await frames(n); await page.keyboard.up(k); await frames(2) }
async function tap(k) { await page.keyboard.down(k); await frames(3); await page.keyboard.up(k); await frames(3) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=homelander&p2=batman`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(20)

  // registered + rendering?
  const s1 = await snap1(), s2 = await snap2()
  ok(s1 && s1.key === "homelander", `p1 is not homelander (${s1 && s1.key})`)
  ok(s2 && s2.key === "batman", `p2 is not batman (${s2 && s2.key})`)
  ok(s1 && (s1.health > 0), "p1 has no health (HUD)")
  ok(s2 && (s2.health > 0), "p2 has no health (HUD)")
  ok(s1 && s1.hasSpriteHandler && s1.spriteReady !== false, "homelander sprite not ready/rendering")
  const pr0 = await probe()
  ok(pr0 && pr0.has, "flight controller not initialised on homelander")
  ok(pr0 && pr0.onGround, "homelander should start grounded")
  await shot("1_grounded")

  // TAKE OFF (charge tap = "p")
  await tap("p")
  await frames(6)
  const prTO = await probe()
  ok(prTO && !prTO.onGround, `did not leave the ground on takeoff (onGround=${prTO && prTO.onGround})`)
  ok(prTO && (prTO.phase === "takeoff" || prTO.phase === "flying"), `not in a flight phase after takeoff (${prTO && prTO.phase})`)

  // CLIMB (hold up = "w")
  const yBefore = (await probe()).y
  await hold("w", 45)
  const prUp = await probe()
  ok(prUp.y < yBefore - 30, `did not climb (y ${yBefore} → ${prUp.y})`)
  ok(["rise", "cruiseA", "cruiseB", "hoverIdle"].includes(prUp.pose) || prUp.phase === "flying", `unexpected climb pose ${prUp.pose}`)
  await shot("2_flying_climb")

  // CRUISE right (hold "d")
  const xBefore = (await probe()).vx
  await hold("d", 22)
  const prCr = await probe()
  ok(prCr.action && /fly/i.test(String(prCr.action)), `cruise not rendering a flight sprite (action=${prCr.action})`)
  await shot("3_flying_cruise")

  // DESCEND + LAND (hold down = "s" until grounded)
  let grounded = false
  for (let i = 0; i < 40 && !grounded; i++) { await hold("s", 8); grounded = (await probe()).onGround }
  const prLand = await probe()
  ok(prLand.onGround, `did not land (phase=${prLand.phase}, y=${prLand.y})`)
  await shot("4_landed")

  // FIRE A LASER (Heat Vision = special "l"). Hold it so the sustained beam drains the heat gauge.
  const heat0 = (await probe()).laserHeat
  await page.keyboard.down("l"); await frames(18)
  const prFire = await probe()
  await shot("5_heat_vision")
  await page.keyboard.up("l"); await frames(2)
  ok(prFire.hvActive, "Heat Vision did not activate on special")
  ok(prFire.laserHeat < heat0, `laser-heat gauge did not drain (${heat0} → ${prFire.laserHeat})`)
  // beam stops after release, then heat recovers when idle
  await frames(12)
  const prStop = await probe()
  ok(!prStop.hvActive, `beam did not stop after releasing special (heat=${prStop.laserHeat})`)
  await frames(50)
  const prCool = await probe()
  ok(prCool.laserHeat > prStop.laserHeat, `laser-heat did not recover while idle (${prStop.laserHeat} → ${prCool.laserHeat})`)

  // both fighters + HUD still render, no errors
  const sf1 = await snap1(), sf2 = await snap2()
  ok(sf1 && sf1.health > 0 && sf2 && sf2.health > 0, "a fighter lost its HUD/health after the flight")
  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)
  ok(my404.length === 0, `homelander assets 404: ${my404.slice(0, 5).join(", ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  HOMELANDER RENDER CHECK: ${passed} passed, ${failed} failed`)
  console.log(`  takeoff.phase=${prTO?.phase} climb y ${yBefore}→${prUp.y} pose=${prUp.pose} cruise.action=${prCr.action} landed.phase=${prLand.phase}`)
  console.log(`  laser: heat ${heat0}→${prFire.laserHeat} (active=${prFire.hvActive}, hit=${prFire.hvHit}) recovered→${prCool.laserHeat}`)
  console.log(`  JS-exceptions=${jsErrors.length}  homelander-404s=${my404.length}  (pre-existing batman/etc. 404s ignored)`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e))
  failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
