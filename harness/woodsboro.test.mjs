// harness/woodsboro.test.mjs — Woodsboro behind a real match: Ghostface / Jason, the peeking mask, the phone, the blackout, the police.
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
const STAGE = "Woodsboro", OUT = path.join(ROOT, "harness", "shots", "woodsboro"); fs.mkdirSync(OUT, { recursive: true })
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" })
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
  const T = () => page.evaluate(async () => (await import("./stageLayers.js")).woodsboroState())
  const hold = (who, f) => page.evaluate(([who, src]) => { clearInterval(window.__h); const fn = eval(src); const H = window.__harness, q = H[who](); window.__h = setInterval(() => H.brutality.setHp(who, fn(q)), 5) }, [who, String(f)])
  const stop = () => page.evaluate(() => clearInterval(window.__h))
  await sleep(4500); const s0 = await T(); await page.screenshot({ path: path.join(OUT, "street.png") }); await sleep(1200); await page.screenshot({ path: path.join(OUT, "street2.png") })
  check("Woodsboro at night: Ghostface / Jason on the sidewalk (real sprites)", s0.crowd.filter(c => c.shown).length >= 1, JSON.stringify(s0.crowd.map(c => c.key + ":" + c.shown)))
  await page.keyboard.down("KeyA"); await sleep(3500); await page.keyboard.up("KeyA"); await page.screenshot({ path: path.join(OUT, "edge_left.png") })
  await page.keyboard.down("KeyD"); await sleep(6000); await page.keyboard.up("KeyD"); await page.screenshot({ path: path.join(OUT, "edge_right.png") })
  const s1 = await T(); check("the mask peeks out from behind a tree now and then", s1.peeks >= 1, JSON.stringify({ p: s1.peeks }))
  check("the night of the slashers: Ghostface / Chucky / Jason kill people in the background, bodies stay", s1.kills >= 2 && s1.bodies >= 2, JSON.stringify({ k: s1.kills, b: s1.bodies, h: s1.hunting }))
  { const b = await page.evaluate(() => window.__harness.p2().health); await hold("p2", new Function(`return () => ${b - 150}`)()) } await sleep(300); await stop()
  await sleep(400); const s2 = await T(); await page.screenshot({ path: path.join(OUT, "phone.png") })
  check("a big hit: a phone rings in a house", s2.rings >= 1 && s2.shouting.length >= 1, JSON.stringify({ r: s2.rings, sh: s2.shouting }))
  await hold("p2", q => Math.round((q.maxHealth || q.maxHp || 1000) * 0.18)); await sleep(3000)
  const s3 = await T(); await page.screenshot({ path: path.join(OUT, "blackout.png") })
  check("a fighter close to losing: the power cuts, lightning, masks in the windows", s3.power < 0.2 && s3.bolts >= 1, JSON.stringify({ p: s3.power, b: s3.bolts }))
  await hold("p2", q => 0); await sleep(3500); await page.screenshot({ path: path.join(OUT, "police.png") }); const s4 = await T(); await stop()
  check("the knockout: police lights, the lights come back — …or is it?", s4.ko > 2 && s4.cops > 0.8 && s4.power > s3.power, JSON.stringify({ k: s4.ko, c: s4.cops, p: s4.power }))
  { const au = await page.evaluate(async () => (await import("./woodsboroAudio.js")).woodsboroAudioState())
    check("the soundscape: wind/drone bed, screams, stabs, Chucky's laugh, Jason's whisper, thunder, phone, siren", au.bed && au.scream >= 3 && au.stab >= 2 && (au.laugh + au.whisper) >= 1 && au.thunder >= 1 && au.phone >= 1 && au.siren >= 1, JSON.stringify(au)) }
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`woodsboro: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
