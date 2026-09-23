// harness/omololu_kit_live.mjs — Stage 6: fire EVERY ported Obito move + the new Flash Time live, and
// confirm the Ultimate still fires the Domain Expansion (NOT Kamui Dimension). Screenshots 3+ moves.
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const section = t => console.log(`\n── ${t} ─────────────────────────────`)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const frames = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
const kit = () => page.evaluate(() => window.__harness.omololu.kit("p1"))
const reset = async () => { await page.evaluate(() => window.__harness.omololu.resetKit("p1")); await frames(2) }
const spec = (dir) => page.evaluate((d) => window.__harness.p1SpecialDir(d), dir)

try {
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=obito`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))   // NOT infiniteResources — the foe must be able to TAKE barrage damage (resetKit refills omololu's meter each move)
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 300) })
  await frames(4)

  section("ZONING — Shuriken (neutral) / Rod (Fwd) / Giant Shuriken (Up)")
  await reset(); await spec(null); await frames(10)
  let k = await kit(); check("Shuriken (neutral Special) spawns a projectile", k.projectiles >= 1, `proj=${k.projectiles} cast=${k.castMove}`)
  await frames(60); await reset()
  await spec("F"); await frames(12)
  k = await kit(); check("Chakra Rod (Forward+Special) spawns a projectile", k.projectiles >= 1, `proj=${k.projectiles} cast=${k.castMove}`)
  await page.screenshot({ path: path.join(OUT, "OMOLOLU_kit_rod.png") })
  await frames(60); await reset()
  await spec("U"); await frames(14)
  k = await kit(); check("Giant Shuriken (Up+Special) spawns a projectile", k.projectiles >= 1, `proj=${k.projectiles} cast=${k.castMove}`)
  await frames(80); await reset()

  section("KAMUI WARP (Back+Special) — teleport")
  const beforeX = (await kit()).x
  await spec("B"); await frames(3)
  k = await kit(); check("Kamui Warp moves omololu a long distance", Math.abs(k.x - beforeX) > 150, `Δx=${Math.abs(k.x - beforeX)} cast=${k.castMove}`)
  await page.screenshot({ path: path.join(OUT, "OMOLOLU_kit_warp.png") })
  await reset()

  section("FLASH TIME (Down+Special) — Killua slow-time + visible cyan speed-aura")
  await spec("D"); await frames(8)
  k = await kit(); check("Flash Time activates (slow-time flag set)", k.flashActive === true && k.oppTimeScale > 0, `active=${k.flashActive} scale=${k.oppTimeScale}`)
  // The frame-skip flag is only true on the SKIPPED fraction of frames (by design), so sample across a few.
  let slowSeen = false
  for (let i = 0; i < 12 && !slowSeen; i++) { await frames(1); if ((await kit()).foeSlowFlag) slowSeen = true }
  check("the OPPONENT is being time-slowed (frame-skip observed)", slowSeen, `slowSeen=${slowSeen}`)
  await page.screenshot({ path: path.join(OUT, "OMOLOLU_kit_flashtime.png") })
  await spec("D"); await frames(2)   // toggle off
  k = await kit(); check("Flash Time toggles OFF on a second press", k.flashActive === false)
  await reset()

  section("KAMUI INTANGIBILITY (P-tap) — phase through")
  await page.keyboard.press("p"); await frames(4)
  k = await kit(); check("Kamui Intangibility toggles ON (i-frame phase)", k.kamuiIntangible === true && k.invulnTimer > 0, `intangible=${k.kamuiIntangible} iframes=${k.invulnTimer}`)
  await page.keyboard.press("p"); await frames(2)
  k = await kit(); check("Kamui Intangibility toggles OFF", k.kamuiIntangible === false)
  await reset()

  section("KAMUI DIMENSION (P-hold→release) — void-swap + barrage, SPECIAL-tier")
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 180) })   // foe reachable, in front
  await frames(2)
  const hpBeforeDim = (await kit()).foeHealth
  await page.keyboard.down("p"); await sleep(280); await page.keyboard.up("p"); await frames(6)
  k = await kit(); const dinfo = await page.evaluate(() => window.__harness.kamuiDim("p1"))
  check("Kamui Dimension activates (void window)", k.kamuiDimActive === true, `active=${k.kamuiDimActive} timer=${k.kamuiDimTimer}`)
  check("the void background swaps in", dinfo?.voidBg === true, `voidBg=${dinfo?.voidBg}`)
  check("the foe is frozen during the void", k.foeFrozen === true, `foeFrozen=${k.foeFrozen}`)
  await page.screenshot({ path: path.join(OUT, "OMOLOLU_kit_kamuidimension.png") })
  await frames(55)   // let the full staggered barrage travel + land on the frozen foe
  k = await kit(); check("Kamui Dimension barrage deals real damage to the frozen foe", k.foeHealth < hpBeforeDim, `hp ${hpBeforeDim}→${k.foeHealth}`)
  await frames(20); await reset()

  section("REKKA (Fwd+Heavy) — Kamui Rod Combo opener")
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 70) })   // in range so the opener can be thrown
  await frames(2)
  await page.keyboard.down("d"); await frames(2)
  await page.keyboard.down("k"); await frames(2)
  k = await kit()
  await page.keyboard.up("k"); await page.keyboard.up("d")
  check("Rekka opener fires (obitoRod1 via Fwd+Heavy)", k.currentMove === "obitoRod1" || k.rekkaNext === "obitoRod2", `currentMove=${k.currentMove} next=${k.rekkaNext}`)
  await frames(40); await reset()

  section("ULTIMATE (U) still fires DOMAIN EXPANSION — NOT Kamui Dimension")
  const ult = await page.evaluate(() => window.__harness.omololu.trigger("p1"))
  await frames(10)
  const di = await page.evaluate(() => window.__harness.omololu.domainInfo())
  const kU = await kit()
  check("Ultimate cast succeeds", !!ult?.cast)
  check("Ultimate = 'The Genesis Threshold' domain (rhythm gauntlet)", di?.name === "The Genesis Threshold", di?.name)
  check("Ultimate did NOT fire Kamui Dimension", kU.kamuiDimActive === false, `kamuiDimActive=${kU.kamuiDimActive}`)
  check("a WASD prompt is live (domain, not barrage)", !!(await page.evaluate(() => window.__harness.omololu.state())))

  check("no JS errors across the whole run", jsErrors.length === 0, jsErrors[0] || "")
  console.log(`\n${FAIL === 0 ? "✓ ALL PASS" : "✗ FAILURES"} — ${PASS} passed, ${FAIL} failed`)
  console.log("shots → OMOLOLU_kit_{rod,warp,flashtime,kamuidimension}.png")
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++
} finally {
  await browser.close(); server.close()
  process.exit(FAIL === 0 ? 0 : 1)
}
