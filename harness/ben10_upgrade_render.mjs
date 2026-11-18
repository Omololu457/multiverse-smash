// UPGRADE RENDER CHECK — boots the real game headless, picks Ben 10 with Upgrade in his PICK-FIVE loadout (dial slot 5), starts
// a match, TRANSFORMS INTO UPGRADE through the Omnitrix Dial (↓↓ + P), deploys a TERMINAL (boot → online), fires a Zap Bolt
// THROUGH it, MERGES (→ OVERCLOCK, alt palette), then uses every special (Zap Bolt, Tendril Lash, Goo Dive, Tendril Rise, Spear
// Dive) and SYSTEM TAKEOVER, then repeats under the BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no
// page errors, no upgrade asset 404s, no black screen.
//   node harness/ben10_upgrade_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /upgrade/.test(r.url())) my404.push(r.url().split("/").pop()) })
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
// the live Upgrade fighter, captured through his render-only drawHud hook (called with the live fighter every frame; the
// wrapper only records the reference — no simulation effect)
const captureUp = () => page.evaluate(async () => {
  const X = await import("./upgrade.js")
  if (!X.UPGRADE.__upWrapped) { const orig = X.UPGRADE.drawHud; X.UPGRADE.drawHud = function (ctx, f, o) { window.__upLive = f; return orig(ctx, f, o) }; X.UPGRADE.__upWrapped = true }
  for (let i = 0; i < 120 && !window.__upLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__upLive
})
const upProbe = (poke = null) => page.evaluate(async poke => {
  const X = await import("./upgrade.js")
  const f = window.__upLive || null, s = f ? X.upState(f) : null
  if (s && poke === "dash") s.dashTapT = s.t                                 // →→ already registered (deterministic Lash input)
  if (s && poke === "cool") { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = [] }
  if (s && poke === "toTerm" && s.term) f.x = s.term.x - f.w / 2 - 40          // stand next to his terminal (Merge range)
  if (s && poke === "behindTerm" && s.term) f.x = s.term.x - f.w / 2 - 200    // the terminal between him and the foe
  return s ? { term: s.term ? { t: s.term.t, gone: s.term.gone, by: s.term.by, x: s.term.x } : null, online: X.termOnline(s), st: { ...s.stats, termEnds: { ...s.stats.termEnds } },
    oc: s.oc.t, pips: s.virus.pips, crash: s.virus.crashT, skinOc: f._skinAnim === X.UP_FRAMESETS.overclock, cast: f._spriteCastMove || null,
    ult: s.ult?.phase || null, lastUltRaw: s.lastUltRaw, x: f.x, def: f.defenseMultiplier } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
try {
  // ── 1. production match: Ben with Upgrade picked into slot 5 (PICK FIVE; slot count read from the registry) ──
  const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "upgrade_ov"]
  const d0 = await boot(false, { experimental: false, p1Aliens: PICK })
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Upgrade in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "upgrade_ov", "Omnitrix Dial ↓↓ + P (slot 5) transforms into Upgrade", `form=${d1?.form}`)
  ok(/ben10_upgrade_ready_idle_uniform/.test(d1?.sheet || ""), "Upgrade frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "Upgrade renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_upgrade_standing.png"), "no black screen (standing)")
  ok(await captureUp(), "live Upgrade captured (HUD hook)")
  ok(Math.abs(((await upProbe())?.def ?? 0) - 0.95) < 1e-9, "defense ×0.95 live")
  // ── 2. DEPLOY TERMINAL: boot → online ──
  await settle(10); await upProbe("cool"); await near(900)
  await H("ben10Cast", "D"); await frames(10); ok((await upProbe())?.cast === "upDeploy", "Deploy Terminal cast (crouch)")
  await frames(30); const tb = await upProbe(); ok(tb?.term && !tb.term.gone && !tb.online, "Terminal planted, BOOTING", JSON.stringify(tb?.term))
  ok(await notBlack("_upgrade_terminal_boot.png"), "no black screen (terminal booting)")
  await frames(70); const to = await upProbe(); ok(to?.online, "Terminal ONLINE", JSON.stringify(to?.term))
  ok(await notBlack("_upgrade_terminal_online.png"), "no black screen (terminal online)")
  // ── 3. ZAP BOLT through the ONLINE terminal (+10, extra pulse) ──
  await upProbe("cool"); await upProbe("behindTerm"); await near(520); let hp = (await H("p2")).health
  await H("ben10Cast", "N"); await frames(24); const zb = await upProbe(); ok(zb?.st.zaps === 1, "Zap Bolt (the extracted bolt)", JSON.stringify({ cast: zb?.cast }))
  ok(zb?.st.boosted === 1 && zb?.st.extraPulses >= 1, "bolt boosted through the Terminal + extra pulse", JSON.stringify({ boosted: zb?.st.boosted, extra: zb?.st.extraPulses }))
  ok(await notBlack("_upgrade_zap_boost.png"), "no black screen (boosted bolt)")
  await frames(30); ok((await H("p2")).health < hp, "Zap Bolt / pulse lands", `${hp} → ${(await H("p2")).health}`)
  // ── 4. MERGE → OVERCLOCK ──
  await settle(10); let mt = await upProbe(); if (!mt?.online) { await upProbe("cool"); await near(900); await H("ben10Cast", "D"); await frames(100) }
  await upProbe("cool"); await upProbe("toTerm"); await near(400)
  await H("ben10Cast", "U"); await frames(8); const mg = await upProbe(); ok(mg?.st.merges === 1 && mg?.cast === "upMerge", "Merge (the Merge frame; terminal consumed)", JSON.stringify({ cast: mg?.cast, by: mg?.term?.by }))
  ok(await notBlack("_upgrade_merge.png"), "no black screen (Merge)")
  await frames(16); const oc = await upProbe(); ok(oc?.oc > 0 && oc?.skinOc, "OVERCLOCK: alt-pal frame set", JSON.stringify({ oc: oc?.oc }))
  ok(await notBlack("_upgrade_overclock.png"), "no black screen (Overclock)")
  // ── 5. Overclocked ZAP BOLT (2-hit piercing) ──
  await upProbe("cool"); await near(300); hp = (await H("p2")).health; await H("ben10Cast", "N"); await frames(24)
  ok((await upProbe())?.st.zaps === 2, "Overclocked Zap Bolt (2-hit piercing)"); ok(await notBlack("_upgrade_zap_oc.png"), "no black screen (overclocked bolt)")
  await frames(20)
  // ── 6. TENDRIL LASH (→→ + P) ──
  await settle(); await upProbe("cool"); await near(260); hp = (await H("p2")).health
  await upProbe("dash"); await H("ben10Cast", "F"); await frames(15); const ls = await upProbe(); ok(ls?.st.lashes === 1 && ls?.cast === "upLash", "Tendril Lash (340 px tendril)", JSON.stringify({ cast: ls?.cast }))
  ok(await notBlack("_upgrade_lash.png"), "no black screen (Tendril Lash)")
  await frames(30); ok((await H("p2")).health < hp, "Tendril Lash lands", `${hp} → ${(await H("p2")).health}`)
  // ── 7. GOO DIVE ──
  await settle(); await upProbe("cool"); await near(400)
  await H("ben10Cast", "B"); await frames(4); const gd = await upProbe(); ok(gd?.st.dives === 1 && /upMelt|upPuddle|upReform/.test(gd?.cast || ""), "Goo Dive (melt → puddle)", JSON.stringify({ cast: gd?.cast }))
  ok(await notBlack("_upgrade_goo_dive.png"), "no black screen (Goo Dive)")
  await frames(30)
  // ── 8. TENDRIL RISE (→↓↘ + P, no terminal near) ──
  await settle(); await upProbe("cool"); await near(90); hp = (await H("p2")).health
  await H("ben10Cast", "U"); await frames(14); const rs = await upProbe(); ok(rs?.st.rises === 1 && rs?.cast === "upRise", "Tendril Rise (goo column)", JSON.stringify({ cast: rs?.cast }))
  ok(await notBlack("_upgrade_rise.png"), "no black screen (Tendril Rise)")
  await frames(10); ok((await H("p2")).health < hp, "Tendril Rise lands", `${hp} → ${(await H("p2")).health}`)
  // ── 9. SPEAR DIVE (air) ──
  await settle(60); await upProbe("cool"); await near(200); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(10)
  await H("ben10Cast", "N"); await frames(8); const sp = await upProbe(); ok(sp?.st.spears === 1, "Spear Dive (air)", JSON.stringify({ cast: sp?.cast }))
  ok(await notBlack("_upgrade_spear.png"), "no black screen (Spear Dive)")
  await frames(40)
  // ── 10. SYSTEM TAKEOVER ──
  await settle(150); await upProbe("cool"); await near(200); await H("ben10SetPower", "p1", 100); hp = (await H("p2")).health
  await key("u", 3); await frames(40); const u1 = await upProbe(); ok(u1?.ult && u1.ult !== "opener", "System Takeover captures (circuit network + cage)", JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack("_upgrade_ult_network.png"), "no black screen (ultimate — network)")
  await frames(30); ok(await notBlack("_upgrade_ult_terminals.png"), "no black screen (ultimate — terminal copies)")
  await frames(90); const u2 = await upProbe(); ok(u2?.lastUltRaw === 240, "ultimate: 240 raw", JSON.stringify({ raw: u2?.lastUltRaw }))
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`)
  ok(await notBlack("_upgrade_after_ult.png"), "cage gone / fighters readable after the ultimate")
  // ── 11. Binding Vow ──
  await boot(true, { experimental: false, p1Aliens: PICK })
  const v1 = await omx(["j"])
  ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "upgrade_ov"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "upgrade_ov" && /ben10_upgrade_ready/.test(v2?.sheet || ""), "Upgrade under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_upgrade_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Upgrade asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nUPGRADE RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
