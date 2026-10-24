/**
 * SUPERMAN RENDER CHECK (feat/superman, foundation) — boots the real game headless (Playwright),
 * picks Superman, starts a match, confirms he RENDERS AS SPRITES (not a fallback box) with a HUD,
 * then exercises the flight.js module (take off → climb → cruise → land) and confirms both fighters
 * + HUD still render with ZERO page errors and no superman_ asset 404s. Screenshots → superman_work/.
 * (The re-spec'd moveset is verified by later kit harnesses; this is the render + flight foundation.)
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
const my404 = []
page.on("pageerror", e => jsErrors.push(String(e)))
page.on("response", r => { if (r.status() === 404 && /superman_/.test(r.url())) my404.push(r.url()) })

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
  await page.goto(`${base}/index.html?harness=1&p1=superman&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(20)

  // REGISTERED + RENDERING AS SPRITES
  const s1 = await snap1(), s2 = await snap2()
  ok(s1 && s1.key === "superman", `p1 is not superman (${s1 && s1.key})`)
  ok(s2 && s2.key === "goku", `p2 is not goku (${s2 && s2.key})`)
  ok(s1 && s1.health > 0, "superman has no health (HUD)")
  ok(s2 && s2.health > 0, "goku has no health (HUD)")
  ok(s1 && s1.hasSpriteHandler && s1.spriteReady !== false, "superman sprite not ready/rendering (fallback box)")
  ok(s1 && (s1.maxEnergy === 100), `superman maxEnergy should be 100 (got ${s1 && s1.maxEnergy})`)
  ok(s1 && (s1.maxHealth === 1150), `superman maxHealth should be 1150 (got ${s1 && s1.maxHealth})`)
  // Grounded neutral resolves the idle pose (new superman_idle_uniform slice); sprite-ready + zero
  // superman_ 404s above prove the new sheets actually decode.
  const idleAction = s1 && (s1.action || s1.spriteAction || "")
  ok(/idle/.test(String(idleAction)), `not resolving the idle pose at neutral (action=${idleAction})`)
  const pr0 = await probe()
  ok(pr0 && pr0.has, "flight controller not initialised on superman (flightProfile not wired?)")
  ok(pr0 && pr0.onGround, "superman should start grounded")
  await shot("1_grounded")

  // TAKE OFF (charge tap = "p")
  // charge-TAP takeoff; retry a few times (the tap→takeoff window occasionally races one frame)
  let prTO = await probe()
  for (let i = 0; i < 5 && (prTO.onGround || prTO.phase === "grounded"); i++) { await tap("p"); await frames(6); prTO = await probe() }
  ok(prTO && !prTO.onGround, `did not leave the ground on takeoff (onGround=${prTO && prTO.onGround})`)
  ok(prTO && (prTO.phase === "takeoff" || prTO.phase === "flying"), `not in a flight phase after takeoff (${prTO && prTO.phase})`)

  // CLIMB (hold up = "w")
  const yBefore = (await probe()).y
  await hold("w", 45)
  const prUp = await probe()
  ok(prUp.y < yBefore - 20, `did not climb (y ${yBefore} → ${prUp.y})`)
  await shot("2_flying_climb")

  // CRUISE right (hold "d") — must resolve a flight sprite action
  await hold("d", 22)
  const prCr = await probe()
  const cruiseFlightSprite = /superman_(run|flight|flightrise|flightdash)_uniform/.test(String(prCr.action))
  const cruiseFlightPose = ["cruiseA", "cruiseB", "hoverIdle", "rise", "dive", "turn", "capeTwirl"].includes(prCr.pose)
  ok(cruiseFlightSprite || cruiseFlightPose, `cruise not rendering a flight sprite (action=${prCr.action}, pose=${prCr.pose})`)
  await shot("3_flying_cruise")

  // DESCEND + LAND (hold down = "s" until grounded)
  let grounded = false
  for (let i = 0; i < 40 && !grounded; i++) { await hold("s", 8); grounded = (await probe()).onGround }
  const prLand = await probe()
  ok(prLand.onGround, `did not land (phase=${prLand.phase}, y=${prLand.y})`)
  await shot("4_landed")

  // THROW A FEW NORMALS (light "j", heavy "k") — confirm they resolve + render without error
  await hold("j", 6); await frames(6)
  await hold("k", 8); await frames(8)
  await shot("5_normals")

  // both fighters + HUD still render, no errors
  const sf1 = await snap1(), sf2 = await snap2()
  ok(sf1 && sf1.health > 0 && sf2 && sf2.health > 0, "a fighter lost its HUD/health after the flight")
  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)
  ok(my404.length === 0, `superman assets 404: ${my404.slice(0, 5).join(", ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  SUPERMAN RENDER CHECK: ${passed} passed, ${failed} failed`)
  console.log(`  sprite=${s1?.hasSpriteHandler} ready=${s1?.spriteReady} HP=${s1?.maxHealth} E=${s1?.maxEnergy}`)
  console.log(`  takeoff.phase=${prTO?.phase} climb y ${yBefore}→${prUp.y} pose=${prUp.pose} cruise.action=${prCr.action} landed.phase=${prLand.phase}`)
  console.log(`  JS-exceptions=${jsErrors.length}  superman-404s=${my404.length}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e))
  failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
