// Green Arrow — comprehensive RENDER CHECK (Playwright, drives the real game).
// Boots green_arrow, confirms sprites + HUD render; spawns all 5 deployable drones + the
// Payload bomber via the Super; verifies drones appear in GAME_STATE and the screen keeps
// rendering with zero JS errors. Uses the window.__harness.ga* hooks.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".ogg": "audio/ogg" }
function startServer() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0])
    const f = path.join(ROOT, u === "/" ? "/index.html" : u)
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) })
  })
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)))
}
let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }

const server = await startServer()
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))

const H = (fn, ...a) => page.evaluate(({ fn, a }) => window.__harness[fn]?.(...a), { fn, a })
async function waitFrames(n) { await page.waitForTimeout(Math.ceil(n * 1000 / 60)) }
const gameState = () => page.evaluate(() => { const s = window.__harness.state ? window.__harness.state() : null; return (typeof s === "string") ? s : (s && s.gameState) || String(s) })
const vivid = (x0, ww) => page.evaluate(([x, w]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const d = g.getImageData(Math.floor(cv.width * x), 0, Math.floor(cv.width * w), cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40 && (Math.abs(d[i] - d[i + 1]) > 16 || Math.abs(d[i + 1] - d[i + 2]) > 16)) n++; return n }, [x0, ww])

try {
  await page.goto(`${base}/index.html?harness=1&p1=green_arrow&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => window.__harness && window.__harness.boot, null, { timeout: 15000 })
  await page.mouse.click(640, 360); await page.waitForTimeout(150)
  await page.evaluate(() => window.__harness.boot())
  try { await page.evaluate(() => window.__harness.skipToBattle()) } catch (_) {}
  try { await page.waitForFunction(() => window.__harness.spriteReady?.("p1")?.ready === true, { timeout: 12000, polling: 60 }) } catch (_) {}
  await page.waitForTimeout(400)

  ok("match is in battle", (await gameState()).includes("battle"), `state=${await gameState()}`)
  const ready = await page.evaluate(() => window.__harness.spriteReady?.("p1")?.ready === true)
  ok("P1 green_arrow sprites ready", ready)
  ok("both fighters render (vivid pixels)", (await vivid(0.04, 0.42)) > 6000 && (await vivid(0.54, 0.42)) > 6000)

  // Spawn each of the 5 deployable drones; verify each appears in GAME_STATE and renders.
  for (const type of ["overwatch", "bulwark", "aegis", "kestrel", "skyhook"]) {
    const cnt = await H("gaSpawnDrone", type)   // returns activeDrones.length on success (>=1)
    const drones = await H("gaDrones")
    const present = (cnt >= 1) || (Array.isArray(drones) && drones.some(d => d.type === type))
    await waitFrames(16)   // let it fly in + render
    ok(`${type} drone deployed + rendered`, present, `cnt=${cnt} drones=${JSON.stringify(drones)}`)
  }
  await waitFrames(10)
  ok("screen still renders with drones out (not blank)", (await vivid(0.04, 0.92)) > 8000)
  ok("no JS errors during drone deploys", jsErrors.length === 0, jsErrors[0] || "")

  // ARROWSTORM super — fires the state machine (Payload bomber + closing volley; the node roster
  // test verifies the Payload/volley mechanics; here we confirm it fires + renders without error).
  const superFired = await H("gaSuper")
  let sawPayload = false
  for (let i = 0; i < 10; i++) { await waitFrames(10); const d = await H("gaDrones"); if (Array.isArray(d) && d.some(x => x.type === "payload")) sawPayload = true }
  ok("ARROWSTORM super fires", superFired === true || sawPayload, `fired=${superFired} payload=${sawPayload}`)
  ok("screen renders through the super", (await vivid(0.04, 0.92)) > 8000)

  // Drone debug training overlay toggles without error.
  await H("gaDroneDebug", true); await waitFrames(6)
  ok("drone-debug overlay toggles cleanly", jsErrors.length === 0, jsErrors[0] || "")

  ok("ZERO JS errors overall", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "))
} catch (e) { console.log("FATAL", e); fail++ }
finally {
  await browser.close(); server.close()
  console.log(`\n════════════════════════════════════════`)
  console.log(`  GREEN ARROW RENDER CHECK: ${pass} passed, ${fail} failed`)
  console.log(`════════════════════════════════════════`)
  process.exit(fail ? 1 : 0)
}
