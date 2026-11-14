// PASS 2 Phase 0 AUDIT (temporary) — boot Green Arrow, fire real arrow inputs via keyboard,
// report whether projectiles actually spawn + render, and dump each drone's facing/native.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".ogg":"audio/ogg",".css":"text/css" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(e.message))
await page.goto(`${base}/index.html?harness=1&p1=green_arrow&p2=goku`, { waitUntil: "load" })
await page.waitForFunction(() => window.__harness && window.__harness.boot, null, { timeout: 15000 })
await page.mouse.click(640, 360); await page.waitForTimeout(150)
await page.evaluate(() => window.__harness.boot())
try { await page.evaluate(() => window.__harness.skipToBattle()) } catch (_) {}
try { await page.waitForFunction(() => window.__harness.spriteReady?.("p1")?.ready === true, { timeout: 12000, polling: 60 }) } catch (_) {}
await page.waitForTimeout(400)

const P = () => page.evaluate(() => (window.__harness.projectiles?.() || []).filter(p => /ga|arrow|green/i.test(p.name || "") || /green_arrow|firearrow|icearrow|plainarrow/i.test(p.sheet || "")))
const allP = () => page.evaluate(() => window.__harness.projectiles?.() || [])
const dbg = () => page.evaluate(() => { const f = window.__harness.p1Raw ? window.__harness.p1Raw() : null; return null })

console.log("JS errors at boot:", errs.length, errs[0] || "")

// qcf + Light (plain shot): s(down) -> d(forward) -> j(light, hold to charge) -> release
async function qcfLight() {
  await page.keyboard.down("s"); await page.waitForTimeout(40); await page.keyboard.up("s")
  await page.keyboard.down("d"); await page.waitForTimeout(40)
  await page.keyboard.down("j"); await page.waitForTimeout(120); await page.keyboard.up("j")
  await page.waitForTimeout(100); await page.keyboard.up("d")
}
// qcf + Heavy (fire arrow): s -> d -> k
async function qcfHeavy() {
  await page.keyboard.down("s"); await page.waitForTimeout(40); await page.keyboard.up("s")
  await page.keyboard.down("d"); await page.waitForTimeout(40)
  await page.keyboard.down("k"); await page.waitForTimeout(40); await page.keyboard.up("k")
  await page.waitForTimeout(80); await page.keyboard.up("d")
}

await qcfLight(); await page.waitForTimeout(100)
const afterPlain = await P(); const afterPlainAll = await allP()
console.log("\n[PLAIN qcf+Light] GA projectiles:", afterPlain.length, "| total projectiles:", afterPlainAll.length)
if (afterPlainAll.length) console.log("  sample:", JSON.stringify(afterPlainAll.slice(0,2)))

await page.waitForTimeout(300)
await qcfHeavy(); await page.waitForTimeout(120)
const afterFire = await P(); const afterFireAll = await allP()
console.log("[FIRE qcf+Heavy] GA projectiles:", afterFire.length, "| total:", afterFireAll.length)
if (afterFireAll.length) console.log("  sample:", JSON.stringify(afterFireAll.slice(0,3)))

// Drone facing audit: spawn each, read facing from gaDrones2 if present else gaDrones
for (const type of []) {
  await page.evaluate(t => window.__harness.gaSpawnDrone?.(t), type)
  await page.waitForTimeout(250)
  const d = await page.evaluate(() => (window.__harness.gaDrones?.() || [])[0] || null)
  console.log(`[DRONE ${type}] ${d ? JSON.stringify(d) : "NOT SPAWNED"}`)
}
console.log("\nTotal JS errors:", errs.length)
await browser.close(); server.close(); process.exit(0)
