// harness/hud_phase2_live.mjs
// PHASE 2 verification for the "satisfying" themed health bar. Boots a real match (P2 = the victim)
// and drives HP via the render-only harness setters, confirming (pixels + screenshots):
//   • a hit leaves a GHOST CHUNK (white→orange→red) and the front bar DRAINS smoothly over frames
//   • a HEAL fills with a green glow and leaves NO red chunk
//   • LOW HP (<25%) shows a red bar (+ CVD tick pattern / portrait pulse — screenshot)
//   • KO desaturates the portrait
//   • a big instant HP-SET / rewind SNAPS (no giant false chunk) vs a normal hit
// Presentation-only — HP values are set by the harness; the HUD only reads them.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".webp": "image/webp" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const section = t => console.log(`\n── ${t} ─────────────────────────────`)
async function frames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction((a) => window.__harness.state().frame >= a, s + n, { timeout: 15000, polling: 16 }).catch(() => {}) }

async function boot(p1, p2) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot())
  await page.evaluate(() => window.__harness.skipToBattle())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 15000, polling: 50 }) } catch (_) {}
  // NOTE: deliberately NOT enabling training-dummy mode — the training dummy auto-heals every frame,
  // which would fight our controlled setP2Health. A plain idle vs match keeps P2's HP where we set it.
  await frames(4)
}
const setP2 = (v) => page.evaluate((x) => window.__harness.setP2Health(x), v)
const koP2  = () => page.evaluate(() => window.__harness.damageP2(999999))   // setP2Health clamps to ≥1; damageP2 reaches 0
const maxHp2 = () => page.evaluate(() => window.__harness.p2().maxHealth || 1000)
// Colour-bucket counts across P2's bar band (right side, top).
const barStats = () => page.evaluate(() => {
  const c = document.querySelector("canvas"); const cx = c.getContext("2d", { willReadFrequently: true })
  const x = Math.floor(c.width * 0.68), y = Math.floor(c.height * 0.035), w = Math.floor(c.width * 0.26), h = Math.floor(c.height * 0.04)
  const d = cx.getImageData(x, y, w, h).data
  let green = 0, orange = 0, white = 0, red = 0
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    if (r > 225 && g > 225 && b > 225) white++
    else if (g > 120 && g > r - 10 && g > b + 25) green++
    else if (r > 195 && g > 115 && g < 195 && b < 115) orange++
    else if (r > 150 && g < 110 && b < 110) red++
  }
  return { green, orange, white, red }
})
try {
  await boot("goku", "frieza")

  // ── 1) HIT → ghost chunk + smooth drain (frame sequence) ──
  section("Hit — ghost chunk (white→orange→red) + smooth drain")
  await setP2(await maxHp2()); await frames(3)
  const full = await barStats()
  await setP2(Math.round((await maxHp2()) * 0.65))   // ~35% hit → chunk path (below the 45% snap threshold)
  await frames(1); const f1 = await barStats(); await page.screenshot({ path: path.join(OUT, "HUD_p2_hit_f1.png") })
  await frames(2); const f3 = await barStats(); await page.screenshot({ path: path.join(OUT, "HUD_p2_hit_f3.png") })
  await frames(4); const f7 = await barStats(); await page.screenshot({ path: path.join(OUT, "HUD_p2_hit_f7.png") })
  await frames(12); const settled = await barStats(); await page.screenshot({ path: path.join(OUT, "HUD_p2_hit_settled.png") })
  check("chunk appears right after the hit (white/orange/red)", (f1.white + f1.orange + f1.red) > 60, `w${f1.white}+o${f1.orange}+r${f1.red}`)
  check("front bar DRAINS (green shrinks full→settled)", settled.green < full.green - 40, `full=${full.green} settled=${settled.green}`)
  check("chunk resolves away after it drains", (settled.white + settled.orange) < (f1.white + f1.orange), `then o${settled.orange}/w${settled.white}`)

  // ── 2) HEAL — green glow, no red chunk ──
  section("Heal — green glow, no leftover red chunk")
  await setP2(Math.round((await maxHp2()) * 0.40)); await frames(20)
  await setP2(Math.round((await maxHp2()) * 0.85)); await frames(3)
  const heal = await barStats(); await page.screenshot({ path: path.join(OUT, "HUD_p2_heal.png") })
  check("heal shows green fill, no red chunk", heal.green > 100 && heal.red < 40, `g${heal.green} red${heal.red}`)

  // ── 3) LOW HP (<25%) ──
  section("Low HP (<25%) — red bar + CVD ticks/pulse (screenshot)")
  await setP2(Math.round((await maxHp2()) * 0.15)); await frames(16)
  const low = await barStats(); await page.screenshot({ path: path.join(OUT, "HUD_p2_lowhp.png") })
  check("low HP reads red (not green)", low.red > 20 && low.green < 80, `red${low.red} g${low.green}`)

  // ── 4) KO — bar drains to zero (+ portrait desaturates: cosmetic, see HUD_p2_ko.png) ──
  section("KO — bar drains to zero")
  await setP2(await maxHp2()); await frames(10)
  const koPre = { g: (await barStats()).green }
  await koP2(); await frames(8)
  const koPost = await barStats(); await page.screenshot({ path: path.join(OUT, "HUD_p2_ko.png") })
  check("KO drains the bar to zero", (koPost.green + koPost.orange + koPost.red + koPost.white) < 120, `coveredAfter=${koPost.green + koPost.orange + koPost.red + koPost.white}`)

  // ── 5) Round-reset style refill (no leftover chunk) ──
  section("Refill to full — no leftover chunk")
  await setP2(Math.round((await maxHp2()) * 0.3)); await frames(16)
  await setP2(await maxHp2()); await frames(16)
  const refilled = await barStats(); await page.screenshot({ path: path.join(OUT, "HUD_p2_refill.png") })
  check("full refill leaves no red/orange chunk", (refilled.red + refilled.orange) < 30 && refilled.green > 120, `g${refilled.green} o${refilled.orange} r${refilled.red}`)

  // ── 6) HP-SET / rewind SNAP vs normal hit ──
  // Discriminator = covered bar width ONE frame after the change. A normal hit holds the chunk at the
  // OLD value → bar stays ~fully covered on frame 1. A big instant set/rewind SNAPS front+trail together
  // → the lost portion is immediately empty track (much less covered).
  section("Big instant HP-set / rewind → SNAP (lost portion empties) vs normal hit (chunk holds)")
  const cov = (s) => s.green + s.orange + s.white + s.red
  await setP2(await maxHp2()); await frames(16)
  await setP2(Math.round((await maxHp2()) * 0.60)); await frames(1)   // 40% drop (<45%) → chunk HOLDS
  const hitCov = cov(await barStats())
  await setP2(await maxHp2()); await frames(16)
  await setP2(Math.round((await maxHp2()) * 0.44)); await frames(1)   // 56% drop (>45%) → SNAP
  const snapCov = cov(await barStats()); await page.screenshot({ path: path.join(OUT, "HUD_p2_snap.png") })
  check("snap empties the lost portion (no held chunk) vs a hit", snapCov < hitCov * 0.8, `snapCov=${snapCov} hitCov=${hitCov}`)

  section("No page errors")
  check("zero JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "))
} catch (e) {
  console.error("ERR", e); FAIL++
  try { await page.screenshot({ path: path.join(OUT, "HUD_P2_ERR.png") }) } catch {}
}

console.log(`\n════════════════════════════════════════\n  THEMED HUD (Phase 2): ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
await browser.close(); server.close()
process.exit(FAIL ? 1 : 0)
