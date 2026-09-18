// harness/narrow_kit_specials_live.mjs
// TRACK B live verify: each of the 6 narrow-kit characters' NEW special fires in a real match —
// energy is spent (by the exact cost), and the gap-filling effect actually happens (projectile
// spawns / launcher+attack / i-frame defensive evade). Boots each char, sets full meter, presses
// Special with the assigned direction, and reads the live fighter + projectile list.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
function check(n, c, d = "") { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
function section(t) { console.log(`\n── ${t} ─────────────────────────────`) }
// Energy regenerates every frame, so after a short wait the meter has clawed a little back:
// spent = max − energy ≈ cost (slightly under). Accept cost−4 .. cost+1.
function spentOK(max, energy, cost) { const d = max - energy; return d >= cost - 4 && d <= cost + 1 }
const state = () => page.evaluate(() => window.__harness.state())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
const p1 = () => page.evaluate(() => window.__harness.p1())
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name))

async function boot(key) {
  await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=${key}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot())
  await page.evaluate(() => window.__harness.skipToBattle())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 15000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.clearProjectiles())
  await frames(6)
}
// Fire the special via the real dispatch with full meter, then read the outcome after a short wait.
async function fireSpec(dir) {
  await page.evaluate(() => window.__harness.clearProjectiles())
  const res = await page.evaluate((d) => window.__harness.brutality.p1Spec(d), dir)
  await frames(16)   // let scheduled projectiles spawn
  const f = await p1()
  const projs = await projNames()
  return { res, f, projs }
}

try {
  section("JASON — Machete Throw (Down) : zoning projectile")
  await boot("jason")
  let max = (await p1()).maxEnergy
  let o = await fireSpec("D")
  check("fires (energy spent ≈ 30)", spentOK(max, o.f.energy, 30), `spent ${(max-o.f.energy).toFixed(1)}`)
  check("spawns a thrown machete projectile", o.projs.includes("jasonMachete"), `projs=[${o.projs}]`)

  section("ALT_SUKUNA — Cursed Repel (Back) : defensive AOE + i-frames")
  await boot("alt_sukuna")
  max = (await p1()).maxEnergy
  o = await page.evaluate(() => window.__harness.brutality.p1Spec("B")); await frames(2)
  let f = await p1()
  check("fires (energy spent ≈ 30)", spentOK(max, f.energy, 30), `spent ${(max-f.energy).toFixed(1)}`)
  check("is attacking (AOE burst active)", f.attacking === true, `attacking=${f.attacking}`)
  check("grants i-frames (defensive reversal)", (f.invulnTimer || 0) > 0, `invuln=${f.invulnTimer}`)

  section("MIWA — Iai Flash-Step (Back, grounded) : defensive i-frame evade")
  await boot("miwa")
  max = (await p1()).maxEnergy
  const faceMiwa = (await p1()).facing
  o = await page.evaluate(() => window.__harness.brutality.p1Spec("B")); await frames(2)
  f = await p1()
  check("fires (energy spent ≈ 18)", spentOK(max, f.energy, 18), `spent ${(max-f.energy).toFixed(1)}`)
  check("grants escape i-frames", (f.invulnTimer || 0) > 0, `invuln=${f.invulnTimer}`)
  check("steps BACKWARD (away from facing)", Math.sign(f.vx) === -Math.sign(faceMiwa || 1) && f.vx !== 0, `vx=${f.vx} facing=${faceMiwa}`)

  section("IPPO — Slip Counter (Back) : slip i-frames → counter-hook")
  await boot("ippo")
  max = (await p1()).maxEnergy
  o = await page.evaluate(() => window.__harness.brutality.p1Spec("B")); await frames(2)
  f = await p1()
  check("fires (energy spent ≈ 26)", spentOK(max, f.energy, 26), `spent ${(max-f.energy).toFixed(1)}`)
  check("is attacking (counter hitbox)", f.attacking === true, `attacking=${f.attacking}`)
  check("grants slip i-frames on the read", (f.invulnTimer || 0) > 0, `invuln=${f.invulnTimer}`)

  section("GHOSTFACE_BILLY — Stalker's Slip (Back) : defensive i-frame evade")
  await boot("ghostface_billy")
  max = (await p1()).maxEnergy
  const faceBilly = (await p1()).facing
  o = await page.evaluate(() => window.__harness.brutality.p1Spec("B")); await frames(2)
  f = await p1()
  check("fires (energy spent ≈ 20)", spentOK(max, f.energy, 20), `spent ${(max-f.energy).toFixed(1)}`)
  check("grants slip i-frames", (f.invulnTimer || 0) > 0, `invuln=${f.invulnTimer}`)
  check("backsteps (re-stalk)", Math.sign(f.vx) === -Math.sign(faceBilly || 1) && f.vx !== 0, `vx=${f.vx} facing=${faceBilly}`)

  section("RICK_PRIME — Portal Skyshot (Up) anti-air + Portal Blast (neutral)")
  await boot("rickPrime")
  max = (await p1()).maxEnergy
  o = await page.evaluate(() => window.__harness.brutality.p1Spec("U")); await frames(2)
  f = await p1()
  check("Skyshot fires (energy spent ≈ 30)", spentOK(max, f.energy, 30), `spent ${(max-f.energy).toFixed(1)}`)
  check("Skyshot is an attacking launcher", f.attacking === true, `attacking=${f.attacking}`)
  check("Skyshot move = rickPrimeSkyshot", o.move === "rickPrimeSkyshot", `move=${o.move}`)
  // neutral portal blast (previously unrouted → generic fallback; now its authored special)
  await boot("rickPrime")
  max = (await p1()).maxEnergy
  let o2 = await fireSpec(null)
  check("Portal Blast fires (energy spent ≈ 35)", spentOK(max, o2.f.energy, 35), `spent ${(max-o2.f.energy).toFixed(1)}`)
  check("Portal Blast spawns projectile", o2.projs.includes("primePortalBlast"), `projs=[${o2.projs}]`)

  check("no page JS errors across all 6", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} narrow-kit-specials-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
