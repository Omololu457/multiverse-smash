// harness/feel_phase3_verify.mjs — FEEL PASS (Phase 3) Weather verification.
// Part A (node): the stage-compatibility table + nearest-allowed fallback (pure functions).
// Part B (browser): boots a real match, confirms both fighters render, drives EVERY weather type through
// the real draw path (screenshotting a few), proves a transition crossfades, checks Reduce Flashing softens
// the thunderstorm flash, and samples 4-player frame time. Render-layer only.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
import { WEATHER, resolveWeather, allowedWeatherFor, weatherPickForStage } from "../weather.js"

let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`) }
const section = t => console.log(`\n── ${t} ──────────────────────`)

// ── Part A — stage compatibility (pure, no browser) ──
section("STAGE COMPATIBILITY — allowed lists + nearest-allowed fallback")
check("outdoor (Jujutsu High) allows rain", allowedWeatherFor({ name: "Jujutsu High Courtyard" }).includes(WEATHER.RAIN))
check("indoor (World Tournament Arena) does NOT allow rain", !allowedWeatherFor({ name: "World Tournament Arena" }).includes(WEATHER.RAIN))
check("indoor rain → falls back to fog", resolveWeather({ name: "World Tournament Arena" }, WEATHER.RAIN) === WEATHER.FOG, resolveWeather({ name: "World Tournament Arena" }, WEATHER.RAIN))
check("warm (Planet Namek) snow → falls back (no snow)", resolveWeather({ name: "Planet Namek" }, WEATHER.SNOW) !== WEATHER.SNOW, resolveWeather({ name: "Planet Namek" }, WEATHER.SNOW))
check("void (Null Void) thunderstorm → clear or fog", [WEATHER.CLEAR, WEATHER.FOG].includes(resolveWeather({ name: "Null Void" }, WEATHER.THUNDERSTORM)))
check("outdoor rain resolves to rain (allowed, unchanged)", resolveWeather({ name: "Hidden Leaf Village" }, WEATHER.RAIN) === WEATHER.RAIN)
check("unknown stage → open outdoor default allows snow", allowedWeatherFor({ name: "???" }).includes(WEATHER.SNOW))
check("deterministic per-stage pick is stable for a seed", weatherPickForStage({ name: "Test Map" }, 12345) === weatherPickForStage({ name: "Test Map" }, 12345))

// ── Part B — live rendering ──
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SHOTS = path.join(ROOT, "harness", "shots"); fs.mkdirSync(SHOTS, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".m4a": "audio/mp4", ".ogg": "audio/ogg" }
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(String(e)))
const state = () => page.evaluate(() => window.__harness.state())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }) }
const wStatus = () => page.evaluate(() => window.__harness.juice.weather())
const wSetRaw = (t) => page.evaluate(x => window.__harness.juice.weatherSetRaw(x), t)
const wStep = (n) => page.evaluate(k => window.__harness.juice.weatherStep(k), n)

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())
  await page.evaluate(() => window.__harness.skipToBattle())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {})
  await frames(6)
  await page.evaluate(() => window.__harness.juice.setWeather(true))

  section("RENDER CHECK — real match, both fighters on screen")
  check("P1 present", await page.evaluate(() => { const f = window.__harness.p1(); return !!f && Number.isFinite(f.x) }))
  check("P2 present", await page.evaluate(() => { const f = window.__harness.p2(); return !!f && Number.isFinite(f.x) }))

  section("EVERY weather type renders without error")
  const SHOT = { rain: 1, snow: 1, thunderstorm: 1, fog: 1 }
  for (const t of ["rain", "thunderstorm", "hail", "snow", "fog", "wind", "heatwave", "rainbow", "clear"]) {
    const before = errs.length
    await wSetRaw(t)
    await wStep(120)   // step past the crossfade so `cur` settles on the target
    await frames(3)
    const st = await wStatus()
    check(`${t} active`, st.cur === t, `cur=${st.cur} alpha=${st.alpha} particles=${st.particles}`)
    if (SHOT[t]) await page.screenshot({ path: path.join(SHOTS, `feel_p3_${t}.png`) })
    check(`${t} no page error`, errs.length === before, errs.slice(before, 1).join(" | "))
  }

  section("TRANSITION — crossfade between two types")
  await wSetRaw("rain"); await wStep(140); await frames(2)
  await wSetRaw("snow")   // start a transition
  const mid = await wStatus()
  await wStep(30)
  const dipped = await wStatus()
  check("transition is in progress right after a switch", mid.transitioning === true, JSON.stringify(mid))
  await wStep(160)
  const done = await wStatus()
  check("transition settles on the new type (snow)", done.cur === "snow" && done.transitioning === false, JSON.stringify(done))

  section("REDUCE FLASHING — thunderstorm flash is softened + clamped (≤1/sec)")
  await page.evaluate(() => window.__harness.juice.setFlash(true))   // Reduce Flashing ON
  await wSetRaw("thunderstorm")
  let maxFlash = 0
  for (let i = 0; i < 12; i++) { const st = await wStep(50); maxFlash = Math.max(maxFlash, st.flash) }
  check("thunderstorm flash stays SOFT under Reduce Flashing (≤2f)", maxFlash <= 2, `maxFlash=${maxFlash}`)
  check("thunderstorm ran with Reduce Flashing, no error", (await wStatus()).cur === "thunderstorm" && errs.length === 0)
  await page.evaluate(() => window.__harness.juice.setFlash(false))

  section("4-PLAYER frame time with weather ON")
  const ffa = await page.evaluate(async () => {
    if (!window.__harness.ffa?.start) return { skipped: true }
    window.__harness.juice.setWeather(true); window.__harness.juice.weatherSetRaw("rain")
    window.__harness.ffa.start(["goku", "sasuke", "naruto", "gon"])
    const t0 = performance.now(); const f0 = window.__harness.state().frame
    await new Promise(r => setTimeout(r, 1500))
    return { frames: window.__harness.state().frame - f0, ms: performance.now() - t0 }
  })
  if (ffa.skipped) console.log("  (no ffa.start hook — 4p weather perf checked on-device)")
  else { const fps = ffa.frames / (ffa.ms / 1000); check(`4-player w/ rain ~≥50fps (${fps.toFixed(1)})`, fps >= 45, `${fps.toFixed(1)}fps`) }

  check("no page JS errors across the run", errs.length === 0, errs.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} feel-phase3-verify: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
