// harness/shibuya_gore.test.mjs — SHIBUYA INCIDENT stage: bystanders, gore and city destruction (render-only) in a real match.
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
const STAGE = "Shibuya Incident", OUT = path.join(ROOT, "harness", "shots", "shibuya_gore"); fs.mkdirSync(OUT, { recursive: true })
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=sukuna&p2=naruto`, { waitUntil: "load" })
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
  await page.evaluate(() => window.__harness.skipToBattle()); await sleep(3500)
  const S = () => page.evaluate(async () => (await import("./stageLayers.js")).shibuyaDebug.stats())
  const s0 = await S()
  check("bystanders walk the street", s0.peds > 0, JSON.stringify(s0))
  // each kind of attack kills its own way
  for (const [cause, rk, want, label] of [["Dismantle", "sukuna", 6, "Dismantle / Cleave dice the body"], ["light", "sukuna", 2, "a slasher's strike cuts the body in half"],
    ["kamehameha", "goku", 12, "a blast blows the body apart"], ["light", "naruto", 1, "a punch launches the body"]]) {
    const got = await page.evaluate(async ([c, r]) => { const D = (await import("./stageLayers.js")).shibuyaDebug; const cam = window.__harness.camera(); D.ped(cam.x - 260); return D.kill(c, r) }, [cause, rk])
    check(label, got === want, `${cause} (${rk}) → ${got} piece(s)`)
  }
  await sleep(350); await page.screenshot({ path: path.join(OUT, "gore_burst.png") })
  await sleep(2500)
  const s1 = await S()
  check("the dead stay on the street, blood pools under them", s1.dead >= 15 && s1.pools > 5, JSON.stringify(s1))
  await page.screenshot({ path: path.join(OUT, "aftermath.png") })
  // a real attack in the match reaches a bystander standing in front of the attacker
  const before = (await S()).dead + (await S()).pieces
  await page.evaluate(async () => { const D = (await import("./stageLayers.js")).shibuyaDebug, h = window.__harness, p = h.p1(), q = h.p2(); D.ped(p.x + (p.w || 50) / 2 + Math.sign(q.x - p.x) * 70) })
  const atk = []
  for (let i = 0; i < 6; i++) { await page.keyboard.down("KeyJ"); await sleep(70); atk.push(await page.evaluate(() => { const p = window.__harness.p1(); return p.attacking ? "A" : "-" })); await page.keyboard.up("KeyJ"); await sleep(260) }
  await sleep(1200)
  console.log("  attacking samples", atk.join(""), JSON.stringify(await page.evaluate(() => { const p = window.__harness.p1(), q = window.__harness.p2(); return { p: [p.x | 0, p.w, p.facing], q: q.x | 0 } })))
  const after = (await S()).dead + (await S()).pieces
  check("a real attack in the match kills a bystander", after > before, `${before} → ${after}`)
  // the city takes the hits landed on the fighters
  const h0 = (await S()).holes
  await page.keyboard.down("KeyD"); await sleep(1500); await page.keyboard.up("KeyD")
  for (let i = 0; i < 14; i++) { await page.keyboard.press(i % 3 === 2 ? "KeyK" : "KeyJ"); await sleep(300) }
  await sleep(700)
  const s2 = await S()
  check("landed hits blow holes in the towers", s2.holes > h0 && s2.total > 0, JSON.stringify(s2))
  await page.screenshot({ path: path.join(OUT, "destruction.png") })
  // who kills: villains / the ones who don't care do; heroes (Yuji, the Rangers, …) only knock bystanders down
  { const k = await page.evaluate(async () => { const M = await import("./stageLayers.js"); return ["sukuna", "toji", "madara", "homelander", "yuji", "gojo", "naruto", "spd_red", "mmpr_pink", "green_ranger", "superman", "spiderman"].map(r => r + ":" + (M.shibuyaKills(r) ? "kill" : "spare")) })
    const want = s => /sukuna|toji|madara|homelander/.test(s) ? s.endsWith(":kill") : s.endsWith(":spare")
    check("villains kill bystanders, heroes and Rangers spare them", k.every(want), k.join(" ")) }
  // a HERO's real attack in a match: the bystander is knocked down, not killed
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=yuji&p2=naruto`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(n => window.__harness.selectStageByName(n), STAGE)
  await page.evaluate(() => window.__harness.start())
  await page.evaluate(i => window.__harness.showMenu("SELECT_STAGE", i), idx0); await sleep(300)
  await page.mouse.move(cx, cy); await sleep(150); await page.mouse.click(cx, cy); await sleep(2500)
  await page.evaluate(() => window.__harness.skipToBattle()); await sleep(3500)
  { const b = await S()
    await page.evaluate(async () => { const D = (await import("./stageLayers.js")).shibuyaDebug, h = window.__harness, p = h.p1(), q = h.p2(); D.ped(p.x + (p.w || 50) / 2 + Math.sign(q.x - p.x) * 70) })
    for (let i = 0; i < 6; i++) { await page.keyboard.down("KeyJ"); await sleep(70); await page.keyboard.up("KeyJ"); await sleep(260) }
    await sleep(600); await page.screenshot({ path: path.join(OUT, "hero_spares.png") })
    const a = await S()
    check("a hero's (Yuji's) attack knocks a bystander down without killing them", a.spared > b.spared && a.dead + a.pieces === b.dead + b.pieces, `spared ${b.spared}→${a.spared}, dead ${b.dead + b.pieces}→${a.dead + a.pieces}`) }
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`shibuya_gore: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
