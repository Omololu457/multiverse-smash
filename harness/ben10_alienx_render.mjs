// ALIEN X RENDER CHECK — boots the real game headless, picks Ben 10 with Alien X in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS INTO ALIEN X with the real slot input ↓↓ + P, cycles the THREE VOICES with the real
// Block + Light tap, casts every Decree (Nullify / Gravity / Rewind / Void Grasp / Starfall Dash) and Absolute Decree,
// then repeats under the BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no page errors, no
// alienx asset 404s, no black screen — in each stance and during Nullify / Gravity / Rewind.
//   node harness/ben10_alienx_render.mjs   → shots in ben10_work/
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
page.on("response", r => { if (r.status() === 404 && /alienx/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Alien X fighter, captured through his render-only drawHud hook (called with the live fighter every frame;
// the wrapper only records the reference — no simulation effect)
const captureAx = () => page.evaluate(async () => {
  const X = await import("./alienx.js")
  if (!X.ALIENX.__axWrapped) { const orig = X.ALIENX.drawHud; X.ALIENX.drawHud = function (ctx, f, o) { window.__axLive = f; return orig(ctx, f, o) }; X.ALIENX.__axWrapped = true }
  for (let i = 0; i < 120 && !window.__axLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__axLive
})
const axProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./alienx.js")
  const f = window.__axLive || null, s = f ? X.axState(f) : null
  if (s && poke === "dash") s.dashTapT = s.t                                 // →→ already registered (render check: deterministic grasp input)
  if (s && poke === "cool") { s.voiceCd = 0; s.switchT = 0; f.attackCooldown = 0; f._benPowerCommit = 0 }
  return s ? { voice: s.voice, switchT: s.switchT, cd: s.voiceCd, pips: s.void.pips, unmade: s.void.unmadeT, cast: f._spriteCastMove || null,
    nullify: !!s.nullify, gravity: !!s.gravity, grasp: s.grasp?.phase || null, star: !!s.star, ult: s.ult?.phase || null, rewinds: s.stats.rewinds,
    grasps: s.stats.grasps, lastUltRaw: s.lastUltRaw, onGround: !!f.onGround } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 70) { await frames(n); await H("ben10SetPower", "p1", 100) }
try {
  // ── 1. production match: Ben with Alien X picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "alienx"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Alien X in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "alienx", "↓↓ + Charge (P, slot 5) transforms into Alien X", `form=${d1?.form}`)
  ok(/ben10_alienx_ready_idle_uniform/.test(d1?.sheet || ""), "Alien X frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Alien X renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_alienx_form.png"), "no black screen (Alien X, Ben voice)")
  ok(await captureAx(), "live Alien X captured (HUD hook)")
  // ── 2. NULLIFY ──
  await near(Math.round(220 + 30 - 30)); await H("ben10SetPower", "p1", 100)
  const hpN = (await H("p2")).health; await H("ben10Cast", "F"); await frames(8)
  const n1 = await axProbe(); ok(n1?.nullify && n1?.cast === "axCast", "Nullify ring opening (Circle cast)", JSON.stringify({ nullify: n1?.nullify, cast: n1?.cast }))
  ok(await notBlack("_alienx_nullify.png"), "no black screen (during Nullify)")
  await frames(40); ok((await H("p2")).health < hpN, "Nullify lands in the live game", `${hpN} → ${(await H("p2")).health}`)
  // ── 3. THREE VOICES via the real Block + Light tap; a render check in each stance ──
  for (const want of ["bellicus", "serena", "ben"]) {
    await settle(10); await axProbe("cool")
    await chord("keydown", [";"]); await frames(2); await chord("keydown", ["j"]); await frames(3); await chord("keyup", ["j", ";"]); await frames(6)
    const v = await axProbe(); ok(v?.voice === want, `Block + Light → ${want.toUpperCase()}`, JSON.stringify({ voice: v?.voice, switchT: v?.switchT, cast: v?.cast }))
    await frames(24); ok(await notBlack(`_alienx_voice_${want}.png`), `no black screen (${want} stance, HUD voice)`)
  }
  // ── 4. GRAVITY (ring at the opponent's cast-time spot) ──
  await settle(); await axProbe("cool"); await near(300); const hpG = (await H("p2")).health
  await H("ben10Cast", "B"); await frames(12); ok((await axProbe())?.gravity, "Gravity ring closing on the cast-time spot")
  ok(await notBlack("_alienx_gravity.png"), "no black screen (during Gravity)")
  await frames(40); ok((await H("p2")).health < hpG, "Gravity lands", `${hpG} → ${(await H("p2")).health}`)
  // ── 5. REWIND ──
  await settle(90); await axProbe("cool"); await H("ben10Cast", "D"); await frames(4)
  const rw = await axProbe(); ok(rw?.rewinds === 1 && rw?.cast === "axRewind", "Rewind cast (trying-circle frame)", JSON.stringify({ rewinds: rw?.rewinds, cast: rw?.cast }))
  ok(await notBlack("_alienx_rewind.png"), "no black screen (during Rewind)")
  // ── 6. VOID GRASP (→→ + P) ──
  await settle(); await axProbe("cool"); await near(90); const hpV = (await H("p2")).health
  await axProbe("dash"); await H("ben10Cast", "F"); await frames(30)
  const vg = await axProbe(); ok(vg?.grasps === 1 || vg?.grasp === "hold" || vg?.grasp === "throw", "Void Grasp connects (command grab)", JSON.stringify({ grasp: vg?.grasp, grasps: vg?.grasps }))
  await frames(50); ok((await H("p2")).health < hpV, "Void Grasp damage + throw", `${hpV} → ${(await H("p2")).health}`)
  ok(await notBlack("_alienx_grasp.png"), "no black screen (after Void Grasp)")
  // ── 7. STARFALL DASH (air) ──
  await settle(); await axProbe("cool"); await near(260); await key("w", 4); await frames(6)
  await H("ben10Cast", "F"); await frames(4); const sf = await axProbe(); ok(sf?.star, "Starfall Dash in the air (Dash frame)", JSON.stringify({ star: sf?.star, cast: sf?.cast, onGround: sf?.onGround }))
  await frames(40); ok(await notBlack("_alienx_starfall.png"), "no black screen (Starfall Dash)")
  // ── 8. ABSOLUTE DECREE ──
  await settle(90); await axProbe("cool"); await near(110); await H("ben10SetPower", "p1", 100); const hpU = (await H("p2")).health
  await key("u", 3); await frames(60); const u1 = await axProbe(); ok(u1?.ult && u1.ult !== "opener", "Absolute Decree captures (starfield cinematic)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_alienx_ult.png"), "no black screen (ultimate starfield — fighters readable)")
  await frames(90); const u2 = await axProbe(); ok(u2?.lastUltRaw === 250 && u2?.voice === "ben", "ultimate: 250 raw, Stance back to Ben", JSON.stringify({ raw: u2?.lastUltRaw, voice: u2?.voice }))
  ok((await H("p2")).health < hpU, "ultimate damage lands", `${hpU} → ${(await H("p2")).health}`)
  ok(await notBlack("_alienx_after_ult.png"), "lighting restored after the ultimate")
  // ── 9. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "alienx"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "alienx" && /ben10_alienx_ready/.test(v2?.sheet || ""), "Alien X under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_alienx_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Alien X asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nALIEN X RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
