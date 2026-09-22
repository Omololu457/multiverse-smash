// harness/omololu_scale_measure.mjs — measure the ACTUAL on-screen rendered sprite height (drawH) of
// omololu vs a spread of roster reference characters, to judge whether omololu's spriteScale is in-band.
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

async function measure(key) {
  await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=${key}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  // let a few idle frames render so _lastDrawH is populated
  const s0 = await page.evaluate(() => window.__harness.state().frame)
  await page.waitForFunction(f => window.__harness.state().frame >= f + 10, s0, { timeout: 8000, polling: 16 }).catch(() => {})
  return await page.evaluate(() => { const p = window.__harness.p1(); const c = window.__harness.charDef ? window.__harness.charDef(p.key) : null; return { key: p.key, drawH: Math.round(p.drawH), drawW: Math.round(p.drawW), scale: c?.spriteScale ?? null } })
}

const REFS = ["goku", "naruto", "sasuke", "itachi", "madara", "obito", "gojo", "sukuna", "omololu"]
const rows = []
for (const k of REFS) { try { rows.push(await measure(k)) } catch (e) { rows.push({ key: k, err: String(e).slice(0, 60) }) } }

console.log("\n  char        scale    drawW   drawH")
console.log("  ─────────────────────────────────────")
for (const r of rows) {
  if (r.err) { console.log(`  ${r.key.padEnd(11)} ERR ${r.err}`); continue }
  console.log(`  ${r.key.padEnd(11)} ${String(r.scale).padEnd(7)} ${String(r.drawW).padEnd(6)} ${String(r.drawH)}`)
}
const playable = rows.filter(r => !r.err && r.drawH > 0 && r.key !== "omololu")
const hs = playable.map(r => r.drawH).sort((a, b) => a - b)
const median = hs[Math.floor(hs.length / 2)]
const omo = rows.find(r => r.key === "omololu")
console.log(`\n  reference drawH range: ${hs[0]}–${hs[hs.length - 1]} (median ${median})`)
console.log(`  omololu drawH: ${omo?.drawH}  → ${omo?.drawH >= hs[0] - 12 && omo?.drawH <= hs[hs.length - 1] + 12 ? "IN-BAND" : "OUT OF BAND"}`)
await browser.close(); server.close()
