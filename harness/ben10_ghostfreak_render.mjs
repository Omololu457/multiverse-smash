// GHOSTFREAK RENDER CHECK — boots the real game headless, picks Ben 10, starts a match, TRANSFORMS INTO GHOSTFREAK with
// the real SLOT 7 input ↓↓ + Up-Attack (I; the press never also launches), TOGGLES PHASE with the real Block + Light
// input, POSSESSES the opponent, shows TERROR, and repeats under the BINDING VOW.
// Confirms both fighters + HUD render (sprites, not boxes), no page errors, no ghostfreak asset 404s, no black screen.
//   node harness/ben10_ghostfreak_render.mjs   → shots in ben10_work/
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
page.on("response", r => { if (r.status() === 404 && /ghostfreak/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
async function boot(vow = false, startOpts = { experimental: false }) {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 })
  await page.mouse.click(640, 360)
  await H("start", startOpts); await frames(4)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
  if (vow) await H("ben10Vow", "p1", true)
  await H("ben10SetPower", "p1", 100)
  return H("ben10Details", "p1")
}
// a same-frame chord on document (both / all buttons go down in ONE synchronous dispatch)
const chord = (type, ks) => page.evaluate(([t, ks]) => { for (const k of ks) document.dispatchEvent(new KeyboardEvent(t, { key: k, code: "Key" + k.toUpperCase(), bubbles: true })) }, [type, ks])
async function omx(ks) {
  await key("s", 2); await key("s", 2)
  await chord("keydown", ks); await frames(3); await chord("keyup", ks)
  await frames(60)
  return H("ben10Details", "p1")
}
// Ghostfreak's live fighter, read through his Wail burst's owner (render check only)
const captureGf = () => page.evaluate(async () => {
  const A = await import("./abilities.js")
  window.__gfLive = null
  for (let i = 0; i < 180 && !window.__gfLive; i++) {
    const p = A.activeProjectiles.find(q => q.owner && q.owner.activeAlien === "ghostfreak"); if (p) window.__gfLive = p.owner
    await new Promise(r => requestAnimationFrame(r))
  }
  return !!window.__gfLive
})
const gfProbe = (force = null) => page.evaluate(async force => {
  const G = await import("./ghostfreak.js")
  const f = window.__gfLive || null, s = f ? G.gfState(f) : null
  if (s && force === "terror") { s.dread.immune = 0; for (const c of [9001, 9002, 9003]) G.addDread(f, s, c, 1) }
  return s ? { ph: s.ph, phT: s.phT, possess: !!s.possess, terror: s.dread.terrorT, pips: s.dread.pips, alpha: G.GHOSTFREAK.bodyAlpha(f),
    blocking: !!f.isBlocking, attack: f.currentAttack?.name || null, lease: f && window.__harness ? null : null } : null
}, force)
const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "ghostfreak"]   // PICK FIVE (owner, 2026-11-17): Ghostfreak is a pick in dial slot 5, not a 7th slot
try {
  // ── 1. production match: Ben with Ghostfreak picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Ghostfreak in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`, JSON.stringify(await H("alienSelectState")))
  const d1 = await omx(["p"])
  ok(d1?.form === "ghostfreak", "↓↓ + Charge (P, slot 5) transforms into Ghostfreak", `form=${d1?.form}`)
  ok(/ben10_ghostfreak_idle_uniform/.test(d1?.sheet || ""), "Ghostfreak frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Ghostfreak renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_ghostfreak_form.png"), "no black screen (tangible)")
  // live Wail (hands the probe the live fighter) + Dread pip
  await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 500))      // out of range: the burst lives its 3 frames
  await H("ben10Cast", "D"); ok(await captureGf(), "live Ghostfreak captured via his Wail"); await frames(50)
  await H("ben10SetPower", "p1", 100); await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 120)); await frames(2)
  const hp0 = (await H("p2")).health; await H("ben10Cast", "D")
  await frames(40); ok((await H("p2")).health < hp0, "Wail lands in the live game", `${hp0} → ${(await H("p2")).health}`)
  ok((await gfProbe())?.pips === 1, "Wail adds 1 Dread pip", JSON.stringify(await gfProbe()))
  await frames(40)
  // I outside the ↓↓ window is still the launcher
  await page.keyboard.down("i"); await frames(4); const la = await gfProbe(); await page.keyboard.up("i"); await frames(40)
  ok(la?.attack === "up", "a plain I press is still the Launcher", JSON.stringify(la))
  // ── 2. PHASE with the real Block + Light input ──
  await H("ben10SetPower", "p1", 100); await frames(10)
  await page.keyboard.down(";"); await frames(3); await key("j", 2); await page.keyboard.up(";"); await frames(14)
  const ph = await gfProbe()
  ok(ph?.ph === "intangible", "Block + Light → Intangible", JSON.stringify(ph))
  ok(ph?.alpha === 0.4, "body drawn at 40 % (render-only)")
  await page.keyboard.down(";"); await frames(4); const pb = await gfProbe(); await page.keyboard.up(";")
  ok(pb && !pb.blocking, "can't block while Intangible")
  ok(await notBlack("_ghostfreak_intangible.png"), "no black screen (Intangible: both fighters + HUD)")
  await frames(100); const pe = await gfProbe(); ok(pe?.ph === "materialize" || pe?.ph === "tangible", "forced out after 90f (Materialize)", JSON.stringify(pe))
  ok(await notBlack("_ghostfreak_materialize.png"), "no black screen (Materialize / lockout badge)")
  await frames(40)
  // ── 3. POSSESS ──
  await H("ben10SetPower", "p1", 100); await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 90)); await frames(4)
  const hp1 = (await H("p2")).health; await H("ben10Cast", "F"); await frames(20)
  const po = await gfProbe(); ok(po?.possess && po.alpha === 0, "Possess grabs: he is inside the opponent", JSON.stringify(po))
  ok(await notBlack("_ghostfreak_possessed.png"), "no black screen (possessed)")
  await frames(50); ok((await H("p2")).health < hp1, "Possess drains", `${hp1} → ${(await H("p2")).health}`)
  // ── 4. TERROR ──
  const te = await gfProbe("terror"); await frames(4); ok((await gfProbe())?.terror > 0, "Terror active (pale tint on the opponent, HUD)", JSON.stringify(te))
  ok(await notBlack("_ghostfreak_terror.png"), "no black screen (Terror)")
  await frames(130)
  // ── 5. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form && d0.loadout.includes(v1.form), "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "ghostfreak"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "ghostfreak" && /ben10_ghostfreak_/.test(v2?.sheet || ""), "Ghostfreak under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_ghostfreak_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Ghostfreak asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nGHOSTFREAK RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
