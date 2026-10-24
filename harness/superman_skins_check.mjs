/**
 * SUPERMAN SKINS check — boots a match on each of Superman's 6 declared skins and confirms the recolored
 * sheets load (sprite renders, no superman_*__<tag>.png 404s). Alien X also seeds its starfield FX.
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = [], skin404 = new Set()
page.on("pageerror", e => jsErrors.push(String(e)))
page.on("response", r => { if (r.status() === 404 && /superman_[^"']*__[a-z]/.test(r.url())) skin404.add(r.url().split("/").pop()) })

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

const SKINS = ["supermanAlbedo", "supermanValkyrie", "supermanAlienX", "supermanCrimsonReversal", "supermanVerdantGuardian", "supermanObsidianSteel", "supermanGoldenSentinel", "supermanAzureDepths", "supermanVioletEclipse", "supermanFrostbound", "supermanAshfall", "supermanVoidSovereign", "supermanKingdomCome", "supermanBlackRecovery", "supermanRedSon", "supermanElectricBlue", "supermanNew52Suit", "supermanRegime", "supermanBizarro", "supermanCyborg"]

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })

  for (const skin of SKINS) {
    skin404.clear()
    const res = await page.evaluate((s) => window.__harness.bootSkin(s), skin)
    await frames(24)
    const snap = await page.evaluate(() => { const f = window.__harness.p1(); return { key: f.key, skinId: f.skinId, spr: f.hasSpriteHandler, ready: f.spriteReady, hp: f.health } })
    const ax = skin === "supermanAlienX" ? await page.evaluate(() => window.__harness.alienXFX("p1")) : null
    ok(snap.skinId === skin, `${skin}: skin not applied (got ${snap.skinId})`)
    ok(snap.spr && snap.ready !== false, `${skin}: sprite not rendering`)
    ok(snap.hp > 0, `${skin}: no health`)
    ok(skin404.size === 0, `${skin}: recolor sheets 404: ${[...skin404].slice(0, 4).join(", ")}`)
    if (ax) ok(ax.isAlienX && ax.seeded, `${skin}: Alien X starfield not seeded (isAlienX=${ax?.isAlienX} seeded=${ax?.seeded})`)
    console.log(`  ${skin}: sprite=${snap.spr} ready=${snap.ready} 404s=${skin404.size}${ax ? ` starfield=${ax.seeded}` : ""}`)
  }
  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  SUPERMAN SKINS: ${passed} passed, ${failed} failed`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e)); failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
