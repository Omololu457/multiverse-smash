// WILDVINE RENDER CHECK — boots the real game headless, picks Ben 10 with Wildvine in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS INTO WILDVINE with the real slot input ↓↓ + P, plants EVERY plant type (Thornspike / Snare Vine /
// Bloom Pod), reaches FULL BLOOM, roots the opponent, uses every special (Vine Whip →→, Verdant Rise ↑, Seed Shot hold ↓),
// casts OVERGROWTH, then repeats under the BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no page
// errors, no wildvine asset 404s, no black screen — standing, all 3 plants, Full Bloom, Rooted, the ultimate and the Vow.
//   node harness/ben10_wildvine_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /wildvine/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Wildvine fighter, captured through his render-only drawHud hook (called with the live fighter every frame;
// the wrapper only records the reference — no simulation effect)
const captureWv = () => page.evaluate(async () => {
  const X = await import("./wildvine.js")
  if (!X.WILDVINE.__wvWrapped) { const orig = X.WILDVINE.drawHud; X.WILDVINE.drawHud = function (ctx, f, o) { window.__wvLive = f; return orig(ctx, f, o) }; X.WILDVINE.__wvWrapped = true }
  for (let i = 0; i < 120 && !window.__wvLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__wvLive
})
const wvProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./wildvine.js")
  const f = window.__wvLive || null, s = f ? X.wvState(f) : null
  if (s && poke === "dash") s.dashTapT = s.t                                 // →→ already registered (deterministic whip input)
  if (s && poke === "cool") { f.attackCooldown = 0; f._benPowerCommit = 0 }
  if (s && poke === "root") { s.ent.immune = 0; s.ent.rootT = 0; s.ent.pips = 0; X.addPip(s, 9001); X.addPip(s, 9002); X.addPip(s, 9003) }
  return s ? { plants: X.livePlants(s).map(p => p.type + ":" + X.plantStage(p)), planted: s.stats.planted, erupts: s.stats.erupts, snares: s.stats.snares,
    heals: s.stats.heals, bloom: s.bloom.t, blooms: s.bloom.count, whips: s.stats.whips, rises: s.stats.rises, seeds: s.stats.seeds, triggers: s.stats.whipTriggers,
    root: s.ent.rootT, pips: s.ent.pips, cast: f._spriteCastMove || null, ult: s.ult?.phase || null, lastUltRaw: s.lastUltRaw, x: f.x, w: f.w, face: f.facing,
    garden: s.garden.map(p => ({ type: p.type, x: p.x })) } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
let plantPoses = []
async function plantOne(dir, label) { await settle(10); await wvProbe("cool"); await near(900); const b = (await wvProbe()).planted; await H("ben10Cast", dir)
  await frames(5); plantPoses.push((await wvProbe()).cast); await frames(19); const a = (await wvProbe()).planted; return a[label] === b[label] + 1 }
try {
  // ── 1. production match: Ben with Wildvine picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "wildvine"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Wildvine in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "wildvine", "↓↓ + Charge (P, slot 5) transforms into Wildvine", `form=${d1?.form}`)
  ok(/ben10_wildvine_idle_uniform/.test(d1?.sheet || ""), "Wildvine frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Wildvine renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_wildvine_standing.png"), "no black screen (standing)")
  ok(await captureWv(), "live Wildvine captured (HUD hook)")
  // ── 2. plant all 3 types (real casts from the planting pose), wait for growth → FULL BLOOM ──
  ok(await plantOne(null, "thorn"), "Thornspike planted (↓↘→ + P)")
  ok(/^wv(Plant|Grow)$/.test(plantPoses[0] || ""), "planting pose (attack ↓ f1–2 → LOOP) while casting", JSON.stringify({ cast: plantPoses[0] }))
  await H("setP1X", (await H("p1")).x - 140).catch(() => {})
  ok(await plantOne("B", "snare"), "Snare Vine planted (↓↙← + P)")
  await H("setP1X", (await H("p1")).x - 140).catch(() => {})
  ok(await plantOne("D", "bloom"), "Bloom Pod planted (←↙↓ + P)")
  ok(await notBlack("_wildvine_sprouts.png"), "no black screen (3 sprouts)")
  await frames(36); const fb = await wvProbe()
  ok(fb?.plants.length === 3 && fb.plants.every(p => /grown/.test(p)), "all 3 plants GROWN (garden HUD)", JSON.stringify(fb?.plants))
  ok(fb?.bloom > 0, "FULL BLOOM active", JSON.stringify({ bloom: fb?.bloom }))
  ok(await notBlack("_wildvine_fullbloom.png"), "no black screen (all 3 plants + Full Bloom)")
  // ── 3. the opponent touches the Snare (rooted) and the Thornspike (erupts) ──
  const sn = fb.garden.find(p => p.type === "snare"), th = fb.garden.find(p => p.type === "thorn")
  await page.evaluate(x => window.__harness.setP2X(x), sn.x - 30); await frames(4)
  const r1 = await wvProbe(); ok(r1?.snares === 1, "Snare Vine roots the opponent (vines at their feet)", JSON.stringify({ snares: r1?.snares, pips: r1?.pips }))
  ok(await notBlack("_wildvine_snared.png"), "no black screen (snared)")
  const hpT = (await H("p2")).health; await page.evaluate(x => window.__harness.setP2X(x), th.x - 30); await frames(30)
  ok((await wvProbe())?.erupts === 1 && (await H("p2")).health < hpT, "Thornspike erupts on contact", `${hpT} → ${(await H("p2")).health}`)
  // ── 4. Vine Whip (→→ + P) ──
  await settle(); await wvProbe("cool"); await near(220); const hpW = (await H("p2")).health
  await wvProbe("dash"); await H("ben10Cast", "F"); await frames(16); const wp = await wvProbe(); ok(wp?.whips === 1 && wp?.cast === "wvWhip", "Vine Whip lashing (attack → frames + vine)", JSON.stringify({ cast: wp?.cast }))
  ok(await notBlack("_wildvine_whip.png"), "no black screen (Vine Whip)")
  await frames(30); ok((await H("p2")).health < hpW, "Vine Whip lands", `${hpW} → ${(await H("p2")).health}`)
  // ── 5. Verdant Rise (↑ + P) ──
  await settle(); await wvProbe("cool"); await near(90); const hpR = (await H("p2")).health
  await H("ben10Cast", "U"); await frames(10); const rp = await wvProbe(); ok(rp?.rises === 1 && rp?.cast === "wvRise", "Verdant Rise (attack ↑ growth + spark)", JSON.stringify({ cast: rp?.cast }))
  ok(await notBlack("_wildvine_rise.png"), "no black screen (Verdant Rise)")
  await frames(30); ok((await H("p2")).health < hpR, "Verdant Rise lands", `${hpR} → ${(await H("p2")).health}`)
  // ── 6. Seed Shot (hold ↓ ≥ 20f + P) ──
  await settle(80); await wvProbe("cool"); await near(260); const hpSd = (await H("p2")).health
  await page.keyboard.down("s"); await frames(26); await H("ben10Cast", "D"); await frames(4); await page.keyboard.up("s"); await frames(8)
  const sd = await wvProbe(); ok(sd?.seeds === 1, "Seed Shot fan (hold ↓ + P)", JSON.stringify({ seeds: sd?.seeds, cast: sd?.cast }))
  ok(await notBlack("_wildvine_seed.png"), "no black screen (Seed Shot)")
  await frames(30); ok((await H("p2")).health < hpSd, "Seed Shot lands", `${hpSd} → ${(await H("p2")).health}`)
  // ── 7. ROOTED (3 Entangle pips) ──
  await settle(10); await wvProbe("root"); await frames(6); const rt = await wvProbe()
  ok(rt?.root > 0, "opponent ROOTED (vines + HUD)", JSON.stringify({ root: rt?.root }))
  ok(await notBlack("_wildvine_rooted.png"), "no black screen (Rooted)")
  // ── 8. OVERGROWTH ──
  await settle(60); await wvProbe("cool"); await near(200); await H("ben10SetPower", "p1", 100); const hpU = (await H("p2")).health
  await key("u", 3); await frames(60); const u1 = await wvProbe(); ok(u1?.ult && u1.ult !== "opener", "Overgrowth captures (pixel forest, crush)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_wildvine_ult.png"), "no black screen (ultimate — fighters readable)")
  await frames(80); const u2 = await wvProbe(); ok(u2?.lastUltRaw === 240, "ultimate: 240 raw", JSON.stringify({ raw: u2?.lastUltRaw }))
  ok((await H("p2")).health < hpU, "ultimate damage lands", `${hpU} → ${(await H("p2")).health}`)
  ok(await notBlack("_wildvine_after_ult.png"), "forest gone / lighting restored after the ultimate")
  // ── 9. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "wildvine"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "wildvine" && /ben10_wildvine/.test(v2?.sheet || ""), "Wildvine under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_wildvine_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Wildvine asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nWILDVINE RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
