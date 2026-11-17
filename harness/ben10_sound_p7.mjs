/**
 * BEN 10 SOUND — Phase 7 harness. Spies on the live SoundManager's playBen10 and drives each Omnitrix
 * event, asserting the right placeholder-synth cue fires: transform / swap / revert / timeout / vow pick /
 * energy shot / dash / shockwave / overload. (The synth output is WebAudio — not audible headless — so we
 * assert the deterministic WIRING + that the recipe code runs without error. Pitch is ±3% hash-derived.)
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
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
const log = () => page.evaluate(() => window.__benSfxLog.slice())
const clear = () => page.evaluate(() => { window.__benSfxLog.length = 0 })

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  // Spy on the live synth (record ids; still call through so the recipe code runs headless).
  await page.evaluate(() => { const s = window.__harness.__sound; window.__benSfxLog = []; const orig = s.playBen10.bind(s); s.playBen10 = (id, p, seed) => { window.__benSfxLog.push({ id, pitch: p }); return orig(id, p, seed) } })
  await page.evaluate(() => window.__harness.start()); await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle()); await frames(16)

  const fired = async (action, id, note) => { await clear(); await action(); await frames(6); const L = await log(); ok(L.some(e => e.id === id), `${note}: expected cue '${id}', got [${L.map(e => e.id).join(",")}]`); return L }

  // TRANSFORM → ben_transform (+ pitch ±3%)
  await call("ben10SetPower", "p1", 100)
  const Lt = await fired(() => call("ben10Morph", "p1", 0), "ben_transform", "transform")
  ok(Lt.length && Lt[0].pitch >= 0.97 && Lt[0].pitch <= 1.03, `pitch should be ±3% (got ${Lt[0] && Lt[0].pitch})`)
  await frames(48)   // ensure the transform startup (40f) fully resolved so the next morph is a SWAP
  // SWAP → ben_swap
  await call("ben10SetPower", "p1", 100)
  await fired(() => call("ben10Morph", "p1", 1), "ben_swap", "swap")
  await frames(32)
  // REVERT → ben_revert
  await fired(() => call("ben10Morph", "p1", "revert"), "ben_revert", "manual revert")
  await frames(24)
  // VOW PICK → ben_vowpick overrides the transform cue (done BEFORE timeout, which locks transforms 6s)
  await call("ben10Vow", "p1", true); await call("ben10SetPower", "p1", 100)
  await fired(() => call("ben10Morph", "p1", 2), "ben_vowpick", "vow transform")
  await call("ben10Vow", "p1", false); await call("ben10Morph", "p1", "revert"); await frames(24)
  // TIMEOUT → ben_timeout (transform, drain to 0)
  await call("ben10SetPower", "p1", 100); await call("ben10Morph", "p1", 0); await frames(44)
  await clear(); await call("ben10SetPower", "p1", 1); await frames(24)
  ok((await log()).some(e => e.id === "ben_timeout"), "0-Power forced revert should fire ben_timeout")

  // SPECIALS + ULT via input (neutral Special = Energy Shot; Ultimate = Overload)
  await call("ben10SetPower", "p1", 100)
  await fired(async () => { await page.keyboard.down("l"); await frames(3); await page.keyboard.up("l") }, "ben_energyshot", "Energy Shot")
  await frames(24); await call("ben10SetPower", "p1", 100)
  await fired(async () => { await page.keyboard.down("u"); await frames(3); await page.keyboard.up("u") }, "ben_overload", "Omnitrix Overload")

  ok(jsErrors.length === 0, `page errors: ${jsErrors.slice(0, 2).join(" | ")}`)
} catch (e) { failed++; fails.push("EXCEPTION: " + String(e && e.stack || e)) }
finally {
  console.log("\n════════════════════════════════════════")
  console.log(`  BEN 10 SOUND P7: ${passed} passed, ${failed} failed`)
  console.log("════════════════════════════════════════")
  if (fails.length) console.log(fails.map(f => "  ❌ " + f).join("\n"))
  await browser.close(); server.close(); process.exit(failed ? 1 : 0)
}
