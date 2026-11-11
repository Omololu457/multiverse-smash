// harness/feel_phase5_verify.mjs — FEEL PASS (Phase 5) weather-changing abilities (VISUAL ONLY).
// Part A (node): the ability→weather map (reuses the audited juice_elements table) + the gameplay-effect
// future-flag is OFF. Part B (browser): a themed hit CONJURES weather for ~12s then returns to the match's
// base; one trigger per character per round; a global cooldown; and three distinct conjures. Visual only.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
import { weatherForAbility, WEATHER_ABILITY_GAMEPLAY_EFFECTS } from "../weather_abilities.js"
import { WEATHER } from "../weather.js"

let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`) }
const section = t => console.log(`\n── ${t} ──────────────────────`)

// ── Part A — mapping (pure) ──
section("ABILITY → WEATHER map (reuses juice_elements; ki/light/dark → none)")
check("lightning (chidori/raikiri) → thunderstorm", weatherForAbility("sasuke", "chidori") === WEATHER.THUNDERSTORM && weatherForAbility("kakashi_war", "raikiri") === WEATHER.THUNDERSTORM)
check("fire (katon/gokakyu) → heatwave", weatherForAbility("madara", "madaraGoka") === WEATHER.HEATWAVE && weatherForAbility("x", "gokakyu") === WEATHER.HEATWAVE)
check("wind (rasenshuriken/rasengan) → wind", weatherForAbility("naruto", "rasenshuriken") === WEATHER.WIND && weatherForAbility("naruto", "rasengan") === WEATHER.WIND)
check("water (suiton) → rain", weatherForAbility("tobirama", "suiton") === WEATHER.RAIN)
check("ult: zenitsu (lightning) → thunderstorm", weatherForAbility("zenitsu", "anything", { isUltimate: true }) === WEATHER.THUNDERSTORM)
check("ult: rengoku (fire) → heatwave", weatherForAbility("rengoku", "anything", { isUltimate: true }) === WEATHER.HEATWAVE)
check("ki/none (kamehameha, gojo) → null (no weather)", weatherForAbility("goku", "kamehameha") === null && weatherForAbility("gojo", "purple") === null)
check("gameplay-effect future-flag is OFF (visual only)", WEATHER_ABILITY_GAMEPLAY_EFFECTS === false)

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
const trigger = (who, move, isUlt = false, force = false) => page.evaluate(a => window.__harness.juice.weatherAbilityTrigger(...a), [who, move, isUlt, force])
const wStep = (n) => page.evaluate(k => window.__harness.juice.weatherStep(k), n)

try {
  await page.goto(`${base}/index.html?harness=1&p1=sasuke&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())
  await page.evaluate(() => window.__harness.skipToBattle())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {})
  await frames(6)

  section("RENDER CHECK + base weather (manual FOG)")
  check("P1 (sasuke) present", await page.evaluate(() => { const f = window.__harness.p1(); return !!f && Number.isFinite(f.x) }))
  check("P2 (goku) present", await page.evaluate(() => { const f = window.__harness.p2(); return !!f && Number.isFinite(f.x) }))
  await page.evaluate(() => { window.__harness.juice.setWeatherSource("manual"); window.__harness.juice.setManualWeather("fog") })
  await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle()); await frames(4)
  let st = await page.evaluate(() => window.__harness.juice.weather())
  check("match base weather is fog", st.target === "fog" || st.cur === "fog", `cur=${st.cur} tgt=${st.target}`)

  section("CONJURE — a lightning move (chidori) brings a THUNDERSTORM for ~12s")
  let r = await trigger("p1", "chidori")
  check("chidori conjured thunderstorm", r.target === "thunderstorm", `tgt=${r.target}`)
  check("ability is active (12s hold armed)", r.abil.until > 0 && r.abil.usedRound === true, JSON.stringify(r.abil))
  await wStep(140); st = await page.evaluate(() => window.__harness.juice.weather()); check("thunderstorm settled in", st.cur === "thunderstorm", `cur=${st.cur}`)
  await page.screenshot({ path: path.join(SHOTS, "feel_p5_ability.png") })

  section("RULES — one trigger per character per round")
  r = await trigger("p1", "katon")   // sasuke already used this round → must be IGNORED (stays thunderstorm)
  check("2nd trigger same round is ignored", r.target === "thunderstorm", `tgt=${r.target}`)

  section("RETURN — after the hold expires, weather returns to the base (fog)")
  const ret = await page.evaluate(() => window.__harness.juice.weatherAbilityExpire())
  check("returns to base fog", ret.target === "fog", `tgt=${ret.target}`)

  section("COOLDOWN — a fresh round re-arms the fighter, but the global cooldown still blocks")
  await page.evaluate(() => window.__harness.juice.bdRoundReset())   // re-arms usedRound (NOT the cooldown)
  r = await trigger("p1", "chidori")   // cooldown still counting → must be blocked
  check("global cooldown blocks a too-soon re-trigger", r.target !== "thunderstorm" && r.abil.cd > 0, `tgt=${r.target} cd=${r.abil.cd}`)

  section("THREE distinct conjures (forced past the cooldown) — storm / heat / wind")
  const a = await trigger("p1", "chidori", false, true);  check("lightning → thunderstorm", a.target === "thunderstorm", a.target)
  const b = await trigger("p1", "madaraGoka", false, true); check("fire → heatwave", b.target === "heatwave", b.target)
  const c = await trigger("p1", "rasengan", false, true);  check("wind → wind", c.target === "wind", c.target)

  section("VISUAL ONLY — gameplay-effect flag stays off in the live build")
  check("weatherAbilityState.gameplayEffects === false", (await page.evaluate(() => window.__harness.juice.weatherAbilityState())).gameplayEffects === false)

  check("no page JS errors across the run", errs.length === 0, errs.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} feel-phase5-verify: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
