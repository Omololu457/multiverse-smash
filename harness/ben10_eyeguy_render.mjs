// EYEGUY RENDER CHECK — boots the real game headless, picks Ben 10, starts a match, TRANSFORMS INTO EYEGUY with the
// real SLOT 6 input ↓↓ + Ultimate (U; the press never also fires the ultimate), charges an EX Eye Orb by holding Special, shows UNBLINKING, and repeats under the BINDING VOW.
// Confirms both fighters + HUD render (sprites, not boxes), no page errors, no eyeguy asset 404s, no black screen.
//   node harness/ben10_eyeguy_render.mjs   → shots in ben10_work/
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
page.on("response", r => { if (r.status() === 404 && /eyeguy/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// Eyeguy's formState, read through a live projectile's owner (render check only; written only to show Unblinking)
const captureEg = () => page.evaluate(async () => {             // wait (≤3 s) for a live Eyeguy projectile → its owner
  const A = await import("./abilities.js")
  window.__egLive = null
  for (let i = 0; i < 180 && !window.__egLive; i++) {
    const p = A.activeProjectiles.find(q => q.owner && q.owner.activeAlien === "eyeguy"); if (p) window.__egLive = p.owner
    await new Promise(r => requestAnimationFrame(r))
  }
  return !!window.__egLive
})
const egProbe = (force = null) => page.evaluate(async force => {
  const G = await import("./eyeguy.js")
  const f = window.__egLive || null, s = f ? G.egState(f) : null
  if (s && force === "unblink") s.stare.unblinkT = 170
  return s ? { pips: s.stare.pips, unblink: s.stare.unblinkT, exOrbs: s.stats.exOrbs, orbs: s.stats.orbs, hold: !!s.orbHold, cast: f._spriteCastMove || null, drained: s.stats.drained } : null
}, force)
try {
  // ── 1. production match: Ben → Eyeguy (slot 6: ↓↓ + Ultimate) ──
  const d0 = await boot()
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(["swampfire", "heatblast", "megawhatt", "goop", "xlr8", "eyeguy"]), "default loadout: Eyeguy in slot 6", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === 6, "alien select / HUD slot cap = 6 (registry count)", JSON.stringify(await H("alienSelectState")))
  const d1 = await omx(["u"])
  ok(d1?.form === "eyeguy", "↓↓ + Ultimate (U, slot 6) transforms into Eyeguy", `form=${d1?.form}`)
  ok(d1?.ultimateCooldown === 0 && (await page.evaluate(() => window.__harness.p1().energy)) >= 50, "the U press did not also fire an ultimate", `ultCd=${d1?.ultimateCooldown}`)
  ok(/ben10_eyeguy_ready_idle_uniform/.test(d1?.sheet || ""), "Eyeguy frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Eyeguy renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_eyeguy_form.png"), "no black screen (normal form)")
  // live Hypno Wave (its slow visual wave hands the probe the live fighter)
  await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 200))
  const hp0 = (await H("p2")).health; await H("ben10Cast", "B"); ok(await captureEg(), "live Eyeguy fighter captured via his Hypno Wave")
  await frames(80); ok((await H("p2")).health < hp0, "Hypno Wave lands in the live game", `${hp0} → ${(await H("p2")).health}`)
  // ── 2. EX CHARGE: hold Special (neutral) 40f+ ──
  await H("ben10SetPower", "p1", 100); await frames(10)
  await page.keyboard.down("l"); await frames(20)
  const h1 = await egProbe(); ok(h1?.hold && h1?.cast === "egOrbHold", "holding Special charges the Eye Orb (attack → f1 hold)", JSON.stringify(h1))
  ok(await notBlack("_eyeguy_charge.png"), "no black screen (charging)")
  await frames(30); const h2 = await egProbe(); await page.keyboard.up("l")
  ok(h2?.exOrbs === 1, "40f held → EX Charged Orb (attack → f3 EX frame)", JSON.stringify(h2))
  await frames(4); ok(await notBlack("_eyeguy_ex.png"), "no black screen (EX orb)")
  await frames(60)
  // ── 3. UNBLINKING ──
  const u = await egProbe("unblink"); await frames(6)
  ok(u && (await egProbe())?.unblink > 0, "Unblinking active (eye glyph over the opponent, HUD)")
  ok(await notBlack("_eyeguy_unblinking.png"), "no black screen (Unblinking)")
  // ── 4. SLOT 6 swap: slot 1 → slot 5 XLR8 (P) → slot 6 Eyeguy (U, held 20 frames: still no ultimate) ──
  await boot(false, { experimental: true, p1Aliens: ["swampfire", "heatblast", "megawhatt", "goop", "xlr8", "eyeguy"] })
  const s0 = await H("ben10Details", "p1")
  ok(s0?.loadout?.length === 6 && s0.loadout[5] === "eyeguy", "6-slot loadout, Eyeguy in slot 6", JSON.stringify(s0?.loadout))
  const s1 = await omx(["j"]); ok(s1?.form === "swampfire", "↓↓ + Light → slot 1", `form=${s1?.form}`)
  await H("ben10SetPower", "p1", 100); await frames(120)
  const s5 = await omx(["p"]); ok(s5?.form === "xlr8", "↓↓ + Charge (P) → slot 5 XLR8 (unchanged)", `form=${s5?.form}`)
  await H("ben10SetPower", "p1", 100); await frames(120)
  await key("s", 2); await key("s", 2); await chord("keydown", ["u"]); await frames(20); await chord("keyup", ["u"]); await frames(60)
  const s2 = await H("ben10Details", "p1")
  ok(s2?.form === "eyeguy", "↓↓ + Ultimate → SLOT 6 Eyeguy (swap from XLR8)", `form=${s2?.form}`)
  ok(s2?.ultimateCooldown === 0 && (await page.evaluate(() => window.__harness.p1().energy)) >= 50, "holding U through the swap fires no ultimate", `ultCd=${s2?.ultimateCooldown}`)
  await H("ben10SetPower", "p1", 100); await frames(30); await key("u", 3); await frames(10)
  const s3 = await H("ben10Details", "p1")
  ok(s3?.ultimateCooldown > 0, "after release, a fresh U is the ultimate again (All-Seeing Eye)", `ultCd=${s3?.ultimateCooldown}`)
  ok(await notBlack("_eyeguy_slot6.png"), "no black screen (slot 6)")
  // ── 5. Binding Vow ──
  await boot(true)
  const v1 = await omx(["u"])
  ok(!!v1?.form && ["swampfire", "heatblast", "megawhatt", "goop", "xlr8", "eyeguy"].includes(v1.form), "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "eyeguy"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "eyeguy" && /ben10_eyeguy_ready/.test(v2?.sheet || ""), "Eyeguy under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_eyeguy_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Eyeguy asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nEYEGUY RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
