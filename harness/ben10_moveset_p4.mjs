/**
 * BEN 10 MOVESET — Phase 4 harness. Proves the alien registry (aliens.js), the per-variant human
 * normals, the human specials (Energy Shot 12 / Dash Strike 10), and the Omnitrix Overload ultimate
 * (full Power → 0, radial damage, forced timeout). Deterministic; no Math.random.
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
async function boot(skin) {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate((s) => window.__harness.start({ p1Skin: s }), skin)
  await frames(4); await page.evaluate(() => window.__harness.skipToBattle()); await frames(16)
}

try {
  await boot("default")
  // ── REGISTRY: 5 ready slots wrapping pool aliens + placeholder factory ──
  const reg = await call("ben10Registry")
  ok(reg && reg.registry.length === 5, `registry should have 5 entries (got ${reg && reg.registry.length})`)
  ok(reg && reg.registry.every(a => a.status === "ready" && a.poolKey), "all 5 registry entries should be ready + pool-backed")
  ok(reg && reg.registry.every(a => a.mods && a.mods.speed === 1.0 && a.movement === "grounded"), "ready mods should be identity (1.0) + grounded")
  ok(reg && reg.placeholder && reg.placeholder.status === "placeholder" && reg.placeholder.moves.special1 === "Placeholder Blast", "placeholder must carry Placeholder Blast")
  ok(reg && reg.loadout.length === 5, "buildLoadout(5) should fill 5 slots")

  // ── PER-VARIANT NORMALS: Alien Force vs Classic vs Prime (light dmg + startup differ) ──
  const nAF = await call("ben10Normals", "p1")
  ok(nAF && nAF.light === 20 && nAF.lightStartup === 5, `Alien Force jab should be 20 dmg / 5f (got ${nAF && nAF.light}/${nAF && nAF.lightStartup})`)
  ok(nAF && nAF.heavy === 55, `Alien Force heavy should be 55 (got ${nAF && nAF.heavy})`)

  // ── HUMAN SPECIALS: Energy Shot (neutral Special) spends 12 Power ──
  await call("ben10SetPower", "p1", 100)
  await page.keyboard.down("l"); await frames(3); await page.keyboard.up("l"); await frames(3)
  let s = await p1()
  ok(s.benOmx && s.benOmx.power <= 90 && s.benOmx.power >= 85, `Energy Shot should spend ~12 Power (100→~88, got ${s.benOmx && s.benOmx.power})`)
  await frames(26)

  // ── OMNITRIX OVERLOAD ultimate: full Power → 0, radial damage to the dummy, forced timeout ──
  // Close the gap to within the 320px radius (walk toward the dummy until near, both facings).
  for (let i = 0; i < 8; i++) {
    const a = await p1(), b = await p2()
    const dist = Math.abs((a.x + (a.w || 60) / 2) - (b.x + (b.w || 60) / 2))
    if (dist <= 240) break
    const key = (b.x > a.x) ? "d" : "a"
    await page.keyboard.down(key); await frames(18); await page.keyboard.up(key); await frames(2)
  }
  await call("ben10SetPower", "p1", 100)
  const hpBefore = (await p2()).health
  await page.keyboard.down("u"); await frames(3); await page.keyboard.up("u"); await frames(5)
  const powAfter = (await p1()).benOmx.power
  ok(powAfter <= 4, `Overload should spend ALL Power (got ${powAfter} right after cast)`)
  await frames(70)   // let all 3 radial hits (frames 18/40/66) resolve
  const d = await p2()
  ok(d.health < hpBefore, `Overload should damage the dummy within 320px (hp ${hpBefore}→${d.health})`)
  await frames(20); s = await p1()   // past the 90f recovery → forced timeout scheduled at +90
  ok(s.benOmx && s.benOmx.timeoutCooldown > 0, `Overload should force a timeout cooldown afterwards (got ${s.benOmx && s.benOmx.timeoutCooldown})`)

  // ── Classic / Prime normals differ ──
  await boot("ben10Classic")
  const nC = await call("ben10Normals", "p1")
  ok(nC && nC.light === 18 && nC.lightStartup === 4, `Classic jab should be 18 dmg / 4f (got ${nC && nC.light}/${nC && nC.lightStartup})`)
  await boot("ben10Prime")
  const nP = await call("ben10Normals", "p1")
  ok(nP && nP.light === 22 && nP.heavy === 60, `Prime jab/heavy should be 22/60 (got ${nP && nP.light}/${nP && nP.heavy})`)

  ok(jsErrors.length === 0, `page errors: ${jsErrors.slice(0, 2).join(" | ")}`)
  console.log(`  normals AF=${nAF.light}/${nAF.heavy} Classic=${nC.light} Prime=${nP.light}/${nP.heavy}`)
} catch (e) { failed++; fails.push("EXCEPTION: " + String(e && e.stack || e)) }
finally {
  console.log("\n════════════════════════════════════════")
  console.log(`  BEN 10 MOVESET P4: ${passed} passed, ${failed} failed`)
  console.log("════════════════════════════════════════")
  if (fails.length) console.log(fails.map(f => "  ❌ " + f).join("\n"))
  await browser.close(); server.close(); process.exit(failed ? 1 : 0)
}
