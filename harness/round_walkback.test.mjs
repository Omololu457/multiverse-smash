// harness/round_walkback.test.mjs — MK1-style round end: the fight stops, the fallen fighter gets up, both fighters walk
// backwards (facing each other) to their starting marks; the next round starts from exactly there (no snap).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".ogg": "audio/ogg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on("pageerror", e => errors.push(String(e)))
const sleep = t => new Promise(r => setTimeout(r, t))
const OUT = path.join(ROOT, "harness", "shots", "round_walkback"); fs.mkdirSync(OUT, { recursive: true })
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "dummy" }); window.__harness.skipToBattle() })
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" && s.countdown === 0 }, null, { timeout: 20000 })
  await page.keyboard.down("KeyD"); await sleep(1500); await page.keyboard.up("KeyD")   // walk p1 off its mark
  const x0 = await page.evaluate(() => ({ a: window.__harness.p1().x, b: window.__harness.p2().x }))
  await page.evaluate(() => window.__harness.forceP1Win())
  await page.waitForFunction(() => window.__harness.state().gameState === "roundBreak", null, { timeout: 15000 })
  const log = [], t0 = Date.now()
  while (Date.now() - t0 < 60000) { const s = await page.evaluate(() => { const H = window.__harness, a = H.p1(), b = H.p2(), st = H.state(); return { fr: st.frame, g: st.gameState, cd: st.countdown, a: { x: a.x, vx: a.vx, f: a.facing, kd: !!a.knockdownState, act: a._lastSpriteAction }, b: { x: b.x, vx: b.vx, f: b.facing, kd: !!b.knockdownState, act: b._lastSpriteAction } } }); log.push(s)
    if (s.g === "battle") break; if (log.length % 12 === 0) await page.screenshot({ path: path.join(OUT, `f${String(log.length).padStart(3, "0")}.png`) }); await sleep(40) }
  if (process.env.TRACE) console.log(log.filter((s, i) => i % 5 === 0).map(s => `${s.fr} ${s.g} a${s.a.x.toFixed(0)}/${(s.a.vx||0).toFixed(1)} b${s.b.x.toFixed(0)}/${(s.b.vx||0).toFixed(1)} ${s.b.kd}`).join("\n"))
  const brk = log.filter(s => s.g === "roundBreak"), last = brk[brk.length - 1], nxt = log[log.length - 1]
  check("the loser stays down, then gets up", brk.some(s => s.b.kd) && !last.b.kd, JSON.stringify(brk.map(s => s.b.kd ? "D" : ".").join("")))
  check("the winner walks backwards to its mark, still facing the opponent", brk.some(s => s.a.vx < -0.5 && s.a.f === 1), JSON.stringify([...new Set(brk.map(s => s.a.f + "/" + s.b.f))]))
  check("they reach their marks: the next round starts where they stopped (no snap)", nxt.g === "battle" && Math.abs(nxt.a.x - last.a.x) < 3 && Math.abs(nxt.b.x - last.b.x) < 3, JSON.stringify({ moved: [x0.a, last.a.x, nxt.a.x], b: [x0.b, last.b.x, nxt.b.x] }))
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`round_walkback: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
