// harness/omololu_drones.test.mjs — Omololu "Drone Swarm" (Up+Ult): drones deploy, drop BOMBS (AOE), CRASH
// into the opponent (contact damage+knockback), and act as Flying-Raijin TELEPORT MARKERS omololu warps to.
// Verifies all 3 sub-mechanics connect live + the teleport repositions, and takes a mid-sequence screenshot.
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
const ok = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const frames = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }).catch(() => {}) }
const dstate = () => page.evaluate(() => window.__harness.omololu.drones.state("p1"))
const p2h = () => page.evaluate(() => Math.round(window.__harness.p2().health))

try {
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  // put the (stationary) opponent at a fixed reachable spot, healed, so both bombs + crashes can connect
  await page.evaluate(() => { window.__harness.setDummyBehavior("stand"); window.__harness.healP2?.(); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 200); window.__harness.setP2Invuln?.(0) })
  await frames(3)

  console.log("\n── deploy ─────────────────────────────")
  const dep = await page.evaluate(() => window.__harness.omololu.drones.trigger("p1"))
  await frames(3)
  const st0 = await dstate()
  ok("drones deploy on Up+Ultimate", dep?.active === true && st0.active === true && st0.drones.length === 4, `count=${st0.drones.length}`)
  ok("swarm has 2 bomb + 2 crash drones", st0.drones.filter(d => d.role === "bomb").length === 2 && st0.drones.filter(d => d.role === "crash").length === 2, st0.drones.map(d => d.role).join(","))
  await page.screenshot({ path: path.join(OUT, "OMOLOLU_drones_deploy.png") })

  console.log("\n── teleport-to-drone (Flying-Raijin markers) ─────────────────────────────")
  await frames(20)   // let drones fly out to their hover points (become reachable markers)
  const tp = await page.evaluate(() => window.__harness.omololu.drones.teleport("p1"))
  ok("teleport-to-drone warps omololu to a drone's position", tp?.ok === true && (tp.before.x !== tp.after.x || tp.before.y !== tp.after.y), `before=${JSON.stringify(tp?.before)} after=${JSON.stringify(tp?.after)}`)

  console.log("\n── bomb (AOE) + crash (contact) connect over the window ─────────────────────────────")
  const hpBefore = await p2h()
  // run the swarm window; keep the opponent pinned + vulnerable so bombs land + crash drones can dive in
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 150); window.__harness.setP2Invuln?.(0); window.__harness.healP2?.() })
    await frames(16)
    const s = await dstate(); if (!s.active) break
    if (s.bombHits > 0 && s.crashHits > 0) break
    if (i === 6) await page.screenshot({ path: path.join(OUT, "OMOLOLU_drones_midsequence.png") })
  }
  const st1 = await dstate()
  const hpAfter = await p2h()
  ok("a drone dropped a BOMB that connected (AOE damage)", st1.bombHits > 0, `bombHits=${st1.bombHits}`)
  ok("a drone CRASHED into the opponent (contact damage)", st1.crashHits > 0, `crashHits=${st1.crashHits}`)
  ok("the opponent took real damage from the swarm", hpAfter < hpBefore, `p2 hp ${hpBefore}→${hpAfter}`)

  ok("no JS errors across the run", jsErrors.length === 0, jsErrors[0] || "")
  console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`)
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++
} finally {
  await browser.close(); server.close()
  process.exit(FAIL ? 1 : 0)
}
