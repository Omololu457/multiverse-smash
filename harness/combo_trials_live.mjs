// harness/combo_trials_live.mjs
// LIVE verification of Combo Trials in the real game (Playwright): boot via the harness,
// arm a trial (which starts a training session + a stationary dummy), land the REAL combo
// with keyboard input, and confirm the observer flips to PASS. Covers 3 characters + a
// wrong-input FAIL, and confirms the select-screen menu wiring.
import { chromium } from "playwright"
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const HEADED = process.env.HEADED === "1"
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json" }
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0])
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath)
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("nf"); return } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data) })
  })
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)))
}
let PASS = 0, FAIL = 0
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`) }
function section(t) { console.log(`\n── ${t} ─────────────────────────────`) }

const server = await startServer()
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))

const state = () => page.evaluate(() => window.__harness.state())
const info  = () => page.evaluate(() => window.__harness.comboTrials.info())
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }) }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); await waitFrames(2) }

const KEY = { light: "j", heavy: "k", up: "i", jump: "w", down: "s" }
const p1 = () => page.evaluate(() => { const f = window.__harness.p1(); return { attacking: f.attacking, grounded: f.grounded, combo: f.comboCounter } })
async function reseat(gap) { const x = await page.evaluate(() => window.__harness.p1().x); await page.evaluate((v) => window.__harness.setP2X(v), x + gap) }
async function tapKey(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key) }
async function waitAttackDone(ms = 900) { try { await page.waitForFunction(() => !window.__harness.p1().attacking, null, { timeout: ms, polling: 16 }) } catch (_) {} }

async function armAndFace(char, trialId, gap = 34) {
  await page.evaluate(([c, t]) => window.__harness.comboTrials.arm(c, t), [char, trialId])
  await page.evaluate(() => window.__harness.skipToBattle())
  await waitFrames(4)
  await reseat(gap)
  await waitFrames(2)
}

// Land the UNIVERSAL AIR ROUTE (seq[0]==="up" launcher, then air normals). The dummy never
// blocks and comboCounter only drops after a 90-frame lapse, so each move just needs to CONNECT
// within range: launch grounded, then liftP1 airborne + re-seat + air/down_air for each follow-up.
// Retries the whole string a few times; returns info once status==="pass".
async function comboCount() { return (await p1()).combo }
async function landAirCombo(seq, tries = 8) {
  let last = null
  for (let t = 0; t < tries; t++) {
    await page.evaluate(() => window.__harness.comboTrials.reset())
    await waitFrames(3)
    // Land the launcher FIRST (retry positioning until it connects — combo must reach 1 on "up",
    // else a following air normal would register as the wrong opening move).
    let launched = false
    for (let k = 0; k < 4 && !launched; k++) {
      await reseat(22)
      await tapKey(KEY.up, 2)
      await waitFrames(4)
      if ((await comboCount()) >= 1) launched = true
    }
    if (!launched) { await waitFrames(20); continue }
    await waitAttackDone()
    let ok = true
    for (let i = 1; i < seq.length && ok; i++) {
      const before = await comboCount()
      // retry each air follow-up until it connects (combo climbs)
      for (let k = 0; k < 3; k++) {
        await page.evaluate(() => window.__harness.liftP1(46))   // P1 airborne near the launched dummy
        await reseat(22)
        await waitFrames(1)
        if (seq[i] === "down_air") { await page.keyboard.down(KEY.down); await tapKey(KEY.light, 2); await page.keyboard.up(KEY.down) }
        else { await tapKey(KEY.light, 2) }   // air normal
        await waitAttackDone()
        if ((await comboCount()) > before) break
      }
      if ((await comboCount()) <= before) ok = false
    }
    await waitFrames(3)
    last = await info()
    if (last && last.status === "pass") return last
    await waitFrames(20)
  }
  return last
}
const landSequence = landAirCombo

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)

  section("MENU WIRING — select screen opens + lists trials")
  const opened = await page.evaluate(() => window.__harness.comboTrials.open())
  check("select screen state = comboTrials", opened.state === "comboTrials", opened.state)
  const chars = await page.evaluate(() => window.__harness.comboTrials.chars())
  check("8 trial characters exposed", chars.length === 8, `n=${chars.length}`)

  section("TRIAL 1 — Goku  Sky Launch [up → air]")
  await armAndFace("goku", "goku_1")
  let armed = await info()
  check("armed with goku_1", armed && armed.name === "Sky Launch", armed && armed.name)
  const tr = await page.evaluate(() => window.__harness.training())
  check("training session booted (mode=training)", tr.mode === "training" && tr.enabled, `mode=${tr.mode} enabled=${tr.enabled}`)
  check("dummy is stationary (stand)", tr.dummyBehavior === "stand", tr.dummyBehavior)
  const t1 = await landSequence(["up", "air"])
  check("Goku [up→air] cleared", t1 && t1.status === "pass", t1 && `${t1.status} landed=${t1.landed}`)
  check("earned ≥1 star", t1 && t1.lastStars >= 1, t1 && `stars=${t1.lastStars}`)

  section("TRIAL 2 — Naruto  Air Spike [up → air → down_air]")
  await armAndFace("naruto", "naruto_2")
  const t2 = await landSequence(["up", "air", "down_air"])
  check("Naruto [up→air→down_air] cleared", t2 && t2.status === "pass", t2 && `${t2.status} landed=${t2.landed}`)

  section("TRIAL 3 — Gon  Air Spike [up → air → down_air]")
  await armAndFace("gon", "gon_2")
  const t3 = await landSequence(["up", "air", "down_air"])
  check("Gon [up→air→down_air] cleared", t3 && t3.status === "pass", t3 && `${t3.status} landed=${t3.landed}`)

  section("FAIL DETECTION — wrong move breaks the string")
  await armAndFace("goku", "goku_2")   // expects [up, air, down_air]
  // launch, then a WRONG 2nd move (down_air instead of air) → fail
  await reseat(30); await tapKey(KEY.up, 2); await waitAttackDone()
  await page.evaluate(() => window.__harness.liftP1(46)); await reseat(24); await waitFrames(1)
  await page.keyboard.down(KEY.down); await tapKey(KEY.light, 2); await page.keyboard.up(KEY.down)
  await waitFrames(4)
  const bad = await info()
  check("wrong 2nd move = fail (not pass)", bad && bad.status !== "pass", bad && `status=${bad.status} landed=${bad.landed}`)

  check("no page JS errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "))
} catch (e) {
  console.error("EXCEPTION", e)
  FAIL++
} finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} combo-trials-live: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
