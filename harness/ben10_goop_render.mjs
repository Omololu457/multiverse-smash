// GOOP RENDER CHECK — boots the real game headless, picks Ben 10, starts a match, TRANSFORMS INTO GOOP with the
// real ↓↓ + Light + Heavy (slot 4) input, casts a live Acid Spit, holds ↓ + Special into PUDDLE FORM, forces a SPLAT,
// and repeats the check under the BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no page errors,
// no ben10_goop asset 404s, no black screen.  node harness/ben10_goop_render.mjs   → shots in ben10_work/
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
page.on("response", r => { if (r.status() === 404 && /goop/.test(r.url())) my404.push(r.url().split("/").pop()) })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
async function notBlack(file) {
  const buf = await page.screenshot({ path: path.join(OUT, file) })
  const lum = await page.evaluate(() => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * 0.3), c.width, Math.floor(c.height * 0.4)).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 })
  return lum > 12 && buf.length > 20000
}
async function boot(vow = false) {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 })
  await page.mouse.click(640, 360)
  await H("start", { experimental: false }); await frames(4)   // a PRODUCTION match (not the dev loadout)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
  if (vow) await H("ben10Vow", "p1", true)
  await H("ben10SetPower", "p1", 100)
  return H("ben10Details", "p1")
}
async function transformSlot4() {
  await key("s", 2); await key("s", 2)
  // ↓↓ + Light + Heavy = slot 4: both buttons go down in the SAME frame (one synchronous dispatch, like a chord)
  const chord = type => page.evaluate(t => { for (const k of ["j", "k"]) document.dispatchEvent(new KeyboardEvent(t, { key: k, code: "Key" + k.toUpperCase(), bubbles: true })) }, type)
  await chord("keydown"); await frames(3); await chord("keyup")
  await frames(60)
  return H("ben10Details", "p1")
}
// Goop's formState, read through a live projectile's owner (render check only; never written except to force a Splat)
const captureGoop = () => page.evaluate(async () => {           // wait (≤3 s) for a live Goop projectile → its owner
  const A = await import("./abilities.js")
  for (let i = 0; i < 180 && !window.__goopLive; i++) {
    const p = A.activeProjectiles.find(q => q.owner && q.owner.activeAlien === "goop"); if (p) window.__goopLive = p.owner
    await new Promise(r => requestAnimationFrame(r))
  }
  return !!window.__goopLive
})
const goopProbe = (force = null) => page.evaluate(async force => {
  const A = await import("./abilities.js"), G = await import("./goop.js")
  const p = A.activeProjectiles.find(q => q.owner && q.owner.activeAlien === "goop") || null
  const f = p ? p.owner : (window.__goopLive || null); if (f) window.__goopLive = f
  const s = f ? G.gpState(f) : null
  if (s && force === "splat") G.startSplat(f, s)
  return s ? { puddle: s.puddle?.phase || null, splat: !!s.splat, pips: s.acid.pips, cast: f._spriteCastMove || null } : null
}, force)
try {
  // ── 1. plain match: Ben → Goop (standing) ──
  const d0 = await boot()
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(["swampfire", "heatblast", "megawhatt", "goop", "xlr8"]), "default loadout includes Goop (slot 4)", JSON.stringify(d0?.loadout))
  const d1 = await transformSlot4()
  ok(d1?.form === "goop", "↓↓ + Light + Heavy (slot 4) transforms into Goop", `form=${d1?.form}`)
  ok(/ben10_goop_idle_uniform/.test(d1?.sheet || ""), "Goop frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Goop renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_goop_standing.png"), "no black screen (standing)")
  // a real special in the live game: Acid Spit (also hands the probe the live fighter via its projectile owner)
  await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 200))
  await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 700))
  await H("ben10Cast", "B"); ok(await captureGoop(), "live Goop fighter captured via his Acid Lob (in flight)")
  await frames(80); await H("ben10SetPower", "p1", 100)
  await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 200))
  const hp0 = (await H("p2")).health; await H("ben10Cast", "N"); await frames(14)
  const g0 = await goopProbe(); ok(!!g0, "Goop GAME_STATE reachable", JSON.stringify(g0))
  await frames(40)
  ok((await H("p2")).health < hp0, "Acid Spit lands in the live game", `${hp0} → ${(await H("p2")).health}`)
  ok((await goopProbe())?.pips === 1, "+1 Acid pip (HUD)")
  ok(await notBlack("_goop_acid.png"), "no black screen (Acid HUD)")
  // ── 2. PUDDLE FORM: hold ↓ + Special ──
  await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 500))
  await frames(30)
  await page.keyboard.down("s"); await frames(2); await page.keyboard.down("l"); await frames(3); await page.keyboard.up("s"); await frames(20)
  const g1 = await goopProbe(); ok(g1?.puddle === "slide", "hold ↓ + Special → Puddle Form", JSON.stringify(g1))
  ok((await H("p1"))?.spriteReady !== false, "Puddle renders as sprites")
  ok(await notBlack("_goop_puddle.png"), "no black screen (puddle)")
  await page.keyboard.up("l"); await frames(30)
  ok((await goopProbe())?.puddle === null, "release → reform")
  // ── 3. SPLAT ──
  await frames(20); const g2 = await goopProbe("splat"); await frames(12)
  const g3 = await goopProbe(); ok(g2?.splat && g3?.splat && g3?.cast === "gpSplat", "Splat (R19 puddle frames)", JSON.stringify(g3))
  ok(await notBlack("_goop_splat.png"), "no black screen (splat)")
  await frames(70); ok((await goopProbe())?.splat === false, "reforms after Splat")
  // ── 4. Binding Vow ──
  await boot(true)
  const v1 = await transformSlot4()
  ok(!!v1?.form && ["swampfire", "heatblast", "megawhatt", "goop", "xlr8"].includes(v1.form), "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "goop"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "goop" && /ben10_goop/.test(v2?.sheet || ""), "Goop under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_goop_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Goop asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nGOOP RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
