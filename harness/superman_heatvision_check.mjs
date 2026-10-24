/**
 * SUPERMAN HEAT VISION check — TAP vs HOLD. Tap neutral Special = a single travelling beam shot (keeps the
 * existing projectile). HOLD neutral Special = a sustained hitscan beam that AUTO-AIMS the opponent no
 * matter the distance (ticks damage, drains Solar Energy) until released. Boots the real game headless.
 * Keys: special=l. 0 JS errors.
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
async function hold(k, n) { await page.keyboard.down(k); await frames(n); await page.keyboard.up(k); await frames(2) }
async function approach(px) { for (let c = 0; c < 8; c++) { const a = await p1p(), b = await p2p(); if (Math.abs(a.x - b.x) <= px) break; await hold(b.x > a.x ? "d" : "a", 14) } }
async function retreat(px) { for (let c = 0; c < 12; c++) { const a = await p1p(), b = await p2p(); if (Math.abs(a.x - b.x) >= px) break; await hold(b.x > a.x ? "a" : "d", 14) } }

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(20)

  // ─────────── TAP = single beam shot (projectile) ───────────
  await page.evaluate(() => window.__harness.fillEnergy())
  const projBefore = await projCount()
  await page.keyboard.down("l"); await frames(3); await page.keyboard.up("l")   // quick TAP
  await frames(6)
  const projAfter = await projCount()
  const beamAfterTap = (await p1p()).hvBeam
  await shot("1_tap")
  ok(projAfter > projBefore, `TAP did not spawn a heat-vision projectile (${projBefore}→${projAfter})`)
  ok(!beamAfterTap, `TAP should NOT start the sustained beam (hvBeam=${beamAfterTap})`)
  await frames(40)   // let the tap projectile clear

  // ─────────── HOLD = sustained AUTO-AIM beam, even from far ───────────
  await page.evaluate(() => window.__harness.fillEnergy())
  await retreat(520)                       // get FAR away → prove it auto-aims regardless of distance
  const far = Math.abs((await p1p()).x - (await p2p()).x)
  const hpBefore = (await p2p()).health
  const eBefore = (await p1p()).solarE
  await page.keyboard.down("l")
  await frames(14)                         // past the hold threshold → beam engages
  const midBeam = await p1p()
  await shot("2_hold_beam")
  await frames(26)                         // keep beaming
  const hpMid = (await p2p()).health
  const eMid = (await p1p()).solarE
  await page.keyboard.up("l")
  await frames(4)
  const afterRelease = await p1p()
  ok(midBeam.hvBeam, `HOLD did not start the sustained beam (hvBeam=${midBeam.hvBeam})`)
  ok(hpMid < hpBefore, `sustained beam dealt no damage from range (far=${Math.round(far)}px, hp ${hpBefore}→${hpMid})`)
  ok(eMid < eBefore, `sustained beam did not drain Solar Energy (${eBefore}→${eMid})`)
  ok(!afterRelease.hvBeam, `beam did not stop on release (hvBeam=${afterRelease.hvBeam})`)

  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  SUPERMAN HEAT VISION: ${passed} passed, ${failed} failed`)
  console.log(`  TAP: projectiles ${projBefore}→${projAfter}, sustained=${beamAfterTap}`)
  console.log(`  HOLD @ ${Math.round(far)}px: beam=${midBeam.hvBeam} dmg ${hpBefore}→${hpMid} energy ${eBefore}→${eMid} stop-on-release=${!afterRelease.hvBeam}`)
  console.log(`  JS-exceptions=${jsErrors.length}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e)); failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
