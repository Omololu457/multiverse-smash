// harness/overnight_render_check.mjs — reusable per-phase RENDER CHECK for the overnight polish run.
// Boots the game, starts a real match, and confirms BOTH fighters + the HUD render with 0 page errors.
//   node harness/overnight_render_check.mjs [p1] [p2]
// Exit 0 = PASS. Used as the render gate before every phase commit.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const P1 = process.argv[2] || "gojo", P2 = process.argv[3] || "sukuna"
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".json":"application/json",".ogg":"audio/ogg",".png":"image/png",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".css":"text/css",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(e.message))
await page.goto(`${base}/index.html?harness=1&p1=${P1}&p2=${P2}`, { waitUntil: "load" })
await page.waitForFunction(() => window.__harness && window.__harness.boot, null, { timeout: 15000 })
await page.mouse.click(640, 360); await page.waitForTimeout(150)
await page.evaluate(() => window.__harness.boot())
try { await page.evaluate(() => window.__harness.skipToBattle()) } catch (_) {}
try { await page.waitForFunction(() => window.__harness.spriteReady?.("p1")?.ready === true, { timeout: 12000, polling: 60 }) } catch (_) {}
await page.waitForTimeout(400)
const vivid = (x0, ww) => page.evaluate(([x, w]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const W = cv.width, H = cv.height; const d = g.getImageData(Math.floor(W * x), 0, Math.floor(W * w), H).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || Math.abs(d[i+1]-d[i+2]) > 16 || d[i] > 90)) n++ } return n }, [x0, ww])
const left = await vivid(0.04, 0.42), right = await vivid(0.54, 0.42)
const hud = await page.evaluate(() => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const d = g.getImageData(0, 0, cv.width, 70).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (d[i+1] > 120 || d[i] > 120)) n++ } return n })
const state = await page.evaluate(() => { const s = window.__harness.state ? window.__harness.state() : null; return (typeof s === "string") ? s : (s && s.gameState) || String(s) })
const pass = errs.length === 0 && left > 6000 && right > 6000 && hud > 2000
console.log(`RENDER CHECK (${P1} vs ${P2}): state=${state} p1=${left>6000}(${left}) p2=${right>6000}(${right}) HUD=${hud>2000}(${hud}) pageErrors=${errs.length} => ${pass ? "✅ PASS" : "❌ FAIL"} ${errs[0] || ""}`)
await browser.close(); server.close()
process.exit(pass ? 0 : 1)
