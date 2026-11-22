// harness/shadow_garden.test.mjs — Shadow Garden = Megumi's Domain Expansion, CHIMERA SHADOW GARDEN, behind a real match: the domain floods
// in, shikigami surge out of the shadow, a big hit calls one by name, the shadows deepen, the KO summons Mahoraga.
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
const STAGE = "Shadow Garden", OUT = path.join(ROOT, "harness", "shots", "shadow_garden"); fs.mkdirSync(OUT, { recursive: true })
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
  await page.evaluate(() => window.__harness.skipToBattle()); await sleep(1000)
  const T = () => page.evaluate(async () => (await import("./stageLayers.js")).shadowState())
  const hold = (who, f) => page.evaluate(([who, src]) => { clearInterval(window.__h); const fn = eval(src); const H = window.__harness, q = H[who](); window.__h = setInterval(() => H.brutality.setHp(who, fn(q)), 5) }, [who, String(f)])
  const stop = () => page.evaluate(() => clearInterval(window.__h))
  await page.screenshot({ path: path.join(OUT, "intro.png") }); const s00 = await T()
  check("match start: the domain floods in — DOMAIN EXPANSION · CHIMERA SHADOW GARDEN", s00.floods === 1, JSON.stringify({ f: s00.floods, i: s00.intro }))
  await sleep(9000); const s0 = await T(); await page.screenshot({ path: path.join(OUT, "domain.png") })
  check("Megumi's shikigami surge out of the shadow sea on their own", s0.summons >= 1, JSON.stringify({ n: s0.summons, k: s0.kinds }))
  await page.keyboard.down("KeyA"); await sleep(3500); await page.keyboard.up("KeyA"); await page.screenshot({ path: path.join(OUT, "edge_left.png") })
  await page.keyboard.down("KeyD"); await sleep(6000); await page.keyboard.up("KeyD"); await page.screenshot({ path: path.join(OUT, "edge_right.png") })
  { const b = await page.evaluate(() => window.__harness.p2().health); await hold("p2", new Function(`return () => ${b - 150}`)()) } await sleep(300); await stop()
  await sleep(600); const s2 = await T(); await page.screenshot({ path: path.join(OUT, "called.png") })
  check("a big hit: a shikigami bursts out with its name called", s2.called >= 1 && s2.shouting.length >= 1, JSON.stringify({ c: s2.called, sh: s2.shouting, k: s2.kinds }))
  await hold("p2", q => Math.round((q.maxHealth || q.maxHp || 1000) * 0.18)); await sleep(2500)
  const s3 = await T(); await page.screenshot({ path: path.join(OUT, "deep.png") })
  check("a fighter close to losing: the shadows deepen — towering tendrils, eyes in the dark", s3.deep > 0.9, JSON.stringify({ d: s3.deep }))
  await hold("p2", q => 0); await sleep(3500); await page.screenshot({ path: path.join(OUT, "mahoraga.png") }); const s4 = await T(); await stop()
  check("the knockout: With this treasure I summon… MAHORAGA rises, the wheel turns", s4.mahoraga >= 1 && s4.maho > 2.5, JSON.stringify({ m: s4.maho, sh: s4.shouting }))
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`shadow_garden: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
