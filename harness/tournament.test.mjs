// harness/tournament.test.mjs — World Tournament Arena: ring cracks, the announcer, the ringside crowd reacting, in a real match.
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
const STAGE = "World Tournament Arena", OUT = path.join(ROOT, "harness", "shots", "tournament"); fs.mkdirSync(OUT, { recursive: true })
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=goku&p2=naruto`, { waitUntil: "load" })
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
  const T = () => page.evaluate(async () => (await import("./stageLayers.js")).tournamentState())
  const holdHp = f => page.evaluate(src => { clearInterval(window.__h); const fn = eval(src); const H = window.__harness, q = H.p2(); window.__h = setInterval(() => H.brutality.setHp("p2", fn(q)), 5) }, String(f))
  const t0 = await T()
  check("ringside crowd loads (real sprites), the fighting Goku left out", t0.crowd.filter(c => c.ready).length >= 5 && t0.crowd.filter(c => c.key === "goku").every(c => !c.shown), t0.crowd.map(c => c.key + ":" + c.shown).join(" "))
  check("the ring starts clean", t0.cracks === 0)
  { const base = await page.evaluate(() => window.__harness.p2().health); await holdHp(new Function(`return () => ${base - 150}`)()) } await sleep(200)
  const t1 = await T(); await page.screenshot({ path: path.join(OUT, "big_hit.png") })
  check("a big hit cracks the ring tiles under the fighter", t1.cracks >= 1, JSON.stringify({ cracks: t1.cracks }))
  check("the announcer calls the big hit", /HIT|INCREDIBLE|UNBELIEVABLE/.test(t1.call || ""), t1.call)
  check("the ringside crowd jumps and shouts at the big hit", t1.crowd.some(c => c.anim === "jump" || c.bubble), t1.crowd.map(c => `${c.key}:${c.anim}:${c.bubble || ""}`).join(" "))
  await holdHp(q => 0); await sleep(300)
  const t2 = await T(); await page.screenshot({ path: path.join(OUT, "ko.png") }); await page.evaluate(() => clearInterval(window.__h))
  check("the knockout: announcer says it's over, the crowd cheers", t2.call === "IT'S OVER!!" && t2.crowd.filter(c => c.mood === "cheer").length >= 2, `${t2.call} · ${t2.crowd.map(c => c.mood).join(" ")}`)
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`tournament: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
