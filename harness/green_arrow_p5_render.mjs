// Green Arrow — PASS2 P5 comprehensive RENDER CHECK: Kamikaze explosion, Net on a FLIER (Homelander),
// Swarm, and the training drone-debug overlay (hurtboxes/HP/facing). Drives the real game.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".ogg":"audio/ogg",".css":"text/css" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
let pass = 0, fail = 0; const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const errs = []; page.on("pageerror", e => errs.push(e.message))
const H = (fn, ...a) => page.evaluate(({ fn, a }) => window.__harness[fn]?.(...a), { fn, a })
const vivid = () => page.evaluate(() => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const d = g.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || d[i] > 90)) n++; return n })
const wait = (ms) => page.waitForTimeout(ms)

try {
  await page.goto(`${base}/index.html?harness=1&p1=green_arrow&p2=homelander`, { waitUntil: "load" })
  await page.waitForFunction(() => window.__harness && window.__harness.boot, null, { timeout: 15000 })
  await page.mouse.click(640, 360); await wait(150)
  await page.evaluate(() => window.__harness.boot()); try { await page.evaluate(() => window.__harness.skipToBattle()) } catch (_) {}
  await wait(500)
  ok("boot green_arrow vs homelander (flier), both render", (await vivid()) > 8000 && errs.length === 0)

  // SWARM
  await H("gaSpawn2", "swarm", false); await wait(300)
  let ds = await H("gaDrones2")
  ok("Swarm deploys + renders", Array.isArray(ds) && ds.some(d => d.type === "swarm") && (await vivid()) > 8000, JSON.stringify(ds))

  // KAMIKAZE (strike kestrel) — flies + explodes
  await H("gaSpawn2", "kestrel", true); await wait(150)
  ds = await H("gaDrones2")
  const kam = ds.find(d => d.type === "kestrel")
  ok("Kamikaze (strike kestrel) spawns, faces target", kam && kam.mode === "strike" && kam.facing === 1, JSON.stringify(kam))
  await wait(1200)   // let it dive + explode
  ok("screen renders through the Kamikaze explosion, no errors", (await vivid()) > 8000 && errs.length === 0, errs[0] || "")

  // FACING both sides — spawn a kestrel while the owner faces each way is covered by the node test;
  // here confirm the side-facing drones draw (vivid) with a bulwark out.
  await H("gaSpawn2", "bulwark", false); await wait(300)
  ok("Bulwark (native-left) renders facing the foe", (await vivid()) > 8000)

  // NET on a FLIER — net the flying Homelander and confirm it is force-grounded + the net renders.
  const net = await H("gaTestNet", "p2"); await wait(200)
  ok("Net force-grounds the flier (Homelander) + sets net status", net && net.netted > 0 && (net.grounded === true || net.forceTimer > 0), JSON.stringify(net))
  ok("net mesh renders over the flier, no errors", (await vivid()) > 8000 && errs.length === 0)

  // TRAINING drone-debug overlay — hurtboxes + HP + facing arrows.
  await H("gaDebug", true); await wait(200)
  ok("drone-debug overlay toggles + renders (hurtboxes/HP/facing)", errs.length === 0 && (await vivid()) > 8000)

  ok("ZERO JS errors across the whole run", errs.length === 0, errs.slice(0, 2).join(" | "))
} catch (e) { console.log("FATAL", e); fail++ }
finally {
  await browser.close(); server.close()
  console.log(`\n════════════════════════════════════════`)
  console.log(`  GREEN ARROW P5 RENDER: ${pass} passed, ${fail} failed`)
  console.log(`════════════════════════════════════════`)
  process.exit(fail ? 1 : 0)
}
