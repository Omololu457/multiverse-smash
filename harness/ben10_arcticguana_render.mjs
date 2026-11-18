// ARCTICGUANA RENDER CHECK — boots the real game headless, picks Ben 10 with Arcticguana in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS INTO ARCTICGUANA through the Omnitrix Dial (↓↓ + P), forms the FROST COAT with the real Block +
// Light input, casts every special (Ice Breath, Ice Shard, Frost Cloud, Ice Slide, Freeze Beam, Icicle Drop), freezes the
// opponent into a POPSICLE, SHATTERS it with a real Heavy, fires ABSOLUTE POPSICLE, then repeats under the BINDING VOW.
// Confirms both fighters + HUD render (sprites, not boxes), no page errors, no arcticguana asset 404s, no black screen.
//   node harness/ben10_arcticguana_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /arcticguana/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Arcticguana fighter, captured through his render-only drawHud hook (the wrapper only records the reference)
const captureAg = () => page.evaluate(async () => {
  const X = await import("./arcticguana.js"); window.__AG = X
  if (!X.ARCTICGUANA.__agWrapped) { const orig = X.ARCTICGUANA.drawHud; X.ARCTICGUANA.drawHud = function (ctx, f, o) { window.__agLive = f; return orig(ctx, f, o) }; X.ARCTICGUANA.__agWrapped = true }
  for (let i = 0; i < 120 && !window.__agLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__agLive
})
// test-only pokes (harness setup, like ben10SetPower): reset cooldowns, register →→, preload Chill pips
const agProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./arcticguana.js")
  const f = window.__agLive || null, s = f ? X.agState(f) : null
  if (s && poke?.dash) s.dashTapT = s.t
  if (s && poke?.cool) { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = []; s.coat.cd = 0 }
  if (s && poke?.pips != null) { s.chill.pips = poke.pips; s.chill.lastT = s.t; s.chill.immuneT = 0 }
  return s ? { coat: s.coat.state, pips: s.chill.pips, frozen: !!s.chill.frozen, ends: s.chill.ends.slice(), shatters: s.chill.shatters, pops: s.chill.pops,
    st: { ...s.stats }, cast: f._spriteCastMove || null, cloud: !!s.cloud, ult: s.ult?.phase || null,
    lastUlt: s.lastUlt ? { captured: s.lastUlt.captured, raw: s.lastUlt.raw } : null, def: f.defenseMultiplier, cd: f.attackCooldown, pc: f._benPowerCommit || 0 } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
async function spec(dir, dx, name, shot, pre = {}, wait = 10) {
  await settle(); await agProbe({ cool: true, ...pre }); if (dx != null) await near(dx)
  const hp = (await H("p2")).health; await H("ben10Cast", dir); await frames(wait)
  const p = await agProbe(); ok(p?.cast && p.cast.startsWith("ag"), name + " cast", JSON.stringify({ cast: p?.cast }))
  ok(await notBlack(shot), "no black screen (" + name + ")")
  return hp
}
try {
  // ── 1. production match: Ben with Arcticguana picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "arcticguana"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Arcticguana in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "arcticguana", "Omnitrix Dial ↓↓ + P (slot 5) transforms into Arcticguana", `form=${d1?.form}`)
  ok(/ben10_arcticguana_ready_idle_uniform/.test(d1?.sheet || ""), "Arcticguana frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Arcticguana renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_arcticguana_standing.png"), "no black screen (standing)")
  ok(await captureAg(), "live Arcticguana captured (HUD hook)")
  // ── 2. FROST COAT with the real Block + Light input ──
  await near(600); await page.keyboard.down(";"); await frames(3); await key("j", 2); await page.keyboard.up(";"); await frames(20)
  const co = await agProbe(); ok(co?.coat === "on", "Block + Light → Frost Coat (14f to form)", JSON.stringify({ coat: co?.coat, def: co?.def }))
  ok(await notBlack("_arcticguana_coat.png"), "no black screen (Frost Coat)")
  // ── 3. every special ──
  let hp = await spec("N", 160, "Ice Breath", "_arcticguana_breath.png", {}, 22); await frames(30); ok((await H("p2")).health < hp, "Ice Breath lands", `${hp} → ${(await H("p2")).health}`)
  hp = await spec("B", 300, "Ice Shard", "_arcticguana_shard.png", {}, 10); await frames(30); ok((await agProbe())?.st.shardHits >= 1, "Ice Shard lands (one hit)")
  hp = await spec("U", 700, "Frost Cloud", "_arcticguana_cloud_cast.png", {}, 6); await frames(12); ok((await agProbe())?.cloud, "Frost Cloud settles")
  ok(await notBlack("_arcticguana_cloud.png"), "no black screen (Frost Cloud)")
  hp = await spec("F", 260, "Ice Slide", "_arcticguana_slide.png", { dash: true }, 12); await frames(30); ok((await agProbe())?.st.slides >= 1, "Ice Slide")
  hp = await spec("D", 250, "Freeze Beam", "_arcticguana_beam_charge.png", {}, 12); await frames(16); ok(await notBlack("_arcticguana_beam.png"), "no black screen (Freeze Beam hold)")
  await frames(50); ok((await agProbe())?.st.beamTicks >= 1, "Freeze Beam ticks")
  await settle(60); await agProbe({ cool: true }); await near(200); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(10)
  await H("ben10Cast", "N"); await frames(6); const ic = await agProbe(); ok(ic?.st.icicles >= 1, "Icicle Drop (air)", JSON.stringify({ cast: ic?.cast }))
  ok(await notBlack("_arcticguana_icicle.png"), "no black screen (Icicle Drop)"); await frames(40)
  // ── 4. POPSICLE (Freeze Beam's first tick = the 3rd pip) + SHATTER with a real Heavy ──
  await settle(80); await agProbe({ cool: true, pips: 2 }); await near(120); await H("ben10Cast", "D")
  await page.waitForFunction(() => { const s = window.__agLive && window.__AG.agState(window.__agLive); return !!(s && s.chill.frozen) }, null, { timeout: 5000, polling: 16 }).catch(() => {})
  const fz = await agProbe(); ok(fz?.frozen, "the opponent is frozen into a POPSICLE", JSON.stringify({ pops: fz?.pops }))
  ok(await notBlack("_arcticguana_popsicle.png"), "no black screen (Popsicle)")
  await frames(40); ok((await agProbe())?.ends.at(-1) === "expire", "the Popsicle thaws on its own (30 ticks)")
  // second freeze: an in-page actor presses the real Heavy key (K) on the FIRST frame he can act after the beam breaks off
  // (installed BEFORE the cast: a Playwright round-trip / screenshot inside the 30 ticks would lose the frames a player has)
  await settle(60); await agProbe({ cool: true, pips: 2 }); await near(120)
  await page.evaluate(() => { const ev = t => document.dispatchEvent(new KeyboardEvent(t, { key: "k", code: "KeyK", bubbles: true })); let n = 0, down = -1
    const tick = () => { const f = window.__agLive, s = window.__AG.agState(f); n++
      if (down < 0 && s?.chill.frozen && !(f.attackCooldown > 0) && !(f._benPowerCommit > 0)) { window.__agPressAt = s.chill.frozen.t; ev("keydown"); down = n }
      if (down >= 0 && n - down >= 3) { ev("keyup"); return } if (n < 240) requestAnimationFrame(tick) }; tick() })
  await H("ben10Cast", "D"); await frames(70); console.log("   Heavy pressed on Popsicle tick", await page.evaluate(() => window.__agPressAt))
  const sh = await agProbe(); ok(sh?.shatters >= 1 && sh.ends.at(-1) === "shatter", "a real Heavy SHATTERS the Popsicle (+25 once)", JSON.stringify({ ends: sh?.ends }))
  ok(await notBlack("_arcticguana_shatter.png"), "no black screen (Shatter)")
  // ── 5. ABSOLUTE POPSICLE ──
  await settle(150); await agProbe({ cool: true }); await near(140); await H("ben10SetPower", "p1", 100); hp = (await H("p2")).health
  await key("u", 3); await frames(40); const u1 = await agProbe(); ok(u1?.ult && u1.ult !== "opener", "Absolute Popsicle captures (frozen solid)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_arcticguana_ult_frozen.png"), "no black screen (ultimate — giant popsicle)")
  await frames(40); ok(await notBlack("_arcticguana_ult_carve.png"), "no black screen (ultimate — carving)")
  await frames(36); ok(await notBlack("_arcticguana_ult_shatter.png"), "no black screen (ultimate — final shatter)")
  await frames(60); const u2 = await agProbe(); ok(u2?.lastUlt?.captured && u2.lastUlt.raw === 240, "ultimate: 240 raw", JSON.stringify(u2?.lastUlt))
  ok(!u2?.frozen, "released unfrozen")
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`)
  ok(await notBlack("_arcticguana_after_ult.png"), "camera restored, fighters readable after the ultimate")
  // ── 6. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "arcticguana"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "arcticguana" && /ben10_arcticguana_ready/.test(v2?.sheet || ""), "Arcticguana under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_arcticguana_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Arcticguana asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nARCTICGUANA RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
