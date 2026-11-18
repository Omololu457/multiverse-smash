// FEEDBACK RENDER CHECK — boots the real game headless, picks Ben 10 with Feedback in his PICK-FIVE loadout (dial slot 5), starts a
// match, TRANSFORMS INTO FEEDBACK through the Omnitrix Dial (↓↓ + P), raises PLUG GUARD (Block + Heavy) and ABSORBS a real
// opponent projectile, RETURN FIRES it, then Siphon Cable, Plasma Orb, OVERLOAD BURST, Conduit Dash, Volt Shot and FULL FEEDBACK,
// then repeats under the BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no page errors, no feedback asset
// 404s, no black screen.
//   node harness/ben10_feedback_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /feedback/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
const captureFb = () => page.evaluate(async () => {
  const X = await import("./feedback.js")
  if (!X.FEEDBACK.__fbWrapped) { const oh = X.FEEDBACK.drawHud, of = X.FEEDBACK.drawFx
    X.FEEDBACK.drawHud = function (ctx, f, o) { window.__fbLive = f; return oh(ctx, f, o) }
    X.FEEDBACK.drawFx = function (c, f, fr, opp) { window.__fbOpp = opp; return of(c, f, fr, opp) }; X.FEEDBACK.__fbWrapped = true }
  for (let i = 0; i < 120 && !window.__fbLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__fbLive
})
const fbProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./feedback.js")
  const f = window.__fbLive || null, s = f ? X.fbState(f) : null
  if (s && poke === "cool") { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = [] }
  if (s && poke === "charge40") { s.charge = 40; s.chargeT = 0 }
  if (s && poke === "pips2") { s.drain.pips = 2; s.drain.pipT = 200 }
  return s ? { charge: s.charge, stored: s.stored ? { name: s.stored.name, damage: s.stored.damage, t: s.stored.t } : null, guard: { ...s.guard },
    st: { ...s.stats }, pips: s.drain.pips, bo: s.drain.boT, cast: f._spriteCastMove || null, ult: s.ult?.phase || null, lastUltRaw: s.lastUltRaw,
    lastUlt: s.lastUlt, def: f.defenseMultiplier, siphon: !!s.siphon, oppE: window.__fbOpp ? window.__fbOpp.energy : null } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
const shoot = (dmg = 40) => H("firePortalTestProj", "p1", dmg)            // a real p2-owned projectile flying into p1 (engine path)
try {
  // ── 1. production match: Ben with Feedback picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "feedback_ov"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Feedback in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "feedback_ov", "Omnitrix Dial ↓↓ + P (slot 5) transforms into Feedback", `form=${d1?.form}`)
  ok(/ben10_feedback_ready_idle_uniform/.test(d1?.sheet || ""), "Feedback frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Feedback renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_feedback_standing.png"), "no black screen (standing)")
  ok(await captureFb(), "live Feedback captured (HUD hook)")
  ok(Math.abs(((await fbProbe())?.def ?? 0) - 0.90) < 1e-9, "defense ×0.90 live")
  // ── 2. PLUG GUARD (Block + Heavy) absorbs a real projectile → Charge + stored record ──
  await settle(10); await fbProbe("cool"); await near(500); let hpMe = (await H("p1")).health
  // the 10f window is shorter than one harness round trip under load, so Heavy (with Block held) and the incoming shot are
  // issued in ONE in-page call: the guard opens on the next game frame, the shot (55 px out at 10 px/f) arrives ~3 frames later
  await chord("keydown", [";"]); await frames(3)
  await page.evaluate(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK", bubbles: true })); window.__harness.firePortalTestProj("p1", 40) })
  await chord("keyup", ["k"]); await chord("keyup", [";"]); let replay = false
  for (let i = 0; i < 12; i++) { await frames(2); if (await page.evaluate(() => !!(window.__fbLive && window.__fbLive.attacking && window.__fbLive.currentAttack?.name === "heavy"))) replay = true }
  ok(!replay, "the Heavy press that raised Plug Guard is NOT replayed as a Heavy normal afterwards")
  const g0 = await fbProbe(); ok(g0?.st.guards === 1 && g0?.guard.cd > 0, "Block + Heavy raises Plug Guard (10f window, 5 s cooldown)", JSON.stringify(g0?.guard))
  const g1 = await fbProbe(); ok(g1?.st.absorbed === 1 && g1?.stored, "projectile ABSORBED + stored", JSON.stringify({ stored: g1?.stored, charge: g1?.charge }))
  ok((await H("p1")).health === hpMe, "absorb: 0 damage", `${hpMe} → ${(await H("p1")).health}`); ok(g1?.charge >= 20, "Charge +0.5 × damage", `charge=${g1?.charge}`)
  // ── 3. RETURN FIRE (→↓↘ + P) — straight away: the record lives 180f and a screenshot can take longer than that under load ──
  await fbProbe("cool"); await near(420); let hp = (await H("p2")).health
  await H("ben10Cast", "U"); ok(await notBlack("_feedback_absorb.png"), "no black screen (absorb → Return Fire wind-up)"); await frames(16); const rf = await fbProbe(); ok(rf?.st.returns === 1 && rf?.stored === null, "Return Fire launches the stored shot", JSON.stringify({ cast: rf?.cast }))
  ok(await notBlack("_feedback_return_fire.png"), "no black screen (Return Fire)")
  await frames(40); ok((await H("p2")).health < hp, "Return Fire lands", `${hp} → ${(await H("p2")).health}`)
  // ── 4. SIPHON CABLE (↓↙← + P): drain 15, +15 Charge ──
  await settle(); await fbProbe("cool"); await near(220); hp = (await H("p2")).health; await H("ben10SetPower", "p2", 60)
  await H("ben10Cast", "B"); await frames(12); const sc = await fbProbe(); ok(sc?.siphon && sc?.cast === "fbSiphon", "Siphon Cable (cable extending)", JSON.stringify({ cast: sc?.cast }))
  ok(await notBlack("_feedback_siphon.png"), "no black screen (Siphon Cable)")
  await frames(10); const sh = await fbProbe(); ok((await H("p2")).health < hp && sh?.st.drained >= 15, "Siphon lands + drains", JSON.stringify({ drained: sh?.st.drained, pips: sh?.pips }))
  await frames(30)
  // ── 5. PLASMA ORB at Charge 40 ──
  await settle(); await fbProbe("cool"); await fbProbe("charge40"); await near(320); hp = (await H("p2")).health
  await H("ben10Cast", "N"); await frames(18); const po = await fbProbe(); ok(po?.st.orbs === 1 && po?.charge === 0, "Plasma Orb (spends all Charge)", JSON.stringify({ charge: po?.charge }))
  ok(await notBlack("_feedback_orb.png"), "no black screen (Plasma Orb)"); await frames(30); ok((await H("p2")).health < hp, "Plasma Orb lands")
  // ── 6. OVERLOAD BURST (Charge ≥ 25) ──
  await settle(); await fbProbe("cool"); await fbProbe("charge40"); await near(100); hp = (await H("p2")).health
  await H("ben10Cast", "D"); await frames(17); const ob = await fbProbe(); ok(ob?.st.bursts === 1 && ob?.cast === "fbBurst", "Overload Burst", JSON.stringify({ cast: ob?.cast }))
  ok(await notBlack("_feedback_overload.png"), "no black screen (Overload Burst)"); await frames(10); ok((await H("p2")).health < hp, "Overload Burst lands")
  // ── 7. CONDUIT DASH (→→ + P) ──
  await settle(); await fbProbe("cool"); await near(260); hp = (await H("p2")).health
  await key("d", 2); await frames(1); await key("d", 2); await H("ben10Cast", "F"); await frames(10); const cd = await fbProbe()
  ok(cd?.st.dashes === 1 && cd?.cast === "fbDash", "Conduit Dash (→→ + P)", JSON.stringify({ cast: cd?.cast }))
  ok(await notBlack("_feedback_dash.png"), "no black screen (Conduit Dash)"); await frames(30)
  // ── 8. VOLT SHOT (air) ──
  await settle(60); await fbProbe("cool"); await near(200); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(8)
  await H("ben10Cast", "N"); await frames(10); ok((await fbProbe())?.st.volts === 1, "Volt Shot (air)"); ok(await notBlack("_feedback_volt.png"), "no black screen (Volt Shot)")
  await frames(40)
  // ── 9. FULL FEEDBACK ──
  await settle(150); await fbProbe("cool"); await near(200); await H("ben10SetPower", "p1", 100); await H("ben10SetPower", "p2", 60); hp = (await H("p2")).health
  await key("u", 3); await frames(30); const u1 = await fbProbe(); ok(u1?.ult && u1.ult !== "opener", "Full Feedback captures (cable + drain)", JSON.stringify({ ult: u1?.ult, oppE: u1?.oppE }))
  ok(await notBlack("_feedback_ult_drain.png"), "no black screen (ultimate — drain)")
  await frames(40); ok(await notBlack("_feedback_ult_pulses.png"), "no black screen (ultimate — pulses)")
  await frames(45); ok(await notBlack("_feedback_ult_discharge.png"), "no black screen (ultimate — discharge)")
  await frames(50); const u2 = await fbProbe(); ok(u2?.lastUltRaw >= 240 && u2?.lastUltRaw <= 280 && u2?.charge === 0, "ultimate: 240–280 raw, Charge → 0", JSON.stringify({ raw: u2?.lastUltRaw, hits: u2?.lastUlt?.hits }))
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`)
  ok(await notBlack("_feedback_after_ult.png"), "fighters readable after the ultimate")
  // ── 10. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "feedback_ov"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "feedback_ov" && /ben10_feedback_ready/.test(v2?.sheet || ""), "Feedback under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_feedback_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Feedback asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nFEEDBACK RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
