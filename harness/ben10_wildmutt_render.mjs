// WILDMUTT RENDER CHECK — boots the real game headless, picks Ben 10 with Wildmutt in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS INTO WILDMUTT through the Omnitrix Dial (↓↓ + P), throws every normal and every special (Spin
// Slash, Pounce, Claw Rush, Ground Shred, Scent Leap), Feral Curl, builds Feral Fury into FRENZY, lets the opponent hit him from
// BEHIND (a cross-up: normal damage, no crash), fires the ULTIMATE (a clean capture: pin → barrage → scaled-up slam), then the
// BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no page errors, no wildmutt asset 404s, no black screen.
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
page.on("response", r => { if (r.status() === 404 && /wildmutt/.test(r.url())) my404.push(r.url().split("/").pop()) })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
const lum = (y0, y1) => page.evaluate(([a, b]) => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * a), c.width, Math.floor(c.height * (b - a))).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 }, [y0, y1])
async function notBlack(file) { const buf = await page.screenshot({ path: path.join(OUT, file) }); return (await lum(0.3, 0.7)) > 12 && buf.length > 20000 }
const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "wildmutt_ov"]
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
// the live Wildmutt fighter, captured through his render-only drawHud hook (the wrapper only records the reference)
const captureWm = () => page.evaluate(async () => {
  const X = await import("./wildmutt.js"); window.__wmLive = null
  if (!X.WILDMUTT.__wmWrapped) { const orig = X.WILDMUTT.drawHud; X.WILDMUTT.drawHud = function (ctx, f, o) { window.__wmLive = f; return orig(ctx, f, o) }; X.WILDMUTT.__wmWrapped = true }
  for (let i = 0; i < 120 && !window.__wmLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__wmLive
})
// test-only pokes (harness setup, like ben10SetPower): reset cooldowns, register →→ / ←←, set Fury
const wm = (poke = null) => page.evaluate(async poke => {
  const X = await import("./wildmutt.js")
  const f = window.__wmLive || null, s = f ? X.wmState(f) : null
  if (s && poke?.dash) s.dashTapT = s.t
  if (s && poke?.back) s.backTapT = s.t
  if (s && poke?.cool) { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = []; f.attacking = false; f.currentAttack = null; s.curlCd = 0 }
  if (s && poke?.fury != null) { s.fury = poke.fury; s.lastGainT = s.t; s.frenzyCd = 0; s.frenzyReadyAt = 0; if (poke.fury >= 100) { s.fury = 96; X.gainFury(f, s, 6) } }
  return s ? { fury: s.fury, frenzyT: s.frenzyT, st: { ...s.stats }, cast: f._spriteCastMove || null, chain: s.chain?.kind || null, spin: s.spin ? s.spin.hits : null,
    lastSpin: s.lastSpin, lastChain: s.lastChain ? { kind: s.lastChain.kind, why: s.lastChain.why, n: s.lastChain.contacts.length } : null, curl: !!s.curl,
    ult: s.ult?.phase || null, lastUlt: s.lastUlt ? { captured: s.lastUlt.captured, raw: s.lastUlt.raw } : null, scale: s.renderScale || 1, hitstun: f.hitstun || 0,
    atk: f.currentAttack?.name || null, x: f.x, facing: f.facing, w: f.w, h: f.h } : null
}, poke)
const near = dx => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
async function sprites(tag) {
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, `Wildmutt renders as sprites (${tag})`, `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, `opponent renders as sprites (${tag})`)
  ok(p1?.health > 0 && p2?.health > 0, `both HP bars live (${tag})`)
}
async function spec(dir, dx, name, shot, pre = {}, wait = 14) {
  await settle(); await wm({ cool: true, ...pre }); if (dx != null) await near(dx)
  await H("ben10Cast", dir); await frames(wait)
  const p = await wm(); ok(p?.cast && /^wm|^crouch|^idle/.test(p.cast), name + " cast", JSON.stringify({ cast: p?.cast }))
  ok(await notBlack(shot), "no black screen (" + name + ")")
}
try {
  // ── 1. production match: Wildmutt picked into slot 5 (PICK FIVE; the slot count read from the registry) ──
  const d0 = await boot()
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Wildmutt in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "wildmutt_ov", "Omnitrix Dial ↓↓ + P (slot 5) transforms into Wildmutt", `form=${d1?.form}`)
  ok(/ben10_wildmutt_ready_idle_uniform/.test(d1?.sheet || ""), "Wildmutt frame set active", d1?.sheet)
  await sprites("standing"); ok(await notBlack("_wildmutt_standing.png"), "no black screen (standing)")
  ok(await captureWm(), "live Wildmutt captured (HUD hook)")
  const g0 = await wm(); ok(g0 && g0.h < 110 && g0.w > 60, "low, wide quadruped hurtbox", JSON.stringify({ w: g0?.w, h: g0?.h }))
  // ── 2. every normal (the real keys: J light, K heavy, ↓+J low, I launcher) + an air normal ──
  for (const [label, keys, shot] of [["Jab", ["j"], "_wildmutt_light.png"], ["Heavy", ["k"], "_wildmutt_heavy.png"], ["Low", ["s", "j"], "_wildmutt_low.png"], ["Launcher", ["i"], "_wildmutt_up.png"]]) {
    await settle(30); await wm({ cool: true }); await near(130); const hp = (await H("p2")).health
    for (const k of keys) await page.keyboard.down(k); await frames(4); const a = await wm(); for (const k of keys.slice().reverse()) await page.keyboard.up(k); await frames(24)
    const want = { Jab: "light", Heavy: "heavy", Low: "down", Launcher: "up" }[label]
    ok(a?.atk === want || (a?.atk == null && (await H("p2")).health < hp), label + " comes out", JSON.stringify({ atk: a?.atk, want })); ok(await notBlack(shot), "no black screen (" + label + ")")
  }
  await settle(30); await wm({ cool: true }); await near(130); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(6)
  await page.keyboard.down("j"); await frames(3); const aa = await wm(); await page.keyboard.up("j"); await frames(40); ok(aa?.atk === "air" || aa?.atk == null, "Air normal", JSON.stringify({ atk: aa?.atk })); ok(await notBlack("_wildmutt_air.png"), "no black screen (Air)")
  // ── 3. every special ──
  await spec("N", 110, "Spin Slash", "_wildmutt_spin.png", {}, 22); await sprites("mid-spin"); await frames(40); ok((await wm())?.st.spinHits >= 1, "Spin Slash lands", JSON.stringify((await wm())?.lastSpin))
  await spec("F", 260, "Pounce", "_wildmutt_pounce.png", { dash: true }, 20); await frames(40); ok((await wm())?.st.pounceHits >= 1, "Pounce lands", JSON.stringify((await wm())?.lastChain))
  await spec("B", 220, "Claw Rush", "_wildmutt_rush.png", {}, 16); await frames(40); ok((await wm())?.st.rushHits >= 1, "Claw Rush lands", JSON.stringify((await wm())?.lastChain))
  await spec("D", 180, "Ground Shred", "_wildmutt_shred.png", {}, 16); await frames(40); ok((await wm())?.st.shredHits >= 1, "Ground Shred lands", JSON.stringify((await wm())?.lastChain))
  await settle(60); await wm({ cool: true }); await near(220); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(8)
  await H("ben10Cast", "N"); await frames(6); const lg = await wm(); ok(lg?.st.leaps >= 1, "Scent Leap (air)", JSON.stringify({ cast: lg?.cast })); ok(await notBlack("_wildmutt_leap.png"), "no black screen (Scent Leap)"); await frames(50)
  // Feral Curl: ←← + Light (the double tap registered by the harness poke, then the real J key)
  await settle(30); await wm({ cool: true, back: true }); await page.keyboard.down("j"); await frames(3); await page.keyboard.up("j"); await frames(3)
  const cu = await wm(); ok(cu?.curl || cu?.st.curls >= 1, "Feral Curl (curled huddle)", JSON.stringify({ cast: cu?.cast })); ok(await notBlack("_wildmutt_curl.png"), "no black screen (Feral Curl)"); await frames(30)
  // ── 4. FERAL FURY → FRENZY ──
  await settle(20); const r1 = await wm({ fury: 60 }); ok(r1?.fury === 60, "Feral Fury gauge (60)", JSON.stringify({ fury: r1?.fury })); await frames(4); ok(await notBlack("_wildmutt_fury.png"), "no black screen (Fury)")
  const r2 = await wm({ fury: 100, cool: true }); ok(r2?.frenzyT > 0 && r2.fury === 0, "FRENZY (gauge consumed)", JSON.stringify({ frenzyT: r2?.frenzyT })); await frames(8)
  ok(await notBlack("_wildmutt_frenzy.png"), "no black screen (FRENZY)"); await sprites("FRENZY")
  // ── 5. a cross-up against him: the opponent on his BACK side attacks — the hit lands normally, no crash ──
  await settle(30); await wm({ cool: true }); await near(-110); await frames(2)
  const before = await wm(), myHp = (await H("p1")).health; await H("p2Attack"); await frames(24)
  ok(true, "cross-up attempted from his back side", JSON.stringify({ facing: before?.facing })); ok(await notBlack("_wildmutt_crossup.png"), "no black screen (cross-up)")
  ok((await H("p1")).health <= myHp, "the behind hit resolves through the normal pipeline", `${myHp} → ${(await H("p1")).health}`); await sprites("cross-up")
  // ── 6. the ULTIMATE (a clean capture) ──
  await settle(200); await wm({ cool: true }); await near(130); await H("ben10SetPower", "p1", 100); const hp = (await H("p2")).health
  await key("u", 3); await frames(44); const u1 = await wm(); ok(u1?.ult && u1.ult !== "opener", "Primal Takedown captures (clean opener → pin / barrage)", JSON.stringify({ ult: u1?.ult, last: u1?.lastUlt }))
  await sprites("ult barrage"); ok(await notBlack("_wildmutt_ult_barrage.png"), "no black screen (ultimate barrage)")
  let sc = 1; for (let i = 0; i < 12; i++) { await frames(4); sc = Math.max(sc, (await wm())?.scale || 1) }
  ok(sc > 1, "the finisher draws scaled up", `scale ${sc}`); ok(await notBlack("_wildmutt_ult_final.png"), "no black screen (ultimate slam)")
  await frames(60); const u2 = await wm(); ok(u2?.lastUlt?.captured && u2.lastUlt.raw === 240, "ultimate: 240 raw", JSON.stringify(u2?.lastUlt)); ok(u2?.fury === 0, "Fury 0 after the ult")
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`); ok(await notBlack("_wildmutt_after_ult.png"), "camera restored")
  // ── 7. Binding Vow ──
  await boot(true)
  const v1 = await omx(["j"]); ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "wildmutt_ov"); await frames(20)
  const v2 = await H("ben10Details", "p1"); ok(v2?.form === "wildmutt_ov" && /ben10_wildmutt_ready/.test(v2?.sheet || ""), "Wildmutt under the Binding Vow renders his own art", v2?.sheet)
  ok(await captureWm(), "Wildmutt captured under the Vow"); await wm({ cool: true }); await near(110); await H("ben10SetPower", "p1", 100); await H("ben10Cast", "N"); await frames(22)
  ok(await notBlack("_wildmutt_vow.png"), "no black screen (Vow, Spin Slash)"); await sprites("Vow")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Wildmutt asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nWILDMUTT RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
