// harness/stuck_key_blur.mjs
// BUG: "infinite dash" that persists across character swaps. Root cause — when the window loses
// focus mid-hold the browser never delivers keyup, so the held movement key stays true in the GLOBAL
// keys map forever (physics force-runs the fighter; survives round/char swaps; hits every character).
// FIX: releaseAllKeys() on blur / visibilitychange(hidden) / pagehide.
// This test proves: (1) a held key does drive continuous movement, (2) a swallowed keyup would leave it
// stuck, (3) a blur event clears the held key so the fighter STOPS, (4) it stays cleared across a swap.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
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
const p1x = () => H(() => Math.round(window.__harness.p1().x))
const held = () => H(() => window.__harness.heldKeys())

await page.goto(`${base}/index.html?harness=1&p1=tobirama&p2=beerus`, { waitUntil: "load" })
await page.waitForFunction(() => !!(window.__harness && window.__harness.heldKeys))
await H(() => window.__harness.boot()); await H(() => window.__harness.skipToBattle())
await frames(6)
await page.mouse.click(640, 360)   // ensure the page has focus so key events land

// ── 1. a held movement key drives continuous movement (P1 = Tobirama, right = 'd') ──
console.log("\n── held key moves the fighter ──")
const x0 = await p1x()
await page.keyboard.down("d")            // HOLD right — deliberately never release (simulates a swallowed keyup)
await frames(18)
const xHeld = await p1x()
check("holding right moves P1 right", xHeld > x0 + 20, `x ${x0} → ${xHeld}`)
check("global keys map reads 'd' as held", (await held()).includes("d"), JSON.stringify(await held()))

// ── 2. a blur (focus loss) clears the stuck key → fighter STOPS ──
console.log("\n── blur clears the stuck key ──")
await H(() => window.dispatchEvent(new Event("blur")))   // window loses focus — the fix's trigger
await frames(2)
check("'d' released from the keys map after blur", !(await held()).includes("d"), JSON.stringify(await held()))
await frames(16)                          // let any in-progress dash finish its remaining frames (momentum tail)
const xSettled1 = await p1x()
await frames(16)
const xSettled2 = await p1x()
check("P1 STOPS after blur (no more forced movement)", Math.abs(xSettled2 - xSettled1) <= 3, `settled x ${xSettled1} → ${xSettled2}`)

// ── 3. the stuck state does NOT carry across a character swap ──
// (Re-boot a fresh match = the char-swap path builds new fighters; prove the map is clean.)
console.log("\n── clean across a fresh match / swap ──")
await H(() => window.dispatchEvent(new Event("blur")))    // ensure nothing held
await H(() => window.__harness.boot()); await H(() => window.__harness.skipToBattle()); await frames(6)
check("new match starts with no stuck movement key", !(await held()).some(k => ["d","a","arrowleft","arrowright"].includes(k)), JSON.stringify(await held()))
const nx0 = await p1x(); await frames(14); const nx1 = await p1x()
check("new fighter is stationary when nothing is held", Math.abs(nx1 - nx0) <= 3, `x ${nx0} → ${nx1}`)

// ── 4. visibilitychange(hidden) also clears (tab hidden, not just window blur) ──
console.log("\n── visibilitychange(hidden) also clears ──")
await page.keyboard.down("d"); await frames(10)
check("held again before hide", (await held()).includes("d"))
await H(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")) })
await frames(2)
check("hiding the tab releases the held key", !(await held()).includes("d"), JSON.stringify(await held()))
await page.keyboard.up("d").catch(() => {})

console.log(`\njsErrors: ${jsErrors.length}`); if (jsErrors.length) console.log(jsErrors.slice(0, 3).join("\n"))
console.log(`\n${FAIL === 0 && jsErrors.length === 0 ? "✅" : "❌"} stuck-key / blur fix: ${PASS} passed, ${FAIL} failed`)
await browser.close(); server.close()
process.exit(FAIL === 0 && jsErrors.length === 0 ? 0 : 1)
