// harness/impact_frame_live.mjs
// STAGE 4 — live verify the IMPACT FRAME (purely visual). Boots a real match and confirms:
//   • a single isolated hit → BASE impact frame (combo 1, comboTier 0, tier from the hit weight)
//   • hit-tier scaling (light < heavy < special desaturation)
//   • combo escalation across the 5/9/15 tiers (longer dur + more desat + radiating lines appear at 9/15)
//   • it's gated OFF during a Brutality (no clash)
// Reads the impactFrame() harness hook (visual-only state). Screenshots a low-combo vs high-combo hit.
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
const impact = () => page.evaluate(() => window.__harness.impactFrame())
async function reseat(gap = 52) { const x = await page.evaluate(() => window.__harness.p1().x); await page.evaluate((v) => window.__harness.setP2X(v), x + gap) }

async function bootTraining(p1 = "goku") {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p1}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot())
  await page.evaluate(() => window.__harness.skipToBattle())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 15000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setSession && window.__harness.setSession({ infiniteResources: true }))
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await reseat(52); await frames(4)
  // In-page rAF recorder: samples impactFrame() every RENDER frame and keeps the FRESHEST (max-timer)
  // non-null sample since the last reset — reliably catches even a 2-frame flash that a coarse poll misses.
  await page.evaluate(() => {
    if (window.__impactRAF) cancelAnimationFrame(window.__impactRAF)
    window.__impactRec = { peak: null }
    const tick = () => {
      const s = window.__harness.impactFrame()
      if (s && (!window.__impactRec.peak || s.timer > window.__impactRec.peak.timer)) window.__impactRec.peak = { ...s }
      window.__impactRAF = requestAnimationFrame(tick)
    }
    tick()
  })
}
// Reset combos, let residual clear, reset the recorder, run the trigger, wait for the flash, read the peak.
async function capture(triggerFn) {
  await page.evaluate(() => { window.__harness.setCombo("p1", 0); window.__harness.setCombo("p2", 0) })
  await frames(8)   // count<1 → no trigger; prevCount settles to 0; residual impactFX expires
  await page.evaluate(() => { window.__impactRec.peak = null })
  await triggerFn()
  await frames(14)  // let the trigger fire + the (brief) flash play; the rAF recorder captures the peak
  return await page.evaluate(() => window.__impactRec.peak)
}

try {
  await bootTraining("goku")

  section("BASE — a single isolated LIGHT hit → subtle base impact frame")
  const b = await capture(async () => { await reseat(48); await page.evaluate(() => window.__harness.p1ForceLight()) })
  check("impact frame fires on a single hit", !!b, JSON.stringify(b))
  check("combo = 1 (isolated hit)", b?.combo === 1, `combo=${b?.combo}`)
  check("comboTier = 0 (BASE, no escalation)", b?.comboTier === 0, `comboTier=${b?.comboTier}`)
  check("tier = light (jab weight)", b?.tier === "light", `tier=${b?.tier}`)
  check("brief base duration (2 frames)", b?.maxTimer === 2, `dur=${b?.maxTimer}`)
  // screenshot the low-combo flash — PIN it by re-firing the combo-1 base each frame (alternate 0/1 →
  // a fresh 0→1 rise re-arms the brief base flash continuously) so the screenshot lands mid-flash.
  await page.evaluate(() => { window.__harness.setCombo("p1", 0) }); await frames(8)
  await page.evaluate(() => { window.__pk = 0; window.__pinLo = setInterval(() => { window.__pk ^= 1; window.__harness.setCombo("p1", window.__pk) }, 8) })
  await page.waitForFunction(() => window.__harness.impactFrame() !== null, null, { timeout: 3000, polling: 4 }).catch(() => {})
  await page.waitForTimeout(60)
  await page.screenshot({ path: path.join(OUT, "IMPACT_low_combo.png") })
  await page.evaluate(() => clearInterval(window.__pinLo))

  section("TIER SCALING — heavier hit → stronger desaturation")
  const hHeavy = await capture(async () => { await reseat(50); await page.evaluate(() => window.__harness.p2Heavy()) })
  check("heavy hit → tier heavy", hHeavy?.tier === "heavy", `tier=${hHeavy?.tier}`)
  check("heavy desaturation > light base desaturation", (hHeavy?.desat || 0) > (b?.desat || 0), `heavy=${hHeavy?.desat} light=${b?.desat}`)
  const hSpec = await capture(async () => { await reseat(50); await page.evaluate(() => window.__harness.p2AttackCat("special")) })
  check("special hit → tier special", hSpec?.tier === "special", `tier=${hSpec?.tier}`)
  check("special desaturation > heavy", (hSpec?.desat || 0) > (hHeavy?.desat || 0), `special=${hSpec?.desat} heavy=${hHeavy?.desat}`)

  section("COMBO ESCALATION — drama climbs across the 5 / 9 / 15 tiers")
  const at = {}
  for (const n of [1, 5, 9, 15]) at[n] = await capture(async () => { await page.evaluate((c) => window.__harness.setCombo("p1", c), n) })
  console.log(`  combo→(comboTier,dur,desat,lines): ` + [1, 5, 9, 15].map(n => `${n}→(${at[n]?.comboTier},${at[n]?.maxTimer},${at[n]?.desat?.toFixed(2)},${at[n]?.comboTier >= 2 ? "yes" : "no"})`).join("  "))
  check("comboTier climbs 0→1→2→3 at 1/5/9/15", at[1]?.comboTier === 0 && at[5]?.comboTier === 1 && at[9]?.comboTier === 2 && at[15]?.comboTier === 3)
  check("duration escalates with combo (15 longer than 1)", (at[15]?.maxTimer || 0) > (at[1]?.maxTimer || 0), `1→${at[1]?.maxTimer}  15→${at[15]?.maxTimer}`)
  check("desaturation escalates with combo (15 > 1)", (at[15]?.desat || 0) > (at[1]?.desat || 0), `1→${at[1]?.desat?.toFixed(2)}  15→${at[15]?.desat?.toFixed(2)}`)
  check("radiating flash-lines appear at 9+ (comboTier ≥ 2), NOT at base", at[1]?.comboTier < 2 && at[9]?.comboTier >= 2 && at[15]?.comboTier >= 2)
  // screenshot the high-combo flash — PIN it by bumping the combo each frame (15,16,17… each a fresh
  // rise re-arms the comboTier-3 flash: max desat + radiating lines) so the screenshot lands mid-flash.
  await page.evaluate(() => { window.__harness.setCombo("p1", 0) }); await frames(8)
  await page.evaluate(() => { window.__hk = 14; window.__pinHi = setInterval(() => { window.__harness.setCombo("p1", ++window.__hk) }, 8) })
  await page.waitForFunction(() => { const s = window.__harness.impactFrame(); return s && s.comboTier === 3 }, null, { timeout: 3000, polling: 4 }).catch(() => {})
  await page.waitForTimeout(40)
  await page.screenshot({ path: path.join(OUT, "IMPACT_high_combo.png") })
  await page.evaluate(() => clearInterval(window.__pinHi))

  section("BRUTALITY — impact frame is gated OFF (no clash)")
  await bootTraining("sukuna")   // brutality-eligible
  await page.evaluate(() => window.__harness.brutality.setBrutality(true))
  await page.evaluate(() => window.__harness.brutality.trigger("p1", true, "cleave"))
  await frames(3)
  const duringBrutality = await impact()
  check("impact frame is NULL during a Brutality", duringBrutality === null, `impact=${JSON.stringify(duringBrutality)}`)

  check("no page JS errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} impact-frame-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
