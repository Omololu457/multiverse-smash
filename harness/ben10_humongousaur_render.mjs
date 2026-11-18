// HUMONGOUSAUR RENDER CHECK — boots the real game headless, picks Ben 10 with Humongousaur in his PICK-FIVE loadout (dial
// slot 5), starts a match, TRANSFORMS INTO HUMONGOUSAUR through the Omnitrix Dial (↓↓ + P), grows through every Size tier
// (NORMAL → LARGE → HUGE → GIANT → SHRINK), casts every special (Charging Tackle, Quake Slam, Roar, Crush Grab, Push Through,
// Meteor Stomp) and EXTINCTION EVENT, then repeats under the BINDING VOW. Confirms both fighters + HUD render (sprites, not
// boxes), no page errors, no humongousaur asset 404s, no black screen.
//   node harness/ben10_humongousaur_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /humongousaur/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Humongousaur fighter, captured through his render-only drawHud hook (the wrapper only records the reference)
const captureHm = () => page.evaluate(async () => {
  const X = await import("./humongousaur.js")
  if (!X.HUMONGOUSAUR.__hmWrapped) { const orig = X.HUMONGOUSAUR.drawHud; X.HUMONGOUSAUR.drawHud = function (ctx, f, o) { window.__hmLive = f; return orig(ctx, f, o) }; X.HUMONGOUSAUR.__hmWrapped = true }
  for (let i = 0; i < 120 && !window.__hmLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__hmLive
})
// test-only pokes (harness setup, like ben10SetPower): reset cooldowns, register →→, set Size / Shrink
const hmProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./humongousaur.js")
  const f = window.__hmLive || null, s = f ? X.hmState(f) : null
  if (s && poke?.dash) s.dashTapT = s.t
  if (s && poke?.cool) { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = [] }
  if (s && poke?.size != null) { s.size.v = poke.size; s.size.idleT = 0; s.size.giantT = poke.giant ? 300 : 0; s.size.shrinkT = 0 }
  if (s && poke?.shrink) X.startShrink(s)
  return s ? { tier: X.tierKey(s), size: s.size.v, st: { ...s.stats }, pips: s.tremor.pips, cast: f._spriteCastMove || null,
    ult: s.ult?.phase || null, lastUlt: s.lastUlt ? { captured: s.lastUlt.captured, raw: s.lastUlt.raw } : null, lastPush: s.lastPush ? { result: s.lastPush.result } : null,
    lastCrush: s.lastCrush ? { result: s.lastCrush.result } : null, skinTier: f._skinAnim === X.HM_FRAMESETS[X.tierKey(s)], def: f.defenseMultiplier, x: f.x } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
async function spec(dir, dx, name, shot, pre = {}) {
  await settle(); await hmProbe({ cool: true, ...pre }); if (dx != null) await near(dx)
  const hp = (await H("p2")).health; await H("ben10Cast", dir); await frames(10)
  const p = await hmProbe(); ok(p?.cast && p.cast.startsWith("hm"), name + " cast", JSON.stringify({ cast: p?.cast }))
  ok(await notBlack(shot), "no black screen (" + name + ")")
  return hp
}
try {
  // ── 1. production match: Ben with Humongousaur picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "humongousaur"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Humongousaur in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "humongousaur", "Omnitrix Dial ↓↓ + P (slot 5) transforms into Humongousaur", `form=${d1?.form}`)
  ok(/ben10_humongousaur_ready_idle_uniform/.test(d1?.sheet || ""), "Humongousaur frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Humongousaur renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_humongousaur_standing.png"), "no black screen (standing)")
  ok(await captureHm(), "live Humongousaur captured (HUD hook)")
  ok(Math.abs(((await hmProbe())?.def ?? 0) - 1.2) < 1e-9, "defense ×1.20 live")
  // ── 2. every Size tier (render-only frame-set swap per tier) ──
  for (const [v, tier, giant] of [[0, "normal"], [55, "large"], [85, "huge"], [100, "giant", true]]) {
    await near(600); await hmProbe({ size: v, giant }); await frames(4); const t = await hmProbe()
    ok(t?.tier === tier && t?.skinTier, `tier ${tier.toUpperCase()} (Size ${v}) frame set`, JSON.stringify({ tier: t?.tier }))
    ok(await notBlack(`_humongousaur_tier_${tier}.png`), `no black screen (${tier})`)
  }
  await hmProbe({ shrink: true }); await frames(4); const sh = await hmProbe(); ok(sh?.tier === "shrink" && sh?.skinTier, "SHRINK frame set", JSON.stringify({ tier: sh?.tier }))
  ok(await notBlack("_humongousaur_tier_shrink.png"), "no black screen (shrink)")
  await hmProbe({ size: 0 }); await frames(4)
  // ── 3. every special ──
  let hp = await spec("F", 260, "Charging Tackle", "_humongousaur_tackle.png", { dash: true }); await frames(40); ok((await H("p2")).health < hp, "Charging Tackle lands", `${hp} → ${(await H("p2")).health}`)
  hp = await spec("N", 180, "Quake Slam", "_humongousaur_quake.png"); await frames(30); ok((await H("p2")).health < hp, "Quake Slam lands", `${hp} → ${(await H("p2")).health}`)
  hp = await spec("B", 110, "Roar", "_humongousaur_roar.png"); await frames(16); ok((await hmProbe())?.st.roars >= 1, "Roar (+30 Size)", JSON.stringify({ size: (await hmProbe())?.size }))
  await hmProbe({ size: 0 })
  hp = await spec("D", 90, "Crush Grab", "_humongousaur_crush.png"); await frames(20); ok(await notBlack("_humongousaur_crush_hold.png"), "no black screen (Crush hold)")
  await frames(40); ok((await hmProbe())?.st.crushes >= 1, "Crush Grab resolved", JSON.stringify((await hmProbe())?.lastCrush))
  hp = await spec("U", 110, "Push Through", "_humongousaur_push.png"); await frames(60); ok((await hmProbe())?.lastPush, "Push Through ends (splat / shove / none)", JSON.stringify((await hmProbe())?.lastPush))
  await settle(60); await hmProbe({ cool: true }); await near(220); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(10)
  await H("ben10Cast", "N"); await frames(6); const sp = await hmProbe(); ok(sp?.st.stomps >= 1, "Meteor Stomp (air)", JSON.stringify({ cast: sp?.cast }))
  ok(await notBlack("_humongousaur_stomp.png"), "no black screen (Meteor Stomp)")
  await frames(40); ok((await hmProbe())?.st.shocks >= 1, "Meteor Stomp landing shockwave"); ok(await notBlack("_humongousaur_stomp_land.png"), "no black screen (landing)")
  // ── 4. EXTINCTION EVENT ──
  await settle(150); await hmProbe({ cool: true, size: 70 }); await near(90); await H("ben10SetPower", "p1", 100); hp = (await H("p2")).health
  await key("u", 3); await frames(40); const u1 = await hmProbe(); ok(u1?.ult && u1.ult !== "opener", "Extinction Event captures (GROW)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_humongousaur_ult_grow.png"), "no black screen (ultimate — grow)")
  await frames(40); ok(await notBlack("_humongousaur_ult_stomps.png"), "no black screen (ultimate — stomps / debris)")
  await frames(40); ok(await notBlack("_humongousaur_ult_slam.png"), "no black screen (ultimate — tail slam)")
  await frames(60); const u2 = await hmProbe(); ok(u2?.lastUlt?.captured && u2.lastUlt.raw >= 240 && u2.lastUlt.raw <= 280, "ultimate: 240–280 raw", JSON.stringify(u2?.lastUlt))
  ok(u2?.tier === "shrink", "SHRINK after the ultimate", u2?.tier)
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`)
  ok(await notBlack("_humongousaur_after_ult.png"), "camera / scale restored, fighters readable after the ultimate")
  // ── 5. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "humongousaur"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "humongousaur" && /ben10_humongousaur_ready/.test(v2?.sheet || ""), "Humongousaur under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_humongousaur_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Humongousaur asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nHUMONGOUSAUR RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
