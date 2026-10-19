// harness/brutality_batch_shots.mjs — visual capture of the new batch (Goku Black / Sasuke×3 / Naruto Seventh)
// at the HERO beat of each finisher. Pass/fail is covered by brutality.test; this is screenshots + 0-error checks.
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
async function wf(n) { const s = (await page.evaluate(() => window.__harness.state())).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function boot(key) {
  await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness); await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())
  await page.evaluate(() => window.__harness.skipToBattle())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {})
  await wf(4); await page.evaluate(() => { window.__harness.brutality.setBrutality(true); window.__harness.brutality.setBlood(true) })
}
// [rosterKey, [ [move, shotName, heroFrame], ... ] ]
const PLAN = [
  ["goku_rose", [["roseScythe", "gokurose_godsplitcut", 72], ["roseKameha", "gokurose_blackkameha", 70]]],
  ["sasuke", [["susanooSword", "sasuke_susanoo", 78], ["up", "sasuke_kirin", 78]]],
  ["sasuke_adult", [["amaterasu", "sasukeadult_amaterasu", 85], ["saChibakuTensei", "sasukeadult_chibaku", 80]]],
  ["naruto_seventh", [["up", "naruto_uzumakibarrage_mid", 55], ["up", "naruto_uzumakibarrage_slam", 118]]],
]
try {
  for (const [key, cases] of PLAN) {
    await boot(key)
    for (const [move, name, frame] of cases) {
      const before = errs.length
      await page.evaluate(m => window.__harness.brutality.trigger("p1", true, m), move)
      await wf(frame); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
      await page.waitForFunction(() => !window.__harness.brutality.activeFinisher(), null, { timeout: 9000, polling: 16 }).catch(() => {})
      ok(errs.length === before, `${name}: 0 page errors  [${errs.slice(before, before + 1).join(" | ")}]`)
      await page.evaluate(() => window.__harness.skipToBattle?.()); await wf(2)
      await page.evaluate(() => { const p2 = window.__harness.p2(); if (p2) p2.health = p2.maxHealth })
    }
  }
  ok(errs.length === 0, `no page errors overall  [${errs.slice(0, 2).join(" | ")}]`)
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally { await browser.close(); server.close(); console.log(`\n${FAIL === 0 ? "✅" : "❌"} batch-shots: ${PASS} passed, ${FAIL} failed`); process.exit(FAIL === 0 ? 0 : 1) }
