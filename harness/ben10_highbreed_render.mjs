// HIGHBREED RENDER CHECK — boots the real game headless, picks Ben 10 with Highbreed in his PICK-FIVE loadout (dial slot 5),
// starts a match, TRANSFORMS through the Omnitrix Dial (↓↓ + P), throws the GROUND normals, RUNNING attacks (dash → attack),
// TAKES OFF (hold Jump) and throws a FLYING attack, lands every special, triggers MUTATION SURGE (MUTATED ×1.15), plays the
// DIALOGUE TAUNT (Block + Light held), fires the ULTIMATE (Genetic Purge, a clean capture), then the BINDING VOW. Confirms
// sprites (not boxes) + HUD for both fighters, no page errors, no highbreed asset 404s, no black screen.
//   node harness/ben10_highbreed_render.mjs   → shots in ben10_work/ (untracked)
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
page.on("response", r => { if (r.status() === 404 && /highbreed/.test(r.url())) my404.push(r.url().split("/").pop()) })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
const lum = (y0, y1) => page.evaluate(([a, b]) => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * a), c.width, Math.floor(c.height * (b - a))).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 }, [y0, y1])
async function notBlack(file) { const buf = await page.screenshot({ path: path.join(OUT, file) }); return (await lum(0.3, 0.7)) > 12 && buf.length > 20000 }
const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "highbreed"]
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
// the live Highbreed fighter + his opponent, captured through his render-only drawFx hook (the wrapper only records references)
const captureHb = () => page.evaluate(async () => {
  const X = await import("./highbreed.js"); window.__hbLive = null
  if (!X.HIGHBREED.__hbWrapped) { const orig = X.HIGHBREED.drawFx; X.HIGHBREED.drawFx = function (c, f, frame, opp) { window.__hbLive = f; window.__hbOpp = opp; return orig(c, f, frame, opp) }; X.HIGHBREED.__hbWrapped = true }
  for (let i = 0; i < 120 && !window.__hbLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__hbLive && !!window.__hbOpp
})
// test-only pokes (harness setup, like ben10SetPower): reset cooldowns, set Surge, a dash tap, a motion
const hb = (poke = null) => page.evaluate(async poke => {
  const X = await import("./highbreed.js"), FL = await import("./flight.js")
  const f = window.__hbLive || null, s = f ? X.hbState(f) : null
  if (s && poke?.cool) { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = []; f.attacking = false; f.currentAttack = null }
  if (s && poke?.surge != null) { s.surge = poke.surge; s.lastGainT = s.t }
  if (s && poke?.dash) s.dashTapT = s.t
  if (s && poke?.qcf) s.hist = [{ d: 2, t: s.t - 2 }, { d: 3, t: s.t - 1 }, { d: 6, t: s.t }]
  if (s && poke?.qcb) s.hist = [{ d: 4, t: s.t - 2 }, { d: 1, t: s.t - 1 }, { d: 2, t: s.t }]
  return s ? { state: s.moveState, anim: s.moveAnim, flying: FL.isFlying(f), flights: s.flights, surge: s.surge, mutT: s.mutT, renderScale: s.renderScale, mutations: s.mutations,
    hurt: X.HIGHBREED.hurtbox(f), w: f.w, h: f.h, taunt: !!s.taunt, taunts: s.taunts, cast: f._spriteCastMove, ult: s.ult ? s.ult.phase : null, lastUlt: s.lastUlt,
    st: JSON.parse(JSON.stringify(s.stats)), lastClaws: s.lastClaws, lastDive: s.lastDive, lastLance: s.lastLance, lastWing: s.lastWing, hp: f.health, y: f.y, ground: !!(f.onGround || f.grounded) } : null
}, poke)
const near = dx => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 50) { await frames(n); await H("ben10SetPower", "p1", 100) }
async function sprites(tag) {
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, `Highbreed renders as sprites (${tag})`, `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, `opponent renders as sprites (${tag})`)
  ok(p1?.health > 0 && p2?.health > 0, `both HP bars live (${tag})`)
}
async function spec(dir, dx, name, shot, pre = {}, wait = 14) {
  await settle(); await hb({ cool: true, ...pre }); if (dx != null) await near(dx)
  await H("ben10Cast", dir); await frames(wait)
  const p = await hb(); ok(!!p?.cast, name + " cast", JSON.stringify({ cast: p?.cast }))
  ok(await notBlack(shot), "no black screen (" + name + ")")
  return p
}
try {
  // ── 1. production match: Highbreed picked into slot 5 (PICK FIVE) → the Omnitrix Dial ──
  const d0 = await boot()
  const SLOTS = await page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT)
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(PICK), "picked loadout: Highbreed in slot 5", JSON.stringify(d0?.loadout))
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS})`)
  const d1 = await omx(["p"])
  ok(d1?.form === "highbreed", "Omnitrix Dial ↓↓ + P (slot 5) transforms into Highbreed", `form=${d1?.form}`)
  ok(/ben10_highbreed_ready_idle_uniform/.test(d1?.sheet || ""), "Highbreed frame set active", d1?.sheet)
  await sprites("standing"); ok(await notBlack("_highbreed_standing.png"), "no black screen (standing)")
  ok(await captureHb(), "live Highbreed + opponent captured (FX hook)")
  // ── 2. GROUND normals (J light, K heavy, ↓+J low, I launcher) — the walking rows ──
  for (const [label, keys, shot, want] of [["Jab", ["j"], "_highbreed_light.png", "light"], ["Heavy", ["k"], "_highbreed_heavy.png", "heavy"], ["Low", ["s", "j"], "_highbreed_low.png", null], ["Launcher", ["i"], "_highbreed_up.png", null]]) {
    await settle(30); await hb({ cool: true }); await near(100); const hp = (await H("p2")).health
    for (const k of keys) await page.keyboard.down(k); await frames(3); for (const k of keys.slice().reverse()) await page.keyboard.up(k); await frames(5)
    const p = await hb(); if (want) ok(p?.anim?.action === want && p.anim.state === "grounded", `${label}: grounded row`, JSON.stringify(p?.anim))
    ok(await notBlack(shot), `no black screen (${label})`); await frames(25); ok((await H("p2")).health < hp, `${label} connects`)
  }
  // ── 3. RUNNING attacks: a dash (→→) then Jab / Heavy pull the running rows ──
  for (const [label, k, want, shot] of [["running Jab", "j", "lightRun", "_highbreed_run_light.png"], ["running Heavy", "k", "heavyRun", "_highbreed_run_heavy.png"]]) {
    await settle(40); await hb({ cool: true }); await near(420)
    await key("d", 2); await key("d", 2); await frames(2); await key(k, 3)
    const p = await hb(); ok(p?.anim?.action === want && p.anim.state === "running", `${label}: running row`, JSON.stringify(p?.anim))
    await sprites(label); ok(await notBlack(shot), `no black screen (${label})`); await frames(30)
  }
  // ── 4. TAKE OFF (hold Jump in the air) + a FLYING attack ──
  await settle(40); await hb({ cool: true }); await near(500)
  await page.keyboard.down("w"); await frames(24)
  const fl = await hb(); ok(fl?.flying && fl.flights >= 1 && fl.state === "flying", "takes off: hover-flight (hold Jump)", JSON.stringify({ flying: fl?.flying, state: fl?.state }))
  await sprites("flying"); ok(await notBlack("_highbreed_flying.png"), "no black screen (flying)")
  await key("j", 3); const fa = await hb(); ok(/Fly$/.test(fa?.anim?.action || "") && fa.anim.state === "flying", "flying attack: flying row", JSON.stringify(fa?.anim))
  ok(await notBlack("_highbreed_fly_attack.png"), "no black screen (flying attack)"); await page.keyboard.up("w"); await frames(60)
  // ── 5. specials ──
  await spec("N", 90, "Rending Claws", "_highbreed_claws.png", { qcf: true }, 18); await frames(30); ok((await hb())?.st.clawHits >= 1, "Rending Claws lands", JSON.stringify((await hb())?.lastClaws))
  await spec("B", 160, "Genetic Lance (melee fallback)", "_highbreed_lance.png", { qcb: true }, 16); await frames(40); ok((await hb())?.st.lanceHits >= 1, "Genetic Lance lands", JSON.stringify((await hb())?.lastLance))
  await spec("F", 260, "Talon Dive (grounded → leap)", "_highbreed_dive.png", { dash: true }, 14); await frames(50); ok((await hb())?.lastDive?.leap, "Talon Dive leapt first", JSON.stringify((await hb())?.lastDive))
  await settle(80); await hb({ cool: true }); await near(150); await page.keyboard.down("w"); await frames(3); await page.keyboard.up("w"); await frames(10)
  await H("ben10Cast", "D"); await frames(6); ok((await hb())?.st.wings >= 1, "Wing Slash (air)", JSON.stringify({ cast: (await hb())?.cast })); ok(await notBlack("_highbreed_wing.png"), "no black screen (Wing Slash)"); await frames(50)
  // ── 6. MUTATION SURGE → MUTATED (render ×1.15 + hurtbox ×1.15 together) ──
  await settle(30); await hb({ cool: true, surge: 100 }); await frames(4)
  const mu = await hb(); ok(mu?.mutT > 0 && mu.renderScale === 1.15, "MUTATED: render scale ×1.15", JSON.stringify({ mutT: mu?.mutT, rs: mu?.renderScale }))
  ok(mu?.hurt && Math.abs(mu.hurt.w - mu.w * 1.15) < 0.01 && Math.abs(mu.hurt.h - mu.h * 1.15) < 0.01, "MUTATED: hurtbox ×1.15 with it", JSON.stringify(mu?.hurt))
  await sprites("MUTATED"); ok(await notBlack("_highbreed_mutated.png"), "no black screen (MUTATED)")
  // ── 7. DIALOGUE TAUNT (Block + Light held 20f) ──
  await settle(10); await hb({ cool: true }); await near(500); await page.keyboard.down(";"); await page.keyboard.down("j"); await frames(28)
  const ta = await hb(); ok(ta?.taunt && ta.cast === "taunt", "Dialogue Taunt plays (Block + Light held)", JSON.stringify({ taunt: ta?.taunt, cast: ta?.cast }))
  await sprites("taunt"); ok(await notBlack("_highbreed_taunt.png"), "no black screen (taunt + text icon)"); await page.keyboard.up("j"); await page.keyboard.up(";"); await frames(2)
  await key("a", 3); ok(!(await hb())?.taunt, "any input cancels the taunt")
  // ── 8. ULTIMATE: Genetic Purge ──
  await settle(260); await hb({ cool: true }); await near(110); await H("ben10SetPower", "p1", 100); const hp = (await H("p2")).health
  await key("u", 3); await frames(50); const u1 = await hb(); ok(u1?.ult && u1.ult !== "opener", "Genetic Purge captures (clean claw opener → top-down circle)", JSON.stringify({ ult: u1?.ult, last: u1?.lastUlt }))
  await sprites("ult circle / dives"); ok(await notBlack("_highbreed_ult.png"), "no black screen (DNA strand / dives)")
  await frames(40); ok(await notBlack("_highbreed_ult_beam.png"), "no black screen (Purge Beam)")
  await frames(60); const u2 = await hb(); ok(u2?.lastUlt?.captured && u2.lastUlt.raw === 240, "ultimate: 240 raw", JSON.stringify(u2?.lastUlt)); ok(u2?.surge === 0, "Surge 0 after the ult")
  ok((await H("p2")).health < hp, "ultimate damage lands", `${hp} → ${(await H("p2")).health}`); await sprites("after the ult"); ok(await notBlack("_highbreed_after_ult.png"), "camera restored")
  // ── 9. Binding Vow ──
  await boot(true)
  const v1 = await omx(["j"]); ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "highbreed"); await frames(20)
  const v2 = await H("ben10Details", "p1"); ok(v2?.form === "highbreed" && /ben10_highbreed_ready/.test(v2?.sheet || ""), "Highbreed under the Binding Vow renders his own art", v2?.sheet)
  ok(await captureHb(), "Highbreed captured under the Vow"); await hb({ cool: true }); await near(90); await H("ben10SetPower", "p1", 100); await hb({ qcf: true }); await H("ben10Cast", "N"); await frames(14)
  await sprites("Vow"); ok(await notBlack("_highbreed_vow.png"), "no black screen (Vow, Rending Claws)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Highbreed asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nHIGHBREED RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
