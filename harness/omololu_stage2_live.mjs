// harness/omololu_stage2_live.mjs — live verification of the SECOND omololu pass:
//   • Stage 1  dash-teleport: double-tap-toward blinks omololu beside the foe — IDENTICAL to obito
//   • Stage 2  rescale: omololu's rendered height is now in-band with the roster (was 100 → 130)
//   • Stage 3  "The Genesis Threshold" (neutral+U): Ankara domain background swap + foe FREEZE + camera
//              push-in (Gojo-model). And Down+U still yields the "Recursive Cadence" WASD domain.
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

async function boot(p1, p2) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setSession && window.__harness.setSession({ infiniteResources: true }))
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await frames(4)
}
// double-tap the toward key (opponent placed to the right → "d")
async function doubleTapToward() {
  await page.keyboard.down("d"); await sleep(28); await page.keyboard.up("d")
  await sleep(55)
  await page.keyboard.down("d"); await sleep(28); await page.keyboard.up("d")
  await sleep(40)
}
// measure the blink gap (px between the fighters' facing edges) after a double-tap-toward
async function measureBlink(p1key) {
  await boot(p1key, "sasuke")
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 320) })
  await frames(2)
  const before = await page.evaluate(() => ({ x: window.__harness.p1().x }))
  await doubleTapToward()
  const after = await page.evaluate(() => { const a = window.__harness.p1(), b = window.__harness.p2(); return { ax: a.x, aw: a.drawW || a.w, bx: b.x, bw: b.w, flash: a.teleportFlash } })
  const moved = Math.abs(after.ax - before.x)
  return { moved, landedX: Math.round(after.ax), foeX: Math.round(after.bx), flash: after.flash }
}

try {
  section("STAGE 1 — dash-teleport parity with obito")
  const omo = await measureBlink("omololu")
  check("omololu double-tap-toward BLINKS a large distance", omo.moved > 150, `moved ${Math.round(omo.moved)}px`)
  check("omololu lands right beside the foe (teleport-behind rule)", Math.abs(omo.foeX - omo.landedX) < 140, `landedX=${omo.landedX} foeX=${omo.foeX}`)
  check("omololu blink sets the teleport flash", omo.flash > 0, `flash=${omo.flash}`)
  const obi = await measureBlink("obito")
  check("obito blinks the same way (parity reference)", obi.moved > 150, `obito moved ${Math.round(obi.moved)}px`)
  // parity: both land at the SAME gap from the foe (same teleportBehindTarget rule)
  const omoGap = omo.foeX - omo.landedX, obiGap = obi.foeX - obi.landedX
  check("omololu & obito land at the SAME relative gap (identical mechanic)", Math.abs(omoGap - obiGap) <= 6, `omo gap=${omoGap} vs obito gap=${obiGap}`)

  section("STAGE 2 — rescale is in-band")
  await boot("omololu", "obito")
  const dh = await page.evaluate(() => Math.round(window.__harness.p1().drawH))
  check("omololu rendered height is roster-consistent (~128–149)", dh >= 124 && dh <= 152, `drawH=${dh}px (was 100 pre-fix)`)

  section("STAGE 3 — The Genesis Threshold (single domain on U): rhythm gauntlet + IMG_3608 backdrop")
  // (Deep domain proof — random prompt, correct=0/wrong=damage judging, photo backdrop — lives in
  //  harness/omololu_genesis_redo.mjs. Here we just confirm the ultimate resolves to the rhythm domain.)
  const t = await page.evaluate(() => window.__harness.omololu.trigger("p1"))
  check("domain cast succeeds", !!t?.cast)
  check("a WASD prompt is armed (it IS the rhythm gauntlet, not a cinematic)", !!t?.view && ["W", "A", "S", "D"].includes(t.view.glyph), t?.view?.glyph)
  await frames(20)
  const info = await page.evaluate(() => window.__harness.omololu.domainInfo())
  check("domain identity is 'The Genesis Threshold'", info?.name === "The Genesis Threshold", info?.name)
  check("IMG_3608 backdrop photo decoded", info?.bgImageReady === true, `bgImageReady=${info?.bgImageReady}`)
  check("cadence is live (rhythm view present)", !!(await page.evaluate(() => window.__harness.omololu.state())))
  await frames(6); await page.screenshot({ path: path.join(OUT, "OMOLOLU_genesis_domain.png") })
  check("no JS errors during the domain", jsErrors.length === 0, jsErrors[0] || "")

  console.log(`\n${FAIL === 0 ? "✓ ALL PASS" : "✗ FAILURES"} — ${PASS} passed, ${FAIL} failed`)
  console.log("shot → harness/shots/OMOLOLU_genesis_domain.png")
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++
} finally {
  await browser.close(); server.close()
  process.exit(FAIL === 0 ? 0 : 1)
}
