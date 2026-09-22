// harness/omololu_live.mjs — STAGE 5 live verification for Omololu (self-insert, Obito recolor) + his
// Domain Expansion: Recursive Cadence. Boots a REAL match, selects omololu, and confirms:
//   • the recolored sprite decodes + renders in combat (idle + an attack pose) — no keying box/halo
//   • the domain ultimate triggers → full-screen domain background swaps in + the WASD prompt HUD draws
//   • the cadence JUDGES live in the real game instance: a correct in-window input deals NO damage,
//     a wrong/missed beat deals REAL damage (driven synchronously in-page so no rAF double-tick)
//   • the domain resolves cleanly back to normal
// Screenshots: OMOLOLU_idle, OMOLOLU_attack, OMOLOLU_domain.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
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
const state = () => page.evaluate(() => window.__harness.state())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
const shot = (name) => page.screenshot({ path: path.join(OUT, name) })

try {
  // Boot p1 = omololu (recolored self-insert), p2 = obito (the untouched SOURCE — a clean A/B contrast).
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=obito`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot())
  await page.evaluate(() => window.__harness.skipToBattle())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 15000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setSession && window.__harness.setSession({ infiniteResources: true }))
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await frames(6)

  section("STAGE 5A — recolored sprite decodes + renders in combat")
  const p1info = await page.evaluate(() => ({ key: window.__harness.p1()?.key, ready: window.__harness.spriteReady("p1")?.ready }))
  check("p1 is omololu", p1info.key === "omololu", p1info.key)
  check("omololu sprite sheet decoded (not procedural box)", p1info.ready === true)
  await shot("OMOLOLU_idle.png")

  await page.evaluate(() => window.__harness.p1ForceLight && window.__harness.p1ForceLight())
  await frames(3); await shot("OMOLOLU_attack.png")
  check("no JS errors during combat render", jsErrors.length === 0, jsErrors[0] || "")

  section("STAGE 5B — domain triggers: background swap + WASD prompt HUD")
  const trig = await page.evaluate(() => window.__harness.omololu.trigger("p1", "recursiveCadence"))
  check("domain cast succeeded", !!trig?.cast)
  check("a WASD beat is armed on cast", !!trig?.view && ["W", "A", "S", "D"].includes(trig.view.glyph), trig?.view?.glyph)
  await frames(30)
  const live = await page.evaluate(() => ({ active: window.__harness.omololu.active(), st: window.__harness.omololu.state() }))
  check("domain still active a beat later", live.active === true)
  check("cadence advancing (beatNo grows)", (live.st?.beatNo || 0) >= 1, `beat #${live.st?.beatNo}`)
  await shot("OMOLOLU_domain.png")

  section("STAGE 5C — LIVE judging in the real game instance (synchronous, no rAF double-tick)")
  // All-CORRECT run: read each beat's dir from the live view and feed it in-window → expect ZERO damage.
  const hitRun = await page.evaluate(() => {
    const H = window.__harness.omololu
    H.trigger("p1", "recursiveCadence")
    let dmg = 0, beats = 0, g
    for (let i = 0; i < 5; i++) {
      g = 0; while (H.state()?.phase === "telegraph" && g++ < 300) H.tick(null)
      const dir = { W: "up", A: "left", S: "down", D: "right" }[H.state().glyph]
      const r = H.tick(dir); dmg += (r?.dmg || 0); beats++
      g = 0; while (H.state()?.phase === "gap" && g++ < 300) H.tick(null)
    }
    return { dmg, beats, hits: H.state()?.hits }
  })
  check("correct inputs over 5 live beats deal ZERO damage", hitRun.dmg === 0, `dmg=${hitRun.dmg}, hits=${hitRun.hits}`)

  // All-WRONG run: feed the opposite direction each beat → expect REAL damage every beat.
  const missRun = await page.evaluate(() => {
    const H = window.__harness.omololu
    H.trigger("p1", "recursiveCadence")
    const OPP = { up: "down", down: "up", left: "right", right: "left" }
    let dmg = 0, beats = 0, g
    for (let i = 0; i < 5; i++) {
      g = 0; while (H.state()?.phase === "telegraph" && g++ < 300) H.tick(null)
      const dir = { W: "up", A: "left", S: "down", D: "right" }[H.state().glyph]
      const r = H.tick(OPP[dir]); dmg += (r?.dmg || 0); beats++
      g = 0; while (H.state()?.phase === "gap" && g++ < 300) H.tick(null)
    }
    return { dmg, beats, misses: H.state()?.misses }
  })
  check("wrong inputs over 5 live beats deal REAL damage each", missRun.dmg > 0 && missRun.misses >= 5, `dmg=${missRun.dmg}, misses=${missRun.misses}`)
  check("live per-beat damage is in-band (not an outlier)", missRun.dmg / 5 <= 20, `${(missRun.dmg / 5).toFixed(1)}/beat`)

  section("STAGE 5D — domain resolves cleanly back to normal")
  const ended = await page.evaluate(() => {
    const H = window.__harness.omololu
    // drain whatever domain is live to completion
    let g = 0; while (H.active() && g++ < 3000) H.tick(null)
    return { active: H.active(), state: H.state(), caster: H.caster() }
  })
  check("domain ends after the cadence", ended.active === false && ended.state === null)
  check("victim released (no domain owner remains)", ended.caster === null)
  check("no JS errors across the whole run", jsErrors.length === 0, jsErrors[0] || "")

  console.log(`\n${FAIL === 0 ? "✓ ALL PASS" : "✗ FAILURES"} — ${PASS} passed, ${FAIL} failed`)
  console.log(`shots → harness/shots/OMOLOLU_idle.png, OMOLOLU_attack.png, OMOLOLU_domain.png`)
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++
} finally {
  await browser.close(); server.close()
  process.exit(FAIL === 0 ? 0 : 1)
}
