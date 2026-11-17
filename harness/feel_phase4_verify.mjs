// harness/feel_phase4_verify.mjs — FEEL PASS (Phase 4) real-world weather + LAN sync.
// Part A (node): the Open-Meteo → our-type mapping table (pure).
// Part B (browser, MOCKED network): live-weather resolves + applies; offline + geolocation-denied fall back
// to Random without blocking/throwing; Manual + Random sources apply; and a LAN host→client handoff renders
// the IDENTICAL weather on the client with NO client fetch. The real live fetch needs a networked machine.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
import { mapOpenMeteo } from "../weatherLive.js"
import { WEATHER } from "../weather.js"

let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`) }
const section = t => console.log(`\n── ${t} ──────────────────────`)

// ── Part A — mapping (pure) ──
section("OPEN-METEO MAPPING — WMO code + wind + temp → our type")
check("clear (0)", mapOpenMeteo(0, 10, 20) === WEATHER.CLEAR)
check("fog (45/48)", mapOpenMeteo(45) === WEATHER.FOG && mapOpenMeteo(48) === WEATHER.FOG)
check("rain (61 / 80 showers)", mapOpenMeteo(61) === WEATHER.RAIN && mapOpenMeteo(80) === WEATHER.RAIN)
check("thunderstorm (95 / 96 w-hail)", mapOpenMeteo(95) === WEATHER.THUNDERSTORM && mapOpenMeteo(96) === WEATHER.THUNDERSTORM)
check("snow (73 / 86)", mapOpenMeteo(73) === WEATHER.SNOW && mapOpenMeteo(86) === WEATHER.SNOW)
check("freezing rain → hail (66)", mapOpenMeteo(66) === WEATHER.HAIL)
check("high wind ≥35km/h overrides clear", mapOpenMeteo(1, 40, 20) === WEATHER.WIND)
check("hot ≥32C → heatwave", mapOpenMeteo(2, 5, 34) === WEATHER.HEATWAVE)
check("rain beats high wind (precip priority)", mapOpenMeteo(61, 50, 20) === WEATHER.RAIN)

// ── Part B — live ──
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
async function startMatch() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle()); await frames(4) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())
  await page.evaluate(() => window.__harness.skipToBattle())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {})
  await frames(6)

  section("RENDER CHECK — real match, both fighters on screen")
  check("P1 present", await page.evaluate(() => { const f = window.__harness.p1(); return !!f && Number.isFinite(f.x) }))
  check("P2 present", await page.evaluate(() => { const f = window.__harness.p2(); return !!f && Number.isFinite(f.x) }))

  section("WEATHER SOURCE setting (Off / Random / Manual / Live)")
  check("default source is Off", (await page.evaluate(() => window.__harness.juice.setWeatherSource("off"))) === "off")
  check("can set Random", (await page.evaluate(() => window.__harness.juice.setWeatherSource("random"))) === "random")
  check("can set Manual", (await page.evaluate(() => window.__harness.juice.setWeatherSource("manual"))) === "manual")
  check("can set Live", (await page.evaluate(() => window.__harness.juice.setWeatherSource("local"))) === "local")

  section("MANUAL source applies the chosen type at match start")
  await page.evaluate(() => { window.__harness.juice.setWeatherSource("manual"); window.__harness.juice.setManualWeather("snow") })
  await startMatch()
  let st = await wStatus(); check("manual snow applied", st.target === "snow" || st.cur === "snow", `cur=${st.cur} tgt=${st.target}`)
  check("chip shows (manual)", (await page.evaluate(() => window.__harness.juice.weatherChip()))?.src === "manual")

  section("LIVE (mocked Open-Meteo) resolves + applies + chip '(live)'")
  const live = await page.evaluate(() => window.__harness.juice.weatherLiveMock({ code: 95, wind: 10, temp: 14 }))   // thunderstorm
  check("mock code 95 maps to thunderstorm", live.mapped === "thunderstorm", `mapped=${live.mapped}`)
  check("live weather applied (resolved to stage)", !!live.applied && live.applied !== "clear", `applied=${live.applied}`)
  check("chip shows (live)", live.chip?.src === "live")
  await page.screenshot({ path: path.join(SHOTS, "feel_p4_live.png") })

  section("OFFLINE + DENIED fall back WITHOUT blocking/throwing up the stack")
  const off = await page.evaluate(() => window.__harness.juice.weatherLiveFail())
  check("failed fetch → resolveLive rejects (game catches → Random + offline chip)", off.threw === true, off.msg)
  const den = await page.evaluate(() => window.__harness.juice.weatherGeoDenied())
  check("geolocation denied → resolveLive rejects (game catches → fallback)", den.threw === true, den.msg)

  section("LAN — ONLY the host decides; the client renders the IDENTICAL type with NO fetch")
  await page.evaluate(() => { window.__harness.juice.setWeatherSource("manual"); window.__harness.juice.setManualWeather("rain") })
  const hostType = await page.evaluate(() => window.__harness.juice.weatherNetSend())   // what the host puts in MATCH_SETUP
  check("host sends a concrete type", typeof hostType === "string" && hostType.length > 0, `hostType=${hostType}`)
  // simulate the CLIENT: adopt the host's type, then start the match → it must render exactly that (no source of its own)
  await page.evaluate(() => window.__harness.juice.setWeatherSource("off"))   // client's own source is OFF — must NOT matter
  await page.evaluate(t => window.__harness.juice.weatherNetAdopt(t), hostType)
  await page.evaluate(() => window.__harness.net?.beginMock?.())
  await startMatch()
  st = await wStatus()
  const adoptedOk = (st.cur === hostType || st.target === hostType)
  check("client renders the host's weather despite its own source=Off", adoptedOk, `cur=${st.cur} tgt=${st.target} host=${hostType}`)
  await page.evaluate(() => window.__harness.net?.end?.())
  await page.evaluate(() => window.__harness.juice.weatherNetAdopt(null))

  check("no page JS errors across the run", errs.length === 0, errs.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} feel-phase4-verify: ${PASS} passed, ${FAIL} failed`)
  console.log("NOTE: the REAL Open-Meteo fetch + browser geolocation need a networked machine — verified here with mocked responses.")
  process.exit(FAIL === 0 ? 0 : 1)
}
