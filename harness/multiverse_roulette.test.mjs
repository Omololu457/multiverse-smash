// harness/multiverse_roulette.test.mjs — Multiverse Roulette behind a real match: a random map, random song, rifts into other random maps, glitches, the merge.
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
const STAGE = "Multiverse Roulette", OUT = path.join(ROOT, "harness", "shots", "multiverse_roulette"); fs.mkdirSync(OUT, { recursive: true })
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
  const T = () => page.evaluate(async () => (await import("./stageLayers.js")).randomMapState())
  const hold = (who, f) => page.evaluate(([who, src]) => { clearInterval(window.__h); const fn = eval(src); const H = window.__harness, q = H[who](); window.__h = setInterval(() => H.brutality.setHp(who, fn(q)), 5) }, [who, String(f)])
  const stop = () => page.evaluate(() => clearInterval(window.__h))
  await sleep(4500); const s0 = await T(); await page.screenshot({ path: path.join(OUT, "start.png") })
  check("the match starts in a random map of the game (drawn whole)", !!s0.cur && s0.ready, JSON.stringify({ cur: s0.cur, ready: s0.ready }))
  { const m = await page.evaluate(() => window.__harness.musicState()); check("a song from the whole library of map songs is playing", !!m.fileSrc, String(m.fileSrc)) }
  await page.evaluate(async () => (await import("./stageLayers.js")).randomMapGo()); await sleep(1300); await page.screenshot({ path: path.join(OUT, "rift.png") }); await sleep(1500)
  const s1 = await T(); await page.screenshot({ path: path.join(OUT, "next.png") })
  check("the screen shakes, reality cracks, a rift opens into another random map", s1.swaps >= 1 && s1.visited.length >= 2 && s1.cur !== s0.cur && s1.shakes >= 2, JSON.stringify({ v: s1.visited, sh: s1.shakes }))
  await page.evaluate(async () => (await import("./stageLayers.js")).randomMapGlitch(true)); await sleep(120); await page.screenshot({ path: path.join(OUT, "glitch_full.png") })
  await sleep(1500); await page.evaluate(async () => (await import("./stageLayers.js")).randomMapGlitch(false)); await sleep(150); await page.screenshot({ path: path.join(OUT, "glitch_bands.png") })
  { const sg = await T(); check("other maps glitch through for a split second", sg.glitches >= 2 && sg.glimpsed.length >= 1, JSON.stringify({ g: sg.glitches, seen: sg.glimpsed })) }
  await page.keyboard.down("KeyA"); await sleep(3500); await page.keyboard.up("KeyA"); await page.screenshot({ path: path.join(OUT, "edge_left.png") })
  await page.keyboard.down("KeyD"); await sleep(6000); await page.keyboard.up("KeyD"); await page.screenshot({ path: path.join(OUT, "edge_right.png") })
  { const a = await T(); let b = a; for (let i = 0; i < 30 && b.swaps === a.swaps; i++) { await sleep(1000); b = await T() }
    check("on its own, at random, it rifts into yet another map", b.swaps > a.swaps, JSON.stringify({ v: b.visited })) }
  await hold("p2", q => Math.round((q.maxHealth || q.maxHp || 1000) * 0.18)); await sleep(1500)
  const s4 = await T(); check("a fighter close to losing: the multiverse spins out — rifts come faster", s4.unstable >= 1 && (s4.phase || s4.nextIn <= 10.5), JSON.stringify({ u: s4.unstable, n: s4.nextIn, p: s4.phase }))
  await hold("p2", q => 0); await sleep(2500); await page.screenshot({ path: path.join(OUT, "merged.png") }); const s5 = await T(); await stop()
  check("the knockout: three maps side by side — MULTIVERSE ROULETTE", s5.merged > 1.5, JSON.stringify({ m: s5.merged }))
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`multiverse_roulette: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
