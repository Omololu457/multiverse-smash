// harness/feel_phase2_verify.mjs — FEEL PASS (Phase 2) Battle Damage verification.
// Boots a REAL match (eligible sukuna vs child naruto), confirms both render, then exercises the
// render-layer battle-damage pipeline via the harness hooks: damage accumulates into 3 levels and
// PERSISTS across rounds; blood is allowed ONLY for brutality-eligible fighters AND only at "Full" +
// bloodFx; floor decals stamp + cap; a new match resets everything. Screenshots the level-3 marks.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SHOTS = path.join(ROOT, "harness", "shots"); fs.mkdirSync(SHOTS, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".m4a": "audio/mp4", ".ogg": "audio/ogg" }
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(String(e)))
let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`) }
const section = t => console.log(`\n── ${t} ──────────────────────`)
const state = () => page.evaluate(() => window.__harness.state())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }) }
const bd = () => page.evaluate(() => window.__harness.juice.battleDamage())
const setBD = (v) => page.evaluate(x => window.__harness.juice.setBattleDamage(x), v)
const apply = (slot, dmg, el, elig, maxHp) => page.evaluate(a => window.__harness.juice.bdApply(...a), [slot, dmg, el, elig, maxHp])

try {
  await page.goto(`${base}/index.html?harness=1&p1=sukuna&p2=naruto`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())
  await page.evaluate(() => window.__harness.skipToBattle())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {})
  await frames(6)

  section("RENDER CHECK — real match, both fighters on screen")
  const p1 = await page.evaluate(() => window.__harness.p1()); const p2 = await page.evaluate(() => window.__harness.p2())
  check("P1 (sukuna) present", !!p1 && Number.isFinite(p1.x))
  check("P2 (naruto) present", !!p2 && Number.isFinite(p2.x))

  section("ELIGIBILITY — the EXISTING brutality rule drives who can bleed")
  const eSukuna = await page.evaluate(() => window.__harness.juice.bdEligibleFor("sukuna"))
  const eNaruto = await page.evaluate(() => window.__harness.juice.bdEligibleFor("naruto"))
  const eObito  = await page.evaluate(() => window.__harness.juice.bdEligibleFor("obito"))
  check("sukuna (adult/brutal) is blood-eligible", eSukuna === true)
  check("naruto (child) is NOT blood-eligible", eNaruto === false)
  check("obito (impact-standalone, no gore) is NOT blood-eligible", eObito === false)

  section("ACCUMULATION — damage builds 3 levels and PERSISTS across rounds")
  await setBD("full")
  await page.evaluate(() => window.__harness.brutality.setBlood(true))   // bloodFx ON (gates blood together with "Full")
  await apply("p1", 160, "fire", true, 1000)      // sukuna: fire → scorch
  let s = await bd(); check("L1 after ~16% dmg (sukuna)", s.slots.p1?.level === 1, `lvl=${s.slots.p1?.level}`)
  await apply("p1", 260, "ice", true, 1000)       // + ice → frost, crosses L2
  s = await bd(); check("L2 after ~42% + frost type recorded", s.slots.p1?.level === 2 && s.slots.p1.types.includes("frost") && s.slots.p1.types.includes("scorch"), `lvl=${s.slots.p1?.level} types=${s.slots.p1?.types}`)
  await apply("p1", 350, "ki", true, 1000)        // crosses L3
  s = await bd(); check("L3 after ~77% dmg", s.slots.p1?.level === 3 && s.slots.p1.hasTex, `lvl=${s.slots.p1?.level} tex=${s.slots.p1?.hasTex}`)
  const texAlpha = await page.evaluate(() => window.__harness.juice.bdTexAlpha("p1"))
  check("mark texture is actually PAINTED (opaque marks present to composite)", texAlpha > 0.01, `opaqueFrac=${texAlpha.toFixed(3)}`)
  // a real round reset must NOT clear battle damage (persists through rounds; only match-end clears)
  await page.evaluate(() => window.__harness.juice.bdRoundReset())
  await frames(2)
  s = await bd(); check("damage PERSISTS across a round reset", (s.slots.p1?.level || 0) === 3, `lvl=${s.slots.p1?.level}`)
  await page.screenshot({ path: path.join(SHOTS, "feel_p2_marks_full.png") })

  section("BLOOD GATING — eligible shows blood at Full+bloodFx; non-eligible & non-Full never")
  const texKeyAt = (slot) => page.evaluate(sl => { const st = window.__harness.juice.battleDamage(); return st.slots[sl] || null }, slot)
  await apply("p2", 500, "ki", false, 1000)       // naruto: non-eligible, heavy dmg
  s = await bd(); check("naruto accrues marks (level up) but record is non-eligible", (s.slots.p2?.level || 0) >= 2 && s.slots.p2.eligible === false, `lvl=${s.slots.p2?.level} elig=${s.slots.p2?.eligible}`)
  check("blood allowed flag true at Full + bloodFx", (await page.evaluate(() => window.__harness.juice.bdBloodAllowed())) === true)
  await setBD("marks")
  check("blood allowed flag FALSE at Marks Only", (await page.evaluate(() => window.__harness.juice.bdBloodAllowed())) === false)
  await setBD("off")
  check("Battle Damage OFF → fighters carry no mark texture", await page.evaluate(() => { const f = window.__harness.p1(); return !f._bdMarkTex }))
  await setBD("full")

  section("FLOOR DECALS — stamp + cap at 150")
  for (let i = 0; i < 170; i++) await page.evaluate(n => window.__harness.juice.bdDecal("scorch", 200 + n * 10, 600), i)
  s = await bd(); check("floor decals capped at 150", s.decals <= 150, `decals=${s.decals}`)

  section("MATCH RESET — a NEW match clears all battle damage")
  await page.evaluate(() => window.__harness.start?.())
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(4)
  // the per-frame tick re-creates empty records for the live fighters; "cleared" = every level back to 0 + no decals
  s = await bd(); const anyDmg = Object.values(s.slots).some(r => (r.level || 0) > 0 || (r.total || 0) > 0)
  check("records + decals cleared on new match (all levels 0, no decals)", !anyDmg && s.decals === 0, JSON.stringify(s))

  check("no page JS errors across the run", errs.length === 0, errs.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} feel-phase2-verify: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
