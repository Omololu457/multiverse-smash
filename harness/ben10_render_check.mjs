/**
 * BEN 10 RENDER CHECK (feat/ben10-omnitrix-framework, Phase 1) — boots the real game headless
 * (Playwright), picks Ben 10, and for EACH of the three human variants (Alien Force default,
 * Classic, Prime-pending) starts a match, confirms Ben RENDERS AS SPRITES (not a fallback box)
 * with a HUD and a resolved idle pose, and that there are ZERO page errors and ZERO ben10_ asset
 * 404s. Screenshots → ben10_work/. (Placeholder-alien + Binding-Vow render checks are added in the
 * phase that introduces them; this is the human-variant foundation.)
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "ben10_work"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; const my404 = []
page.on("pageerror", e => jsErrors.push(String(e)))
page.on("response", r => { if (r.status() === 404 && /ben10_/.test(r.url())) my404.push(r.url().split("/").pop()) })

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
const snap1 = () => page.evaluate(() => window.__harness.p1())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

const VARIANTS = [
  { skin: "default",      label: "Alien Force", hp: 950 },
  { skin: "ben10Classic", label: "Classic",     hp: 900 },
  { skin: "ben10Prime",   label: "Prime",       hp: 1000 },
]

try {
  for (const v of VARIANTS) {
    await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
    await page.evaluate((skin) => window.__harness.start({ p1Skin: skin }), v.skin)
    await frames(4)
    await page.evaluate(() => window.__harness.skipToBattle())
    await frames(24)

    const s1 = await snap1()
    ok(s1 && s1.key === "ben10", `[${v.label}] p1 is not ben10 (${s1 && s1.key})`)
    ok(s1 && s1.health > 0, `[${v.label}] no health (HUD)`)
    ok(s1 && s1.maxHealth === v.hp, `[${v.label}] per-variant maxHealth should be ${v.hp} (got ${s1 && s1.maxHealth})`)
    ok(s1 && s1.maxEnergy === 100, `[${v.label}] maxEnergy should be 100 (got ${s1 && s1.maxEnergy})`)
    ok(s1 && s1.hasSpriteHandler, `[${v.label}] no sprite handler (procedural box)`)
    ok(s1 && s1.spriteReady !== false, `[${v.label}] sprite not ready (fallback box / sheet missing)`)
    const act = s1 && (s1.spriteAction || s1.action || "")
    ok(/idle/.test(String(act)), `[${v.label}] not resolving idle pose at neutral (action=${act})`)
    await page.screenshot({ path: path.join(OUT, `_render_${v.skin}.png`) })
    console.log(`  ${v.label.padEnd(12)} key=${s1 && s1.key} spriteReady=${s1 && s1.spriteReady} action=${act} hp=${s1 && s1.health}/${s1 && s1.maxHealth} energy=${s1 && s1.maxEnergy}`)
  }

  // ── PLACEHOLDER ALIEN + BINDING VOW render (Phase 10 requirement) ──
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start({ p1Skin: "default" }))
  await frames(4); await page.evaluate(() => window.__harness.skipToBattle()); await frames(20)
  await page.evaluate(() => { window.__harness.ben10Vow("p1", true); window.__harness.ben10SetPower("p1", 100); window.__harness.ben10Morph("p1", 0) })
  await frames(46)
  const sv = await snap1()
  ok(sv && sv.benTransformed, "placeholder/Vow: should be transformed into an alien")
  ok(sv && sv.benPlaceholder, "placeholder/Vow: alien should render as a PLACEHOLDER (human + tint)")
  ok(sv && sv.spriteReady !== false, "placeholder/Vow: alien form must still render as sprites")
  ok(sv && sv.benOmx && sv.benOmx.vowActive, "placeholder/Vow: Binding Vow should be active")
  await page.screenshot({ path: path.join(OUT, `_render_placeholder_vow.png`) })
  console.log(`  Placeholder+Vow key=${sv && sv.key} form=${sv && sv.benForm} placeholder=${sv && sv.benPlaceholder} vow=${sv && sv.benOmx && sv.benOmx.vowActive} spriteReady=${sv && sv.spriteReady}`)

  ok(jsErrors.length === 0, `page errors: ${jsErrors.slice(0, 3).join(" | ")}`)
  ok(my404.length === 0, `ben10_ asset 404s: ${[...new Set(my404)].slice(0, 6).join(", ")}`)
} catch (e) {
  failed++; fails.push("EXCEPTION: " + String(e && e.stack || e))
} finally {
  console.log("\n════════════════════════════════════════")
  console.log(`  BEN 10 RENDER CHECK: ${passed} passed, ${failed} failed`)
  console.log("════════════════════════════════════════")
  if (fails.length) console.log(fails.map(f => "  ❌ " + f).join("\n"))
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
