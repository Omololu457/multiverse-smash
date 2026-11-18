// WILDMUTT RENDER CHECK — boots the real game headless, picks Ben 10 with Wildmutt in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS INTO WILDMUTT with the real slot input ↓↓ + P, casts EVERY special (Pounce, Ground Pound, Maul,
// Roar, Bull Rush, Claw Dive), enters FRENZY, casts PRIMAL HUNT, then repeats under the BINDING VOW. Confirms both fighters +
// HUD render (sprites, not boxes), no page errors, no wildmutt_ov asset 404s, no black screen.
//   node harness/ben10_wildmutt_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /wildmutt_ov/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Wildmutt fighter, captured through his render-only drawHud hook (called with the live fighter every frame;
// the wrapper only records the reference — no simulation effect)
const captureWm = () => page.evaluate(async () => {
  const X = await import("./wildmutt.js")
  if (!X.WILDMUTT.__wmWrapped) { const orig = X.WILDMUTT.drawHud; X.WILDMUTT.drawHud = function (ctx, f, o) { window.__wmLive = f; return orig(ctx, f, o) }; X.WILDMUTT.__wmWrapped = true }
  for (let i = 0; i < 120 && !window.__wmLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__wmLive
})
const wmProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./wildmutt.js")
  const f = window.__wmLive || null, s = f ? X.wmState(f) : null
  if (s && poke === "cool") { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = [] }
  if (s && poke === "fury60") { s.fury.v = 60; s.fury.idle = 0 }
  if (s && poke === "frenzy") X.gainFury(f, s, 100)
  if (s && poke === "calm") { s.fury.frenzyT = 0; s.fury.exhaustT = 0; s.fury.v = 0; if (s.fury.baseWalk != null) { f._benWalkSpeed = s.fury.baseWalk; s.fury.baseWalk = null } }
  return s ? { pounces: s.stats.pounces, pounceHits: s.stats.pounceHits, gps: s.stats.gps, mauls: s.stats.mauls, mauled: s.stats.mauled, roars: s.stats.roars,
    rushes: s.stats.rushes, rushCarry: s.stats.rushCarry, dives: s.stats.dives, ults: s.stats.ults, scent: s.scent.t, fury: s.fury.v, frenzy: s.fury.frenzyT,
    red: /frenzy_/.test(f._skinAnim?.idle?.sheet || ""), noBlock: s.noBlock, cast: f._spriteCastMove || null, ult: s.ult?.phase || null, lastUltRaw: s.lastUltRaw,
    def: f.defenseMultiplier } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
try {
  // ── 1. production match: Ben with Wildmutt picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "wildmutt_ov"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Wildmutt in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "wildmutt_ov", "↓↓ + Charge (P, slot 5) transforms into Wildmutt", `form=${d1?.form}`)
  ok(/ben10_wildmutt_ov_idle_uniform/.test(d1?.sheet || ""), "Wildmutt frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Wildmutt renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_wildmutt_standing.png"), "no black screen (standing)")
  ok(await captureWm(), "live Wildmutt captured (HUD hook)")
  ok(Math.abs(((await wmProbe())?.def ?? 0) - 0.90) < 1e-9, "defense ×0.90 live")
  // ── 2. POUNCE (→ + P fallback) ──
  await settle(10); await wmProbe("cool"); await near(220); let hp = (await H("p2")).health
  await H("ben10Cast", "F"); await frames(18); const po = await wmProbe(); ok(po?.pounces === 1 && po?.cast === "wmPounce", "Pounce (RUN leap frames)", JSON.stringify({ cast: po?.cast }))
  ok(await notBlack("_wildmutt_pounce.png"), "no black screen (Pounce)")
  await frames(40); ok((await H("p2")).health < hp && (await wmProbe()).scent > 0, "Pounce lands + scents the opponent", `${hp} → ${(await H("p2")).health}`)
  // ── 3. GROUND POUND ──
  await settle(); await wmProbe("cool"); await near(140); hp = (await H("p2")).health
  await H("ben10Cast", "N"); await frames(24); ok((await wmProbe())?.gps === 1, "Ground Pound (shock line along the floor)")
  ok(await notBlack("_wildmutt_groundpound.png"), "no black screen (Ground Pound)")
  await frames(40); ok((await H("p2")).health < hp, "Ground Pound lands", `${hp} → ${(await H("p2")).health}`)
  // ── 4. MAUL ──
  await settle(70); await wmProbe("cool"); await near(80); hp = (await H("p2")).health
  await H("ben10Cast", "D"); await frames(30); const ma = await wmProbe(); ok(ma?.mauls === 1, "Maul (command grab: bite, pin, toss)", JSON.stringify({ mauled: ma?.mauled, cast: ma?.cast }))
  ok(await notBlack("_wildmutt_maul.png"), "no black screen (Maul)")
  await frames(50); ok((await wmProbe()).mauled === 1 && (await H("p2")).health < hp, "Maul grabs, mauls and throws", `${hp} → ${(await H("p2")).health}`)
  // ── 5. ROAR (Fury 60) ──
  await settle(80); await wmProbe("cool"); await wmProbe("fury60"); await near(150); hp = (await H("p2")).health
  await H("ben10Cast", "B"); await frames(20); const ro = await wmProbe(); ok(ro?.roars === 1 && ro?.fury <= 5, "Roar (spends all Fury — at most its own +5 hit gain after — sound rings)", JSON.stringify({ fury: ro?.fury }))
  ok(await notBlack("_wildmutt_roar.png"), "no black screen (Roar)")
  await frames(30); ok((await H("p2")).health < hp, "Roar lands", `${hp} → ${(await H("p2")).health}`)
  // ── 6. BULL RUSH ──
  await settle(60); await wmProbe("cool"); await near(120); hp = (await H("p2")).health
  await H("ben10Cast", "U"); await frames(22); const ru = await wmProbe(); ok(ru?.rushes === 1 && ru?.cast === "wmRush", "Bull Rush (rolling charge)", JSON.stringify({ carry: ru?.rushCarry }))
  ok(await notBlack("_wildmutt_rush.png"), "no black screen (Bull Rush)")
  await frames(50); ok((await H("p2")).health < hp, "Bull Rush lands", `${hp} → ${(await H("p2")).health}`)
  // ── 7. FRENZY ──
  await settle(40); await wmProbe("cool"); await wmProbe("frenzy"); await frames(8); const fr = await wmProbe()
  ok(fr?.frenzy > 0 && fr?.red && fr?.noBlock, "FRENZY: red frame set, no guard", JSON.stringify({ frenzy: fr?.frenzy }))
  ok(await notBlack("_wildmutt_frenzy.png"), "no black screen (Frenzy)")
  await wmProbe("calm"); await frames(4)
  // ── 8. CLAW DIVE (air) ──
  await settle(40); await wmProbe("cool"); await near(200); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(10)
  await H("ben10Cast", "N"); await frames(8); const dv = await wmProbe(); ok(dv?.dives === 1, "Claw Dive (air)", JSON.stringify({ cast: dv?.cast }))
  ok(await notBlack("_wildmutt_dive.png"), "no black screen (Claw Dive)")
  await frames(40)
  // ── 9. PRIMAL HUNT ──
  await settle(150); await wmProbe("cool"); await near(180); await H("ben10SetPower", "p1", 100); hp = (await H("p2")).health
  await key("u", 3); await frames(60); const u1 = await wmProbe(); ok(u1?.ult && u1.ult !== "opener", "Primal Hunt captures (darkened stage, scent orbit, slashes)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_wildmutt_ult.png"), "no black screen (ultimate — fighters readable)")
  await frames(110); const u2 = await wmProbe(); ok(u2?.lastUltRaw === 240, "ultimate: 240 raw", JSON.stringify({ raw: u2?.lastUltRaw }))
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`)
  ok(await notBlack("_wildmutt_after_ult.png"), "lighting restored after the ultimate")
  // ── 10. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "wildmutt_ov"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "wildmutt_ov" && /ben10_wildmutt_ov/.test(v2?.sheet || ""), "Wildmutt under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_wildmutt_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Wildmutt asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nWILDMUTT RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
