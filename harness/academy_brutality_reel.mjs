// harness/academy_brutality_reel.mjs — ACADEMY "Brutality Gallery" reel (Watch Brutalities).
// Opens the gallery for a character and verifies it auto-plays each finisher on a loop, that ◀/▶ jump works,
// and that exiting returns to the lesson page. Runs for gojo + tobirama (both gore-enabled).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SHOTS = path.join(ROOT, "brutality_work", "shots"); fs.mkdirSync(SHOTS, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".m4a": "audio/mp4", ".ogg": "audio/ogg" }
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(String(e)))
let PASS = 0, FAIL = 0; const ok = (c, m) => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${m}`) }
const st = () => page.evaluate(() => window.__harness.state())
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.academy); await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())

  for (const CH of ["gojo", "tobirama"]) {
    console.log(`\n── ${CH}: open gallery reel ──`)
    await page.evaluate(k => window.__harness.academy.openChar(k), CH)
    const start = await page.evaluate(() => window.__harness.academy.startReel())
    ok(start.ok && start.reel && start.total >= 4, `reel started: total=${start.total} state=${start.state}`)
    await wf(4)

    // watch it auto-advance: collect the distinct finisher names it plays over a span of frames
    const names = new Set()
    for (let i = 0; i < 6; i++) {
      await page.waitForFunction(() => { const r = window.__harness.academy.reelState(); return r && r.playing && r.name }, null, { timeout: 9000, polling: 16 }).catch(() => {})
      const r = await page.evaluate(() => window.__harness.academy.reelState())
      if (r?.name) names.add(r.name)
      if (i === 0) await page.screenshot({ path: path.join(SHOTS, `reel_${CH}.png`) })
      // let this clip end so the next arms
      await page.waitForFunction(() => !window.__harness.brutality.activeFinisher(), null, { timeout: 9000, polling: 16 }).catch(() => {})
      await wf(3)
    }
    ok(names.size >= 3, `auto-played multiple distinct finishers: ${names.size}  [${[...names].join(", ")}]`)

    console.log(`── ${CH}: ◀/▶ jump + exit ──`)
    const before = await page.evaluate(() => window.__harness.academy.reelState()?.idx)
    await page.evaluate(() => window.__harness.academy.reelJump(1)); await wf(2)
    const after = await page.evaluate(() => window.__harness.academy.reelState()?.idx)
    ok(after != null && after !== before, `▶ jumped clip: ${before} → ${after}`)
    const ex = await page.evaluate(() => window.__harness.academy.reelExit())
    ok(!ex.reel && ex.state === "academyChar", `exit → back to lesson page (reel cleared, state=${ex.state})`)
  }

  ok(errs.length === 0, `no page JS errors overall  [${errs.slice(0, 2).join(" | ")}]`)
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} academy-brutality-reel: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
