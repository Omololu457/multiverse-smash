// RATH RENDER CHECK — boots the real game headless, picks Ben 10 with Rath in his PICK-FIVE loadout (dial slot 5), starts a
// match, TRANSFORMS INTO RATH through the Omnitrix Dial (↓↓ + P), throws every normal and every special (Claw Rake, Rath Rush,
// "Let Me Tell You Something", Overhead Slam, Primal Lunge), builds Fury to RAGING and to RATH'S FURY (super armor: a real foe
// hit lands with no flinch), fires the ULTIMATE (a clean capture), then the BINDING VOW. Confirms both fighters + HUD render
// (sprites, not boxes), no page errors, no rath asset 404s, no black screen.
//   node harness/ben10_rath_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /rath/.test(r.url())) my404.push(r.url().split("/").pop()) })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
const lum = (y0, y1) => page.evaluate(([a, b]) => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * a), c.width, Math.floor(c.height * (b - a))).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 }, [y0, y1])
async function notBlack(file) { const buf = await page.screenshot({ path: path.join(OUT, file) }); return (await lum(0.3, 0.7)) > 12 && buf.length > 20000 }
const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "rath"]
async function boot(vow = false) {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
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
// the live Rath fighter, captured through his render-only drawHud hook (the wrapper only records the reference)
const captureRt = () => page.evaluate(async () => {
  const X = await import("./rath.js"); window.__rtLive = null
  if (!X.RATH.__rtWrapped) { const orig = X.RATH.drawHud; X.RATH.drawHud = function (ctx, f, o) { window.__rtLive = f; return orig(ctx, f, o) }; X.RATH.__rtWrapped = true }
  for (let i = 0; i < 120 && !window.__rtLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__rtLive
})
// test-only pokes (harness setup, like ben10SetPower): reset cooldowns, register →→, set Fury
const rt = (poke = null) => page.evaluate(async poke => {
  const X = await import("./rath.js")
  const f = window.__rtLive || null, s = f ? X.rtState(f) : null
  if (s && poke?.dash) s.dashTapT = s.t
  if (s && poke?.cool) { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = []; f.attacking = false; f.currentAttack = null }
  if (s && poke?.fury != null) { s.fury = poke.fury; s.lastGainT = s.t; s.furyCd = 0; s.furyReadyAt = 0; if (poke.fury >= 100) { s.fury = 96; X.gainFury(f, s, 5, "dealt") } }
  return s ? { fury: s.fury, tier: X.furyTier(s), furyT: s.furyT, armored: s.armored, st: { ...s.stats }, cast: f._spriteCastMove || null, chain: s.chain?.kind || null,
    grab: s.grab ? { held: s.grab.held } : null, lastGrab: s.lastGrab, lastChain: s.lastChain ? { kind: s.lastChain.kind, why: s.lastChain.why, n: s.lastChain.contacts.length } : null,
    ult: s.ult?.phase || null, lastUlt: s.lastUlt ? { captured: s.lastUlt.captured, raw: s.lastUlt.raw } : null, hitstun: f.hitstun || 0, atk: f.currentAttack?.name || null } : null
}, poke)
const near = dx => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
async function sprites(tag) {
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, `Rath renders as sprites (${tag})`, `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, `opponent renders as sprites (${tag})`)
  ok(p1?.health > 0 && p2?.health > 0, `both HP bars live (${tag})`)
}
async function spec(dir, dx, name, shot, pre = {}, wait = 14) {
  await settle(); await rt({ cool: true, ...pre }); if (dx != null) await near(dx)
  const hp = (await H("p2")).health; await H("ben10Cast", dir); await frames(wait)
  const p = await rt(); ok(p?.cast && /^rt/.test(p.cast), name + " cast", JSON.stringify({ cast: p?.cast }))
  ok(await notBlack(shot), "no black screen (" + name + ")")
  return hp
}
try {
  // ── 1. production match: Rath picked into slot 5 (PICK FIVE; the slot count read from the registry) ──
  const d0 = await boot()
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Rath in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "rath", "Omnitrix Dial ↓↓ + P (slot 5) transforms into Rath", `form=${d1?.form}`)
  ok(/ben10_rath_ready_idle_uniform/.test(d1?.sheet || ""), "Rath frame set active", d1?.sheet)
  await sprites("standing"); ok(await notBlack("_rath_standing.png"), "no black screen (standing)")
  ok(await captureRt(), "live Rath captured (HUD hook)")
  // ── 2. every normal (the real keys: J light, K heavy, ↓+J low, ↑+J launcher, air J) ──
  for (const [label, keys, shot] of [["Jab", ["j"], "_rath_light.png"], ["Heavy", ["k"], "_rath_heavy.png"], ["Low", ["s", "j"], "_rath_low.png"], ["Launcher", ["i"], "_rath_up.png"]]) {
    await settle(30); await rt({ cool: true }); await near(110); const hp = (await H("p2")).health
    for (const k of keys) await page.keyboard.down(k); await frames(4); const a = await rt(); for (const k of keys.slice().reverse()) await page.keyboard.up(k); await frames(24)
    const want = { Jab: "light", Heavy: "heavy", Low: "down", Launcher: "up" }[label]
    ok(a?.atk === want || (a?.atk == null && (await H("p2")).health < hp), label + " comes out", JSON.stringify({ atk: a?.atk, want })); ok(await notBlack(shot), "no black screen (" + label + ")")
  }
  // ── 3. every special ──
  let hp = await spec("N", 140, "Claw Rake", "_rath_rake.png"); await frames(40); ok((await rt())?.st.rakeHits >= 1, "Claw Rake lands", JSON.stringify((await rt())?.lastChain))
  hp = await spec("F", 240, "Rath Rush", "_rath_rush.png", { dash: true }, 18); await frames(40); ok((await rt())?.st.rushHits >= 1, "Rath Rush lands", JSON.stringify((await rt())?.lastChain))
  hp = await spec("D", 90, "Overhead Slam", "_rath_slam.png", {}, 18); await frames(40); ok((await rt())?.st.slamHits >= 1, "Overhead Slam lands (ground bounce)", JSON.stringify({ b: (await rt())?.st.bounces }))
  await settle(); await rt({ cool: true }); await near(70); hp = (await H("p2")).health; await H("ben10Cast", "B"); await frames(34)
  const g1 = await rt(); ok(g1?.grab?.held, "\"Let Me Tell You Something\" grabs (rant + speech burst)", JSON.stringify(g1?.grab))
  await sprites("the rant"); ok(await notBlack("_rath_grab_rant.png"), "no black screen (rant)")
  await frames(60); ok((await rt())?.lastGrab?.ticks === 4 && (await H("p2")).health < hp, "4 rant hits + the shove", JSON.stringify((await rt())?.lastGrab))
  await settle(60); await rt({ cool: true }); await near(200); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(8)
  await H("ben10Cast", "N"); await frames(6); const lg = await rt(); ok(lg?.st.lunges >= 1, "Primal Lunge (air)", JSON.stringify({ cast: lg?.cast })); ok(await notBlack("_rath_lunge.png"), "no black screen (Primal Lunge)"); await frames(50)
  // ── 4. FURY: RAGING, then RATH'S FURY (super armor: the foe's real Heavy lands with no flinch) ──
  await settle(20); const r1 = await rt({ fury: 75 }); ok(r1?.tier === 2, "RAGING (Fury 75)", JSON.stringify({ fury: r1?.fury })); await frames(6); ok(await notBlack("_rath_raging.png"), "no black screen (RAGING)")
  const r2 = await rt({ fury: 100, cool: true }); ok(r2?.tier === 3 && r2.furyT > 0, "RATH'S FURY (armor glow + roar)", JSON.stringify({ furyT: r2?.furyT })); await frames(8)
  ok(await notBlack("_rath_fury.png"), "no black screen (RATH'S FURY)"); await sprites("RATH'S FURY")
  await near(90); const myHp = (await H("p1")).health
  await H("p2Attack"); await frames(24)
  const r3 = await rt(); const hit = (await H("p1")).health < myHp
  ok(hit && r3?.armored >= 1 && r3.hitstun === 0, "super armor: the foe's real hit lands (damage) with no flinch", JSON.stringify({ hit, armored: r3?.armored, hitstun: r3?.hitstun }))
  // ── 5. the ULTIMATE (a clean capture) ──
  await settle(200); await rt({ cool: true }); await near(110); await H("ben10SetPower", "p1", 100); hp = (await H("p2")).health
  await key("u", 3); await frames(40); const u1 = await rt(); ok(u1?.ult && u1.ult !== "opener", "Rath's Fury captures (clean opener → rant)", JSON.stringify({ ult: u1?.ult, last: u1?.lastUlt }))
  await sprites("ult rant"); ok(await notBlack("_rath_ult_rant.png"), "no black screen (ultimate rant)")
  await frames(48); ok(await notBlack("_rath_ult_final.png"), "no black screen (ultimate haymaker)")
  await frames(60); const u2 = await rt(); ok(u2?.lastUlt?.captured && u2.lastUlt.raw === 240, "ultimate: 240 raw", JSON.stringify(u2?.lastUlt)); ok(u2?.fury === 0, "Fury reset after the ult")
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`); ok(await notBlack("_rath_after_ult.png"), "camera restored")
  // ── 6. Binding Vow ──
  await boot(true)
  const v1 = await omx(["j"]); ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "rath"); await frames(20)
  const v2 = await H("ben10Details", "p1"); ok(v2?.form === "rath" && /ben10_rath_ready/.test(v2?.sheet || ""), "Rath under the Binding Vow renders his own art", v2?.sheet)
  ok(await captureRt(), "Rath captured under the Vow"); await rt({ cool: true }); await near(140); await H("ben10SetPower", "p1", 100); await H("ben10Cast", "N"); await frames(14)
  ok(await notBlack("_rath_vow.png"), "no black screen (Vow, Claw Rake)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Rath asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nRATH RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
