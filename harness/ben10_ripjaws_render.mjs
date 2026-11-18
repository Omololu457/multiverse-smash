// RIPJAWS RENDER CHECK — boots the real game headless, picks Ben 10 with Ripjaws in his PICK-FIVE loadout (dial slot 5), starts
// a match, TRANSFORMS INTO RIPJAWS through the Omnitrix Dial (↓↓ + P), casts STORM TIDE at both levels (dry → wading →
// submerged), SWIMS, fights through the flood (Fin Blade / Shark Rush / Water Jet / Breach), DROWNS the opponent, fires a
// fire projectile into the water (put out + boil), triggers MAELSTROM FEAST — on a BRIGHT stage and a DARK stage — then a
// WATERBORNE opponent (Frozone), a FIRE fighter (Itachi) and the BINDING VOW. Confirms both fighters + HUD render (sprites,
// not boxes), no page errors, no Ripjaws / flood asset 404s, no black screen.
//   node harness/ben10_ripjaws_render.mjs   → shots in ben10_work/ (untracked)
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
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
const lum = (y0, y1) => page.evaluate(([a, b]) => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * a), c.width, Math.floor(c.height * (b - a))).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 }, [y0, y1])
async function notBlack(file) { const buf = await page.screenshot({ path: path.join(OUT, file) }); return (await lum(0.3, 0.7)) > 12 && buf.length > 20000 }
page.on("pageerror", e => jsErrors.push(String(e)))
page.on("response", r => { if (r.status() === 404 && /ripjaws|benFlood|waterAffinity/.test(r.url())) my404.push(r.url().split("/").pop()) })
const PICK = ["swampfire", "heatblast", "megawhatt", "goop", "ripjaws"]
const BRIGHT = "World Tournament Arena", DARK = "Null Void"
async function boot(stage, p2 = "goku", vow = false) {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=${p2}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 })
  await page.mouse.click(640, 360)
  await H("start", { experimental: false, p1Aliens: PICK }); await frames(4)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
  const st = await H("selectStageByName", stage); await frames(10)
  if (vow) await H("ben10Vow", "p1", true)
  await H("ben10SetPower", "p1", 100)
  return { st, d: await H("ben10Details", "p1") }
}
const chord = (type, ks) => page.evaluate(([t, ks]) => { for (const k of ks) document.dispatchEvent(new KeyboardEvent(t, { key: k, code: k === ";" ? "Semicolon" : "Key" + k.toUpperCase(), bubbles: true })) }, [type, ks])
async function omx(ks) { await key("s", 2); await key("s", 2); await chord("keydown", ks); await frames(3); await chord("keyup", ks); await frames(60); return H("ben10Details", "p1") }
// the live Ripjaws fighter + his opponent, captured through his render-only drawHud / drawFx hooks (the wrappers only record
// references — no simulation effect)
const capture = () => page.evaluate(async () => {
  const X = await import("./ripjaws.js"); window.__rjLive = null
  if (!X.RIPJAWS.__wrapped) { const oh = X.RIPJAWS.drawHud, of = X.RIPJAWS.drawFx
    X.RIPJAWS.drawHud = function (ctx, f, o) { window.__rjLive = f; return oh(ctx, f, o) }
    X.RIPJAWS.drawFx = function (c, f, fr, opp) { window.__rjOpp = opp; return of(c, f, fr, opp) }; X.RIPJAWS.__wrapped = true }
  for (let i = 0; i < 120 && !window.__rjLive; i++) await new Promise(r => requestAnimationFrame(r))
  return !!window.__rjLive
})
// read-only probe + test-only pokes (harness setup, like ben10SetPower): cooldowns, a →→ tap, the opponent's breath
const rj = (poke = null) => page.evaluate(async poke => {
  const X = await import("./ripjaws.js"), FL = await import("./benFlood.js")
  const f = window.__rjLive || null, s = f ? X.rjState(f) : null, o = window.__harness.p2 ? null : null
  const opp = window.__rjOpp || null, r = f ? FL.floodOf(f) : null
  if (s && poke?.cool) { f.attackCooldown = 0; f._benPowerCommit = 0; s.hist = [] }
  if (s && poke?.dash) s.dashTapT = s.t
  if (r && opp && poke?.breath != null) r.breath[opp.side || "p2"] = poke.breath
  if (poke?.fire && opp && r) { const A = await import("./abilities.js"), ly = FL.floodLineY(r)
    A.activeProjectiles.push({ name: poke.fire, owner: opp, x: opp.x + 20, y: ly - 70, w: 30, h: 30, vx: 0, vy: 9, damage: 30, lifetime: 60 }) }
  const w = opp ? FL.waterOf(opp) : null, me = f ? FL.waterOf(f) : null
  return s ? { st: { ...s.stats }, depth: s.depth, swimming: !!s.swimming, set: s.set, cast: f._spriteCastMove || null, ult: s.ult?.phase || null, lastUlt: s.lastUlt,
    flood: r ? { phase: r.phase, level: r.level, line: r.line, l1: r.l1, l2: r.l2, cap: r.cap, H: r.H, boiled: r.boiled, putOut: r.putOut || 0, fizzles: r.fizzles || 0, breath: r.breath[opp?.side || "p2"] ?? null } : null,
    opp: w ? { depth: w.depth, wb: w.wb, drowning: !!w.drowning } : null, me: me ? { depth: me.depth } : null, x: f.x, y: f.y } : null
}, poke)
const near = async (dx) => page.evaluate(dx => window.__harness.setP2X(window.__harness.p1().x + dx), dx)
async function settle(n = 40) { await frames(n); await H("ben10SetPower", "p1", 100) }
async function sprites(tag) {
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, `Ripjaws renders as sprites (${tag})`, `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, `opponent renders as sprites (${tag})`)
  ok(p1?.health > 0 && p2?.health > 0, `both HP bars live (${tag})`)
}
async function transform(tag) {
  const d = await omx(["p"]); ok(d?.form === "ripjaws", `Omnitrix Dial ↓↓ + P (slot 5) transforms into Ripjaws (${tag})`, `form=${d?.form}`)
  ok(/ben10_ripjaws_ready_idle_uniform/.test(d?.sheet || ""), `Ripjaws frame set active (${tag})`, d?.sheet); ok(await capture(), `live Ripjaws captured (${tag})`)
}
async function storm(level, tag) {
  await settle(); await rj({ cool: true }); await near(260)
  ok(await H("ben10Cast", "D"), `Storm Tide cast → Level ${level} (${tag})`); await frames(24 + (level === 1 ? 92 : 64))
  const p = await rj(); ok(p?.flood?.level === level && Math.abs(p.flood.line - (level === 1 ? p.flood.l1 : p.flood.l2)) < 1, `the water reaches Level ${level} (${tag})`, JSON.stringify(p?.flood))
  ok(p.flood.line <= p.flood.cap + 1e-6 && p.flood.H - p.flood.line >= 140, `cap + air gap hold (${tag})`, `${p.flood.line.toFixed(0)} / H ${p.flood.H}`)
  return p
}
async function run(stage, tag) {
  const b = await boot(stage); ok(b.st?.name === stage, `${tag} stage selected`, JSON.stringify(b.st?.name))
  ok(JSON.stringify(b.d?.loadout) === JSON.stringify(PICK), `picked loadout: Ripjaws in slot 5 (${tag})`, JSON.stringify(b.d?.loadout))
  await transform(tag); await sprites(`dry, ${tag}`); ok((await rj())?.depth === "dry", `DRY before the flood (${tag})`)
  ok(await notBlack(`_ripjaws_dry_${tag}.png`), `no black screen (dry, ${tag})`)
  const l1 = await storm(1, tag); ok(l1.opp?.depth === "wading" && l1.depth === "wading", `Level 1: both WADING (${tag})`, JSON.stringify({ me: l1.depth, opp: l1.opp }))
  await sprites(`wading, ${tag}`); ok(await notBlack(`_ripjaws_wading_${tag}.png`), `no black screen (wading, ${tag})`)
  const l2 = await storm(2, tag); await frames(4); const s2 = await rj(); ok(s2.opp?.depth === "submerged" && s2.depth === "submerged", `Level 2: both SUBMERGED (${tag})`, JSON.stringify({ me: s2.depth, opp: s2.opp }))
  ok(s2.set === "water" && s2.swimming, `Ripjaws swims with the tail frames (${tag})`)
  await sprites(`submerged, ${tag}`); ok(await notBlack(`_ripjaws_submerged_${tag}.png`), `no black screen (submerged, ${tag})`)
  // swim: hold up-forward
  const sx = s2.x, sy = s2.y; await page.keyboard.down("d"); await page.keyboard.down("w"); await frames(12); await page.keyboard.up("w"); await page.keyboard.up("d"); await frames(2)
  const sw = await rj(); ok(sw.x !== sx || sw.y !== sy, `8-direction swim moves him (${tag})`, `${sx.toFixed(0)},${sy.toFixed(0)} → ${sw.x.toFixed(0)},${sw.y.toFixed(0)}`)
  ok(await notBlack(`_ripjaws_swim_${tag}.png`), `no black screen (swimming, ${tag})`)
  // (the flood lasts 480f from the first cast: drown + fire first, then the specials)
  // drown the opponent
  await settle(10); await near(260); await rj({ breath: 0 }); const hd = (await H("p2")).health; await frames(46)
  const dr = await rj(); ok(dr.opp?.drowning, `the opponent DROWNS at 0 breath (HUD pulse) (${tag})`, JSON.stringify(dr.opp)); ok(hd - (await H("p2")).health >= 8, `drowning: 4 HP / 15f (${tag})`, `${hd} → ${(await H("p2")).health}`)
  ok(await notBlack(`_ripjaws_drowning_${tag}.png`), `no black screen (drowning, ${tag})`); await rj({ breath: 100 })
  // fire into the water: put out + boil
  const b0 = (await rj()).flood; await rj({ fire: "heatblast_fire" }); await frames(14); const bf = (await rj()).flood
  ok(bf.putOut >= 1 && bf.boiled === b0.boiled + 30, `fire into the water: put out + boil −30 px (${tag})`, JSON.stringify({ putOut: bf.putOut, boiled: bf.boiled }))
  ok(await notBlack(`_ripjaws_steam_${tag}.png`), `no black screen (steam, ${tag})`)
  // fight through the flood (swim back down to the floor first: the opponent stands on it)
  await page.keyboard.down("s"); await frames(24); await page.keyboard.up("s"); await frames(2)
  for (const [dir, dx, name, wait, pre] of [["B", 160, "Fin Blade", 22, {}], ["F", 120, "Shark Rush", 20, { dash: true }], ["N", 260, "Water Jet", 30, {}]]) {
    await settle(); await rj({ cool: true, ...pre }); await near(dx); const hp = (await H("p2")).health; ok(await H("ben10Cast", dir), `${name} cast (${tag})`); await frames(wait)
    ok(await notBlack(`_ripjaws_${name.replace(/ /g, "").toLowerCase()}_${tag}.png`), `no black screen (${name}, ${tag})`); await frames(20); ok((await H("p2")).health < hp, `${name} lands under water (${tag})`)
  }
  // the Ultimate
  await settle(30); await rj({ cool: true }); await near(110); await H("ben10SetPower", "p1", 100); const hu = (await H("p2")).health
  await key("u", 3); await frames(40); const u1 = await rj(); ok(u1?.ult && u1.ult !== "opener", `Maelstrom Feast captures (${tag})`, JSON.stringify({ ult: u1?.ult }))
  ok(await notBlack(`_ripjaws_ult_wave_${tag}.png`), `no black screen (ultimate — tidal wave, ${tag})`)
  await frames(45); ok(await notBlack(`_ripjaws_ult_abyss_${tag}.png`), `no black screen (ultimate — abyss, ${tag})`)
  await frames(45); ok(await notBlack(`_ripjaws_ult_geyser_${tag}.png`), `no black screen (ultimate — geyser, ${tag})`)
  await frames(40); const u2 = await rj(); ok(u2?.lastUlt?.raw === 240, `ultimate: 240 raw (${tag})`, JSON.stringify(u2?.lastUlt?.hits)); ok((await H("p2")).health < hu, `ultimate damage lands (${tag})`)
  await sprites(`after the ultimate, ${tag}`); ok(await notBlack(`_ripjaws_after_ult_${tag}.png`), `fighters readable after the ultimate (${tag})`)
}
try {
  const SLOTS = await (async () => { await boot(BRIGHT); return page.evaluate(async () => (await import("./aliens.js")).BEN10_SLOT_COUNT) })()
  ok((await H("alienSelectState"))?.cap === SLOTS, `alien select / HUD slot cap = registry count (${SLOTS}; PICK FIVE)`)
  await run(BRIGHT, "bright")
  await run(DARK, "dark")
  // a WATERBORNE opponent (Frozone): no breath, no penalties
  await boot(BRIGHT, "frozone"); await transform("vs Frozone"); await storm(1, "vs Frozone"); await storm(2, "vs Frozone"); await frames(30)
  const wb = await rj(); ok(wb.opp?.wb === true && wb.flood.breath === null, "Frozone is WATERBORNE: no breath", JSON.stringify(wb.opp)); await sprites("waterborne opponent")
  ok(await notBlack("_ripjaws_vs_frozone.png"), "no black screen (waterborne opponent)")
  // a FIRE fighter against the flood (Itachi's Fireball into the water: put out + boil)
  await boot(DARK, "itachi"); await transform("vs Itachi"); await storm(1, "vs Itachi"); const i0 = (await rj()).flood; await rj({ fire: "itachiFireball" }); await frames(14); const i1 = (await rj()).flood
  ok(i1.putOut >= 1 && i1.boiled === i0.boiled + 30, "Itachi's Fireball is put out and boils the flood", JSON.stringify({ putOut: i1.putOut, boiled: i1.boiled })); await sprites("fire fighter")
  ok(await notBlack("_ripjaws_vs_itachi.png"), "no black screen (fire fighter vs the flood)")
  // the Binding Vow
  await boot(BRIGHT, "goku", true); const v1 = await omx(["j"]); ok(!!v1?.form, "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "ripjaws"); await frames(20); const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "ripjaws" && /ben10_ripjaws_ready/.test(v2?.sheet || ""), "Ripjaws under the Binding Vow renders his own art", v2?.sheet)
  await capture(); await storm(1, "Vow"); ok(await notBlack("_ripjaws_vow.png"), "no black screen (Vow + flood)")
  ok(jsErrors.length === 0, "no page errors", jsErrors.slice(0, 3).join(" | "))
  ok(my404.length === 0, "no Ripjaws / flood asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nRIPJAWS RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
