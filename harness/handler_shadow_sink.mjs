// harness/handler_shadow_sink.mjs
// Megumi (handler) SHADOW SINK — additive i-frame dodge. Live verification against the REAL game:
//   1. Fires from the real charge (P) input; costs energy; grants intangibility (invulnTimer).
//   2. Attacks WHIFF during the window (real p2Attack through the combat hit-path → no damage),
//      PROVEN against a control where the same attack DOES land when he is not sinking.
//   3. He re-emerges correctly (sink window ends, becomes targetable again, can act).
//   4. A real cooldown blocks re-cast (no permanent-invincibility loop).
//   5. handler-scoped: the move is a no-op for another character.
// Each phase re-boots for a CLEAN neutral P1 (Shadow Sink is gated out of hitstun by design, so a
// contaminated state would false-fail — we deliberately test from neutral, which is when it's usable).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const H = (fn, ...a) => page.evaluate(fn, ...a)
async function frames(n) { const s = await H(() => window.__harness.state().frame); await page.waitForFunction(a => window.__harness.state().frame >= a, s + n, { timeout: 8000, polling: 16 }).catch(() => {}) }
const p1 = () => H(() => window.__harness.p1())
const ss = () => H(() => window.__harness.shadowSinkState("p1"))
async function bootClean(p1k = "handler", p2k = "handler") {
  await page.goto(`${base}/index.html?harness=1&p1=${p1k}&p2=${p2k}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!(window.__harness && window.__harness.shadowSink))
  await H(() => window.__harness.boot()); await H(() => window.__harness.skipToBattle())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 15000, polling: 50 }) } catch (_) {}
  await frames(10)
}

await bootClean()
const cfg = await H(() => { const a = window.__harness.p1(); return { window: 0, invuln: 0, cost: 0, cooldown: 0, ...(window.__harness.shadowSink("p1").cfg) } })
console.log(`\ncfg: window=${cfg.window}f (~${(cfg.window/60).toFixed(2)}s) invuln=${cfg.invuln}f cost=${cfg.cost} cooldown=${cfg.cooldown}f`)

// ── CONTROL: the same attack LANDS when P1 is NOT sinking (proves the test can see a hit) ──
console.log("\n── control: attack lands when NOT sinking ──")
await bootClean()
await H(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 62) }); await frames(2)
const hpBefore = (await p1()).health
await H(() => window.__harness.p2Attack()); await frames(26)
check("p2 light DOES damage P1 in the open", (await p1()).health < hpBefore, `before=${hpBefore} after=${(await p1()).health}`)

// ── fire SHADOW SINK from the REAL charge (P) input, from a CLEAN neutral state ──
console.log("\n── fire via real charge (P) input ──")
await bootClean()
await page.keyboard.down("p"); await frames(2); await page.keyboard.up("p"); await frames(3)
let s = await ss()
check("Shadow Sink armed from charge key (intangible + window running)", s.sinking === true && s.invulnTimer > 0 && s.sinkT > 0, JSON.stringify(s))
check("energy was spent (cost 30)", s.energy === 200 - cfg.cost, `energy=${s.energy}`)
check("cooldown is now running", s.cooldown > 0, `cd=${s.cooldown}`)
await page.screenshot({ path: path.join(OUT, "SHADOW_SINK_sink.png") })   // mid-window: pool open + body faded

// ── attacks WHIFF during the intangible window (continue — P1 is sinking) ──
// Two real attacks, each landing WELL INSIDE the invuln span (checked: invulnTimer>0 at each assert).
console.log("\n── attacks whiff while intangible ──")
const hp0 = (await p1()).health
let checkedInvulnHits = 0
for (let i = 0; i < 2; i++) {
  await H(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 62) })
  await H(() => window.__harness.p2Attack())
  await frames(14)                                    // let the attack's active frames resolve (still inside invuln)
  const st = await ss()
  if (st.invulnTimer > 0) { checkedInvulnHits++; check(`attack ${i + 1} whiffed while intangible (invuln=${st.invulnTimer})`, (await p1()).health === hp0, `hp=${(await p1()).health}`) }
}
check("at least one attack was verified during the invuln window", checkedInvulnHits >= 1, `verified=${checkedInvulnHits}`)
check("P1 took NO damage across the intangible barrage", (await p1()).health === hp0, `hp ${hp0}→${(await p1()).health}`)

// ── cooldown blocks re-cast: still within the 200f cooldown, from a clean neutral state ──
console.log("\n── cooldown blocks re-cast ──")
await page.waitForFunction(() => (window.__harness.shadowSinkState("p1").sinkT || 0) === 0, null, { timeout: 4000, polling: 16 }).catch(() => {})
await frames(4)
s = await ss()
check("sink window ended (re-emerged, no longer intangible)", s.sinking === false && s.invulnTimer === 0, JSON.stringify(s))
check("still within cooldown after the window", s.cooldown > 0, `cd=${s.cooldown}`)
const rBlocked = await H(() => window.__harness.shadowSink("p1"))
check("re-cast BLOCKED while on cooldown", rBlocked.ok === false, `ok=${rBlocked.ok} cd=${rBlocked.cooldown}`)

// ── re-emerges targetable + can act ──
console.log("\n── re-emerge: targetable + able to act ──")
check("P1 can act again (attackCooldown drained)", (await p1()).attackCooldown === 0, `cd=${(await p1()).attackCooldown}`)
await page.screenshot({ path: path.join(OUT, "SHADOW_SINK_emerge.png") })
const hpPre = (await p1()).health
await H(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 62) })
await H(() => window.__harness.p2Attack()); await frames(26)
check("targetable again after emerge (attack lands)", (await p1()).health < hpPre, `hp ${hpPre}→${(await p1()).health}`)

// ── cooldown eventually clears → castable again ──
console.log("\n── cooldown clears → castable again ──")
await bootClean()   // fresh: cooldown starts at 0
const rFresh = await H(() => window.__harness.shadowSink("p1"))
check("castable from a fresh neutral state", rFresh.ok === true, `ok=${rFresh.ok}`)

// ── handler-scoped: no-op for another character ──
console.log("\n── other characters unaffected ──")
await bootClean("goku", "goku")
const rg = await H(() => window.__harness.shadowSink("p1"))
check("Shadow Sink is a NO-OP for a non-handler (goku)", rg.ok === false && rg.sinking === false, JSON.stringify({ ok: rg.ok, sinking: rg.sinking }))

console.log(`\njsErrors: ${jsErrors.length}`); if (jsErrors.length) console.log(jsErrors.slice(0, 3).join("\n"))
console.log(`\n${FAIL === 0 && jsErrors.length === 0 ? "✅" : "❌"} handler shadow sink: ${PASS} passed, ${FAIL} failed`)
await browser.close(); server.close()
process.exit(FAIL === 0 && jsErrors.length === 0 ? 0 : 1)
