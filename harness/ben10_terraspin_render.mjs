// TERRASPIN RENDER CHECK — boots the real game headless, picks Ben 10 with Terraspin in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS INTO TERRASPIN with the real slot input ↓↓ + P, holds the real Special key for INHALE, fires
// EXHALE / WIND CHOP / SHELL SPIN, raises Shell Guard (real Block + Heavy), casts EYE OF THE STORM, then repeats under the
// BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no page errors, no terraspin asset 404s, no black
// screen — standing, during Inhale, during Shell Spin, during the ultimate and under the Vow.
//   node harness/ben10_terraspin_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /terraspin/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
const chord = (type, ks) => page.evaluate(([t, ks]) => { for (const k of ks) document.dispatchEvent(new KeyboardEvent(t, { key: k, code: k === ";" ? "Semicolon" : "Key" + k.toUpperCase(), bubbles: true })) }, [type, ks])
async function omx(ks) {
  await key("s", 2); await key("s", 2)
  await chord("keydown", ks); await frames(3); await chord("keyup", ks)
  await frames(60)
  return H("ben10Details", "p1")
}
// the live Terraspin fighter, captured through his render-only drawHud hook (called with the live fighter every frame;
// the wrapper only records the reference — no simulation effect)
const captureTs = () => page.evaluate(async () => {
  const X = await import("./terraspin.js")
  if (!X.TERRASPIN.__tsWrapped) { const orig = X.TERRASPIN.drawHud; X.TERRASPIN.drawHud = function (ctx, f, o) { window.__tsLive = f; return orig(ctx, f, o) }; X.TERRASPIN.__tsWrapped = true }
  for (let i = 0; i < 120 && !window.__tsLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__tsLive
})
const tsProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./terraspin.js")
  const f = window.__tsLive || null, s = f ? X.tsState(f) : null
  if (s && poke === "dash") s.dashTapT = s.t                                 // →→ already registered (render check: deterministic chop input)
  if (s && poke === "cool") { f.attackCooldown = 0; f._benPowerCommit = 0; s.post = 0 }
  if (s && poke === "p50") s.pressure = 50
  if (s && poke === "drag") { s.shear.immune = 0; s.shear.dragT = 0; s.shear.pips = 0; X.addShear(s, 9001); X.addShear(s, 9002); X.addShear(s, 9003) }
  return s ? { pressure: s.pressure, inhale: !!s.inhale, pulled: s.stats.pulledF, inhales: s.stats.inhales, exhales: s.stats.exhales, chops: s.stats.chops,
    spins: s.stats.spins, spin: !!s.spin, guards: s.stats.guards, cast: f._spriteCastMove || null, drag: s.shear.dragT, ult: s.ult?.phase || null,
    lastUltRaw: s.lastUltRaw, onGround: !!f.onGround, def: f.defenseMultiplier } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 70) { await frames(n); await H("ben10SetPower", "p1", 100) }
const blockTap = async k => { await chord("keydown", [";"]); await frames(2); await chord("keydown", [k]); await frames(3); await chord("keyup", [k, ";"]); await frames(4) }
try {
  // ── 1. production match: Ben with Terraspin picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "terraspin"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Terraspin in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "terraspin", "↓↓ + Charge (P, slot 5) transforms into Terraspin", `form=${d1?.form}`)
  ok(/ben10_terraspin_ready_idle_uniform/.test(d1?.sheet || ""), "Terraspin frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Terraspin renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_terraspin_standing.png"), "no black screen (standing)")
  ok(await captureTs(), "live Terraspin captured (HUD hook)")
  const st = await tsProbe(); ok(Math.abs((st?.def ?? 0) - 1.2) < 1e-9, "defense ×1.20 live", JSON.stringify({ def: st?.def }))
  // ── 2. INHALE: hold the REAL Special key (neutral) ──
  await settle(10); await tsProbe("cool"); await near(260); const x0 = (await H("p2")).x
  await chord("keydown", ["l"]); await frames(30)
  const ih = await tsProbe(); ok(ih?.inhale && /^ts(Spin|Cyclone)$/.test(ih?.cast || ""), "holding Special → INHALE (spin frames, cyclone cone)", JSON.stringify({ inhale: ih?.inhale, cast: ih?.cast, pulled: ih?.pulled }))
  ok(await notBlack("_terraspin_inhale.png"), "no black screen (during Inhale)")
  await frames(10); await chord("keyup", ["l"]); await frames(4)
  const ih2 = await tsProbe(); ok(ih2?.pulled > 0 && (await H("p2")).x < x0 && ih2?.pressure > 0, "Inhale pulled the opponent in + built Pressure", JSON.stringify({ x: `${Math.round(x0)} → ${Math.round((await H("p2")).x)}`, pressure: ih2?.pressure }))
  // ── 3. EXHALE (↓↙← + P) ──
  await settle(30); await tsProbe("cool"); await tsProbe("p50"); await near(140); const hpE = (await H("p2")).health
  await H("ben10Cast", "B"); await frames(18); const ex = await tsProbe(); ok(ex?.exhales === 1 && /^ts(Spin|Cyclone)$/.test(ex?.cast || ""), "Exhale cast (spin frames)", JSON.stringify({ cast: ex?.cast }))
  ok(await notBlack("_terraspin_exhale.png"), "no black screen (Exhale)")
  await frames(20); ok((await H("p2")).health < hpE, "Exhale lands", `${hpE} → ${(await H("p2")).health}`)
  // ── 4. WIND CHOP (→→ + P) ──
  await settle(); await tsProbe("cool"); await near(120); const hpC = (await H("p2")).health
  await tsProbe("dash"); await H("ben10Cast", "F"); await frames(16); ok((await tsProbe())?.chops === 1, "Wind Chop slicing dash (chop pose)")
  ok(await notBlack("_terraspin_chop.png"), "no black screen (Wind Chop)")
  await frames(30); ok((await H("p2")).health < hpC, "Wind Chop lands", `${hpC} → ${(await H("p2")).health}`)
  // ── 5. SHELL SPIN (←↙↓ + P) ──
  await settle(); await tsProbe("cool"); await near(110); const hpS = (await H("p2")).health
  await H("ben10Cast", "D"); await frames(12); const sp = await tsProbe(); ok(sp?.spin && /tsSpin|tsCyclone/.test(sp?.cast || ""), "Shell Spin rolling (spin frames)", JSON.stringify({ spin: sp?.spin, cast: sp?.cast }))
  ok(await notBlack("_terraspin_spin.png"), "no black screen (during Shell Spin)")
  await frames(40); ok((await H("p2")).health < hpS, "Shell Spin lands", `${hpS} → ${(await H("p2")).health}`)
  // ── 6. SHELL GUARD (real Block + Heavy) + Gale Drag on the opponent ──
  await settle(10); await tsProbe("cool"); await blockTap("k")
  const sg = await tsProbe(); ok(sg?.guards === 1, "Block + Heavy → Shell Guard (curled)", JSON.stringify({ guards: sg?.guards, cast: sg?.cast }))
  await settle(20); await tsProbe("drag"); await frames(8); const gd = await tsProbe()
  ok(gd?.drag > 0, "opponent under GALE DRAG (streaks + HUD)", JSON.stringify({ drag: gd?.drag }))
  ok(await notBlack("_terraspin_galedrag.png"), "no black screen (Gale Drag)")
  // ── 7. EYE OF THE STORM ──
  await settle(200); await tsProbe("cool"); await tsProbe("p50"); await near(120); await H("ben10SetPower", "p1", 100); const hpU = (await H("p2")).health
  await key("u", 3); await frames(60); const u1 = await tsProbe(); ok(u1?.ult && u1.ult !== "opener", "Eye of the Storm captures (pixel cyclone, chop storm)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_terraspin_ult.png"), "no black screen (ultimate — fighters readable)")
  await frames(80); const u2 = await tsProbe(); ok(u2?.lastUltRaw >= 208 && u2?.lastUltRaw <= 268 && u2?.pressure === 0, "ultimate: 208-268 raw, Pressure → 0", JSON.stringify({ raw: u2?.lastUltRaw, pressure: u2?.pressure }))
  ok((await H("p2")).health < hpU, "ultimate damage lands", `${hpU} → ${(await H("p2")).health}`)
  ok(await notBlack("_terraspin_after_ult.png"), "lighting restored after the ultimate")
  // ── 8. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "terraspin"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "terraspin" && /ben10_terraspin_ready/.test(v2?.sheet || ""), "Terraspin under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_terraspin_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Terraspin asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nTERRASPIN RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
