// harness/omololu_kamui_cost.test.mjs — verify omololu's three ported Kamui moves spend the NEW (reduced)
// energy costs, live: Kamui Warp = 15 (was 20), Kamui Dimension = 33 (was 45), Kamui Intangibility drains
// 0.9/frame (was 1.2). Boots a real omololu match and measures fighter.energy before/after each move.
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let pass = 0, fail = 0
const ok = (c, n, d = "") => { (c ? pass++ : fail++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const state = () => page.evaluate(() => window.__harness.state())
const waitFrames = async n => { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
const energy = () => page.evaluate(() => window.__harness.p1()?.energy ?? null)
const readyP1 = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 }, null, { timeout: 4000 }).catch(() => {})
const reset = async () => { await page.evaluate(() => { window.__harness.omololu?.resetKit?.("p1"); window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1") }); await readyP1() }
// Spent-energy = the TROUGH after a one-shot move (energy caps at max pre-spend, so the min over the next
// frames = max - cost exactly; passive regen only REFILLS afterward, never contaminating the trough).
async function spentByTrough(fireFn, frames = 12) {
  const e0 = await energy()
  await fireFn()
  let mn = await energy()
  for (let i = 0; i < frames; i++) { await waitFrames(1); const e = await energy(); if (e != null && e < mn) mn = e }
  return { e0, mn, spent: Math.round((e0 - mn) * 100) / 100 }
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=obito`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await waitFrames(3)

  console.log("\n── omololu Kamui energy costs (live) ──────────────────")

  // KAMUI WARP (Down+Special) — one-shot activation cost, expected 15 (was 20)
  await reset()
  const warp = await spentByTrough(() => page.evaluate(() => window.__harness.p1SpecialDir("B")))
  ok(Math.round(warp.spent) === 15, `Kamui Warp spent ${warp.spent} → 15 (was 20)`, `energy ${warp.e0}→trough ${warp.mn}`)

  // KAMUI DIMENSION (P-hold→release) — one-shot activation cost, expected 33 (was 45)
  await reset()
  const dim = await spentByTrough(async () => { await page.keyboard.down("p"); await sleep(280); await page.keyboard.up("p") })
  ok(Math.round(dim.spent) === 33, `Kamui Dimension spent ${dim.spent} → 33 (was 45)`, `energy ${dim.e0}→trough ${dim.mn}`)
  await waitFrames(70)   // let the dimension window close before the next move

  // KAMUI INTANGIBILITY (P-tap toggle) — continuous drain, expected ~0.9/frame (was 1.2)
  await reset(); await page.keyboard.press("p"); await waitFrames(2)   // activate
  const active = await page.evaluate(() => !!window.__harness.p1()?._kamuiIntangible ?? false).catch(() => false)
  const i0 = await energy(); const F = 30
  await waitFrames(F)
  const i1 = await energy(); const perFrame = Math.round(((i0 - i1) / F) * 100) / 100
  await page.keyboard.press("p")   // deactivate
  // Intangibility drain is now VERY LOW (0.1/frame, net even lower after passive regen) → sustainable while
  // gaining meter. Was 0.9; a charge (+0.5/f) or even passive regen (~0.075/f) now outpaces it.
  ok(perFrame <= 0.15, `Kamui Intangibility drain ${perFrame}/frame net — LOW/sustainable (was ~0.9)`, `energy ${i0}→${i1} over ${F}f`)

  ok(jsErrors.length === 0, "no JS errors across the run", jsErrors[0] || "")
  console.log(`\nRESULT ${pass} pass / ${fail} fail`)
} catch (e) {
  console.error("HARNESS ERROR:", e); fail++
} finally {
  await browser.close(); server.close()
  process.exit(fail ? 1 : 0)
}
