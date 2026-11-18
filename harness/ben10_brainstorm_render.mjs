// BRAINSTORM RENDER CHECK — boots the real game headless, picks Ben 10 with Brainstorm in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS INTO BRAINSTORM with the real slot input ↓↓ + P, toggles the DOME with the real Block + Light
// tap, fires every special (Brain Bolt / Neural Burst / Psychic Pull / Calculated Strike / Overcharge), raises Mind Shield
// (real Block + Heavy), Short-Circuits the opponent and casts Neural Tempest, then repeats under the BINDING VOW. Confirms
// both fighters + HUD render (sprites, not boxes), no page errors, no brainstorm asset 404s, no black screen — closed, open,
// during the ultimate, with a Short-Circuited target and under the Vow.
//   node harness/ben10_brainstorm_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /brainstorm/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Brainstorm fighter, captured through his render-only drawHud hook (called with the live fighter every frame;
// the wrapper only records the reference — no simulation effect)
const captureBs = () => page.evaluate(async () => {
  const X = await import("./brainstorm.js")
  if (!X.BRAINSTORM.__bsWrapped) { const orig = X.BRAINSTORM.drawHud; X.BRAINSTORM.drawHud = function (ctx, f, o) { window.__bsLive = f; return orig(ctx, f, o) }; X.BRAINSTORM.__bsWrapped = true }
  for (let i = 0; i < 120 && !window.__bsLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__bsLive
})
const bsProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./brainstorm.js")
  const f = window.__bsLive || null, s = f ? X.bsState(f) : null
  if (s && poke === "dash") s.dashTapT = s.t                                 // →→ already registered (render check: deterministic strike input)
  if (s && poke === "cool") { f.attackCooldown = 0; f._benPowerCommit = 0 }
  if (s && poke === "sc") { X.addSynapse(s, 9001); X.addSynapse(s, 9002); X.addSynapse(s, 9003) }
  return s ? { dome: s.dome, cast: f._spriteCastMove || null, sheet: f._skinAnim?.idle?.sheet || null, pips: s.syn.pips, sc: s.syn.scT, scs: s.syn.scs,
    bolts: s.stats.bolts, bursts: s.stats.bursts, pulls: s.stats.pulls, pullHits: s.stats.pullHits, strikes: s.stats.strikes, ocs: s.stats.ocs,
    shield: s.shield.t, shieldCd: s.shield.cd, ult: s.ult?.phase || null, lastUltRaw: s.lastUltRaw, onGround: !!f.onGround, def: f.defenseMultiplier } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 70) { await frames(n); await H("ben10SetPower", "p1", 100) }
const blockTap = async k => { await chord("keydown", [";"]); await frames(2); await chord("keydown", [k]); await frames(3); await chord("keyup", [k, ";"]); await frames(4) }
try {
  // ── 1. production match: Ben with Brainstorm picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "brainstorm"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Brainstorm in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "brainstorm", "↓↓ + Charge (P, slot 5) transforms into Brainstorm", `form=${d1?.form}`)
  ok(/ben10_brainstorm_ready_idle_uniform/.test(d1?.sheet || ""), "Brainstorm CLOSED frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Brainstorm renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_brainstorm_closed.png"), "no black screen (dome CLOSED)")
  ok(await captureBs(), "live Brainstorm captured (HUD hook)")
  // ── 2. MIND SHIELD (real Block + Heavy, closed only) ──
  await settle(10); await bsProbe("cool"); await blockTap("k")
  const ms = await bsProbe(); ok(ms?.shieldCd > 0, "Block + Heavy raises Mind Shield (closed)", JSON.stringify({ shield: ms?.shield, cd: ms?.shieldCd }))
  // ── 3. THE DOME via the real Block + Light tap ──
  await settle(10); await bsProbe("cool"); await blockTap("j")
  const o1 = await bsProbe(); ok(o1?.dome === "opening" && o1?.cast === "bsDomeOpen", "Block + Light → dome OPENING (R1→R3)", JSON.stringify({ dome: o1?.dome, cast: o1?.cast }))
  await frames(24); const o2 = await bsProbe()
  ok(o2?.dome === "open" && /open_idle/.test(o2?.sheet || "") && Math.abs(o2.def - 0.8) < 1e-9, "dome OPEN: dome-up frame set, defense ×0.80", JSON.stringify({ dome: o2?.dome, sheet: o2?.sheet, def: o2?.def }))
  ok(await notBlack("_brainstorm_open.png"), "no black screen (dome OPEN)")
  // ── 4. the specials ──
  await settle(10); await bsProbe("cool"); await near(260); const hpB = (await H("p2")).health
  await H("ben10Cast", "F"); await frames(10); ok((await bsProbe())?.cast === "bsCast", "Brain Bolt cast (burst frames)")
  ok(await notBlack("_brainstorm_bolt.png"), "no black screen (Brain Bolt)")
  await frames(40); ok((await H("p2")).health < hpB, "Brain Bolt lands", `${hpB} → ${(await H("p2")).health}`)
  await settle(); await bsProbe("cool"); await near(110); const hpN = (await H("p2")).health
  await H("ben10Cast", "B"); await frames(16); ok((await bsProbe())?.bursts === 1, "Neural Burst (radial ring)")
  ok(await notBlack("_brainstorm_burst.png"), "no black screen (Neural Burst)")
  await frames(30); ok((await H("p2")).health < hpN, "Neural Burst lands", `${hpN} → ${(await H("p2")).health}`)
  await settle(); await bsProbe("cool"); await near(280); const xP = (await H("p2")).x
  await H("ben10Cast", "D"); await frames(34); const pl = await bsProbe()
  ok(pl?.pullHits === 1 && (await H("p2")).x < xP, "Psychic Pull drags the opponent in", JSON.stringify({ pullHits: pl?.pullHits, x: `${Math.round(xP)} → ${Math.round((await H("p2")).x)}` }))
  ok(await notBlack("_brainstorm_pull.png"), "no black screen (Psychic Pull)")
  await settle(); await bsProbe("cool"); await near(260); const hpS = (await H("p2")).health
  await bsProbe("dash"); await H("ben10Cast", "F"); await frames(14); ok((await bsProbe())?.strikes === 1, "Calculated Strike travels")
  await frames(30); ok((await H("p2")).health < hpS, "Calculated Strike lands", `${hpS} → ${(await H("p2")).health}`)
  ok(await notBlack("_brainstorm_strike.png"), "no black screen (Calculated Strike)")
  await settle(); await bsProbe("cool"); await near(40); await key("w", 4); await frames(4)
  await H("ben10Cast", "N"); await frames(6); const oc = await bsProbe(); ok(oc?.ocs === 1, "Overcharge in the air (lightning column)", JSON.stringify({ ocs: oc?.ocs, onGround: oc?.onGround }))
  ok(await notBlack("_brainstorm_overcharge.png"), "no black screen (Overcharge)")
  // ── 5. Short-Circuited target ──
  await settle(60); await bsProbe("sc"); await frames(10); const sc = await bsProbe()
  ok(sc?.sc > 0, "opponent SHORT-CIRCUITED (static overlay + HUD)", JSON.stringify({ sc: sc?.sc }))
  ok(await notBlack("_brainstorm_shortcircuit.png"), "no black screen (Short-Circuited target)")
  // ── 6. NEURAL TEMPEST ──
  await settle(250); await bsProbe("cool"); await near(110); await H("ben10SetPower", "p1", 100); const hpU = (await H("p2")).health
  await key("u", 3); await frames(70); const u1 = await bsProbe(); ok(u1?.ult && u1.ult !== "opener", "Neural Tempest captures (dimmed stage, calculation montage, storm)", JSON.stringify({ ult: u1?.ult, dome: u1?.dome }))
  ok(await notBlack("_brainstorm_ult.png"), "no black screen (ultimate — fighters readable)")
  await frames(90); const u2 = await bsProbe(); ok(u2?.lastUltRaw === 250 && u2?.dome === "closed", "ultimate: 250 raw, dome back to CLOSED", JSON.stringify({ raw: u2?.lastUltRaw, dome: u2?.dome }))
  ok((await H("p2")).health < hpU, "ultimate damage lands", `${hpU} → ${(await H("p2")).health}`)
  ok(await notBlack("_brainstorm_after_ult.png"), "lighting restored after the ultimate")
  // ── 7. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "brainstorm"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "brainstorm" && /ben10_brainstorm_ready/.test(v2?.sheet || ""), "Brainstorm under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_brainstorm_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Brainstorm asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nBRAINSTORM RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
