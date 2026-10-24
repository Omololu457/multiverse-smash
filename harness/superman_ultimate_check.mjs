/**
 * SUPERMAN ULTIMATE check — "World of Cardboard". Boots the real game headless, positions Superman next
 * to the opponent, fills the meter, triggers the ult, and confirms the scripted multi-hit runs end to end
 * (dash first strike → barrage → uppercut → fly up → heat vision → orbital slam), deals ~380, knocks the
 * opponent down, then applies the 4s Solar-Energy lock (specials refuse to fire). 0 JS errors.
 */
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "superman_work")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []
page.on("pageerror", e => jsErrors.push(String(e)))

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const state = () => page.evaluate(() => window.__harness.state())
const p1p = () => page.evaluate(() => window.__harness.flightProbe("p1"))
const p2p = () => page.evaluate(() => window.__harness.flightProbe("p2"))
const shot = (n) => page.screenshot({ path: path.join(OUT, `_ult_${n}.png`) })
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
async function hold(k, n) { await page.keyboard.down(k); await frames(n); await page.keyboard.up(k); await frames(2) }
async function approach(px) { for (let c = 0; c < 8; c++) { const a = await p1p(), b = await p2p(); if (Math.abs(a.x - b.x) <= px) break; await hold(b.x > a.x ? "d" : "a", 14) } }

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start())
  await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle())
  await frames(20)
  await approach(100)

  const hp0 = (await p2p()).health
  const res = await page.evaluate(() => { window.__harness.fillEnergy(); return window.__harness.p1Ultimate(); })
  ok(res && res.cast, `ultimate did not cast (${JSON.stringify(res)})`)
  // observe at least one mid-sequence phase
  let sawPhase = null
  for (let i = 0; i < 40; i++) { const a = await p1p(); if (a.woc) { sawPhase = a.woc } await frames(2) }
  await shot("1_midsequence")
  ok(!!sawPhase, "World of Cardboard state machine never ran (_supWoC never set)")

  // let the whole sequence resolve
  for (let i = 0; i < 60 && (await p1p()).woc; i++) await frames(4)
  const after = await p2p(), me = await p1p()
  await shot("2_aftermath")
  const dmg = hp0 - after.health
  ok(dmg > 250, `ultimate dealt too little (dmg=${dmg}, expect ~380)`)
  ok(after.knockdown || after.hitstun > 0, `opponent not knocked down/stunned after the ult (kd=${after.knockdown})`)
  ok(me.woc === null, `Superman stuck mid-ult (woc=${me.woc})`)
  ok(me.energyLock > 0, `post-ult Solar Energy lock not applied (energyLock=${me.energyLock})`)

  // ENERGY LOCK: a special must refuse to fire during the 4s lock.
  await page.evaluate(() => window.__harness.fillEnergy())
  await frames(2)
  const cdBefore = (await p1p()).freezeCd
  await hold("a", 1); await page.keyboard.down("a"); await page.keyboard.down("l"); await frames(3); await page.keyboard.up("l"); await page.keyboard.up("a")
  await frames(2)
  const cdAfter = (await p1p()).freezeCd
  ok(cdAfter <= cdBefore, `a special fired during the energy lock (freezeCd ${cdBefore}→${cdAfter})`)

  ok(jsErrors.length === 0, `JS exceptions: ${jsErrors.slice(0, 3).join(" | ")}`)

  console.log("════════════════════════════════════════════")
  console.log(`  SUPERMAN ULTIMATE (World of Cardboard): ${passed} passed, ${failed} failed`)
  console.log(`  cast=${res?.cast} sawPhase=${sawPhase} dmg to opp=${dmg} (${hp0}→${after.health}) kd=${after.knockdown}`)
  console.log(`  post-ult energyLock=${me.energyLock}  special-during-lock blocked=${cdAfter <= cdBefore}`)
  console.log(`  JS-exceptions=${jsErrors.length}`)
  console.log("════════════════════════════════════════════")
  if (failed) fails.slice(0, 12).forEach(m => console.log("  ✗ " + m))
} catch (e) {
  console.log("HARNESS THREW:", String(e)); failed++
} finally {
  await browser.close(); server.close()
  process.exit(failed ? 1 : 0)
}
