// XLR8 RENDER CHECK — boots the real game headless, picks Ben 10, starts a match, TRANSFORMS INTO XLR8 with the real
// ↓↓ + Charge (P) (slot 5) input, the Killua blink (double-tap toward) + full-sprite speed trail, runs FLASH TIME (Block + Special), a live Sonic Slash and Blur Step, and repeats
// the check under the BINDING VOW. Confirms both fighters + HUD render (sprites, not boxes), no page errors, no
// ben10_xlr8 asset 404s, no black screen.  node harness/ben10_xlr8_render.mjs   → shots in ben10_work/
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
page.on("response", r => { if (r.status() === 404 && /ben10_xlr8|xlr8/.test(r.url())) my404.push(r.url().split("/").pop()) })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
// a lit canvas (no black screen): sample the middle band of the page
async function notBlack(file) {
  const buf = await page.screenshot({ path: path.join(OUT, file) })
  const lum = await page.evaluate(() => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * 0.3), c.width, Math.floor(c.height * 0.4)).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 })
  return lum > 12 && buf.length > 20000
}
async function boot(vow = false) {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 })
  await page.mouse.click(640, 360)
  await H("start", { experimental: false }); await frames(4)   // a PRODUCTION match (not the 5-form dev loadout)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
  if (vow) await H("ben10Vow", "p1", true)
  await H("ben10SetPower", "p1", 100)
  const d = await H("ben10Details", "p1"); return d
}
async function transformSlot5() {
  await key("s", 2); await key("s", 2)
  // ↓↓ + Charge (P) = slot 5: both buttons down in the SAME frame (one synchronous dispatch, like a chord)
  const chord = type => page.evaluate(t => { for (const k of ["p"]) document.dispatchEvent(new KeyboardEvent(t, { key: k, code: "Key" + k.toUpperCase(), bubbles: true })) }, type)
  await chord("keydown"); await frames(3); await chord("keyup")
  await frames(60)
  return H("ben10Details", "p1")
}
try {
  // ── 1. plain match: Ben → XLR8 ──
  const d0 = await boot()
  ok(JSON.stringify(d0?.loadout) === JSON.stringify(["swampfire", "heatblast", "megawhatt", "goop", "xlr8"]), "default loadout ends with XLR8 in slot 5", JSON.stringify(d0?.loadout))
  const d1 = await transformSlot5()
  ok(d1?.form === "xlr8", "↓↓ + Charge (P) (slot 5) transforms into XLR8", `form=${d1?.form}`)
  ok(/ben10_xlr8_idle_uniform/.test(d1?.sheet || ""), "XLR8 frame set active", d1?.sheet)
  const p1 = await H("p1"), p2 = await H("p2")
  ok(p1?.spriteReady !== false && p1?.hasSpriteHandler, "XLR8 renders as sprites (no fallback box)", `action=${p1?.spriteAction || p1?.action}`)
  ok(p2?.spriteReady !== false && p2?.hasSpriteHandler, "opponent renders as sprites")
  ok(p1?.w > p1?.h, "long, low hurtbox", `${p1?.w}x${p1?.h}`)
  ok(p1?.health > 0 && p2?.health > 0, "both HP bars live (HUD)")
  ok(await notBlack("_xlr8_form.png"), "no black screen (normal form)")
  // ── 2. FLASH TIME: hold Block (;) + press Special (L) ──
  await H("ben10SetPower", "p1", 100); await frames(4)
  const spd0 = (await H("ben10Details", "p1"))?.speed
  await page.keyboard.down(";"); await frames(2); await key("l", 3); await page.keyboard.up(";"); await frames(6)
  const d2 = await H("ben10Details", "p1")
  ok(d2?.speed && Math.abs(d2.speed / spd0 - 1.4) < 0.01, "Flash Time active: movement ×1.4", `${spd0} → ${d2?.speed}`)
  ok(Math.abs((await H("p1"))?.energy - 75) < 3, "Flash Time spent 25 Power (the Special press is consumed, no stray special)", `${(await H("p1"))?.energy}`)
  // a live Sonic Slash during Flash Time
  await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 200))
  const hp0 = (await H("p2")).health, x0 = (await H("p1")).x; const cast = await H("ben10Cast", "N"); await frames(40)
  ok((await H("p2")).health < hp0, "Sonic Slash lands in the live game", `cast=${cast} ${hp0} → ${(await H("p2")).health} x ${x0} → ${(await H("p1")).x} p2 ${(await H("p2")).x}`)
  ok(await notBlack("_xlr8_flash_time.png"), "no black screen (Flash Time: grey world + afterimages)")
  // Blur Step: reappears on the far side of the opponent
  await frames(30); await H("ben10SetPower", "p1", 100)
  const before = await H("p1"), op = await H("p2"); const side0 = Math.sign((op.x + op.w / 2) - (before.x + before.w / 2))
  await H("ben10Cast", "F"); await frames(20)
  const after = await H("p1"), op2 = await H("p2"); const side1 = Math.sign((op2.x + op2.w / 2) - (after.x + after.w / 2))
  ok(side0 !== 0 && side1 === -side0, "Blur Step lands behind the opponent", `${before.x} → ${after.x} (opp ${op.x})`)
  ok(await notBlack("_xlr8_blur_step.png"), "no black screen (Blur Step)")
  // Killua kit: a REAL double-tap toward the opponent blinks him behind them, leaving the full-sprite trail + speed lines
  await frames(60)
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + (a.x > 1000 ? -450 : 450)) }); await frames(4)
  const b0 = await H("p1"), o0 = await H("p2"); const tk = (o0.x + o0.w / 2) > (b0.x + b0.w / 2) ? "d" : "a"
  const flick = await page.evaluate(() => { const h = window.__harness; for (const k of Object.keys(h)) if (h[k] && typeof h[k] === "object" && typeof h[k].dashState === "function") return h[k].dashState("p1"); return null })
  await page.keyboard.press(tk); await page.waitForTimeout(60); await page.keyboard.press(tk); await frames(1)
  const b1 = await H("p1"), o1 = await H("p2"); const gap0 = Math.abs((o0.x + o0.w / 2) - (b0.x + b0.w / 2)), gap1 = Math.abs((o1.x + o1.w / 2) - (b1.x + b1.w / 2))
  ok(flick?.flicker === true && b1.teleportFlash > 0 && gap1 < gap0 * 0.6, "double-tap toward = Killua speed-tier blink to the opponent", `gap ${gap0.toFixed(0)} → ${gap1.toFixed(0)} flash=${b1.teleportFlash} speedTier=${flick?.flicker}`)
  const trail = await H("benFormTrail", "p1")
  ok(trail > 0, "full-sprite afterimage trail drawn behind him", `ghosts=${trail}`)
  ok(await notBlack("_xlr8_speed_trail.png"), "no black screen (blink + speed trail)")
  // ── 3. Binding Vow ──
  await boot(true)
  const v1 = await transformSlot5()
  ok(!!v1?.form && ["swampfire", "heatblast", "megawhatt", "goop", "xlr8"].includes(v1.form), "Vow transform picks a ready form by hash", `form=${v1?.form}`)
  await H("benForm", "xlr8"); await frames(20)
  const v2 = await H("ben10Details", "p1")
  ok(v2?.form === "xlr8" && /ben10_xlr8/.test(v2?.sheet || ""), "XLR8 under the Binding Vow renders his own art", v2?.sheet)
  ok(await notBlack("_xlr8_vow.png"), "no black screen (Vow)")
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no XLR8 asset 404s", my404.join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nXLR8 RENDER: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
