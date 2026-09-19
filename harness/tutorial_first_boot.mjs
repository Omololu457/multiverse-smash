// harness/tutorial_first_boot.mjs
// TRACK B live verification (beta-readiness): the first-boot guided tutorial.
// Proves, against the REAL game:
//   1. A FRESH save (no "seen" flag) auto-triggers the tutorial on reaching the menu.
//   2. Every step advances via the REAL detection path (held controls + comboCounter).
//   3. Finishing marks it seen.
//   4. A RETURNING save (seen flag set) does NOT auto-trigger.
//   5. Replaying it manually (the menu action) works.
// Uses ?harness=1&tutorial=1 so the first-boot gate is live under the harness (it is
// OFF for every other harness by default, so existing tests are unaffected).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const URL = `${base}/index.html?harness=1&tutorial=1`
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const page = await ctx.newPage()
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const H = (fn, ...a) => page.evaluate(fn, ...a)
const info = () => H(() => window.__harness.tutorial.info())
const gstate = () => H(() => window.__harness.state().gameState ?? window.__harness.state().state)
async function frames(n) { const s = (await H(() => window.__harness.state().frame)); await page.waitForFunction(a => window.__harness.state().frame >= a, s + n, { timeout: 8000, polling: 16 }).catch(() => {}) }
async function boot() { await page.goto(URL, { waitUntil: "load" }); await page.waitForFunction(() => !!(window.__harness && window.__harness.tutorial)) }
async function tap(k, hold = 8) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(4) }

// ── 1. FRESH SAVE auto-triggers on reaching the menu ──────────────────────────
console.log("\n── fresh save → auto-trigger ──")
await boot()
await H(() => window.__harness.tutorial.resetSeen())            // clear "seen" + re-arm the gate
check("fresh save reports NOT seen", (await H(() => window.__harness.tutorial.seen())) === false)
await H(() => window.__harness.ui.goto("MAIN_MENU"))            // land on the menu → gate should fire
await frames(6)
check("tutorial auto-started on first menu visit", (await H(() => window.__harness.tutorial.active())) === true)
await H(() => window.__harness.skipToBattle())                  // skip the intro countdown into the live match
await frames(10)
let i = await info()
check("starts on step 1 of 6 (MOVE)", i && i.idx === 0 && i.total === 6 && i.step?.id === "move", `idx=${i?.idx} step=${i?.step?.id}`)
await page.screenshot({ path: path.join(OUT, "TUTORIAL_step_move.png") })

// ── 2. drive each step via the REAL detection path ────────────────────────────
console.log("\n── step advancement (real inputs) ──")
await tap("d", 10); i = await info(); check("MOVE → JUMP (pressed D)", i.step?.id === "jump", `idx=${i.idx} step=${i.step?.id}`)
await tap("w", 10); i = await info(); check("JUMP → BLOCK (pressed W)", i.step?.id === "block", `idx=${i.idx} step=${i.step?.id}`)
await frames(20)   // let goku land before blocking
await tap(";", 12); i = await info(); check("BLOCK → ATTACK (held guard)", i.step?.id === "attack", `idx=${i.idx} step=${i.step?.id}`)
await tap("j", 10); i = await info(); check("ATTACK → SPECIAL (pressed Light)", i.step?.id === "special", `idx=${i.idx} step=${i.step?.id}`)
await tap("l", 10); i = await info(); check("SPECIAL → COMBO (pressed Special)", i.step?.id === "combo", `idx=${i.idx} step=${i.step?.id}`)
await page.screenshot({ path: path.join(OUT, "TUTORIAL_step_combo.png") })
// Final step reads the live comboCounter — drive it the same way the game does.
await H(() => window.__harness.setCombo("p1", 2)); await frames(4)
i = await info(); check("COMBO step completes at combo≥2", i.complete === true, `complete=${i.complete} idx=${i.idx}`)
await page.screenshot({ path: path.join(OUT, "TUTORIAL_complete.png") })
check("finishing marked it SEEN", (await H(() => window.__harness.tutorial.seen())) === true)

// dismiss the completion panel (Enter) → back to menu
await tap("Enter", 6)
check("Enter on completion returns to menu", (await gstate()) === "mainMenu", `state=${await gstate()}`)
check("tutorial no longer active after finish", (await H(() => window.__harness.tutorial.active())) === false)

// ── 3. RETURNING save does NOT auto-trigger (reload = fresh module, seen persists) ──
console.log("\n── returning save → no auto-trigger ──")
await boot()   // reload: localStorage (seen=true) persists, module state resets
check("returning save reports seen", (await H(() => window.__harness.tutorial.seen())) === true)
await H(() => window.__harness.ui.goto("MAIN_MENU"))
await frames(8)
check("tutorial did NOT auto-start for a returning player", (await H(() => window.__harness.tutorial.active())) === false)

// ── 4. manual replay from the menu works ──────────────────────────────────────
console.log("\n── manual replay ──")
await H(() => window.__harness.tutorial.start())   // the menu "TUTORIAL" action calls startTutorial()
await frames(6)
check("manual replay re-arms the tutorial", (await H(() => window.__harness.tutorial.active())) === true)
const ri = await info(); check("replay restarts at step 1", ri && ri.idx === 0, `idx=${ri?.idx}`)

console.log(`\njsErrors: ${jsErrors.length}`); if (jsErrors.length) console.log(jsErrors.slice(0, 3).join("\n"))
console.log(`\n${FAIL === 0 && jsErrors.length === 0 ? "✅" : "❌"} tutorial first-boot: ${PASS} passed, ${FAIL} failed`)
await browser.close(); server.close()
process.exit(FAIL === 0 && jsErrors.length === 0 ? 0 : 1)
