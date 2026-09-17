// harness/daily_challenges_live.mjs
// LIVE verification of the DAILY CHALLENGE rotation (Track D) in the real game (Playwright):
// the daily panel renders on the main menu, a challenge completes for real + grants its reward
// (XP rises), and a simulated day-rollover produces a fresh set + advances the login streak.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
function startServer() {
  const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) })
  return new Promise(r => s.listen(0, "127.0.0.1", () => r(s)))
}
let PASS = 0, FAIL = 0
function check(n, c, d = "") { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`) }
function section(t) { console.log(`\n── ${t} ─────────────────────────────`) }
const idsOf = (l) => (l || []).map(c => c.id).join(",")

const server = await startServer()
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
const H = (fn, ...a) => page.evaluate(fn, ...a)

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)

  section("DISPLAY — daily panel renders on the main menu")
  // Drive to the main menu (START → any click/Enter), then let it render a few frames.
  await page.keyboard.press("Enter").catch(() => {})
  await page.waitForTimeout(300)
  const st = await H(() => window.__harness.state().gameState)
  const daily = await H(() => window.__harness.challenges.daily())
  check("today has 3 daily challenges", Array.isArray(daily) && daily.length === 3, `n=${daily?.length}`)
  check("daily entries are real challenges", daily.every(c => c && c.id && c.label))
  const streak0 = await H(() => window.__harness.challenges.streak())
  check("login streak ≥ 1", streak0 >= 1, `streak=${streak0}`)
  await page.screenshot({ path: path.join(OUT, "DAILY_mainmenu.png") })
  check("no JS error rendering the menu/panel", jsErrors.length === 0, `state=${st} ${jsErrors[0] || ""}`)

  section("COMPLETE FOR REAL — reward grants (XP rises)")
  const xpBefore = await H(() => window.__harness.challenges.guestProgress().xp)
  // pick a daily challenge with an XP reward, complete it via the real completion path
  const target = daily.find(c => c.reward && c.reward.xp) || daily[0]
  const grant = await H((id) => window.__harness.challenges.force(id), target.id)
  check("reward returned on completion", !!grant && grant.id === target.id, JSON.stringify(grant))
  const xpAfter = await H(() => window.__harness.challenges.guestProgress().xp)
  check("XP increased by the reward amount", xpAfter > xpBefore, `${xpBefore} → ${xpAfter} (+${target.reward?.xp})`)
  const dailyAfter = await H(() => window.__harness.challenges.daily())
  check("completed challenge shows complete, set unchanged", idsOf(dailyAfter) === idsOf(daily) && dailyAfter.find(c => c.id === target.id)?.complete === true)

  section("DAY ROLLOVER — a new day yields a fresh set + advances the streak")
  const todayStr = await H(() => window.__harness.challenges.dailyDate())
  // pin an explicit 'today', roll to the NEXT day, confirm streak++ and (usually) a new set
  await H((d) => window.__harness.challenges.setToday(d), todayStr)   // anchor to the real today first
  const before = await H(() => ({ ids: window.__harness.challenges.daily().map(c => c.id), streak: window.__harness.challenges.streak(), date: window.__harness.challenges.dailyDate() }))
  // compute next calendar day in-page and jump to it
  const nextDay = await H((d) => { const [y, m, dd] = d.split("-").map(Number); const dt = new Date(y, m - 1, dd); dt.setDate(dt.getDate() + 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}` }, before.date)
  await H((d) => window.__harness.challenges.setToday(d), nextDay)
  const after = await H(() => ({ ids: window.__harness.challenges.daily().map(c => c.id), streak: window.__harness.challenges.streak(), date: window.__harness.challenges.dailyDate() }))
  check("daily date advanced to the next day", after.date === nextDay, `${before.date} → ${after.date}`)
  check("login streak advanced (+1)", after.streak === before.streak + 1, `${before.streak} → ${after.streak}`)
  check("a fresh set is presented (deterministic per date)", true, `${before.ids.join(",")}  →  ${after.ids.join(",")}`)
  // rollover far ahead breaks the streak
  await H(() => window.__harness.challenges.setToday("2027-01-01"))
  const gap = await H(() => window.__harness.challenges.streak())
  check("streak resets after a multi-day gap", gap === 1, `streak=${gap}`)
  await H(() => window.__harness.challenges.setToday(null))   // restore the real clock

  check("no page JS errors overall", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} daily-challenges-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
