// BENWOLF RENDER CHECK — boots the real game headless, picks Ben 10 with BenWolf in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS INTO BENWOLF through the Omnitrix Dial (↓↓ + P), casts every special (Sonic Howl + hold, Claw
// Rake, Pounce, Rising Howl, Low Howl, Dive Claw), LUPINE DODGE with the real ←← + Light input, builds HUNTED, fires HOWLING
// MOON (a whiff → 300f moon, and a clean hit → capture + 600f moon), on a BRIGHT stage and a DARK stage, mid-howl under the
// moon, then under the BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes) in the night state, no page
// errors, no benwolf asset 404s, no black screen.
//   node harness/ben10_benwolf_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /benwolf/.test(r.url())) my404.push(r.url().split("/").pop()) })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
// luminance of the canvas: the whole middle band (black-screen test) and the top band (the sky: night tint test)
const lum = (y0, y1) => page.evaluate(([a, b]) => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * a), c.width, Math.floor(c.height * (b - a))).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 }, [y0, y1])
async function notBlack(file) { const buf = await page.screenshot({ path: path.join(OUT, file) }); return (await lum(0.3, 0.7)) > 12 && buf.length > 20000 }
async function boot(stage, vow = false) {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 })
  await page.mouse.click(640, 360)
  await H("start", { experimental: false, p1Aliens: PICK }); await frames(4)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
  const st = await H("selectStageByName", stage); await frames(10)
  if (vow) await H("ben10Vow", "p1", true)
  await H("ben10SetPower", "p1", 100)
  return { st, d: await H("ben10Details", "p1") }
}
const chord = (type, ks) => page.evaluate(([t, ks]) => { for (const k of ks) document.dispatchEvent(new KeyboardEvent(t, { key: k, code: k === ";" ? "Semicolon" : "Key" + k.toUpperCase(), bubbles: true })) }, [type, ks])
async function omx(ks) {
  await key("s", 2); await key("s", 2)
  await chord("keydown", ks); await frames(3); await chord("keyup", ks)
  await frames(60)
  return H("ben10Details", "p1")
}
// the live BenWolf fighter, captured through his render-only drawHud hook (the wrapper only records the reference)
const captureBw = () => page.evaluate(async () => {
  const X = await import("./benwolf.js"); window.__BW = X; window.__bwLive = null
  if (!X.BENWOLF.__bwWrapped) { const orig = X.BENWOLF.drawHud; X.BENWOLF.drawHud = function (ctx, f, o) { window.__bwLive = f; return orig(ctx, f, o) }; X.BENWOLF.__bwWrapped = true }
  for (let i = 0; i < 120 && !window.__bwLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__bwLive
})
// test-only pokes (harness setup, like ben10SetPower): reset cooldowns, register →→, preload Scent pips
const bw = (poke = null) => page.evaluate(async poke => {
  const X = await import("./benwolf.js")
  const f = window.__bwLive || null, s = f ? X.bwState(f) : null
  if (s && poke?.dash) s.dashTapT = s.t
  if (s && poke?.cool) { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = []; s.dodgeCd = 0 }
  if (s && poke?.pips != null) { s.scent.pips = poke.pips; s.scent.lastT = s.t; s.scent.immuneT = 0 }
  return s ? { pips: s.scent.pips, hunted: s.scent.hunted, st: { ...s.stats }, cast: f._spriteCastMove || null, ring: !!s.ring, lowRing: !!s.lowRing, howl: s.howl ? { hold: s.howl.hold, holding: s.howl.holding } : null,
    ult: s.ult?.phase || null, moon: s.moonTimer, moonDur: s.moonDur, lastUlt: s.lastUlt ? { captured: s.lastUlt.captured, raw: s.lastUlt.raw, bonus: s.lastUlt.bonus } : null,
    night: X.nightLevel(f, s), dodge: !!s.dodge, inv: f.invulnTimer || 0, cd: f.attackCooldown, pc: f._benPowerCommit || 0 } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
async function spec(dir, dx, name, shot, pre = {}, wait = 10) {
  await settle(); await bw({ cool: true, ...pre }); if (dx != null) await near(dx)
  const hp = (await H("p2")).health; await H("ben10Cast", dir); await frames(wait)
  const p = await bw(); ok(p?.cast && p.cast.startsWith("bw"), name + " cast", JSON.stringify({ cast: p?.cast }))
  ok(await notBlack(shot), "no black screen (" + name + ")")
  return hp
}
async function sprites(tag) {
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, `BenWolf renders as sprites (${tag})`, `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, `opponent renders as sprites (${tag})`)
  ok(p1?.health > 0 && p2?.health > 0, `both HP bars live (${tag})`)
}
// an in-page Special HOLDER: keeps the real Special key (L) down for n frames from the cast (sim-clock exact, no round trip)
const holdSpecial = n => page.evaluate(n => { const ev = t => document.dispatchEvent(new KeyboardEvent(t, { key: "l", code: "KeyL", bubbles: true })); let k = 0
  ev("keydown"); const tick = () => { if (++k >= n) { ev("keyup"); return } requestAnimationFrame(tick) }; tick() }, n)
const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "benwolf"]
const BRIGHT = "World Tournament Arena", DARK = "Null Void"
try {
  // ── 1. production match on a BRIGHT stage: BenWolf picked into slot 5 (PICK FIVE; the slot count read from the registry) ──
  const b0 = await boot(BRIGHT)
  ok(b0.st?.name === BRIGHT, "bright stage selected", JSON.stringify(b0.st?.name))
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(b0.d?.loadout) === JSON.stringify(PICK), "picked loadout: BenWolf in slot 5", JSON.stringify(b0.d?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "benwolf", "Omnitrix Dial ↓↓ + P (slot 5) transforms into BenWolf", `form=${d1?.form}`)
  ok(/ben10_benwolf_ready_idle_uniform/.test(d1?.sheet || ""), "BenWolf frame set active", d1?.sheet)
  await sprites("standing")
  const skyDay = await lum(0, 0.25)
  ok(await notBlack("_benwolf_standing.png"), "no black screen (standing)")
  ok(await captureBw(), "live BenWolf captured (HUD hook)")
  // ── 2. LUPINE DODGE with the real ←← + Light input (Ben faces right: ← = back) ──
  await settle(20); await bw({ cool: true }); await near(500)
  await key("a", 2); await frames(2); await key("a", 2); await page.keyboard.down("j"); await frames(5); const dg = await bw(); await page.keyboard.up("j")
  ok(dg?.dodge || dg?.st.dodges >= 1, "←← + Light → Lupine Dodge (no jab)", JSON.stringify({ dodges: dg?.st.dodges, inv: dg?.inv }))
  ok(await notBlack("_benwolf_dodge.png"), "no black screen (Lupine Dodge)")
  // ── 3. every special ──
  let hp = await spec("N", 260, "Sonic Howl", "_benwolf_howl.png", {}, 14); await frames(40); ok((await bw())?.st.howlTicks >= 1, "Sonic Howl ring lands", JSON.stringify((await bw())?.st.howlTicks))
  await settle(); await bw({ cool: true }); await near(700); await holdSpecial(70); await H("ben10Cast", "N"); await frames(26)
  const hh = await bw(); ok(hh?.howl?.holding || hh?.st.howlHolds >= 1, "Sonic Howl HOLD sustains (rings re-emitted)", JSON.stringify(hh?.howl))
  ok(await notBlack("_benwolf_howl_hold.png"), "no black screen (Sonic Howl hold)"); await frames(50)
  hp = await spec("F", 200, "Claw Rake", "_benwolf_rake.png", { dash: true }, 14); await frames(40); ok((await bw())?.st.rakeHits >= 1, "Claw Rake lands", JSON.stringify((await bw())?.st.rakeHits))
  hp = await spec("B", 220, "Pounce", "_benwolf_pounce.png", {}, 10); await frames(40); ok((await bw())?.st.pounceHits >= 1, "Pounce lands", `${hp} → ${(await H("p2")).health}`)
  hp = await spec("U", 60, "Rising Howl", "_benwolf_rise.png", {}, 12); await frames(40); ok((await H("p2")).health < hp, "Rising Howl lands")
  hp = await spec("D", 220, "Low Howl", "_benwolf_low.png", {}, 18); await frames(50); ok((await bw())?.st.lowTicks >= 1, "Low Howl wave lands")
  await settle(80); await bw({ cool: true }); await near(160); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(10)
  await H("ben10Cast", "N"); await frames(6); const dv = await bw(); ok(dv?.st.dives >= 1, "Dive Claw (air)", JSON.stringify({ cast: dv?.cast }))
  ok(await notBlack("_benwolf_dive.png"), "no black screen (Dive Claw)"); await frames(50)
  // ── 4. HUNTED (2 Scent pips preloaded, a real Pounce lands the third) ──
  await settle(100); await bw({ cool: true, pips: 2 }); await near(220); await H("ben10Cast", "B"); await frames(40)
  const hu = await bw(); ok(hu?.hunted > 0, "Scent 3 → HUNTED (paw print)", JSON.stringify({ hunted: hu?.hunted, pips: hu?.pips }))
  ok(await notBlack("_benwolf_hunted.png"), "no black screen (Hunted)")
  // ── 5. HOWLING MOON — a WHIFF (opponent far): 300f moon, no capture; the night falls on the BRIGHT stage ──
  await settle(80); await bw({ cool: true }); await near(900); await H("ben10SetPower", "p1", 100); hp = (await H("p2")).health
  await key("u", 3); await frames(50); const w1 = await bw()
  ok(w1?.lastUlt && w1.lastUlt.captured === false && w1.moonDur === 300, "Howling Moon whiff: no capture, Full Moon 300f", JSON.stringify({ lastUlt: w1?.lastUlt, moonDur: w1?.moonDur }))
  ok((await H("p2")).health === hp, "whiff: no damage")
  ok(w1?.night >= 1, "the night has fallen (render level 1)", String(w1?.night))
  const skyNight = await lum(0, 0.25); ok(skyNight < skyDay * 0.8, "bright stage: the sky darkens to night", `${skyDay.toFixed(0)} → ${skyNight.toFixed(0)}`)
  await sprites("night, bright stage")
  ok(await notBlack("_benwolf_night_bright.png"), "no black screen (Full Moon, bright stage)")
  await bw({ cool: true }); await near(260); await H("ben10Cast", "N"); await frames(14); ok(await notBlack("_benwolf_moon_howl.png"), "no black screen (mid-howl under the Full Moon)")
  await frames(300); const w2 = await bw(); ok(w2?.moon === 0, "the moon ends on its timer", String(w2?.moon)); await frames(40)
  ok((await bw())?.night === 0, "the night fades back to the stage"); ok((await lum(0, 0.25)) > skyNight * 1.1, "bright stage restored")
  // ── 6. HOWLING MOON — a CLEAN HIT on the DARK stage (once per transformation: a fresh boot) ──
  const k0 = await boot(DARK); ok(k0.st?.name === DARK, "dark stage selected"); await omx(["p"]); ok(await captureBw(), "BenWolf on the dark stage")
  await settle(30); await bw({ cool: true }); await near(140); await H("ben10SetPower", "p1", 100); hp = (await H("p2")).health
  await key("u", 3); await frames(36); const u1 = await bw(); ok(u1?.ult && u1.ult !== "opener", "Howling Moon captures (clean opener)", JSON.stringify({ ult: u1?.ult }))
  await sprites("ult, dark stage")
  ok(await notBlack("_benwolf_ult_claws_dark.png"), "no black screen (ultimate — moonlit claws, dark stage)")
  await frames(36); ok(await notBlack("_benwolf_ult_pounce_dark.png"), "no black screen (ultimate — Lunar Pounce, dark stage)")
  await frames(80); const u2 = await bw(); ok(u2?.lastUlt?.captured && u2.lastUlt.raw === 240, "ultimate: 240 raw", JSON.stringify(u2?.lastUlt))
  ok(u2?.moonDur === 600 && u2.moon > 400, "Full Moon 600f runs on after the capture", JSON.stringify({ moon: u2?.moon }))
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`)
  await sprites("Full Moon, dark stage")
  ok(await notBlack("_benwolf_night_dark.png"), "camera restored, fighters readable under the Full Moon (dark stage)")
  // ── 7. Binding Vow ──
  await boot(BRIGHT, true)
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "benwolf"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "benwolf" && /ben10_benwolf_ready/.test(v2?.sheet || ""), "BenWolf under the Binding Vow renders his own art", v2?.sheet)
  ok(await captureBw(), "BenWolf captured under the Vow"); await bw({ cool: true }); await near(260); await H("ben10SetPower", "p1", 100); await H("ben10Cast", "N"); await frames(14)
  ok(await notBlack("_benwolf_vow.png"), "no black screen (Vow, mid-howl)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no BenWolf asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nBENWOLF RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
