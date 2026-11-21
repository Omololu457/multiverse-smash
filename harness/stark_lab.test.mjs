// harness/stark_lab.test.mjs — Stark Lab: the lab reacts to the fight (holograms glitch, alert, K.O. flash, bots dodge) in a real match.
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
const STAGE = "Stark Lab", OUT = path.join(ROOT, "harness", "shots", "stark_lab"); fs.mkdirSync(OUT, { recursive: true })
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=spiderman&p2=naruto`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(n => window.__harness.selectStageByName(n), STAGE)
  await page.evaluate(() => window.__harness.start())
  const idx0 = await page.evaluate(n => window.__harness.selectStageByName("__none__").have.indexOf(n), STAGE)
  await page.evaluate(i => window.__harness.showMenu("SELECT_STAGE", i), idx0); await sleep(300)
  const cx = 115 + (idx0 % 6) * 210, cy = 215 + Math.floor(idx0 / 6) * 130
  await page.mouse.move(cx, cy); await sleep(150); await page.mouse.click(cx, cy); await sleep(2500)
  await page.evaluate(() => window.__harness.skipToBattle()); await sleep(4000)
  const L = () => page.evaluate(async () => (await import("./stageLayers.js")).labState())
  const holdHp = f => page.evaluate(src => { clearInterval(window.__h); const fn = eval(src); const H = window.__harness, q = H.p2(); window.__h = setInterval(() => H.brutality.setHp("p2", fn(q)), 5) }, String(f))
  const s0 = await L()
  check("Stark Lab is in the stage list", await page.evaluate(() => window.__harness.selectStageByName("__none__").have.includes("Stark Lab")))
  { const base = await page.evaluate(() => window.__harness.p2().health); await holdHp(new Function(`return () => ${base - 150}`)()) } await sleep(150)
  const s1 = await L(); await page.screenshot({ path: path.join(OUT, "big_hit.png") })
  check("a big hit glitches the holograms and throws sparks off the robot arms", s1.glitch > 0 && s1.sparks > 0, JSON.stringify(s1))
  await holdHp(q => Math.round((q.maxHealth || 1000) * 0.12)); await sleep(700)
  const s2 = await L(); await page.screenshot({ path: path.join(OUT, "alert.png") })
  check("a fighter close to dying sets off the red alert", s2.alert, JSON.stringify(s2))
  await holdHp(q => 0); await sleep(250)
  await sleep(1500)
  const s3 = await L(); await page.screenshot({ path: path.join(OUT, "ko.png") }); await page.evaluate(() => clearInterval(window.__h))
  check("a knockout lights up every suit (K.O. flash)", s3.flash > 0, JSON.stringify(s3))
  check("helper bots roll around the floor", s0.bots.length === 2 && s3.bots.join() !== s0.bots.join(), `${s0.bots} → ${s3.bots}`)
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`stark_lab: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
