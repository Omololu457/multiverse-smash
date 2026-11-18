// BIG CHILL RENDER CHECK — boots the real game headless, picks Ben 10 with Big Chill in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS INTO BIG CHILL through the Omnitrix Dial (↓↓ + P), FLIES, then Freeze Breath (freezing the
// opponent), Frost Wing Cut, Ice Spire, COCOON (burst by a real projectile), PHASE DRIFT, Diving Chill and FROZEN SKY, then
// repeats under the BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no page errors, no Big Chill asset
// 404s, no black screen.
//   node harness/ben10_bigchill_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /bigchill/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Feedback fighter + his opponent, captured through his render-only drawHud / drawFx hooks (called with the live fighters
// every frame; the wrappers only record references — no simulation effect)
// the live Big Chill fighter + his opponent, captured through his render-only drawHud / drawFx hooks (the wrappers only record
// references — no simulation effect)
const capture = () => page.evaluate(async () => {
  const X = await import("./bigchill.js")
  if (!X.BIGCHILL.__wrapped) { const oh = X.BIGCHILL.drawHud, of = X.BIGCHILL.drawFx
    X.BIGCHILL.drawHud = function (ctx, f, o) { window.__bcLive = f; return oh(ctx, f, o) }
    X.BIGCHILL.drawFx = function (c, f, fr, opp) { window.__bcOpp = opp; return of(c, f, fr, opp) }; X.BIGCHILL.__wrapped = true }
  for (let i = 0; i < 120 && !window.__bcLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__bcLive
})
const probe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./bigchill.js")
  const f = window.__bcLive || null, s = f ? X.bcState(f) : null
  if (s && poke === "cool") { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = []; s.cocoonCd = 0; s.driftCd = 0 }
  if (s && poke === "pips2") { s.chill.pips = 2; s.chill.lastT = s.t; s.chill.immuneT = 0; if (window.__bcOpp) delete window.__bcOpp._benIceImmuneUntil }
  return s ? { st: { ...s.stats }, pips: s.chill.pips, frozen: !!s.chill.frozen, pops: s.chill.pops, wings: X.bcWings(f), flyT: s.flyT,
    cast: f._spriteCastMove || null, ult: s.ult?.phase || null, lastUlt: s.lastUlt, def: f.defenseMultiplier, cocoon: s.cocoon ? s.cocoon.state : null,
    drift: X.driftLive(s), immune: window.__bcOpp ? window.__bcOpp._benIceImmuneUntil ?? null : null } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
try {
  // ── 1. production match: Ben with Big Chill picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "bigchill"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Big Chill in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "bigchill", "Omnitrix Dial ↓↓ + P (slot 5) transforms into Big Chill", `form=${d1?.form}`)
  ok(/ben10_bigchill_ready_idle_uniform/.test(d1?.sheet || ""), "Big Chill frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Big Chill renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_bigchill_standing.png"), "no black screen (grounded, wings closed)")
  ok(await capture(), "live Big Chill captured (HUD hook)")
  ok((await probe())?.wings === "closed", "wings CLOSED on the ground")
  ok(Math.abs(((await probe())?.def ?? 0) - 0.95) < 1e-9, "defense ×0.95 live")
  // ── 2. FLIGHT: hold Jump in the air ──
  await near(600); await page.keyboard.down("w"); let flew = false, opened = false
  for (let i = 0; i < 20; i++) { await frames(3); const q = await probe(); if (q?.wings === "open") flew = true; if (q?.wings === "opening") opened = true }
  ok(flew, "hold Jump in the air → flight (wings OPEN)", JSON.stringify({ opened })); ok(await notBlack("_bigchill_flying.png"), "no black screen (flying)")
  await page.keyboard.up("w"); await frames(60)
  // ── 3. FREEZE BREATH (+1 Chill → the 3rd pip freezes the opponent) ──
  await settle(); await probe("cool"); await probe("pips2"); await near(140); let hp = (await H("p2")).health
  await H("ben10Cast", "N"); await frames(16); const fb = await probe(); ok(fb?.st.breaths === 1, "Freeze Breath", JSON.stringify({ cast: fb?.cast }))
  ok(await notBlack("_bigchill_breath.png"), "no black screen (Freeze Breath)")
  const fz = await probe(); ok(fz?.pops === 1, "the opponent is FROZEN (shared Popsicle, Big Chill's ice cocoon)", JSON.stringify({ frozen: fz?.frozen, pips: fz?.pips }))
  ok(await notBlack("_bigchill_frozen.png"), "no black screen (frozen opponent)"); ok((await H("p2")).health < hp, "Freeze Breath lands")
  await frames(60)
  // ── 4. FROST WING CUT ──
  await settle(); await probe("cool"); await near(260); hp = (await H("p2")).health
  await H("ben10Cast", "B"); await frames(22); const wc = await probe(); ok(wc?.st.wings === 1, "Frost Wing Cut (blade out)", JSON.stringify({ cast: wc?.cast }))
  ok(await notBlack("_bigchill_wingcut.png"), "no black screen (Frost Wing Cut)"); await frames(30); ok((await H("p2")).health < hp, "Frost Wing Cut lands")
  // ── 5. ICE SPIRE ──
  await settle(); await probe("cool"); await near(140); hp = (await H("p2")).health
  await H("ben10Cast", "U"); await frames(24); const isp = await probe(); ok(isp?.st.spires === 1, "Ice Spire (spires erupting)", JSON.stringify({ cast: isp?.cast }))
  ok(await notBlack("_bigchill_spire.png"), "no black screen (Ice Spire)"); await frames(30); ok((await H("p2")).health < hp, "Ice Spire lands")
  // ── 6. COCOON (a real p2 projectile bursts it) ──
  await settle(); await probe("cool"); await near(300)
  await page.evaluate(() => { window.__harness.ben10Cast("D"); window.__harness.firePortalTestProj("p1", 40) })
  await frames(4); ok((await probe())?.cocoon != null, "Cocoon (wings wrapped)"); ok(await notBlack("_bigchill_cocoon.png"), "no black screen (Cocoon)")
  await frames(20); ok(((await probe())?.st.cocoons || 0) === 1, "Cocoon cast", JSON.stringify((await probe())?.st))
  await frames(30)
  // ── 7. PHASE DRIFT (→→ + P) ──
  await settle(); await probe("cool"); await near(120); const x0 = (await H("p1")).x, ox = (await H("p2")).x
  await key("d", 2); await frames(1); await key("d", 2); await H("ben10Cast", "F"); await frames(8); const pd = await probe()
  ok(pd?.st.drifts === 1 && pd?.drift, "Phase Drift (intangible glide)", JSON.stringify({ cast: pd?.cast }))
  ok(await notBlack("_bigchill_drift.png"), "no black screen (Phase Drift)"); await frames(30)
  const x1 = (await H("p1")).x; ok((x1 - ox) * (x0 - ox) < 0, "Phase Drift ends on the far side of the opponent", `${x0} → ${x1} (opp ${ox})`)
  // ── 8. DIVING CHILL (air) ──
  await settle(60); await probe("cool"); await near(200); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(8)
  await H("ben10Cast", "D"); await frames(10); ok(((await probe())?.st.dives || 0) === 1, "Diving Chill (air)"); ok(await notBlack("_bigchill_dive.png"), "no black screen (Diving Chill)")
  await frames(40)
  // ── 9. FROZEN SKY ──
  await settle(150); await probe("cool"); await near(140); await H("ben10SetPower", "p1", 100); hp = (await H("p2")).health
  await key("u", 3); await frames(30); const u1 = await probe(); ok(u1?.ult && u1.ult !== "opener", "Frozen Sky captures (lift + ice cocoon)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_bigchill_ult_lift.png"), "no black screen (ultimate — lift)")
  await frames(40); ok(await notBlack("_bigchill_ult_storm.png"), "no black screen (ultimate — Winter Storm)")
  await frames(40); ok(await notBlack("_bigchill_ult_burst.png"), "no black screen (ultimate — Cocoon Burst)")
  await frames(40); const u2 = await probe(); ok(u2?.lastUlt?.raw === 240, "ultimate: 240 raw", JSON.stringify(u2?.lastUlt))
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`); ok(u2?.immune != null, "released with the shared immunity")
  ok(await notBlack("_bigchill_after_ult.png"), "fighters readable after the ultimate")
  // ── 10. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "bigchill"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "bigchill" && /ben10_bigchill_ready/.test(v2?.sheet || ""), "Big Chill under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_bigchill_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Big Chill asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nBIG CHILL RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
