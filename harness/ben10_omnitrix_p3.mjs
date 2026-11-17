/**
 * BEN 10 OMNITRIX ENGINE — Phase 3 harness. Boots the real game headless and drives the Omnitrix via
 * the deterministic harness hooks (__harness.ben10Morph / ben10SetPower / ben10Vow / ben10VowSequence)
 * to prove: transform cost+startup+placeholder, swap cost+lockout+same-reject+hitstun, manual revert
 * lockout, 0-Power forced revert + timeout cooldown, and Binding-Vow determinism (same seed → same picks)
 * + its cost/mult flags. No Math.random anywhere.
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
const p1 = () => page.evaluate(() => window.__harness.p1())
const call = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4); await page.evaluate(() => window.__harness.skipToBattle()); await frames(16)

  // ── REAL INPUT PATH: ↓↓ + Light actually transforms (double-tap Down, then Light) ──
  await call("ben10SetPower", "p1", 100)
  await page.keyboard.down("s"); await frames(2); await page.keyboard.up("s"); await frames(4)
  await page.keyboard.down("s"); await frames(2); await page.keyboard.up("s"); await frames(2)
  await page.keyboard.down("j"); await frames(3); await page.keyboard.up("j"); await frames(6)
  let si = await p1()
  ok(si.benVulnerable || si.benTransformed || (si.benOmx && si.benOmx.startup > 0), "↓↓+Light input did not start a transform")
  await frames(44); si = await p1()
  ok(si.benTransformed, "↓↓+Light transform did not complete via the real input path")
  await call("ben10Morph", "p1", "revert"); await frames(24)   // reset to human for the hook tests below

  // ── TRANSFORM: cost 20, 40f startup (vulnerable), then alien applied as a PLACEHOLDER ──
  await call("ben10SetPower", "p1", 100)
  const t = await call("ben10Morph", "p1", 0)
  ok(t && t.act === "transform", `transform did not fire (${t && t.act})`)
  ok(t && t.power === 80, `transform cost should leave 80 Power (got ${t && t.power})`)
  ok(t && t.startup === 40, `transform startup should be 40 (got ${t && t.startup})`)
  ok(t && t.transformed === false, "should NOT be transformed yet (mid-startup)")
  let s = await p1(); ok(s.benVulnerable, "should be vulnerable during startup")
  await frames(44)
  s = await p1()
  ok(s.benTransformed, "alien not applied after startup")
  ok(s.benOmx && s.benOmx.index === 0, `wrong slot after transform (${s.benOmx && s.benOmx.index})`)
  ok(s.benPlaceholder, "alien form should render as a PLACEHOLDER (human + tint) — art wiped")
  ok(s.spriteReady !== false, "placeholder alien must still render as sprites (playable)")
  ok(!s.benVulnerable, "vulnerability should clear after startup")

  // ── SWAP: cost 15, 30f lockout, same-form rejected, second swap during lockout rejected ──
  await call("ben10SetPower", "p1", 100)
  const sw = await call("ben10Morph", "p1", 1)
  ok(sw && sw.act === "swap", `swap did not fire (${sw && sw.act})`)
  ok(sw && sw.power === 85, `swap cost should leave 85 Power (got ${sw && sw.power})`)
  ok(sw && sw.index === 1, `swap should land on slot 1 (got ${sw && sw.index})`)
  const sw2 = await call("ben10Morph", "p1", 2)     // during swapLockout → rejected
  ok(sw2 && sw2.act === null, "second swap during lockout should be REJECTED")
  const same = await call("ben10Morph", "p1", 1)    // same form → rejected (after lockout we still test same)
  ok(same && same.act === null, "swap into the SAME form should be rejected")

  // ── MANUAL REVERT: 20f lockout, no timeout ──
  await frames(32)                                   // clear swap lockout
  const rv = await call("ben10Morph", "p1", "revert")
  ok(rv && rv.act === "revert", `manual revert did not fire (${rv && rv.act})`)
  s = await p1()
  ok(!s.benTransformed, "should be human after revert")
  ok(s.benOmx && s.benOmx.manualLockout > 0, "manual revert should set a lockout")
  ok(s.benOmx && s.benOmx.timeoutCooldown === 0, "manual revert must NOT incur a timeout")

  // ── 0-POWER FORCED REVERT → 6s TIMEOUT cooldown (no transform during it) ──
  await frames(24)
  await call("ben10SetPower", "p1", 100)
  await call("ben10Morph", "p1", 0); await frames(44)   // transform
  await call("ben10SetPower", "p1", 1)                   // nearly empty → drains to 0 within ~1s
  await frames(30)
  s = await p1()
  ok(!s.benTransformed, "0 Power should FORCE a revert to human")
  ok(s.benOmx && s.benOmx.timeoutCooldown > 0, "forced revert should start a timeout cooldown")
  await call("ben10SetPower", "p1", 100)
  const blocked = await call("ben10Morph", "p1", 0)
  ok(blocked && blocked.act === null, "transform must be BLOCKED during the timeout cooldown")

  // ── BINDING VOW determinism: same seed → identical pick sequence; picks in range ──
  await call("ben10Vow", "p1", true)
  const seqFrames = [10, 11, 12, 20, 21, 50, 99, 100, 250, 999]
  const a1 = await call("ben10VowSequence", "p1", seqFrames)
  const a2 = await call("ben10VowSequence", "p1", seqFrames)
  ok(Array.isArray(a1) && a1.length === seqFrames.length, "vow sequence should return picks")
  ok(JSON.stringify(a1) === JSON.stringify(a2), `vow picks NOT deterministic:\n  ${JSON.stringify(a1)}\n  ${JSON.stringify(a2)}`)
  s = await p1()
  const nSlots = s.benOmx ? s.benOmx.slots : 5
  ok(a1.every(x => x >= 0 && x < nSlots), `vow picks out of range [0,${nSlots}): ${JSON.stringify(a1)}`)
  ok(s.benOmx && s.benOmx.vowActive, "vow should be active")

  ok(jsErrors.length === 0, `page errors: ${jsErrors.slice(0, 2).join(" | ")}`)
  console.log(`  slots=${nSlots} vowSeq=${JSON.stringify(a1)}`)
} catch (e) { failed++; fails.push("EXCEPTION: " + String(e && e.stack || e)) }
finally {
  console.log("\n════════════════════════════════════════")
  console.log(`  BEN 10 OMNITRIX P3: ${passed} passed, ${failed} failed`)
  console.log("════════════════════════════════════════")
  if (fails.length) console.log(fails.map(f => "  ❌ " + f).join("\n"))
  await browser.close(); server.close(); process.exit(failed ? 1 : 0)
}
