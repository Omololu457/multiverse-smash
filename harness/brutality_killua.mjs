// harness/brutality_killua.mjs — base Killua cinematic finishers (opt-in roll-out).
// Verifies the per-move BLOWs (lightningPalm→THUNDERHEAD, killua_yoyo→YO-YO) + the GODSPEED FLURRY TRAIT
// (_godspeedActive → real-sprite after-image barrage) resolve + render without a page error. Screenshots each.
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

const CASES = [["lightningPalm", "THUNDERHEAD", "electrocute"], ["killua_yoyo", "YO-YO", "yoyobisect"]]
try {
  await page.goto(`${base}/index.html?harness=1&p1=killua&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness); await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())
  await page.evaluate(() => window.__harness.skipToBattle())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {})
  await wf(4)
  await page.evaluate(() => { window.__harness.brutality.setBrutality(true); window.__harness.brutality.setBlood(true) })

  console.log("\n── finisherFor resolution (move BLOWs) ──")
  for (const [move, name, gore] of CASES) {
    const r = await page.evaluate(m => window.__harness.brutality.finisherFor("killua", m), move)
    ok(r.name === name && r.gore === gore && !r.klassic, `${move} → ${name} (${gore})  [got ${r.name}/${r.gore}]`)
  }
  console.log("\n── live TRIGGER each renderer ──")
  for (const [move, name, gore] of CASES) {
    const before = errs.length
    const started = await page.evaluate(m => window.__harness.brutality.trigger("p1", true, m), move)
    await wf(2)
    const af = await page.evaluate(() => window.__harness.brutality.activeFinisher())
    ok(started && af && af.name === name && af.gore === gore, `${move} → ${name} (${gore})  [got ${af?.name}/${af?.gore}]`)
    await wf(80); await page.screenshot({ path: path.join(SHOTS, `killua_${gore}.png`) })
    await page.waitForFunction(() => !window.__harness.brutality.activeFinisher(), null, { timeout: 9000, polling: 16 }).catch(() => {})
    ok(errs.length === before, `${gore}: 0 page errors  [${errs.slice(before, before + 1).join(" | ")}]`)
    await page.evaluate(() => window.__harness.skipToBattle?.()); await wf(2)
    await page.evaluate(() => { const p2 = window.__harness.p2(); if (p2) p2.health = p2.maxHealth })
  }
  console.log("\n── GODSPEED FLURRY trait (_godspeedActive → ANY kill plays the flurry) ──")
  {
    const before = errs.length
    await page.evaluate(() => window.__harness.brutality.setTrait("_godspeedActive", true, "p1"))
    const started = await page.evaluate(() => window.__harness.brutality.trigger("p1", true, "light"))   // light would be nothing; the Godspeed trait wins
    await wf(2)
    const af = await page.evaluate(() => window.__harness.brutality.activeFinisher())
    ok(started && af && af.name === "GODSPEED FLURRY" && af.gore === "godspeedflurry", `trait → GODSPEED FLURRY (godspeedflurry)  [got ${af?.name}/${af?.gore}]`)
    await wf(48); await page.screenshot({ path: path.join(SHOTS, `killua_godspeedflurry_mid.png`) })   // mid-storm (after-images)
    await wf(34); await page.screenshot({ path: path.join(SHOTS, `killua_godspeedflurry.png`) })        // detonation
    await page.waitForFunction(() => !window.__harness.brutality.activeFinisher(), null, { timeout: 9000, polling: 16 }).catch(() => {})
    ok(errs.length === before, `godspeedflurry: 0 page errors  [${errs.slice(before, before + 1).join(" | ")}]`)
  }
  ok(errs.length === 0, `no page JS errors overall  [${errs.slice(0, 2).join(" | ")}]`)
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} brutality-killua: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
