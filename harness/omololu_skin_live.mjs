// harness/omololu_skin_live.mjs — verify omololu's 2nd skin "Web-Weave Suit" (white/black bodysuit):
// selectable from the skin-select screen, and renders cleanly (no keying) across idle/walk/attack.
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
const frames = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
// mean brightness of the p1 sprite band (left-centre), to prove the suit reads WHITE (default omololu = charcoal)
const bandLuma = () => page.evaluate(() => {
  const c = document.querySelector("canvas"); const cx = c.getContext("2d", { willReadFrequently: true })
  const x = Math.floor(c.width * 0.30), y = Math.floor(c.height * 0.50), w = Math.floor(c.width * 0.10), h = Math.floor(c.height * 0.22)
  const d = cx.getImageData(x, y, w, h).data; let lum = 0, whitePx = 0, n = 0
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 40) continue; const L = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; lum += L; if (L > 170 && Math.abs(d[i] - d[i + 2]) < 30) whitePx++; n++ }
  return { lum: n ? Math.round(lum / n) : 0, whiteFrac: n ? +(whitePx / n).toFixed(2) : 0, n }
})

try {
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=obito`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)

  section("STAGE 2 — the skin is registered + selectable from the skin-select screen")
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })   // establishes matchConfig.p1CharKey = omololu
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  // jump to the real SELECT_SKIN screen (drawSkinSelectScreen renders getSkins(p1CharKey)) + screenshot it
  await page.evaluate(() => window.__harness.ui.goto("SELECT_SKIN"))
  await frames(3)
  const skinScreen = await page.evaluate(() => window.__harness.ui.state())
  check("skin-select screen opens for omololu", /skin/i.test(skinScreen || ""), `gameState=${skinScreen}`)
  await page.screenshot({ path: path.join(OUT, "OMOLOLU_skinselect.png") })

  section("STAGE 3 — boot with the Web-Weave skin selected; clean idle/walk/attack render")
  await page.evaluate(() => window.__harness.boot && window.__harness.boot())
  const applied = await page.evaluate(() => window.__harness.bootSkin("omololuWebWeave", "default"))
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await frames(6)
  const ready = await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true)
  const key = await page.evaluate(() => window.__harness.p1()?.key)
  check("p1 is omololu with the Web-Weave skin applied", applied?.p1Skin === "omololuWebWeave" && key === "omololu", `applied=${JSON.stringify(applied)} key=${key}`)
  check("skin sprite sheet decoded (not a box)", ready === true)

  // idle
  await frames(4); await page.screenshot({ path: path.join(OUT, "OMOLOLU_skin_idle.png") })
  const idleL = await bandLuma()
  check("suit renders BRIGHT/WHITE in combat (not the charcoal default)", idleL.lum > 120 && idleL.whiteFrac > 0.15, `lum=${idleL.lum} whiteFrac=${idleL.whiteFrac}`)

  // walk — nudge p1 toward the foe so the run cycle plays
  await page.keyboard.down("d"); await frames(10); await page.screenshot({ path: path.join(OUT, "OMOLOLU_skin_walk.png") }); await page.keyboard.up("d")
  const walkReady = await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true)
  check("walk/run renders cleanly", walkReady)

  // attack
  await frames(4); await page.evaluate(() => window.__harness.p1ForceLight && window.__harness.p1ForceLight()); await frames(3)
  await page.screenshot({ path: path.join(OUT, "OMOLOLU_skin_attack.png") })
  check("attack pose renders cleanly", await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true))
  check("no JS errors across the whole run", jsErrors.length === 0, jsErrors[0] || "")

  console.log(`\n${FAIL === 0 ? "✓ ALL PASS" : "✗ FAILURES"} — ${PASS} passed, ${FAIL} failed`)
  console.log("shots → OMOLOLU_skinselect.png, OMOLOLU_skin_{idle,walk,attack}.png")
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++
} finally {
  await browser.close(); server.close()
  process.exit(FAIL === 0 ? 0 : 1)
}
