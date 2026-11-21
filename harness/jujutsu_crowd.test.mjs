// harness/jujutsu_crowd.test.mjs — Jujutsu High: the watching crowd (JJK characters + skinned multiverse visitors) in a real match.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".ogg": "audio/ogg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on("pageerror", e => errors.push(String(e)))
const sleep = t => new Promise(r => setTimeout(r, t))
const STAGE = "Jujutsu High Courtyard", OUT = path.join(ROOT, "harness", "shots", "jujutsu_crowd"); fs.mkdirSync(OUT, { recursive: true })
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=yuji&p2=gojo`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(n => window.__harness.selectStageByName(n), STAGE)
  await page.evaluate(() => window.__harness.start())
  const idx0 = await page.evaluate(n => window.__harness.selectStageByName("__none__").have.indexOf(n), STAGE)
  await page.evaluate(i => window.__harness.showMenu("SELECT_STAGE", i), idx0); await sleep(300)
  const cx = 115 + (idx0 % 6) * 210, cy = 215 + Math.floor(idx0 / 6) * 130
  await page.mouse.move(cx, cy); await sleep(150); await page.mouse.click(cx, cy); await sleep(2500)
  await page.evaluate(() => window.__harness.skipToBattle()); await sleep(4000)
  const C = await page.evaluate(async () => (await import("./stageLayers.js")).jujutsuCrowd())
  await page.screenshot({ path: path.join(OUT, "yuji_vs_gojo.png") })
  const jjk = ["yuji", "megumi_fushiguro", "maki", "gojo", "aoi_todo", "miwa", "yuta"]
  check("the crowd loads from the game's own sprites (10+ characters)", C.length >= 10 && C.filter(c => c.ready).length >= 10, C.map(c => c.key + ":" + c.skin).join(" "))
  check("JJK students / teachers watch in their own colours", C.filter(c => jjk.includes(c.key) && c.skin === "default").length >= 6)
  check("multiverse visitors wear one of their skins", C.filter(c => !jjk.includes(c.key) && c.skin !== "default").length >= 4, C.filter(c => !jjk.includes(c.key)).map(c => c.key + ":" + c.skin).join(" "))
  check("the two fighters in the match aren't also in the crowd", C.filter(c => c.key === "yuji" || c.key === "gojo").every(c => !c.shown) && C.filter(c => c.shown).length >= 9)
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`jujutsu_crowd: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
