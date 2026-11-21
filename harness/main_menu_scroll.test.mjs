// harness/main_menu_scroll.test.mjs — the main menu scrolls (mouse wheel) so the low buttons (Settings / Credits / Back) are reachable.
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
const OUT = path.join(ROOT, "harness", "shots", "main_menu_scroll"); fs.mkdirSync(OUT, { recursive: true })
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.showMenu("MAIN_MENU")); await sleep(500)
  const rects = () => page.evaluate(() => window.__harness.ui.mainMenuRects())
  const st = () => page.evaluate(() => window.__harness.ui.state())
  const vis = r => r.y >= 130 && r.y + r.h <= 720 - 55
  let R = await rects(); const cr0 = R.find(r => r.id === "credits")
  await page.screenshot({ path: path.join(OUT, "top.png") })
  check("the main menu has more buttons than fit (Credits starts off-screen)", !vis(cr0), JSON.stringify(cr0))
  await page.mouse.move(640, 400)
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 120); await sleep(60) }
  await sleep(300)
  R = await rects(); const cr = R.find(r => r.id === "credits"), se = R.find(r => r.id === "settings"), bk = R.find(r => r.id === "back")
  await page.screenshot({ path: path.join(OUT, "scrolled.png") })
  check("the mouse wheel scrolls Settings, Credits and Back into view", vis(cr) && vis(se) && vis(bk), JSON.stringify({ cr, se, bk }))
  await page.mouse.move(cr.x + cr.w / 2, cr.y + cr.h / 2); await sleep(200); await page.mouse.click(cr.x + cr.w / 2, cr.y + cr.h / 2); await sleep(600)
  const s = await st()
  await page.screenshot({ path: path.join(OUT, "credits.png") })
  check("clicking the scrolled-to CREDITS opens the credits", /credit/i.test(String(s)), String(s))
  await page.evaluate(() => window.__harness.showMenu("MAIN_MENU")); await sleep(300)
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -120); await sleep(60) }
  await sleep(300)
  R = await rects()
  check("wheel up scrolls back to PLAY at the top", vis(R.find(r => r.id === "play")), JSON.stringify(R[0]))
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`main_menu_scroll: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
