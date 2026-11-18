// JETRAY RENDER CHECK — boots the real game headless, picks Ben 10 with Jetray in his PICK-FIVE loadout (dial slot 5), starts a
// match, TRANSFORMS INTO JETRAY with the real slot input ↓↓ + P, FLIES (real held Jump), fires EYE LASER / TAIL VOLLEY / WING
// DASH / SONIC DIVE, triggers MACH TIME (real Block + Special) and COSMIC DRAG, then repeats under the BINDING VOW. Confirms both
// fighters + HUD render (sprites, not boxes), no page errors, no jetray asset 404s, no black screen — grounded, flying, in Mach
// Time, during the ultimate and under the Vow.
//   node harness/ben10_jetray_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /jetray/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Jetray fighter, captured through his render-only drawHud hook (the wrapper only records the reference)
const captureJr = () => page.evaluate(async () => {
  const X = await import("./jetray.js")
  if (!X.JETRAY.__jrWrapped) { const orig = X.JETRAY.drawHud; X.JETRAY.drawHud = function (ctx, f, o) { window.__jrLive = f; return orig(ctx, f, o) }; X.JETRAY.__jrWrapped = true }
  for (let i = 0; i < 120 && !window.__jrLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__jrLive
})
const jrProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./jetray.js"), FL = await import("./flight.js")
  const f = window.__jrLive || null, s = f ? X.jrState(f) : null
  if (s && poke === "dash") s.dashTapT = s.t
  if (s && poke === "cool") { f.attackCooldown = 0; f._benPowerCommit = 0 }
  if (s && poke === "air") { f.y -= 160; f.onGround = false; f.grounded = false; f.vy = -2 }
  return s ? { eyes: s.stats.eyes, tails: s.stats.tails, dashes: s.stats.dashes, dives: s.stats.dives, booms: s.stats.booms, mach: s.machT, flights: s.flights,
    flying: !!(f._flightCtl && FL.isFlying(f)), cast: f._spriteCastMove || null, ult: s.ult?.phase || null, lastUltRaw: s.lastUltRaw, onGround: !!f.onGround,
    y: Math.round(f.y), pips: s.neuro.pips, echoes: s.echoesFired, eye: !!s.eye, beam: s.eye?.beam ? { ...s.eye.beam } : null,
    pulses: (s.tail?.pulses || []).map(p => ({ ...p })), pulseCount: s.stats.pulses, eyeTicks: s.stats.eyeTicks, gauge: s.laser.gauge,
    p2: (() => { const o = window.__harness.p2(); return o ? { x: o.x, y: o.y, w: o.w, h: o.h } : null })() } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
const ptap = async () => { await page.keyboard.down("p"); await frames(1); await page.keyboard.up("p"); await frames(1) }   // a real short tap (headless runs several sim frames per rAF)
async function settle(n = 70) { await frames(n); await H("ben10SetPower", "p1", 100) }
try {
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "jetray"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Jetray in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "jetray", "↓↓ + Charge (P, slot 5) transforms into Jetray", `form=${d1?.form}`)
  ok(/ben10_jetray_ready_idle_uniform/.test(d1?.sheet || ""), "Jetray frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Jetray renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_jetray_standing.png"), "no black screen (grounded hover)")
  ok(await captureJr(), "live Jetray captured (HUD hook)")
  // ── FLY (Homelander / Superman architecture): real P TAP takes off, he stays up with nothing held, P tap again lands ──
  await settle(10); await ptap(); await chord("keydown", ["w"]); await frames(25); await chord("keyup", ["w"]); await frames(40)
  const fl = await jrProbe(); ok(fl?.flying && fl?.flights >= 1, "P tap → takeoff; still FLYING 40f after letting go of everything", JSON.stringify({ flying: fl?.flying, y: fl?.y, cast: fl?.cast }))
  ok(await notBlack("_jetray_flying.png"), "no black screen (flying)")
  // ── EYE LASER fired FROM THE AIR at the grounded opponent: the beam must point DOWN onto them (lock-on) ──
  await jrProbe("cool"); await near(260); const hpA = (await H("p2")).health
  await H("ben10Cast", "F"); await chord("keydown", ["l"]); await frames(24)
  const ea = await jrProbe(); const onTarget = (b, q) => !!b && b.hit && b.tx >= q.x - 2 && b.tx <= q.x + q.w + 2 && b.ty >= q.y - 2 && b.ty <= q.y + q.h + 2
  ok(ea?.beam && ea.beam.ty > ea.beam.oy + 40 && onTarget(ea.beam, ea.p2), "airborne Eye Laser = a real BEAM angled DOWN onto the opponent", JSON.stringify({ beam: ea?.beam && [Math.round(ea.beam.ox), Math.round(ea.beam.oy), Math.round(ea.beam.tx), Math.round(ea.beam.ty)], p2: ea?.p2 }))
  ok(await notBlack("_jetray_eye_air.png"), "no black screen (Eye Laser from the air)")
  await chord("keyup", ["l"]); await frames(30); ok((await H("p2")).health < hpA, "air Eye Laser lands", `${hpA} → ${(await H("p2")).health}`)
  const y0 = (await jrProbe()).y; await ptap(); await frames(8); const sk = await jrProbe()
  ok(sk?.flying && sk.y > y0, "P tap again → he starts coming down (Homelander's descend-to-land)", JSON.stringify({ y0, y: sk?.y }))
  await chord("keydown", ["s"]); await frames(60); await chord("keyup", ["s"]); await frames(10)
  const ld = await jrProbe(); ok(!ld?.flying && ld?.onGround, "…hold Down → lands", JSON.stringify({ flying: ld?.flying, y: ld?.y }))
  // ── EYE LASER on the ground, HELD (Homelander heat vision: sustained, locked on, heat gauge) ──
  await settle(70); await jrProbe("cool"); await near(220); const hpE = (await H("p2")).health
  await H("ben10Cast", "F"); await chord("keydown", ["l"]); await frames(22)
  const eg = await jrProbe(); ok(eg?.eyes >= 2 && onTarget(eg?.beam, eg.p2), "held Eye Laser: beam from his eyes ends ON the opponent", JSON.stringify({ beam: eg?.beam && [Math.round(eg.beam.tx), Math.round(eg.beam.ty)], p2: eg?.p2 }))
  ok(await notBlack("_jetray_eye.png"), "no black screen (Eye Laser)")
  await frames(30); await chord("keyup", ["l"]); await frames(20); const eg2 = await jrProbe()
  ok((await H("p2")).health < hpE && eg2.eyeTicks >= 4 && eg2.gauge < 48, "held beam ticks repeatedly and spends heat", JSON.stringify({ hp: `${hpE} → ${(await H("p2")).health}`, ticks: eg2?.eyeTicks, gauge: eg2?.gauge }))
  const boxes = await page.evaluate(async () => (await import("./abilities.js")).activeProjectiles.filter(p => p.owner === window.__jrLive && !(p.alien && p.alien.hidden)).length)
  ok(boxes === 0, "no visible hitbox shapes (no 'bombs')", String(boxes))
  // ── TAIL VOLLEY (←↙↓ + P): three LASER PULSES from the tail, aimed at the opponent ──
  await settle(100); await jrProbe("cool"); await near(200); const hpT = (await H("p2")).health
  await H("ben10Cast", "D"); await frames(14); const tv = await jrProbe()
  ok(tv?.tails >= 1 && tv.pulses.length >= 1 && tv.pulses.every(p => p.hit), "Tail Volley: laser pulses from the tail tip, locked onto the opponent", JSON.stringify(tv?.pulses?.map(p => [Math.round(p.ox), Math.round(p.oy), Math.round(p.tx), Math.round(p.ty), p.hit])))
  ok(await notBlack("_jetray_tail.png"), "no black screen (Tail Volley)")
  await frames(30); ok((await H("p2")).health < hpT && (await jrProbe()).pulseCount >= 3, "Tail Volley lands (3 pulses)", `${hpT} → ${(await H("p2")).health}`)
  // ── FLASH TIME: real P + L (hold Charge, press Special) → WING DASH (→→ + P) + Sonic Boom ──
  await settle(30); await jrProbe("cool")
  await chord("keydown", ["p"]); await frames(2); await chord("keydown", ["l"]); await frames(3); await chord("keyup", ["l", "p"]); await frames(14)
  const m = await jrProbe(); ok(m?.mach > 0 && !m.flying, "P + L → FLASH TIME (not a flight toggle, no special)", JSON.stringify({ mach: m?.mach, flying: m?.flying, eyes: m?.eyes }))
  ok(await notBlack("_jetray_mach.png"), "no black screen (Flash Time)")
  await jrProbe("cool"); await near(150); const hpD = (await H("p2")).health
  await jrProbe("dash"); await H("ben10Cast", "F"); await frames(4); const wd = await jrProbe()
  ok(wd?.dashes === 1 && wd?.cast === "jrDash", "Wing Dash in the warp-bubble frames", JSON.stringify({ dashes: wd?.dashes, cast: wd?.cast }))
  ok(await notBlack("_jetray_dash.png"), "no black screen (Wing Dash)")
  await frames(30); const wd2 = await jrProbe(); ok((await H("p2")).health < hpD && wd2?.booms === 1, "Wing Dash lands + Sonic Boom in Mach Time", JSON.stringify({ hp: `${hpD} → ${(await H("p2")).health}`, booms: wd2?.booms }))
  // ── SONIC DIVE (air ↓ + P) ──
  await settle(40); await jrProbe("cool"); await near(120); await jrProbe("air"); await frames(2)
  await H("ben10Cast", "D"); await frames(6); ok((await jrProbe())?.dives === 1, "Sonic Dive (dive frame)")
  ok(await notBlack("_jetray_dive.png"), "no black screen (Sonic Dive)")
  await frames(40)
  // ── COSMIC DRAG ──
  await settle(200); await jrProbe("cool"); await near(110); await H("ben10SetPower", "p1", 100); const hpU = (await H("p2")).health
  await key("u", 3); await frames(70); const u1 = await jrProbe(); ok(u1?.ult === "universe", "Cosmic Drag captures → hyperspace (starfield, planets)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_jetray_ult.png"), "no black screen (ultimate — fighters readable over hyperspace)")
  await frames(110); const u2 = await jrProbe(); ok(u2?.lastUltRaw === 240, "Cosmic Drag: 240 raw", JSON.stringify({ raw: u2?.lastUltRaw }))
  ok((await H("p2")).health < hpU, "ultimate damage lands", `${hpU} → ${(await H("p2")).health}`)
  ok(await notBlack("_jetray_after_ult.png"), "stage restored after the ultimate")
  // ── Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"]); ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "jetray"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "jetray" && /ben10_jetray_ready/.test(v2?.sheet || ""), "Jetray under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_jetray_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Jetray asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nJETRAY RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
