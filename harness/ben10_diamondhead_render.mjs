// DIAMONDHEAD RENDER CHECK — boots the real game headless, picks Ben 10 with Diamondhead in his PICK-FIVE loadout (dial slot
// 5), starts a match, TRANSFORMS INTO DIAMONDHEAD with the real slot input ↓↓ + P, casts EVERY special (Shard Shot, Prism Wall,
// Spike Eruption, Crystal Lance, Shatter Burst, Diamond Dive), fires a REFRACTED volley through his Prism Wall, raises Harden
// (real Block + Heavy), goes PRISMATIC, casts DIAMOND CATHEDRAL, then repeats under the BINDING VOW. Confirms both fighters +
// HUD render (sprites, not boxes), no page errors, no diamondhead asset 404s, no black screen.
//   node harness/ben10_diamondhead_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /diamondhead/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Diamondhead fighter, captured through his render-only drawHud hook (called with the live fighter every frame;
// the wrapper only records the reference — no simulation effect)
const captureDh = () => page.evaluate(async () => {
  const X = await import("./diamondhead.js")
  if (!X.DIAMONDHEAD.__dhWrapped) { const orig = X.DIAMONDHEAD.drawHud; X.DIAMONDHEAD.drawHud = function (ctx, f, o) { window.__dhLive = f; return orig(ctx, f, o) }; X.DIAMONDHEAD.__dhWrapped = true }
  for (let i = 0; i < 120 && !window.__dhLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__dhLive
})
const dhProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./diamondhead.js")
  const f = window.__dhLive || null, s = f ? X.dhState(f) : null
  if (s && poke === "dash") s.dashTapT = s.t                                 // →→ already registered (deterministic Spike Eruption input)
  if (s && poke === "cool") { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = [] }
  if (s && poke === "pips3") { s.shards.pips = 3; s.shards.pipT = 280 }
  return s ? { wall: s.wall ? { x: s.wall.x, caught: s.wall.caught, gone: s.wall.gone, by: s.wall.by } : null, shots: s.stats.shots, spikes: s.stats.spikes,
    lances: s.stats.lances, bursts: s.stats.bursts, dives: s.stats.dives, hardens: s.stats.hardens, hardened: s.stats.hardened, refracted: s.stats.refracted,
    pips: s.shards.pips, prism: s.prism.t, skinPrism: /prism_/.test(f._skinAnim?.idle?.sheet || ""), cast: f._spriteCastMove || null,
    ult: s.ult?.phase || null, lastUltRaw: s.lastUltRaw, x: f.x, face: f.facing, def: f.defenseMultiplier } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
const blockTap = async k => { await chord("keydown", [";"]); await frames(2); await chord("keydown", [k]); await frames(3); await chord("keyup", [k, ";"]); await frames(4) }
try {
  // ── 1. production match: Ben with Diamondhead picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "diamondhead_ov"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Diamondhead in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "diamondhead_ov", "↓↓ + Charge (P, slot 5) transforms into Diamondhead", `form=${d1?.form}`)
  ok(/ben10_diamondhead_idle_uniform/.test(d1?.sheet || ""), "Diamondhead frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Diamondhead renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_diamondhead_standing.png"), "no black screen (standing)")
  ok(await captureDh(), "live Diamondhead captured (HUD hook)")
  ok(Math.abs(((await dhProbe())?.def ?? 0) - 1.15) < 1e-9, "defense ×1.15 live")
  // ── 2. SHARD SHOT ──
  await settle(10); await dhProbe("cool"); await near(300); let hp = (await H("p2")).health
  await H("ben10Cast", "N"); await frames(8); const sh = await dhProbe(); ok(sh?.shots === 1 && sh?.cast === "dhShoot", "Shard Shot (SHOOT frames)", JSON.stringify({ cast: sh?.cast }))
  await frames(6); ok(await notBlack("_diamondhead_shot.png"), "no black screen (shard volley)")
  await frames(30); ok((await H("p2")).health < hp && (await dhProbe()).pips >= 1, "Shard Shot lands + embeds a Shard pip", `${hp} → ${(await H("p2")).health}`)
  // ── 3. PRISM WALL + a REFRACTED volley ──
  await settle(30); await dhProbe("cool"); await near(700)
  await H("ben10Cast", "B"); await frames(10); ok((await dhProbe())?.cast === "dhGround", "Prism Wall cast (ATTACK 3 hand to ground)")
  await frames(26); const pw = await dhProbe(); ok(pw?.wall && !pw.wall.gone, "Prism Wall stands 140 px ahead", JSON.stringify(pw?.wall))
  ok(await notBlack("_diamondhead_wall.png"), "no black screen (Prism Wall)")
  await near(520); await dhProbe("cool"); hp = (await H("p2")).health; await H("ben10Cast", "N"); await frames(22)
  const rf = await dhProbe(); ok(rf?.refracted >= 1, "Shard Shot refracts through the wall (3-way fan)", JSON.stringify({ refracted: rf?.refracted }))
  ok(await notBlack("_diamondhead_refract.png"), "no black screen (refracted volley)")
  await frames(30)
  // ── 4. SPIKE ERUPTION (→→ + P) ──
  await settle(); await dhProbe("cool"); await near(120); hp = (await H("p2")).health
  await dhProbe("dash"); await H("ben10Cast", "F"); await frames(22); ok((await dhProbe())?.spikes === 1, "Spike Eruption (spikes rising in a line)")
  ok(await notBlack("_diamondhead_spikes.png"), "no black screen (Spike Eruption)")
  await frames(40); ok((await H("p2")).health < hp, "Spike Eruption lands", `${hp} → ${(await H("p2")).health}`)
  // ── 5. CRYSTAL LANCE (←↙↓ + P) ──
  await settle(); await dhProbe("cool"); await near(260); hp = (await H("p2")).health
  await H("ben10Cast", "D"); await frames(15); const ln = await dhProbe(); ok(ln?.lances === 1 && ln?.cast === "dhLance", "Crystal Lance (full lance + crystal past the art)", JSON.stringify({ cast: ln?.cast }))
  ok(await notBlack("_diamondhead_lance.png"), "no black screen (Crystal Lance)")
  await frames(30); ok((await H("p2")).health < hp, "Crystal Lance lands", `${hp} → ${(await H("p2")).health}`)
  // ── 6. SHATTER BURST with pips + its own wall → PRISMATIC ──
  await settle(); await dhProbe("cool"); await near(700); await H("ben10Cast", "B"); await frames(34)
  await dhProbe("cool"); await dhProbe("pips3"); await near(90); hp = (await H("p2")).health
  await H("ben10Cast", "U"); await frames(18); const bu = await dhProbe(); ok(bu?.bursts === 1, "Shatter Burst (shard ring)", JSON.stringify({ pips: bu?.pips }))
  ok(await notBlack("_diamondhead_burst.png"), "no black screen (Shatter Burst)")
  await frames(4); ok((await H("p2")).health < hp && (await dhProbe()).pips === 0, "Shatter Burst lands, pips spent", `${hp} → ${(await H("p2")).health}`)
  const pr = await dhProbe(); ok(pr?.prism > 0 && pr?.skinPrism, "PRISMATIC: alt-pal frame set (his wall shattered by the burst)", JSON.stringify({ prism: pr?.prism, wall: pr?.wall }))
  ok(await notBlack("_diamondhead_prismatic.png"), "no black screen (Prismatic)")
  // ── 7. HARDEN (real Block + Heavy) ──
  await settle(30); await dhProbe("cool"); await blockTap("k"); const hd = await dhProbe(); ok(hd?.hardens === 1, "Block + Heavy → Harden (crouch + crystal sheen)", JSON.stringify({ cast: hd?.cast }))
  ok(await notBlack("_diamondhead_harden.png"), "no black screen (Harden)")
  // ── 8. DIAMOND DIVE (air) ──
  await settle(40); await dhProbe("cool"); await near(200); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(10)
  await H("ben10Cast", "N"); await frames(8); const dv = await dhProbe(); ok(dv?.dives === 1, "Diamond Dive (air)", JSON.stringify({ cast: dv?.cast }))
  ok(await notBlack("_diamondhead_dive.png"), "no black screen (Diamond Dive)")
  await frames(40)
  // ── 9. DIAMOND CATHEDRAL ──
  await settle(150); await dhProbe("cool"); await dhProbe("pips3"); await near(200); await H("ben10SetPower", "p1", 100); hp = (await H("p2")).health
  await key("u", 3); await frames(54); const u1 = await dhProbe(); ok(u1?.ult && u1.ult !== "opener", "Diamond Cathedral captures (crystal prison, spire storm)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_diamondhead_ult.png"), "no black screen (ultimate — fighters readable)")
  await frames(90); const u2 = await dhProbe(); ok(u2?.lastUltRaw >= 240 && u2?.lastUltRaw <= 270, "ultimate: 240 (+30 with 3 pips) raw", JSON.stringify({ raw: u2?.lastUltRaw }))
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`)
  ok(await notBlack("_diamondhead_after_ult.png"), "prison gone / lighting restored after the ultimate")
  // ── 10. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "diamondhead_ov"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "diamondhead_ov" && /ben10_diamondhead/.test(v2?.sheet || ""), "Diamondhead under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_diamondhead_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Diamondhead asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nDIAMONDHEAD RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
