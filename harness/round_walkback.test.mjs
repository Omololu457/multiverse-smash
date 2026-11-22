// harness/round_walkback.test.mjs — MK1-style round end: the fight stops, the fallen fighter gets up, both fighters go back to
// their marks — speedsters (MS_V1 Wind Ranger) DASH there, walkers (S.P.D. Red) walk at their own pace within 5 s; no snap.
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
async function run(p1key) {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=${p1key}&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "dummy" }); window.__harness.skipToBattle() })
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" && s.countdown === 0 }, null, { timeout: 30000 })
  await page.keyboard.down("KeyD"); await sleep(3000); await page.keyboard.up("KeyD")   // walk p1 well off its mark
  await page.evaluate(() => { const H = window.__harness, q = H.p1(); H.brutality.setHp("p1", Math.round((q.maxHealth || 1000) * 0.4)) })   // p1 took real damage
  await page.evaluate(() => window.__harness.forceP1Win())
  await page.waitForFunction(() => window.__harness.state().gameState === "roundBreak", null, { timeout: 15000 })
  const log = [], t0 = Date.now(); let maxDrops = 0
  while (Date.now() - t0 < 90000) { const s = await page.evaluate(() => { const H = window.__harness, a = H.p1(), b = H.p2(), st = H.state(); return { fr: st.frame, g: st.gameState, a: { x: a.x, vx: a.vx, f: a.facing }, b: { x: b.x, kd: !!b.knockdownState, hs: b.hitstun || 0 }, tp: !!a._tauntPlaying || (a.attacking ? a.currentMove : null) } }); log.push(s)
    if (s.g === "battle") break; if (log.length % 10 === 0) { const r = await page.evaluate(async () => (await import("./roundBreakFx.js")).rbfxState()); maxDrops = Math.max(maxDrops, r.drops + r.pools) }
    if (log.length % 10 === 0) await page.screenshot({ path: path.join(OUT, `${p1key}_${String(log.length).padStart(3, "0")}.png`) }); await sleep(25) }
  const brk = log.filter(s => s.g === "roundBreak"), mv = brk.filter(s => Math.abs(s.a.vx || 0) > 1), last = brk[brk.length - 1], nxt = log[log.length - 1]
  if (process.env.TRACE) console.log(p1key, mv.map(s => s.fr + ":" + s.a.x.toFixed(0) + "/" + s.a.vx.toFixed(1)).join(" "))
  const span = mv.length ? mv[mv.length - 1].fr - mv[0].fr : 0, vmax = Math.max(0, ...mv.map(s => Math.abs(s.a.vx)))
  const after = brk.filter(s => s.tp && s.b.hs > 0)
  return { brk, mv, last, nxt, span, vmax, after, maxDrops }
}
try {
  { const r = await run("windrangers")   // MS_V1 Wind Ranger: Ninja Streak → dashes back
    check("the loser stays down, then gets up", r.brk.some(s => s.b.kd) && !r.last.b.kd)
    check("MS_V1 Wind Ranger DASHES back to the mark (fast, done in well under a second)", r.vmax >= 20 && r.span <= 40, JSON.stringify({ vmax: r.vmax, frames: r.span }))
    check("…and reaches it: the next round starts where he stopped (no snap)", r.nxt.g === "battle" && Math.abs(r.nxt.a.x - r.last.a.x) < 3, JSON.stringify([r.last.a.x, r.nxt.a.x])) }
  { const r = await run("spd_red")   // S.P.D. Red: a normal walker → walks back (hurt → limping), within 5 s
    check("S.P.D. Red WALKS back facing the opponent at a walking pace (not a dash, not a crawl)", r.vmax > 2 && r.vmax < 12 && r.mv.every(s => s.a.f === 1), JSON.stringify({ vmax: +r.vmax.toFixed(2) }))
    check("…and gets there within 5 seconds", r.span > 10 && r.span <= 300, JSON.stringify({ frames: r.span }))
    check("…the next round starts where he stopped (no snap)", r.nxt.g === "battle" && Math.abs(r.nxt.a.x - r.last.a.x) < 3, JSON.stringify([r.last.a.x, r.nxt.a.x])) }
  { const r = await run("goku")   // the aftermath: once both are on their marks the winner taunts and the loser stands hurt, bleeding a little
    check("on their marks, the round's WINNER taunts while the LOSER stands hurt (≈1.7 s)", r.after.length >= 5 && r.after.every(s => s.a.x === r.last.a.x || Math.abs(s.a.vx || 0) < 0.01), JSON.stringify({ n: r.after.length, pose: r.after[0]?.tp }))
    check("…and the loser drips blood once they're up (drops falling + pooling)", r.maxDrops >= 3, JSON.stringify({ maxDrops: r.maxDrops }))
    check("…then the next round starts normally", r.nxt.g === "battle", JSON.stringify({ brk: r.brk.length, nxt: r.nxt?.g, last: r.last })) }
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`round_walkback: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
