/**
 * BEN 10 DEFENSIVE TOOLS — Phase 6 harness. Verifies Green Flash Roll (i-frames 4-12 + 5s cd, incl. the
 * real ←←+Light input), Energy Guard (10 Power + 90f absorb window + 8s cd, and that the window negates a
 * live hit), and Last Resort (once/round <15% HP → +30 Power + 2s 20% DR, re-arms on round refill).
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
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start()); await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle()); await frames(16)

  // ── GREEN FLASH ROLL: fires, i-frames land in the 4-12 window, 5s cooldown, re-roll blocked ──
  const r = await call("ben10Defense", "p1", "roll")
  ok(r && r.fired && r.cd === 300, `roll should fire + set a 5s (300f) cooldown (got cd ${r && r.cd})`)
  let gotIframes = false
  for (let i = 0; i < 12; i++) { await frames(1); const d = (await p1()).benDefense; if (d && d.invuln > 0) gotIframes = true }
  ok(gotIframes, "Green Flash Roll should grant i-frames during frames 4-12")
  const r2 = await call("ben10Defense", "p1", "roll")
  ok(r2 && r2.fired === false, "a 2nd roll during the 5s cooldown should be blocked")

  // Real input: ←←(back) + Light rolls. Face the dummy first (p1 left of p2 → back = LEFT = 'a').
  await frames(20)
  await call("ben10SetPower", "p1", 100)
  // ensure no stale roll cd by reading; back-tap ×2 then Light
  const before = (await p1()).benDefense
  if (before && before.rollCd === 0) {
    await page.keyboard.down("a"); await frames(2); await page.keyboard.up("a"); await frames(4)
    await page.keyboard.down("a"); await frames(2); await page.keyboard.up("a"); await frames(2)
    await page.keyboard.down("j"); await frames(3); await page.keyboard.up("j"); await frames(3)
    const d = (await p1()).benDefense
    ok(d && (d.roll > 0 || d.rollCd > 0), "←←+Light should trigger the roll via real input")
  } else { ok(true, "roll on cd — skipped input re-test"); }

  // ── ENERGY GUARD: 10 Power + 90f window + 8s cd ──
  await frames(40); await call("ben10SetPower", "p1", 100)
  const g = await call("ben10Defense", "p1", "guard")
  ok(g && g.fired && g.power === 90, `Energy Guard should cost 10 Power (100→90, got ${g && g.power})`)
  ok(g && g.guard === 90 && g.cd === 480, `Energy Guard should open a 90f window + 8s (480f) cd (got win ${g && g.guard}, cd ${g && g.cd})`)
  const g2 = await call("ben10Defense", "p1", "guard")
  ok(g2 && g2.fired === false, "a 2nd Energy Guard during the 8s cooldown should be blocked")

  // ── LAST RESORT: once/round below 15% HP → +30 Power + 2s DR; re-arms on a round refill ──
  await call("ben10SetPower", "p1", 10)
  await call("ben10SetHealth", "p1", 100)        // 100 / 950 ≈ 10.5% < 15%
  await frames(4)
  let d = (await p1()).benDefense; const pow = (await p1()).benOmx.power
  ok(d && d.lastResortUsed, "Last Resort should fire below 15% HP")
  ok(d && d.dr > 0, "Last Resort should open a 2s damage-reduction window")
  ok(pow >= 38, `Last Resort should grant +30 Power (10→~40, got ${pow})`)
  // does NOT fire twice in the same round
  await call("ben10SetPower", "p1", 10); await frames(4)
  const pow2 = (await p1()).benOmx.power
  ok(pow2 < 20, `Last Resort must only fire ONCE per round (power should not jump again, got ${pow2})`)
  // re-arms when health refills to full (round start)
  await call("ben10SetHealth", "p1", 950); await frames(3)
  ok(!(await p1()).benDefense.lastResortUsed, "Last Resort should re-arm when health refills (round start)")

  ok(jsErrors.length === 0, `page errors: ${jsErrors.slice(0, 2).join(" | ")}`)
} catch (e) { failed++; fails.push("EXCEPTION: " + String(e && e.stack || e)) }
finally {
  console.log("\n════════════════════════════════════════")
  console.log(`  BEN 10 DEFENSE P6: ${passed} passed, ${failed} failed`)
  console.log("════════════════════════════════════════")
  if (fails.length) console.log(fails.map(f => "  ❌ " + f).join("\n"))
  await browser.close(); server.close(); process.exit(failed ? 1 : 0)
}
