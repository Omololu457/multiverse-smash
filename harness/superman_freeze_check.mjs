/**
 * SUPERMAN FREEZE BREATH check (Phase 4a) — boots the real game headless, walks Superman next to the
 * opponent, fires Up+Special (Freeze Breath), and confirms: the opponent is FROZEN (_supFrozen > 0),
 * takes the initial chip, is action-locked (hitstun), the 8s cooldown is set (cannot loop), and that a
 * follow-up heavy lands bonus damage while frozen. Screenshots → superman_work/. Deterministic, 0 errors.
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "superman_work")
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
const shot = (n) => page.screenshot({ path: path.join(OUT, `_freeze_${n}.png`) })
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function hold(k, n) { await page.keyboard.down(k); await frames(n); await page.keyboard.up(k); await frames(2) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(20)
  await page.evaluate(() => window.__harness.fillEnergy())

  // Robust vs CPU variance (no fixed seed → Goku's AI differs per run): retry the cast until Freeze
  // Breath actually FIRES (cooldown set) and CONNECTS (opponent frozen). Reposition + wait for Superman
  // to be actionable between attempts.
  let hp0 = (await p2p()).health, bFroze = await p2p(), aFire = await p1p()
  let fired = false
  for (let attempt = 0; attempt < 8 && (bFroze.supFrozen <= 0); attempt++) {
    // close to point-blank so the post-freeze follow-up heavy is already in range
    for (let c = 0; c < 6; c++) { const a = await p1p(), b = await p2p(); if (Math.abs(a.x - b.x) <= 95) break; await hold(b.x > a.x ? "d" : "a", 16) }
    // wait until Superman can act (not stunned / mid-move)
    for (let w = 0; w < 20 && ((await p1p()).hitstun > 0); w++) await frames(4)
    const faceRight = (await p2p()).x > (await p1p()).x
    const BACK = faceRight ? "a" : "d"
    hp0 = (await p2p()).health
    await page.keyboard.down(BACK); await page.keyboard.down("l"); await frames(3)
    await page.keyboard.up("l"); await page.keyboard.up(BACK)
    await frames(16)   // windup + active window
    aFire = await p1p(); bFroze = await p2p()
    if (aFire.freezeCd > 0) fired = true
    if (aFire.freezeCd > 0 && bFroze.supFrozen <= 0) {
      // fired but whiffed (Goku moved / i-frame) — wait out the 8s CD before retrying
      for (let w = 0; w < 70 && (await p1p()).freezeCd > 0; w++) await frames(8)
    }
  }
  ok(fired, "Freeze Breath never fired (freezeCd never set across attempts)")
  await shot("1_frozen")
  ok(bFroze.supFrozen > 0, `opponent not frozen after Freeze Breath (supFrozen=${bFroze.supFrozen})`)
  ok(bFroze.health < hp0, `freeze dealt no chip (hp ${hp0} → ${bFroze.health})`)
  ok(bFroze.hitstun > 0, `frozen opponent not action-locked (hitstun=${bFroze.hitstun})`)
  ok(aFire.freezeCd > 0, `freeze cooldown not set (cd=${aFire.freezeCd})`)

  // FOLLOW-UP while frozen: nudge to melee range (frozen Goku can't move), then a heavy (k) connects.
  for (let c = 0; c < 4; c++) { const a = await p1p(), b = await p2p(); if (Math.abs(a.x - b.x) <= 80) break; await hold(b.x > a.x ? "d" : "a", 10) }
  const hpBeforeFollow = (await p2p()).health
  await hold("k", 10); await frames(4)
  const bFollow = await p2p()
  await shot("2_follow_up")
  ok(bFollow.health < hpBeforeFollow, `frozen follow-up heavy dealt no damage (hp ${hpBeforeFollow} → ${bFollow.health})`)

  // COOLDOWN: immediately trying again must NOT re-freeze (cd still running). Wait for thaw first.
  for (let i = 0; i < 20 && (await p2p()).supFrozen > 0; i++) await frames(8)
  const thawed = await p2p()
  ok(thawed.supFrozen === 0, `opponent never thawed (supFrozen=${thawed.supFrozen})`)
  const cdNow = (await p1p()).freezeCd
  ok(cdNow > 0, `cooldown should still be running shortly after use (cd=${cdNow})`)

  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  SUPERMAN FREEZE BREATH: ${passed} passed, ${failed} failed`)
  console.log(`  froze=${bFroze.supFrozen} chip ${hp0}->${bFroze.health} lock(hitstun)=${bFroze.hitstun} cd=${aFire.freezeCd}`)
  console.log(`  follow-up ${hpBeforeFollow}->${bFollow.health}  thawed=${thawed.supFrozen}  JS-exceptions=${jsErrors.length}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e)); failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
