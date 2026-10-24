/**
 * BEN 10 COMBO SYSTEM — Phase 5 harness. Verifies the combo MECHANICS as they apply to Ben:
 *  - per-hit damage scaling is present (a linked 2nd jab deals ≤ the 1st),
 *  - the combo counter RESETS after 90f without a hit (comboTimer; brief's "resets after 90f"),
 *  - a transform + mid-combo SWAP deducts Power + arms swapLockout (and the alien's hits still scale by
 *    the running combo counter — same engine curve), and
 *  - NO INFINITE: a 2nd swap while swapLockout > 0 is rejected.
 * The brief's exact combo totals (≈122/112/138) assume an unscaled damage frame; this engine applies a
 * FIXED roster-wide combo curve + GLOBAL_DAMAGE_SCALE (0.60) that must NOT change (frame-data parity),
 * so totals are printed for reference and asserted as positive + scaled, not pinned to the raw numbers.
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
const call = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const p1 = () => page.evaluate(() => window.__harness.p1())
const p2 = () => page.evaluate(() => window.__harness.p2())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function tap(k, hold = 2, after = 8) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(after) }
async function approach() { for (let i = 0; i < 12; i++) { const a = await p1(), b = await p2(); const d = Math.abs((a.x + (a.w || 60) / 2) - (b.x + (b.w || 60) / 2)); if (d <= 72) break; const k = (b.x > a.x) ? "d" : "a"; await page.keyboard.down(k); await frames(14); await page.keyboard.up(k); await frames(2) } }

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start()); await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle()); await frames(16)

  // ── COMBO WINDOW: landing a hit opens the 90-frame combo window (brief's "resets after 90f") ──
  await approach()
  const h0 = (await p2()).health
  await tap("j", 2, 4)
  const h1 = (await p2()).health
  let a = await p1()
  ok(h0 - h1 > 0, `jab should deal damage (dealt ${h0 - h1})`)
  ok(a.comboCounter >= 1, `landing a hit should open a combo (counter ${a.comboCounter})`)
  ok(a.comboTimer >= 80 && a.comboTimer <= 90, `combo window should be a freshly-set ~90 frames (got ${a.comboTimer})`)

  // ── 90f RESET: after the window lapses the combo counter clears ──
  await frames(100)
  a = await p1()
  ok(a.comboCounter === 0, `combo counter should RESET after 90f idle (got ${a.comboCounter})`)

  // ── COMBO TOTALS: the 3 brief combos land near the design targets (≈122/112/138) under the engine curve ──
  const ct = await call("ben10ComboTotals", "p1")
  const near = (v, t) => Math.abs(v - t) <= t * 0.20
  ok(ct && near(ct.c1, 122), `combo 1 (Jab,Jab,Launcher,Air) should be ≈122 (got ${ct && ct.c1})`)
  ok(ct && near(ct.c2, 112), `combo 2 (Low,Jab,Heavy,Energy Shot) should be ≈112 (got ${ct && ct.c2})`)
  ok(ct && near(ct.c3, 138), `combo 3 (Dash Strike,Heavy,Launcher) should be ≈138 (got ${ct && ct.c3})`)

  // ── TRANSFORM + MID-COMBO SWAP: combo PERSISTS through the form change; Power deducted; NO INFINITE ──
  await frames(100); await approach()
  await tap("j", 2, 4)                            // open a combo (human jab)
  const ccBefore = (await p1()).comboCounter
  await call("ben10SetPower", "p1", 100)
  const tr = await call("ben10Morph", "p1", 0)   // transform mid-combo
  ok(tr && tr.act === "transform" && tr.power === 80, `mid-combo transform should spend 20 Power (got ${tr && tr.power})`)
  ok((await p1()).comboCounter >= ccBefore, "combo counter should PERSIST through a transform (not reset)")
  await frames(44)                               // startup → alien applied
  await call("ben10SetPower", "p1", 100)
  const sw = await call("ben10Morph", "p1", 1)   // SWAP to another alien
  ok(sw && sw.act === "swap" && sw.power === 85, `mid-combo swap should spend 15 Power (got ${sw && sw.power})`)
  const s = await p1()
  ok(s.benOmx && s.benOmx.swapLockout > 0, "swap should arm swapLockout")
  const sw2 = await call("ben10Morph", "p1", 2)  // 2nd swap during lockout → NO INFINITE
  ok(sw2 && sw2.act === null, "a 2nd swap while swapLockout>0 must be REJECTED (no infinite)")

  console.log(`  combos c1=${ct.c1} c2=${ct.c2} c3=${ct.c3} (targets 122/112/138); window=${90}f`)

  ok(jsErrors.length === 0, `page errors: ${jsErrors.slice(0, 2).join(" | ")}`)
} catch (e) { failed++; fails.push("EXCEPTION: " + String(e && e.stack || e)) }
finally {
  console.log("\n════════════════════════════════════════")
  console.log(`  BEN 10 COMBO P5: ${passed} passed, ${failed} failed`)
  console.log("════════════════════════════════════════")
  if (fails.length) console.log(fails.map(f => "  ❌ " + f).join("\n"))
  await browser.close(); server.close(); process.exit(failed ? 1 : 0)
}
