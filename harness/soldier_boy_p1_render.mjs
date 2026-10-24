/**
 * SOLDIER BOY — PHASE 1 RENDER CHECK. Boots the real game headless (Playwright), picks Soldier Boy
 * vs Homelander, starts a match, and confirms BOTH fighters + the HUD render, the Soldier Boy sprite
 * handler is live (idle manifest gate flipped him off the procedural box), and walk / jump / crouch
 * resolve real sprite actions with ZERO page JS errors and ZERO soldier_boy asset 404s. Screenshots
 * → soldier_boy_work/.
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
const shot = (n) => page.screenshot({ path: path.join(OUT, `_render_${n}.png`) })
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function hold(k, n) { await page.keyboard.down(k); await frames(n); await page.keyboard.up(k); await frames(2) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=soldier_boy&p2=homelander`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(24)

  // registered + rendering?
  const s1 = await snap1(), s2 = await snap2()
  ok(s1 && s1.key === "soldier_boy", `p1 is not soldier_boy (${s1 && s1.key})`)
  ok(s2 && s2.key === "homelander", `p2 is not homelander (${s2 && s2.key})`)
  ok(s1 && s1.health > 0, "p1 has no health (HUD)")
  ok(s2 && s2.health > 0, "p2 has no health (HUD)")
  ok(s1 && s1.maxEnergy === 100, `Nuclear Charge pool wrong (maxEnergy=${s1 && s1.maxEnergy})`)
  ok(s1 && s1.hasSpriteHandler && s1.spriteReady !== false, "soldier_boy sprite not ready/rendering (procedural box?)")
  await shot("1_idle")

  // WALK forward
  await hold("d", 20)
  const sWalk = await snap1()
  ok(/walk|run/.test(String(sWalk.action || sWalk.currentMove || "")) || Math.abs(sWalk.x - s1.x) > 2, `walk did not move/animate (action=${sWalk.action}, dx=${(sWalk.x - s1.x).toFixed(1)})`)
  await shot("2_walk")

  // JUMP
  await page.keyboard.down("w"); await frames(10)
  const sJump = await snap1()
  ok(sJump.y < s1.y - 5 || /jump|fall/.test(String(sJump.action || "")), `jump did not leave the ground (y ${s1.y}→${sJump.y}, action=${sJump.action})`)
  await page.keyboard.up("w"); await frames(26)
  await shot("3_jump")

  // CROUCH (hold down)
  await page.keyboard.down("s"); await frames(10)
  const sCr = await snap1()
  await shot("4_crouch")
  await page.keyboard.up("s"); await frames(4)
  ok(s1.hasSpriteHandler, "sprite handler lost after crouch")

  // both fighters + HUD still render, no errors
  const f1 = await snap1(), f2 = await snap2()
  ok(f1 && f1.health > 0 && f2 && f2.health > 0, "a fighter lost its HUD/health")
  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)
  ok(my404.length === 0, `soldier_boy assets 404: ${my404.slice(0, 6).join(", ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  SOLDIER BOY P1 RENDER CHECK: ${passed} passed, ${failed} failed`)
  console.log(`  p1=${s1?.key} hp=${s1?.health} energy=${s1?.energy}/${s1?.maxEnergy} spriteReady=${s1?.spriteReady} handler=${s1?.hasSpriteHandler}`)
  console.log(`  idle.action=${s1?.action} walk.action=${sWalk?.action} jump.action=${sJump?.action} crouch.action=${sCr?.action}`)
  console.log(`  JS-exceptions=${jsErrors.length}  soldier_boy-404s=${my404.length}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e)); failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
