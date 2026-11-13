// harness/green_arrow_blast_ground_check.mjs — Green Arrow explosions are BIGGER and GROUNDED: a drone kamikaze
// and an Arrowstorm (Super) bomb blast both plant their mushroom cloud on the floor and rise from it. Screenshots
// the blast frames; asserts the gaBlast FX bottom sits on the floor + 0 page errors.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SH = path.join(ROOT, "brutality_work", "shots", "ga_blast"); fs.mkdirSync(SH, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404); rs.end(); return } rs.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d) }) }); s.listen(0, () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(String(e)))
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m) } else { fail++; console.log("  ✗", m) } }
const st = () => page.evaluate(() => window.__harness.state())
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 4 }).catch(() => {}) }
const blasts = () => page.evaluate(() => (window.__harness.projectiles?.() || []).filter(p => p.name === "gaBlast" || p.type === "gaBlast").map(p => ({ y: p.y, bottom: p.spriteBottomY })))
try {
  await page.goto(`${base}/index.html?harness=1&p1=green_arrow&p2=zoro`, { waitUntil: "load" })
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {}); await wf(4)
  // ── drone kamikaze ──
  const n = await page.evaluate(() => window.__harness.gaSpawnDrone("overwatch")); await wf(30)
  const same = await page.evaluate(async () => { const m = await import("./drones.js"); return { n: m.activeDrones.length, h: window.__harness.gaDrones().length } })
  ok(same.n === same.h && same.n > 0, `live drones.js instance reachable (${JSON.stringify(same)})`)
  await page.evaluate(async () => { const m = await import("./drones.js"); for (const d of m.activeDrones) { d._retiring = "expire" } })
  const gy = await page.evaluate(() => { const f = window.__harness.buggyTest.raw("p1"); return f.groundY ?? (f.y + f.h) })
  let shot = 0, seenBottom = null
  for (let i = 0; i < 160 && shot < 4; i++) {
    await wf(1)
    const b = await page.evaluate(async () => { const m = await import("./abilities.js"); return (m.activeProjectiles || []).filter(p => (p.sheet || "").includes("green_arrow_explosion")).map(p => ({ y: Math.round(p.y), bottom: p.spriteBottomY, age: p.age || 0, sc: p.spriteScale })) })
    if (b.length) { if (seenBottom == null) seenBottom = b[0]; await page.screenshot({ path: path.join(SH, `kamikaze_${shot}.png`) }); shot++; await wf(3) }
  }
  ok(seenBottom != null, `kamikaze blast spawned ${JSON.stringify(seenBottom)}`)
  ok(seenBottom && seenBottom.bottom != null && Math.abs(seenBottom.bottom - gy) < 2, `kamikaze cloud planted on the floor (bottom ${seenBottom?.bottom} vs floor ${gy})`)
  ok(seenBottom && seenBottom.sc >= 2.8, `kamikaze cloud bigger (spriteScale ${seenBottom?.sc})`)
  // ── Arrowstorm bombs (munitions blasts) ──
  await page.evaluate(() => window.__harness.buggyTest.reset()); await wf(10)
  ok(await page.evaluate(() => window.__harness.gaSuper()), "Arrowstorm super fired")
  let mshot = 0, groundedSeen = null
  for (let i = 0; i < 400 && mshot < 4; i++) {
    await wf(2)
    const b = await page.evaluate(async () => { const m = await import("./munitions.js"); return m.__blastsForTest ? m.__blastsForTest() : null })
    if (b && b.length) { groundedSeen = groundedSeen || b[0]; await page.screenshot({ path: path.join(SH, `bomb_${mshot}.png`) }); mshot++; await wf(6) }
  }
  ok(groundedSeen && groundedSeen.grounded && Math.abs(groundedSeen.y - gy) < 2, `bomb blast planted on the floor ${JSON.stringify(groundedSeen)} (floor ${gy})`)
} catch (e) { console.error("EXCEPTION", e); fail++ }
ok(errs.length === 0, `0 page errors (${errs.slice(0, 2).join(" | ")})`)
console.log(`\nRESULT: ${pass}/${pass + fail} passed, ${fail} failed · shots → ${SH}`)
await browser.close(); server.close(); process.exit(fail ? 1 : 0)
