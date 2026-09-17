// harness/frame_advantage_live.mjs
// LIVE verification of the Training-mode FRAME ADVANTAGE readout (Track B). Lands real moves on
// a standing (on-hit) and a blocking (on-block) dummy and checks the displayed advantage tracks
// the game's REAL frame data: value === stun − recovery, on-hit stun > on-block stun (hitstun >
// blockstun), and a heavier move imparts more hitstun than a light. Display-layer only.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
function startServer() {
  const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) })
  return new Promise(r => s.listen(0, "127.0.0.1", () => r(s)))
}
let PASS = 0, FAIL = 0
function check(n, c, d = "") { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`) }
function section(t) { console.log(`\n── ${t} ─────────────────────────────`) }

const server = await startServer()
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
const state = () => page.evaluate(() => window.__harness.state())
const training = () => page.evaluate(() => window.__harness.training())
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }) }
async function reseat(gap) { const x = await page.evaluate(() => window.__harness.p1().x); await page.evaluate((v) => window.__harness.setP2X(v), x + gap) }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); await waitFrames(2) }

// Land `key` and return the fresh advantage capture (waits for the stored frame to advance).
// For on-block we SETTLE the guard first (hold it >4 frames) so the hit lands on a stale guard =
// NORMAL block, not a flawless block — the representative case a player practises block-strings on.
async function landAndRead(key, behavior, gap = 46, tries = 8) {
  await page.evaluate((b) => window.__harness.setDummyBehavior(b), behavior)
  if (behavior === "block") await waitFrames(14)   // let the guard go stale (past the flawless window)
  const prevFrame = (await training()).advantage?.frame ?? -1
  for (let t = 0; t < tries; t++) {
    await reseat(gap)
    await tap(key, 2)
    await waitFrames(4)
    const a = (await training()).advantage
    if (a && a.frame !== prevFrame) return a
  }
  return (await training()).advantage
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot())
  await page.evaluate(() => window.__harness.skipToBattle())
  await waitFrames(4)
  await page.evaluate(() => window.__harness.setSession && window.__harness.setSession({ infiniteResources: true }))

  section("BASELINE — no advantage until a move connects")
  check("training exposes an advantage slot", "advantage" in (await training()))

  section("ON HIT — light on a standing dummy")
  const lh = await landAndRead("j", "stand")
  check("advantage captured on hit", !!lh, JSON.stringify(lh))
  check("flagged on HIT (not block)", lh && lh.onBlock === false, lh && `onBlock=${lh.onBlock}`)
  check("value === stun − recovery (arithmetic identity)", lh && lh.value === lh.stun - lh.recovery, lh && `${lh.value} === ${lh.stun}−${lh.recovery}`)
  check("on-hit stun ≈ light hitstun (12) w/ scale", lh && lh.stun >= 11 && lh.stun <= 20, lh && `stun=${lh.stun}`)

  section("ON BLOCK — same light on a blocking dummy")
  const lb = await landAndRead("j", "block")
  check("advantage captured on block", !!lb, JSON.stringify(lb))
  check("flagged on BLOCK", lb && lb.onBlock === true, lb && `onBlock=${lb.onBlock}`)
  check("value === stun − recovery (identity)", lb && lb.value === lb.stun - lb.recovery, lb && `${lb.value}=${lb.stun}−${lb.recovery}`)
  check("normal blockstun (~8-12, not flawless)", lb && lb.stun >= 6 && lb.stun <= 14, lb && `blockstun=${lb.stun}`)
  check("blockstun < hitstun (block stun lower than hit)", lb && lh && lb.stun < lh.stun, `block=${lb?.stun} hit=${lh?.stun}`)
  check("advantage WORSE on block than on hit", lb && lh && lb.value < lh.value, `block=${lb?.value} hit=${lh?.value}`)

  section("MOVE TYPE — heavy imparts more hitstun than light (on hit)")
  const hh = await landAndRead("k", "stand")
  check("heavy advantage captured on hit", !!hh && hh.onBlock === false, JSON.stringify(hh))
  check("heavy hitstun > light hitstun", hh && lh && hh.stun > lh.stun, `heavy=${hh?.stun} light=${lh?.stun}`)
  check("heavy value === stun − recovery (identity)", hh && hh.value === hh.stun - hh.recovery, hh && `${hh.value}=${hh.stun}−${hh.recovery}`)

  check("no page JS errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "))
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} frame-advantage-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
