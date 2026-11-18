// WATER HAZARD RENDER CHECK — boots the real game headless, picks Ben 10 with Water Hazard in his PICK-FIVE loadout (dial
// slot 5), starts a match, TRANSFORMS through the Omnitrix Dial (↓↓ + P), throws the normals, holds PUDDLE FORM, CHARGES and
// FIRES the Pressure Blast orb, lands every other special, builds DRENCHED → SHORT FUSE, fires the ULTIMATE (a clean capture),
// stands in a STORM TIDE flood (Ripjaws' generic flood, owned by the opponent: Core gain, waterborne, no drowning), then the
// BINDING VOW. Confirms sprites (not boxes) + HUD, no page errors, no waterhazard asset 404s, no black screen.
//   node harness/ben10_waterhazard_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /waterhazard/.test(r.url())) my404.push(r.url().split("/").pop()) })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
const lum = (y0, y1) => page.evaluate(([a, b]) => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * a), c.width, Math.floor(c.height * (b - a))).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 }, [y0, y1])
async function notBlack(file) { const buf = await page.screenshot({ path: path.join(OUT, file) }); return (await lum(0.3, 0.7)) > 12 && buf.length > 20000 }
const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "waterhazard"]
async function boot(vow = false, p2 = "goku") {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=${p2}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 })
  await page.mouse.click(640, 360)
  await H("start", { experimental: false, p1Aliens: PICK }); await frames(4)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
  if (vow) await H("ben10Vow", "p1", true)
  await H("ben10SetPower", "p1", 100)
  return H("ben10Details", "p1")
}
const chord = (type, ks) => page.evaluate(([t, ks]) => { for (const k of ks) document.dispatchEvent(new KeyboardEvent(t, { key: k, code: k === ";" ? "Semicolon" : "Key" + k.toUpperCase(), bubbles: true })) }, [type, ks])
async function omx(ks) { await key("s", 2); await key("s", 2); await chord("keydown", ks); await frames(3); await chord("keyup", ks); await frames(60); return H("ben10Details", "p1") }
// the live Water Hazard fighter + his opponent, captured through his render-only drawFx hook (the wrapper only records references)
const captureWh = () => page.evaluate(async () => {
  const X = await import("./waterhazard.js"); window.__whLive = null
  if (!X.WATERHAZARD.__whWrapped) { const orig = X.WATERHAZARD.drawFx; X.WATERHAZARD.drawFx = function (c, f, frame, opp) { window.__whLive = f; window.__whOpp = opp; return orig(c, f, frame, opp) }; X.WATERHAZARD.__whWrapped = true }
  for (let i = 0; i < 120 && !window.__whLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__whLive && !!window.__whOpp
})
// test-only pokes (harness setup, like ben10SetPower): reset cooldowns, Core, pips, a dash tap, a ←↙↓ motion; start a flood on the opponent
const wh = (poke = null) => page.evaluate(async poke => {
  const X = await import("./waterhazard.js"), FL = await import("./benFlood.js")
  const f = window.__whLive || null, opp = window.__whOpp || null, s = f ? X.whState(f) : null
  if (s && poke?.cool) { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = []; f.attacking = false; f.currentAttack = null }
  if (s && poke?.core != null) { s.core = poke.core; s.lastGainT = s.t }
  if (s && poke?.pips != null) { s.pips = poke.pips; s.pipT = s.t }
  if (s && poke?.dash) s.dashTapT = s.t
  if (s && poke?.qcb) s.hist = [{ d: 4, t: s.t - 2 }, { d: 1, t: s.t - 1 }, { d: 2, t: s.t }]
  if (opp && poke?.flood) { FL.startFlood(opp, {}, [opp, f], 99); FL.raiseFlood(opp) }
  const r = opp ? FL.floodOf(opp) : null, w = f ? FL.waterOf(f) : null
  return s ? { core: s.core, pips: s.pips, fuses: s.fuses, puddle: s.puddle ? s.puddle.phase || true : null, blast: !!s.blast, lastBlast: s.lastBlast, lastBurst: s.lastBurst,
    lastChain: s.lastChain, lastSweep: s.lastSweep, lastDive: s.lastDive, st: { ...s.stats }, cast: f._spriteCastMove || null, ult: s.ult?.phase || null,
    lastUlt: s.lastUlt ? { captured: s.lastUlt.captured, raw: s.lastUlt.raw, pipAdded: s.lastUlt.pipAdded } : null, fuse: opp?._benShortFuse ? { ...opp._benShortFuse } : null,
    coreFlood: s.coreFlood, depth: w ? w.depth : "dry", wb: w ? w.wb : null, flood: r ? { phase: r.phase, line: r.line, breath: { ...r.breath }, drown: { ...r.drown } } : null, hp: f.health, side: f.side } : null
}, poke)
const near = dx => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
async function sprites(tag) {
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, `Water Hazard renders as sprites (${tag})`, `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, `opponent renders as sprites (${tag})`)
  ok(p1?.health > 0 && p2?.health > 0, `both HP bars live (${tag})`)
}
async function spec(dir, dx, name, shot, pre = {}, wait = 14) {
  await settle(); await wh({ cool: true, ...pre }); if (dx != null) await near(dx)
  await H("ben10Cast", dir); await frames(wait)
  const p = await wh(); ok(!!p?.cast, name + " cast", JSON.stringify({ cast: p?.cast }))
  ok(await notBlack(shot), "no black screen (" + name + ")")
  return p
}
try {
  // ── 1. production match: Water Hazard picked into slot 5 (PICK FIVE) → the Omnitrix Dial ──
  const d0 = await boot()
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Water Hazard in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "waterhazard", "Omnitrix Dial ↓↓ + P (slot 5) transforms into Water Hazard", `form=${d1?.form}`)
  ok(/ben10_waterhazard_ready_idle_uniform/.test(d1?.sheet || ""), "Water Hazard frame set active", d1?.sheet)
  await sprites("standing"); ok(await notBlack("_waterhazard_standing.png"), "no black screen (standing)")
  ok(await captureWh(), "live Water Hazard + opponent captured (FX hook)")
  // ── 2. normals (J light, K heavy, ↓+J low, I launcher) ──
  for (const [label, keys, shot] of [["Jab", ["j"], "_waterhazard_light.png"], ["Heavy", ["k"], "_waterhazard_heavy.png"], ["Low", ["s", "j"], "_waterhazard_low.png"], ["Launcher", ["i"], "_waterhazard_up.png"]]) {
    await settle(30); await wh({ cool: true }); await near(100); const hp = (await H("p2")).health
    for (const k of keys) await page.keyboard.down(k); await frames(4); for (const k of keys.slice().reverse()) await page.keyboard.up(k); await frames(24)
    ok((await H("p2")).health < hp, label + " connects"); ok(await notBlack(shot), "no black screen (" + label + ")")
  }
  // ── 3. Puddle Form (hold ↓ + Special) ──
  await settle(); await wh({ cool: true }); await near(400)
  await page.keyboard.down("s"); await page.keyboard.down("l"); await frames(24)
  const pu = await wh(); ok(!!pu?.puddle, "Puddle Form (hold ↓ + Special)", JSON.stringify({ puddle: pu?.puddle }))
  await sprites("Puddle Form"); ok(await notBlack("_waterhazard_puddle.png"), "no black screen (Puddle Form)")
  await page.keyboard.up("l"); await page.keyboard.up("s"); await frames(40); ok(!(await wh())?.puddle, "released: he reforms")
  // ── 4. Pressure Blast: CHARGE the orb (hold Special 30f) and FIRE (a full hold spends the Core) ──
  await settle(); await wh({ cool: true, core: 50 }); await near(260)
  await page.keyboard.down("l"); await H("ben10Cast", "N"); await frames(18)
  const ch = await wh(); ok(ch?.blast && /whCharge/.test(ch.cast || ""), "Pressure Blast charging (the orb)", JSON.stringify({ cast: ch?.cast }))
  ok(await notBlack("_waterhazard_charge.png"), "no black screen (charge)")
  await frames(16); await page.keyboard.up("l"); await frames(4); ok(await notBlack("_waterhazard_fire.png"), "no black screen (the jet)")
  await frames(30); const fb = await wh()
  ok(fb?.lastBlast?.full && fb.lastBlast.dmg === 65 && fb.lastBlast.core === 50 && fb.core <= 5, "full hold: 40 + 0.5 × 50 = 65, all 50 Core spent (≤ +5 back from the hit)", JSON.stringify(fb?.lastBlast)); ok(fb?.st.blastHits >= 1, "the jet lands")
  // ── 5. every other special ──
  let p = await spec("B", 80, "Hydro Burst", "_waterhazard_burst.png", { core: 40 }, 18); await frames(40); ok((await wh())?.st.burstHits >= 1, "Hydro Burst lands", JSON.stringify((await wh())?.lastBurst))
  p = await spec("F", 160, "Claw Lash", "_waterhazard_lash.png", { dash: true }, 16); await frames(40); ok((await wh())?.st.lashHits >= 1, "Claw Lash lands", JSON.stringify((await wh())?.lastChain))
  p = await spec("D", 80, "Undertow Sweep", "_waterhazard_sweep.png", { qcb: true }, 16); await frames(40); ok((await wh())?.lastSweep?.kd, "Undertow Sweep trips", JSON.stringify((await wh())?.lastSweep))
  await settle(80); await wh({ cool: true }); await near(150); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(10)
  await H("ben10Cast", "N"); await frames(6); ok((await wh())?.st.dives >= 1, "Geyser Dive (air)", JSON.stringify({ cast: (await wh())?.cast })); ok(await notBlack("_waterhazard_dive.png"), "no black screen (Geyser Dive)"); await frames(50)
  // ── 6. DRENCHED → SHORT FUSE (three pip casts on a fresh opponent) ──
  const dr = await wh(); ok(dr?.pips >= 1 || dr?.fuse, "Drenched pips build from the specials", JSON.stringify({ pips: dr?.pips, fuse: dr?.fuse }))
  await settle(); await wh({ cool: true, pips: 2 }); await near(260); await H("ben10Cast", "N"); await frames(40)
  const sf = await wh(); ok(sf?.fuse && sf.fuse.left > 0 && sf.fuses >= 1, "3 pips → SHORT FUSE on the opponent", JSON.stringify(sf?.fuse))
  await sprites("SHORT FUSE"); ok(await notBlack("_waterhazard_shortfuse.png"), "no black screen (Drenched / Short Fuse)")
  // ── 7. the ULTIMATE (a clean capture) ──
  await settle(420); await wh({ cool: true }); await near(200); await H("ben10SetPower", "p1", 100); const hp = (await H("p2")).health
  await key("u", 3); await frames(50); const u1 = await wh(); ok(u1?.ult && u1.ult !== "opener", "Tidal Discharge captures (clean jet → vortex)", JSON.stringify({ ult: u1?.ult, last: u1?.lastUlt }))
  await sprites("ult vortex"); ok(await notBlack("_waterhazard_ult.png"), "no black screen (vortex / barrage)")
  await frames(40); ok(await notBlack("_waterhazard_ult_geyser.png"), "no black screen (geyser finish)")
  await frames(60); const u2 = await wh(); ok(u2?.lastUlt?.captured && u2.lastUlt.raw === 240, "ultimate: 240 raw", JSON.stringify(u2?.lastUlt)); ok(u2?.core === 0, "Core 0 after the ult")
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`); ok(await notBlack("_waterhazard_after_ult.png"), "camera restored")
  // ── 8. inside a STORM TIDE flood owned by an opposing RIPJAWS (a Ben-vs-Ben match; the flood ticks on its Ben owner) ──
  await boot(false, "ben10"); await H("benForm", "waterhazard", "p1"); await H("benForm", "ripjaws", "p2"); await frames(20)
  ok((await H("ben10Details", "p1"))?.form === "waterhazard", "Water Hazard vs a Ripjaws Ben"); ok(await captureWh(), "captured (flood match)"); await near(260)
  await settle(10); const hp0 = (await wh()).hp, c0 = (await wh({ cool: true, core: 0, flood: true })).core
  await frames(240); const fl = await wh()
  ok(fl?.flood && fl.flood.phase !== "off", "a live STORM TIDE flood", JSON.stringify(fl?.flood?.phase)); ok(fl.wb === true, "Water Hazard is WATERBORNE", `depth=${fl.depth}`)
  ok(fl.coreFlood > 0 && fl.core > c0, "Core gains from the water", `core ${c0} → ${fl.core.toFixed(1)}`); ok(!(fl.side in fl.flood.breath) && !(fl.side in fl.flood.drown), "no breath / drowning record for him")
  ok(fl.hp === hp0, "no HP lost in the flood", `${hp0} → ${fl.hp}`); await sprites("in the flood"); ok(await notBlack("_waterhazard_flood.png"), "no black screen (flood)")
  // ── 9. Binding Vow ──
  await boot(true)
  const v1 = await omx(["j"]); ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "waterhazard"); await frames(20)
  const v2 = await H("ben10Details", "p1"); ok(v2?.form === "waterhazard" && /ben10_waterhazard_ready/.test(v2?.sheet || ""), "Water Hazard under the Binding Vow renders his own art", v2?.sheet)
  ok(await captureWh(), "Water Hazard captured under the Vow"); await wh({ cool: true }); await near(260); await H("ben10SetPower", "p1", 100); await H("ben10Cast", "N"); await frames(14)
  ok(await notBlack("_waterhazard_vow.png"), "no black screen (Vow, Pressure Blast)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Water Hazard asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nWATER HAZARD RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
