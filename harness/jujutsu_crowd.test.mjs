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
const missing = []; page.on("response", r => { if (r.status() === 404 && /\.png/.test(r.url())) missing.push(r.url().replace(/^.*\//, "")) })
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
  // the stage grid adapts its columns / card size to the number of stages, so ask the game where the card is
  const { cx, cy } = await page.evaluate(i => { const r = window.__harness.ui.currentHoverRects()[i], cv = document.querySelector("canvas"), b = cv.getBoundingClientRect()
    return { cx: b.left + (r.x + r.w / 2) * b.width / cv.width, cy: b.top + (r.y + r.h / 2) * b.height / cv.height } }, idx0)
  await page.mouse.move(cx, cy); await sleep(150); await page.mouse.click(cx, cy); await sleep(2500)
  await page.evaluate(() => window.__harness.skipToBattle()); await sleep(4000)
  const C = await page.evaluate(async () => (await import("./stageLayers.js")).jujutsuCrowd())
  await page.screenshot({ path: path.join(OUT, "yuji_vs_gojo.png") })
  const jjk = ["yuji", "megumi_fushiguro", "maki", "gojo", "aoi_todo", "miwa", "yuta"]
  check("the crowd loads from the game's own sprites (10+ characters)", C.length >= 10 && C.filter(c => c.ready).length >= 10, C.map(c => c.key + ":" + c.skin).join(" "))
  check("JJK students / teachers watch in their own colours", C.filter(c => jjk.includes(c.key) && c.skin === "default").length >= 6)
  check("multiverse visitors wear one of their skins", C.filter(c => !jjk.includes(c.key) && c.skin !== "default").length >= 5, C.filter(c => !jjk.includes(c.key)).map(c => c.key + ":" + c.skin).join(" "))
  check("the two fighters in the match aren't also in the crowd", C.filter(c => c.key === "yuji" || c.key === "gojo").every(c => !c.shown) && C.filter(c => c.shown).length >= 9)
  // REACTIONS
  const crowd = () => page.evaluate(async () => (await import("./stageLayers.js")).jujutsuCrowd().filter(c => c.shown))
  // 1. a fighter walks right up to them → they back away and cover up
  await page.keyboard.down("KeyA"); await sleep(2600)
  let R = await crowd(); await page.screenshot({ path: path.join(OUT, "react_near.png") }); await page.keyboard.up("KeyA")
  check("a fighter walking up makes the nearby crowd back away (scared)", R.some(c => c.mood === "scared" && c.off !== 0), R.map(c => `${c.key}:${c.mood}:${c.off}`).join(" "))
  const wasScared = R.filter(c => c.mood === "scared").map(c => c.key)
  await page.keyboard.down("KeyD"); await sleep(2500); await page.keyboard.up("KeyD"); await sleep(1500)
  R = await crowd()
  check("once the fighter leaves they walk back to their spot", R.filter(c => c.mood !== "scared").every(c => Math.abs(c.off) < 4) && R.some(c => wasScared.includes(c.key) && c.mood !== "scared"),
    R.map(c => `${c.key}:${c.mood}:${c.off}`).join(" "))
  // training mode refills health, so hold the (real fighter's, via brutality.setHp) value the scenario needs for its duration
  const holdHp = f => page.evaluate(src => { clearInterval(window.__jjHold); const fn = eval(src); const H = window.__harness, q = H.p2(); window.__jjHold = setInterval(() => H.brutality.setHp("p2", fn(q)), 5) }, String(f))
  // 2. a big hit lands → they jump and shout
  { const base = await page.evaluate(() => window.__harness.p2().health); await holdHp(new Function(`return () => ${base - 150}`)()) } await sleep(250)
  R = await crowd(); await page.screenshot({ path: path.join(OUT, "react_bighit.png") })
  check("a big hit makes the crowd jump and shout", R.filter(c => c.bubble).length >= 2 && R.some(c => c.anim === "jump"), R.map(c => `${c.key}:${c.anim}:${c.bubble || ""}`).join(" "))
  // 3. someone about to die → the crowd gets tense
  await holdHp(q => Math.round((q.maxHealth || 1000) * 0.12)); await sleep(1800)
  R = await crowd(); await page.screenshot({ path: path.join(OUT, "react_danger.png") })
  check("a fighter close to dying puts the crowd on edge (tense)", R.filter(c => c.mood === "tense").length >= 5, R.map(c => c.mood).join(" "))
  // 4. the knockout → they cheer
  await holdHp(q => 0); await sleep(300)
  R = await crowd(); await page.screenshot({ path: path.join(OUT, "react_ko.png") })
  await page.evaluate(() => clearInterval(window.__jjHold))
  check("a knockout makes the crowd cheer", R.filter(c => c.mood === "cheer").length >= 5, R.map(c => `${c.key}:${c.mood}:${c.anim}`).join(" "))
  check("every crowd sprite loads (no missing skin art)", !missing.length, missing.slice(0, 3).join(" | "))
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`jujutsu_crowd: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
