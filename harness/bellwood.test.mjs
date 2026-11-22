// harness/bellwood.test.mjs — Bellwood behind a real match (Ben 10 vs Naruto): a peaceful street, then the fight draws a crowd, the car alarm, Ben going alien, the cops, the KO.
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
const STAGE = "Bellwood", OUT = path.join(ROOT, "harness", "shots", "bellwood"); fs.mkdirSync(OUT, { recursive: true })
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=ben10&p2=naruto`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(n => window.__harness.selectStageByName(n), STAGE)
  await page.evaluate(() => window.__harness.start())
  const idx0 = await page.evaluate(n => window.__harness.selectStageByName("__none__").have.indexOf(n), STAGE)
  await page.evaluate(i => window.__harness.showMenu("SELECT_STAGE", i), idx0); await sleep(300)
  // the stage grid adapts its columns / card size to the number of stages, so ask the game where the card is
  const { cx, cy } = await page.evaluate(i => { const r = window.__harness.ui.currentHoverRects()[i], cv = document.querySelector("canvas"), b = cv.getBoundingClientRect()
    return { cx: b.left + (r.x + r.w / 2) * b.width / cv.width, cy: b.top + (r.y + r.h / 2) * b.height / cv.height } }, idx0)
  await page.mouse.move(cx, cy); await sleep(150); await page.mouse.click(cx, cy); await sleep(2500)
  await page.evaluate(() => window.__harness.skipToBattle()); await sleep(4000)
  const T = () => page.evaluate(async () => (await import("./stageLayers.js")).bellwoodState())
  const hold = (who, f) => page.evaluate(([who, src]) => { clearInterval(window.__h); const fn = eval(src); const H = window.__harness, q = H[who](); window.__h = setInterval(() => H.brutality.setHp(who, fn(q)), 5) }, [who, String(f)])
  const stop = () => page.evaluate(() => clearInterval(window.__h))
  await sleep(1500); const b0 = await T(); await page.screenshot({ path: path.join(OUT, "peaceful.png") })
  check("peaceful at first: neighbours walking the sidewalk, pigeons on the curb, nobody watching", b0.people >= 10 && b0.walking === b0.people && b0.watching === 0 && b0.birds >= 5, JSON.stringify(b0))
  // the immersion rule: walk to both ends, the street never runs out
  await page.keyboard.down("KeyA"); await sleep(3500); await page.keyboard.up("KeyA"); await page.screenshot({ path: path.join(OUT, "edge_left.png") })
  await page.keyboard.down("KeyD"); await sleep(6000); await page.keyboard.up("KeyD"); await page.screenshot({ path: path.join(OUT, "edge_right.png") })
  for (let i = 0; i < 6; i++) { const b = await page.evaluate(() => window.__harness.p2().health); await hold("p2", new Function(`return () => ${b - 20}`)()); await sleep(250); await stop(); await sleep(300) }
  await sleep(2500); const b1 = await T(); await page.screenshot({ path: path.join(OUT, "crowd.png") })
  check("the fight draws a crowd: neighbours stop to watch, phones out", b1.watching >= 3 && b1.phones >= 1, JSON.stringify({ w: b1.watching, ph: b1.phones }))
  { const b = await page.evaluate(() => window.__harness.p2().health); await hold("p2", new Function(`return () => ${b - 150}`)()) } await sleep(400); await stop()
  const b2 = await T(); await page.screenshot({ path: path.join(OUT, "big_hit.png") })
  check("a big hit: the car alarm goes off, the pigeons scatter", b2.alarms >= 1 && b2.flying >= 1, JSON.stringify({ a: b2.alarms, fly: b2.flying, s: b2.shouting }))
  // Ben goes alien: Omnitrix dial ↓↓ then Light
  // each key HELD ~60 ms like a player's tap (an instant press() can fall between two game frames and be missed)
  for (const k of ["KeyS", "KeyS", "KeyJ"]) { await page.keyboard.down(k); await sleep(60); await page.keyboard.up(k); await sleep(70) }
  await sleep(2500); const b3 = await T(); await page.screenshot({ path: path.join(OUT, "ben.png") })
  check("Ben transforms in the street: green flash + \"IT'S BEN 10!!\"", b3.benCalls >= 1, JSON.stringify({ calls: b3.benCalls, form: await page.evaluate(() => { const p = window.__harness.p1(); return [p.transformed, p.activeAlien] }) }))
  await hold("p2", q => Math.round((q.maxHealth || q.maxHp || 1000) * 0.18)); await sleep(2500)
  const b4 = await T(); await page.screenshot({ path: path.join(OUT, "cops.png") })
  check("a fighter close to losing: the cops roll up", b4.cop === "parked" || b4.cop === "drive", `cop ${b4.cop}`)
  await hold("p2", q => 0); await sleep(1500); const b5 = await T(); await page.screenshot({ path: path.join(OUT, "ko.png") }); await stop()
  check("the knockout: the whole street goes off", b5.ko && b5.watching >= 8, JSON.stringify({ ko: b5.ko, w: b5.watching }))
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`bellwood: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
