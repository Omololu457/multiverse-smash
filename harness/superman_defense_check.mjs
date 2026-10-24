/**
 * SUPERMAN DEFENSIVE TOOLS check (Phase 6) — X-Ray Vision (+8% vs sub-25%-HP opponent), Super Armor on
 * Heavy (shrug one hit without flinching, still take damage, 8s cd), Flight Escape (burst out of a combo
 * into flight: Special + 25 energy while in hitstun, 12f invuln, 10s cd). Boots the real game headless,
 * uses test hooks (setHealth / p1ForceLight / p1ForceHeavy / enemyProjAtP1), 0 JS errors.
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []
page.on("pageerror", e => jsErrors.push(String(e)))

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
const p1p = () => page.evaluate(() => window.__harness.flightProbe("p1"))
const p2p = () => page.evaluate(() => window.__harness.flightProbe("p2"))
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function hold(k, n) { await page.keyboard.down(k); await frames(n); await page.keyboard.up(k); await frames(2) }
async function approach(px) { for (let c = 0; c < 8; c++) { const a = await p1p(), b = await p2p(); if (Math.abs(a.x - b.x) <= px) break; await hold(b.x > a.x ? "d" : "a", 14) } }

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(20)
  await approach(90)

  // ─────────── X-RAY VISION (+8% vs sub-25% HP) ───────────
  // Same forced light at FULL vs LOW opponent HP (combo reset each time) → low-HP hit must do more.
  await page.evaluate(() => window.__harness.setHealth(100000, "p2"))   // clamps to max
  await frames(2)
  let hpA0 = (await p2p()).health
  await page.evaluate(() => window.__harness.p1ForceLight()); await frames(10)
  const dmgFull = hpA0 - (await p2p()).health
  await page.evaluate(() => window.__harness.setHealth(80, "p2"))       // < 25% of maxHealth
  await frames(2)
  let hpB0 = (await p2p()).health
  await page.evaluate(() => window.__harness.p1ForceLight()); await frames(10)
  const dmgLow = hpB0 - (await p2p()).health
  ok(dmgFull > 0 && dmgLow > 0, `forced lights did not connect (full=${dmgFull}, low=${dmgLow})`)
  ok(dmgLow > dmgFull, `X-Ray: sub-25% hit (${dmgLow}) not greater than full-HP hit (${dmgFull})`)

  // ─────────── SUPER ARMOR on Heavy ───────────
  await page.evaluate(() => window.__harness.setHealth(100000, "p2"))
  await page.evaluate(() => window.__harness.fillEnergy())
  await frames(2)
  await page.evaluate(() => window.__harness.p1ForceHeavy())
  await frames(4)   // into the heavy's active frames
  const before = await p1p()
  await page.evaluate(() => window.__harness.enemyProjAtP1(60))   // hit Superman mid-heavy
  await frames(3)
  const afterHit = await p1p()
  ok(before.move === "heavy", `Super Armor setup: not in heavy (move=${before.move})`)
  ok(afterHit.hitstun === 0, `Super Armor: Superman flinched (hitstun=${afterHit.hitstun})`)
  ok(afterHit.health < before.health, `Super Armor: took no damage (should still take it) (${before.health}→${afterHit.health})`)
  ok(afterHit.armorCd > 0, `Super Armor: cooldown not set after absorb (cd=${afterHit.armorCd})`)

  // ─────────── FLIGHT ESCAPE (Special while combo'd) ───────────
  let fe = { ok: false }
  for (let attempt = 0; attempt < 5 && !fe.ok; attempt++) {
    await page.evaluate(() => { window.__harness.fillEnergy() })
    // wait for armor/esc cooldown + actionable
    for (let w = 0; w < 30 && (await p1p()).flEscCd > 0; w++) await frames(8)
    await frames(6)
    await page.evaluate(() => window.__harness.enemyProjAtP1(50))   // put Superman in hitstun
    await frames(2)
    const stun = await p1p()
    if (stun.hitstun <= 0) { await frames(10); continue }
    const eBefore = stun.solarE
    await page.keyboard.down("l"); await frames(3); await page.keyboard.up("l")
    await frames(4)
    const esc = await p1p()
    if (esc.hitstun === 0 && (esc.invuln > 0 || !esc.onGround) && esc.flEscCd > 0 && esc.solarE <= eBefore - 20) {
      fe = { ok: true, esc, eBefore }
    } else { await frames(20) }
  }
  ok(fe.ok, `Flight Escape did not burst out of the combo (${JSON.stringify(fe.esc || {})})`)

  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  SUPERMAN DEFENSE: ${passed} passed, ${failed} failed`)
  console.log(`  X-Ray: full-HP dmg=${dmgFull} vs sub-25% dmg=${dmgLow} (+${dmgLow - dmgFull})`)
  console.log(`  Super Armor: flinch=${(await p1p()).hitstun > 0 ? "yes" : "no"} (absorbed), armorCd set`)
  console.log(`  Flight Escape: ${fe.ok ? "burst OK" : "FAILED"}${fe.ok ? ` (energy ${fe.eBefore}→${fe.esc.solarE}, invuln=${fe.esc.invuln}, flying=${!fe.esc.onGround})` : ""}`)
  console.log(`  JS-exceptions=${jsErrors.length}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e)); failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
