// HEATBLAST RENDER CHECK — boots the real game headless, picks Ben 10, starts a match, TRANSFORMS INTO HEATBLAST
// with the real ↓↓ + Heavy (slot 2) input, then drives him into BLUE FLAME with real Fireball casts, and repeats
// the check under the BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no page errors, no
// ben10_heatblast asset 404s, no black screen.  node harness/ben10_heatblast_render.mjs   → shots in ben10_work/
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "ben10_work"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = [], my404 = []
page.on("pageerror", e => jsErrors.push(String(e)))
page.on("response", r => { if (r.status() === 404 && /ben10_heatblast|heatblast/.test(r.url())) my404.push(r.url().split("/").pop()) })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
// a lit canvas (no black screen): sample the middle band of the page
async function notBlack(file) {
  const buf = await page.screenshot({ path: path.join(OUT, file) })
  const lum = await page.evaluate(() => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * 0.3), c.width, Math.floor(c.height * 0.4)).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 })
  return lum > 12 && buf.length > 20000
}
async function boot(vow = false) {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 })
  await page.mouse.click(640, 360)
  await H("start", { experimental: false }); await frames(4)   // a PRODUCTION match (not the 5-form dev loadout)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
  if (vow) await H("ben10Vow", "p1", true)
  await H("ben10SetPower", "p1", 100)
  const d = await H("ben10Details", "p1"); return d
}
async function transformSlot2() {
  await key("s", 2); await key("s", 2); await key("k", 3)   // ↓↓ + Heavy = Omnitrix slot 2
  await frames(60)
  return H("ben10Details", "p1")
}
try {
  // ── 1. plain match: Ben → Heatblast ──
  const d0 = await boot()
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(["swampfire", "heatblast", "megawhatt", "goop", "xlr8"]), "default loadout is the five ready forms", JSON.stringify(d0?.loadout))
  const d1 = await transformSlot2()
  ok(d1?.form === "heatblast", "↓↓ + Heavy (slot 2) transforms into Heatblast", `form=${d1?.form}`)
  ok(/ben10_heatblast_idle_uniform/.test(d1?.sheet || ""), "Heatblast's own sheet is active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Heatblast renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_heatblast_form.png"), "no black screen (Heatblast form)")
  // ── 2. Blue Flame via real Fireball casts (+10 Heat each) ──
  await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 180))
  for (let i = 0; i < 12; i++) { await H("ben10SetPower", "p1", 100); await H("ben10Cast", "N"); await frames(30) }
  const d2 = await H("ben10Details", "p1")
  ok(/ben10_heatblast_blue_idle_uniform/.test(d2?.sheet || ""), "BLUE FLAME: alt-pal palette strips active", d2?.sheet)
  ok(await notBlack("_heatblast_blue_flame.png"), "no black screen (Blue Flame)")
  const p1b = await H("p1"); ok(p1b?.spriteReady !== false, "Blue Flame renders as sprites")
  // a special and the ultimate actually play out in the page
  await H("ben10SetPower", "p1", 100); await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 90))
  const hp0 = (await H("p2")).health; await H("ben10Cast", "N", true); await frames(80)
  await page.screenshot({ path: path.join(OUT, "_heatblast_ult_sun.png") }); await frames(60)
  ok((await H("p2")).health < hp0, "Pyronite Meteor lands in the live game", `${hp0} → ${(await H("p2")).health}`)
  // ── 3. Binding Vow ──
  const v0 = await boot(true)
  const v1 = await transformSlot2()
  ok(!!v1?.form && ["swampfire", "heatblast", "megawhatt", "goop", "xlr8"].includes(v1.form), "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  const vf = await H("benForm", "heatblast"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "heatblast" && /ben10_heatblast/.test(v2?.sheet || ""), "Heatblast under the Binding Vow renders its own art", v2?.sheet)
  ok(await notBlack("_heatblast_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Heatblast asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nHEATBLAST RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
