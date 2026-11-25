// harness/creative_skins_live.mjs — roster-wide CREATIVE skins (creativeSkins.js) applied in a real match: sprite decodes idle / walk / attack, no JS errors.
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
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const frames = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
const { SKINS } = await import(path.join(ROOT, "skins.js"))
const SHOTS = path.join(OUT, "creative_skins"); fs.mkdirSync(SHOTS, { recursive: true })
const PICK = { naruto: 3, batman: 2, megumi_fushiguro: 2, baki: 2, goku: 2, spiderman: 2, arlong: 2, hashirama: 2 }
try {
  for (const [key, n] of Object.entries(PICK)) {
    const list = (SKINS[key] || []).filter(s => s.classification === "Creative").slice(0, n)
    await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=obito`, { waitUntil: "load", timeout: 180000 })
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 120000 })
    await page.mouse.click(20, 20)
    await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
    for (const s of list) {
      await page.evaluate(id => window.__harness.bootSkin(id, "default"), s.id)
      try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 30000, polling: 50 }) } catch (_) {}
      await frames(6)
      const st = await page.evaluate(() => ({ id: window.__harness.p1()?.skinId, ready: window.__harness.spriteReady("p1")?.ready === true }))
      await page.keyboard.down("d"); await frames(10); await page.keyboard.up("d"); await page.keyboard.press("j"); await frames(5)
      const atk = await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true)
      await page.screenshot({ path: path.join(SHOTS, `${s.id}.png`) })
      check(`${key} ${s.name}: applies + renders idle / walk / attack`, st.id === s.id && st.ready && atk, `skinId=${st.id} ready=${st.ready}/${atk}`)
    }
  }
  check("no JS errors across the run", jsErrors.length === 0, jsErrors[0] || "")
} catch (e) { check("run completed", false, String(e).slice(0, 200)) }
await browser.close(); server.close()
console.log(`\n  CREATIVE SKINS LIVE: ${PASS} passed, ${FAIL} failed`); process.exit(FAIL ? 1 : 0)
