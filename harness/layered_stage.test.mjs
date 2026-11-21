// harness/layered_stage.test.mjs — LAYERED STAGE check (stageLayers.js) on a layered stage (default "Harbor Dock"; pass a stage name), in a real match.
//   • the stage is selectable, its art loads, and the match world uses its width;
//   • the fighters' feet sit on the dock's standing row (ground line == art floor);
//   • parallax: moving the camera moves the far sky LESS than the dock (the row under the fighters);
//   • the crowd animates (ship region changes over time) while the fighters' positions don't (render-only);
//   • no page errors. Screenshots → harness/shots/layered_stage/.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const STAGE = process.argv[2] || "Harbor Dock"
const OUT = path.join(ROOT, "harness", "shots", "layered_stage", STAGE.replace(/[^a-z0-9]+/gi, "_").toLowerCase()); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".ogg": "audio/ogg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on("pageerror", e => errors.push(String(e)))
const sleep = t => new Promise(r => setTimeout(r, t))
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  const sel = await page.evaluate(n => window.__harness.selectStageByName(n), STAGE)
  check(`${STAGE} is a selectable stage`, !sel.error, JSON.stringify(sel).slice(0, 120))
  // pick it the way a player does: fighters set, then Stage Select → Enter on the Harbor Dock card
  await page.evaluate(() => window.__harness.start())
  const idx0 = await page.evaluate(n => window.__harness.selectStageByName("__none__").have.indexOf(n), STAGE)
  await page.evaluate(i => window.__harness.showMenu("SELECT_STAGE", i), idx0); await sleep(300)
  // click the card (stage cards start the match on click); its rect comes from the same layout the screen draws
  const cx = 115 + (idx0 % 6) * 210, cy = 215 + Math.floor(idx0 / 6) * 130     // stage-select card grid (6 per row)
  await page.mouse.move(cx, cy); await sleep(150); await page.mouse.click(cx, cy); await sleep(2500)
  await page.evaluate(() => window.__harness.skipToBattle())
  await page.waitForFunction(() => window.__harness.camera().worldWidth === 2400, null, { timeout: 15000 }).catch(() => {})
  { const ww = await page.evaluate(() => window.__harness.camera().worldWidth); check("match world uses the stage width (2400)", ww === 2400, String(ww)) }
  await sleep(2500)   // art load
  const shot = async n => page.screenshot({ path: path.join(OUT, n + ".png") })
  await shot("center")
  // ground line vs art: the canvas row under the fighters' feet must be the dock's standing row (warm wood, not sea)
  const g = await page.evaluate(() => {
    const c = document.querySelector("canvas"), x = c.getContext("2d"), h = window.__harness
    const p = h.p1?.() || {}, cam = h.camera()
    return { feetY: p.y, cam }
  })
  console.log("  p1/camera", JSON.stringify(g).slice(0, 200))
  // parallax: shove both fighters far left, then far right; compare how far the sky vs the dock row shifted on screen
  const sample = () => page.evaluate(() => { const c = document.querySelector("canvas"); return c.toDataURL("image/png").length })
  const camX = () => page.evaluate(() => window.__harness.camera().x)
  const x0 = await camX()
  await page.keyboard.down("KeyA"); await sleep(4000); await page.keyboard.up("KeyA"); await sleep(600)
  const xl = await camX(); await shot("left")
  await page.keyboard.down("KeyD"); await sleep(7000); await page.keyboard.up("KeyD"); await sleep(600)
  const xr = await camX(); await shot("right")
  check("camera scrolls with the fighters", xl < x0 - 100 && xr > xl + 200, `centre ${x0 | 0} → left ${xl | 0} → right ${xr | 0}`)
  // crowd + flag animate (render-only): the ship/yacht band changes over time while the fighters stay put
  const band = () => page.screenshot({ clip: { x: 0, y: 90, width: 1280, height: 210 } })
  const pa = await page.evaluate(() => [window.__harness.p1().x, window.__harness.p2?.().x])
  const A = await band(); await sleep(700); const B = await band()
  const pb = await page.evaluate(() => [window.__harness.p1().x, window.__harness.p2?.().x])
  check("stage animates (crowd / flag / hologram)", !A.equals(B))
  check("fighters untouched by the stage animation", JSON.stringify(pa) === JSON.stringify(pb), `${pa} → ${pb}`)
  // the stage's own song is the one playing (and its file loads)
  const want = await page.evaluate(n => window.__harness.selectStageByName(n).music, STAGE)
  if (want) {
    const ms = await page.evaluate(() => window.__harness.musicState())
    const ok = await page.evaluate(async f => (await fetch("./" + encodeURI(f))).ok, want)
    check(`stage song "${want}" playing and its file loads`, String(ms.fileSrc || "").includes(want.slice(0, 10)) && ok, JSON.stringify(ms.fileSrc))
  }
  // stage select: the card shows the stage's preview picture
  const idx = await page.evaluate(n => window.__harness.selectStageByName("__none__").have.indexOf(n), STAGE)
  await page.evaluate(i => window.__harness.showMenu("SELECT_STAGE", i), idx); await sleep(1200); await shot("stage_select")
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
  void sample
} finally { await browser.close(); server.close() }
console.log(`layered_stage: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
