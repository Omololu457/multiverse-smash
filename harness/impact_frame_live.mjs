// harness/impact_frame_live.mjs
// STAGE 5 — frame-exact verification of the "Black Flash" IMPACT FRAME (purely visual sprite colour-swap).
// Boots a real match and confirms, reading the impactFrame() hook (visual-only state) frame-by-frame:
//   • a real hit stamps the flash on BOTH the struck + striking fighters (Stage-1 confirm for the rebuild)
//   • the recolor filter actually LANDS on the sprites (p1Filter/p2Filter = a Black-Flash grayscale tint)
//   • extremity scales by hit tier (heavy/special bump the level) and escalates with combo (1/5/9/15)
//   • it's gated OFF during a Brutality
// Then captures FRAME-EXACT screenshots (base + high combo) — the flash is pinned by re-firing it each
// frame so the harness-driven screenshot is GUARANTEED to land on an active frame (not human-timed) — and
// pixel-samples the on-canvas fighter region to prove the palette shifted (darker / red-cast / blue crushed).
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
async function reseat(gap = 48) { const x = await page.evaluate(() => window.__harness.p1().x); await page.evaluate((v) => window.__harness.setP2X(v), x + gap) }
const isBlackFlashTint = s => typeof s === "string" && s.startsWith("grayscale(1) contrast")
// average RGB of the on-canvas central fighter band (reads final composited pixels → proves the swap landed)
const sampleBand = () => page.evaluate(() => {
  const c = document.querySelector("canvas"); const cx = c.getContext("2d", { willReadFrequently: true })
  const x = Math.floor(c.width * 0.42), y = Math.floor(c.height * 0.46), w = Math.floor(c.width * 0.16), h = Math.floor(c.height * 0.22)
  const d = cx.getImageData(x, y, w, h).data; let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
  return { r: r / n, g: g / n, b: b / n, lum: (0.3 * r + 0.59 * g + 0.11 * b) / n }
})

async function bootTraining(p1 = "goku") {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p1}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot())
  await page.evaluate(() => window.__harness.skipToBattle())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 15000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setSession && window.__harness.setSession({ infiniteResources: true }))
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await reseat(48); await frames(4)
  // In-page rAF recorder: samples impactFrame() every RENDER frame, keeps the FRESHEST (max-timer) active
  // marker since the last reset — catches even a 2-frame flash a coarse poll would step over.
  await page.evaluate(() => {
    if (window.__impactRAF) cancelAnimationFrame(window.__impactRAF)
    window.__impactRec = { peak: null }
    const tick = () => {
      const s = window.__harness.impactFrame()
      if (s && s.active && (!window.__impactRec.peak || s.active.timer > window.__impactRec.peak.active.timer)) window.__impactRec.peak = s
      window.__impactRAF = requestAnimationFrame(tick)
    }
    tick()
  })
}
// Reset combos, let residual clear, reset the recorder, run the trigger, wait for the flash, read the peak.
async function capture(triggerFn) {
  await page.evaluate(() => { window.__harness.setCombo("p1", 0); window.__harness.setCombo("p2", 0) })
  await frames(8)
  await page.evaluate(() => { window.__impactRec.peak = null })
  await triggerFn()
  await frames(14)
  return await page.evaluate(() => window.__impactRec.peak)
}

try {
  await bootTraining("goku")

  section("STAGE 1 (rebuild) — a real hit stamps the Black-Flash marker on BOTH fighters + recolor lands")
  const b = await capture(async () => { await reseat(46); await page.evaluate(() => window.__harness.p1ForceLight()) })
  check("flash fires on a single real hit", !!b?.active, JSON.stringify(b?.active))
  check("BOTH fighters flash (struck + striking)", !!b?.p1 && !!b?.p2)
  check("combo = 1 (isolated hit)", b?.active?.combo === 1, `combo=${b?.active?.combo}`)
  check("comboTier = 0, level = 0 (BASE)", b?.active?.comboTier === 0 && b?.active?.level === 0, `ct=${b?.active?.comboTier} lvl=${b?.active?.level}`)
  check("brief base duration (2 frames)", b?.active?.maxTimer === 2, `dur=${b?.active?.maxTimer}`)
  check("recolor filter LANDS on both sprites (Black-Flash grayscale tint)", isBlackFlashTint(b?.p1Filter) && isBlackFlashTint(b?.p2Filter), `p1=${b?.p1Filter}`)

  section("TIER SCALING — a heavier hit recolors a notch harder even at combo 0")
  const hHeavy = await capture(async () => { await reseat(50); await page.evaluate(() => window.__harness.p2Heavy()) })
  check("heavy hit → tier heavy", hHeavy?.active?.tier === "heavy", `tier=${hHeavy?.active?.tier}`)
  check("heavy level ≥ 1 (weightier than a jab at same combo)", (hHeavy?.active?.level || 0) >= 1, `level=${hHeavy?.active?.level}`)

  section("COMBO ESCALATION — recolor extremity + duration climb across 5 / 9 / 15")
  const at = {}
  for (const n of [1, 5, 9, 15]) at[n] = await capture(async () => { await page.evaluate((c) => window.__harness.setCombo("p1", c), n) })
  console.log(`  combo→(comboTier,level,dur): ` + [1, 5, 9, 15].map(n => `${n}→(${at[n]?.active?.comboTier},${at[n]?.active?.level},${at[n]?.active?.maxTimer})`).join("  "))
  check("comboTier climbs 0→1→2→3 at 1/5/9/15", at[1]?.active?.comboTier === 0 && at[5]?.active?.comboTier === 1 && at[9]?.active?.comboTier === 2 && at[15]?.active?.comboTier === 3)
  check("recolor level escalates (15 more extreme than 1)", (at[15]?.active?.level || 0) > (at[1]?.active?.level || 0), `1→${at[1]?.active?.level}  15→${at[15]?.active?.level}`)
  check("duration escalates (15 longer than 1)", (at[15]?.active?.maxTimer || 0) > (at[1]?.active?.maxTimer || 0), `1→${at[1]?.active?.maxTimer}  15→${at[15]?.active?.maxTimer}`)
  check("max-combo uses the most extreme tint (level 3)", at[15]?.active?.level === 3, `level=${at[15]?.active?.level}`)

  section("FRAME-EXACT SCREENSHOTS + pixel proof (pinned to an active frame, not human-timed)")
  // baseline (no flash) — clear combo + let the combo counter fully fade, then sample the normal palette.
  await page.evaluate(() => { window.__harness.setImpactFlash(-1); window.__harness.setCombo("p1", 0); window.__harness.setCombo("p2", 0) }); await frames(45)
  const baseline = await sampleBand()
  // LOW: a base (level 0) single-hit flash on combo 1 (no combo counter shown) — stamped directly + held → frame-exact.
  await page.evaluate(() => window.__harness.setImpactFlash(0)); await frames(2)
  const loBand = await sampleBand()
  await page.screenshot({ path: path.join(OUT, "IMPACT_low_combo.png") })
  // HIGH: the max (level 3) flash at a real high combo (HUD reads the combo) — stamped directly + held.
  await page.evaluate(() => { window.__harness.setImpactFlash(-1); window.__harness.setCombo("p1", 18) }); await frames(3)
  await page.evaluate(() => window.__harness.setImpactFlash(3)); await frames(2)
  const hiBand = await sampleBand()
  await page.screenshot({ path: path.join(OUT, "IMPACT_high_combo.png") })
  await page.evaluate(() => window.__harness.setImpactFlash(-1))   // clear the held flash
  const fmt = o => `r${o.r.toFixed(0)} g${o.g.toFixed(0)} b${o.b.toFixed(0)} lum${o.lum.toFixed(0)}`
  console.log(`  fighter band  baseline[${fmt(baseline)}]  low[${fmt(loBand)}]  high[${fmt(hiBand)}]`)
  const delta = (a, o) => Math.abs(a.r - o.r) + Math.abs(a.g - o.g) + Math.abs(a.b - o.b)
  const dLo = delta(loBand, baseline), dHi = delta(hiBand, baseline)
  // The core fix vs the prior (invisible) pass: BOTH base and high visibly change the sprite region.
  check("base flash is CLEARLY visible vs baseline (Δ well above noise)", dLo > 10, `Δ=${dLo.toFixed(1)}`)
  check("high flash is CLEARLY visible vs baseline", dHi > 10, `Δ=${dHi.toFixed(1)}`)
  check("both flashes darken the band (charcoal, not a bright wash)", loBand.lum < baseline.lum && hiBand.lum < baseline.lum, `lum base=${baseline.lum.toFixed(0)} lo=${loBand.lum.toFixed(0)} hi=${hiBand.lum.toFixed(0)}`)
  check("both flashes are red-dominant (red is the strongest channel)", loBand.r >= loBand.g && loBand.r >= loBand.b && hiBand.r >= hiBand.g && hiBand.r >= hiBand.b, `lo r${loBand.r.toFixed(0)}/g${loBand.g.toFixed(0)}/b${loBand.b.toFixed(0)}  hi r${hiBand.r.toFixed(0)}/g${hiBand.g.toFixed(0)}/b${hiBand.b.toFixed(0)}`)

  section("BRUTALITY — impact flash is gated OFF (no clash)")
  await bootTraining("sukuna")
  await page.evaluate(() => window.__harness.brutality.setBrutality(true))
  await page.evaluate(() => window.__harness.brutality.trigger("p1", true, "cleave"))
  await frames(3)
  const db = await impact()
  check("flash markers are NULL during a Brutality (both fighters)", db?.active === null && db?.p1 === null && db?.p2 === null, `active=${JSON.stringify(db?.active)}`)

  check("no page JS errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} impact-frame-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
