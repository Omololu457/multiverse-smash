// harness/hud_themed_live.mjs
// PHASE 1 verification for the THEMED HUD overhaul (portrait + per-character accent + name plate).
// Boots REAL matches and confirms, via genuine boot → battle:
//   • both fighters render (spriteReady) AND both health bars render (HP-coloured pixels top-left + top-right)
//   • Themed (default) and Classic (ms_hud_style=classic) both render with no page errors
//   • a form-swapper, a long-name char, a child char, and an idle-crop (non-select-art) char all render
//   • FFA 3–4 players render themed bars
// Captures screenshots for each. Presentation-only — reads HP from the sim, changes no values.
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

async function boot(p1, p2, { classic = false } = {}) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.evaluate((c) => { try { localStorage.setItem("ms_hud_style", c ? "classic" : "themed") } catch (_) {} }, classic)
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" })   // reload so the style flag is read at module load
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot())
  await page.evaluate(() => window.__harness.skipToBattle())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 15000, polling: 50 }) } catch (_) {}
  try { await page.waitForFunction(() => window.__harness.spriteReady("p2")?.ready === true, null, { timeout: 8000, polling: 50 }) } catch (_) {}
  await page.waitForTimeout(400)
}
// Count HP-bar-coloured (green/amber/red, bright) pixels in a normalized canvas band.
const hpPixels = (nx, ny, nw, nh) => page.evaluate((a) => {
  const c = document.querySelector("canvas"); const cx = c.getContext("2d", { willReadFrequently: true })
  const x = Math.floor(c.width * a.nx), y = Math.floor(c.height * a.ny), w = Math.floor(c.width * a.nw), h = Math.floor(c.height * a.nh)
  const d = cx.getImageData(x, y, w, h).data; let hp = 0
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    // steel-green / bronze / blood-red bar fills — saturated, mid/bright, not UI grey
    if ((g > 90 && g > b + 20 && r < g + 60) || (r > 150 && g < 120 && b < 120) || (r > 150 && g > 110 && b < 110)) hp++
  }
  return hp
}, { nx, ny, nw, nh })
const bothSprites = () => page.evaluate(() => ({ p1: !!window.__harness.spriteReady("p1")?.ready, p2: !!window.__harness.spriteReady("p2")?.ready }))

try {
  // ── 1) Themed default — 2 players, both bars + both fighters ──
  section("Themed (default) — 2 players")
  await boot("goku", "frieza")
  let spr = await bothSprites()
  check("both fighters render", spr.p1 && spr.p2, JSON.stringify(spr))
  let L = await hpPixels(0.01, 0.0, 0.33, 0.12), R = await hpPixels(0.66, 0.0, 0.33, 0.12)
  check("P1 health bar renders (left)", L > 200, `hpPx=${L}`)
  check("P2 health bar renders (right)", R > 200, `hpPx=${R}`)
  await page.screenshot({ path: path.join(OUT, "HUD_themed_2p.png") })

  // mid-damage frame (shows the lag/ghost chunk already present in the animator)
  await page.evaluate(() => { const p = window.__harness.p2(); if (p) window.__harness.healP2 && window.__harness.healP2(0) })
  await page.evaluate(() => window.__harness.setP2Health && window.__harness.setP2Health(Math.round((window.__harness.p2().maxHealth || 1000) * 0.45)))
  await page.waitForTimeout(120)
  await page.screenshot({ path: path.join(OUT, "HUD_themed_middamage.png") })

  // ── 2) Form-swapper (madara), long name, child, idle-crop char ──
  section("Variety — form-swapper / long name / child / idle-crop")
  await boot("madara", "goku")
  spr = await bothSprites(); check("madara (form-swapper) + goku render", spr.p1 && spr.p2, JSON.stringify(spr))
  await page.screenshot({ path: path.join(OUT, "HUD_themed_formswapper.png") })

  await boot("shisui_itachi_kids", "gon")
  spr = await bothSprites()
  check("long-name 'Shisui & Itachi (Kids)' + child 'gon' render", spr.p1 && spr.p2, JSON.stringify(spr))
  L = await hpPixels(0.01, 0.0, 0.33, 0.12); R = await hpPixels(0.66, 0.0, 0.33, 0.12)
  check("both bars render (long name / child)", L > 200 && R > 200, `L=${L} R=${R}`)
  await page.screenshot({ path: path.join(OUT, "HUD_themed_longname_child.png") })

  // cell/morty are idle-crop chars that render PROCEDURALLY (no SPRITE_MANIFEST idle → spriteReady false
  // by design, the long-standing "fallback box" behaviour); the HUD must still resolve a portrait (idle
  // crop or letter fallback) and draw both bars without error.
  await boot("cell", "goku")
  spr = await bothSprites()
  check("idle-crop case live (match booted)", spr.p1 || spr.p2, JSON.stringify(spr))
  L = await hpPixels(0.01, 0.0, 0.33, 0.12); R = await hpPixels(0.66, 0.0, 0.33, 0.12)
  check("both bars render (idle-crop portrait case)", L > 200 && R > 200, `L=${L} R=${R}`)
  await page.screenshot({ path: path.join(OUT, "HUD_themed_idlecrop.png") })

  // ── 3) Classic restores the old look (no portrait) ──
  section("Classic HUD style")
  await boot("goku", "frieza", { classic: true })
  spr = await bothSprites(); check("classic: both fighters render", spr.p1 && spr.p2, JSON.stringify(spr))
  L = await hpPixels(0.01, 0.0, 0.33, 0.12); R = await hpPixels(0.66, 0.0, 0.33, 0.12)
  check("classic: both health bars render", L > 200 && R > 200, `L=${L} R=${R}`)
  await page.screenshot({ path: path.join(OUT, "HUD_classic_2p.png") })

  // ── 4) FFA 4 players ──
  section("FFA — 4 players (themed)")
  await boot("gojo", "sukuna")
  await page.evaluate(() => window.__harness.ffaStart(4, ["gojo", "sukuna", "naruto", "gon"]))
  await page.waitForTimeout(500)
  const fi = await page.evaluate(() => window.__harness.ffaInfo())
  check("4-player FFA active", fi && fi.fighters && fi.fighters.length === 4, `n=${fi?.fighters?.length}`)
  const topHp = await hpPixels(0.05, 0.02, 0.9, 0.08)
  check("FFA bars render across the top", topHp > 300, `hpPx=${topHp}`)
  await page.screenshot({ path: path.join(OUT, "HUD_themed_ffa4.png") })

  section("No page errors")
  check("zero JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "))
} catch (e) {
  console.error("ERR", e); FAIL++
  try { await page.screenshot({ path: path.join(OUT, "HUD_ERR.png") }) } catch {}
}

console.log(`\n════════════════════════════════════════\n  THEMED HUD (Phase 1): ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
await browser.close(); server.close()
process.exit(FAIL ? 1 : 0)
