// harness/the_originals.test.mjs — The Originals behind a real match: three dimensions (Omololu / Dseyl / Enoch), rifts, the merge.
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
const STAGE = "The Originals", OUT = path.join(ROOT, "harness", "shots", "the_originals"); fs.mkdirSync(OUT, { recursive: true })
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
  const T = () => page.evaluate(async () => (await import("./stageLayers.js")).originalsState())
  const go = k => page.evaluate(async k => (await import("./stageLayers.js")).originalsGo(k), k)
  const hold = (who, f) => page.evaluate(([who, src]) => { clearInterval(window.__h); const fn = eval(src); const H = window.__harness, q = H[who](); window.__h = setInterval(() => H.brutality.setHp(who, fn(q)), 5) }, [who, String(f)])
  const stop = () => page.evaluate(() => clearInterval(window.__h))
  await sleep(4500); const s0 = await T(); await page.screenshot({ path: path.join(OUT, "lab.png") })
  check("starts in Omololu's lab; Omololu / Dseyl / Enoch watch (real sprites)", s0.dim === 0 && s0.crowd.filter(c => c.shown).length >= 2, JSON.stringify({ d: s0.dim, c: s0.crowd.map(c => c.key + ":" + c.shown) }))
  await go(1); await sleep(1300); await page.screenshot({ path: path.join(OUT, "rift.png") }); await sleep(1400); const s1 = await T(); await page.screenshot({ path: path.join(OUT, "sky.png") })
  check("the screen shakes, reality cracks, a rift opens into Dseyl's sky", s1.dim === 1 && s1.swaps >= 1 && s1.shakes >= 2, JSON.stringify({ d: s1.dim, sw: s1.swaps, sh: s1.shakes }))
  await go(2); await sleep(2700); const s2 = await T(); await page.screenshot({ path: path.join(OUT, "frost.png") })
  check("…and into Enoch's frost & flame — all three dimensions seen", s2.dim === 2 && s2.seen.every(Boolean), JSON.stringify({ d: s2.dim, seen: s2.seen }))
  await go(0); await sleep(2700)
  await page.keyboard.down("KeyA"); await sleep(3500); await page.keyboard.up("KeyA"); await page.screenshot({ path: path.join(OUT, "edge_left.png") })
  await page.keyboard.down("KeyD"); await sleep(6000); await page.keyboard.up("KeyD"); await page.screenshot({ path: path.join(OUT, "edge_right.png") })
  { const a = await T(); let b = a; for (let i = 0; i < 34 && b.swaps === a.swaps; i++) { await sleep(1000); b = await T() }
    check("on its own, at random, the multiverse switches again", b.swaps > a.swaps, JSON.stringify({ before: a.swaps, after: b.swaps, d: b.dim })) }
  { const b = await page.evaluate(() => window.__harness.p2().health); await hold("p2", new Function(`return () => ${b - 150}`)()) } await sleep(300); await stop()
  await sleep(100); const s3 = await T(); await page.screenshot({ path: path.join(OUT, "flicker.png") })
  check("a big hit: reality flickers", s3.flickers >= 1, JSON.stringify({ f: s3.flickers, sh: s3.shouting }))
  await hold("p2", q => Math.round((q.maxHealth || q.maxHp || 1000) * 0.18)); await sleep(1500)
  const s4 = await T(); await page.screenshot({ path: path.join(OUT, "unstable.png") })
  check("a fighter close to losing: THE MULTIVERSE IS SPLITTING — switches come faster", s4.unstable >= 1 && (s4.phase || s4.nextIn <= 11.5), JSON.stringify({ u: s4.unstable, n: s4.nextIn, p: s4.phase }))
  await hold("p2", q => 0); await sleep(2500); await page.screenshot({ path: path.join(OUT, "merged.png") }); const s5 = await T(); await stop()
  check("the knockout: all three dimensions side by side — THE ORIGINALS", s5.merged > 1.5 && s5.seen.every(Boolean), JSON.stringify({ m: s5.merged }))
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`the_originals: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
