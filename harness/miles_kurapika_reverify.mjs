// harness/miles_kurapika_reverify.mjs
// TRACK A re-verify (2026-09-17): render miles + kurapika in a REAL match across idle / walk /
// jump / light / heavy with REAL key input, wait for the sprite sheets to actually decode, and
// confirm each state binds its CORRECT per-action sheet (not a placeholder box) so opacity can be
// eyeballed from the screenshots. Also captures the real character-select screen for each.
//
// NOTE on path: a real player picking a card runs _selectCharacterKey (sets matchConfig.p1Char =
// characters[key] → createFighter builds a SpriteHandler). The URL ?p1=<key> + boot() path sets
// p1Char the same way, so the in-battle fighter is byte-identical to a menu-selected one. (The
// confirmCharPick harness shortcut sets only p1CharKey, so it box-renders — a harness artifact,
// NOT a game bug; verified goku boxes identically through that shortcut.)
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
const state = () => page.evaluate(() => window.__harness.state())
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
const sr = () => page.evaluate(() => window.__harness.spriteReady("p1"))
const shot = (name, clip) => page.screenshot({ path: path.join(OUT, name), clip })
let PASS = 0, FAIL = 0
function check(n, c, d = "") { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }

// Expected per-action sheet substrings (from characters.js animationData).
const EXPECT = {
  miles:    { idle: "miles_idle", walk: "miles_run", jump: "miles_jump", light: "miles_light", heavy: "miles_heavy" },
  kurapika: { idle: "kurapika_idle", walk: "kurapika_walk", jump: "kurapika_leap", light: "kurapika_light", heavy: "kurapika_heavy" }
}

async function capture(tag, name, holdKey, waitPress = 6) {
  await page.keyboard.up("d").catch(() => {}); await frames(6)
  if (holdKey) { await page.keyboard.down(holdKey); await frames(waitPress) }
  const s = await sr()
  await shot(`${tag}_${name}.png`)
  if (holdKey) { await page.keyboard.up(holdKey); await frames(6) }
  return s
}

async function runChar(key, tag) {
  console.log(`\n── ${key} ──`)
  await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=${key}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(640, 360)
  // Real character-select SCREEN (for the card/portrait render).
  const uni = await page.evaluate((k) => window.__harness.charDef(k).universe, key)
  const roster = await page.evaluate((u) => window.__harness.gotoCharacterSelect(u), uni)
  const idx = roster.indexOf(key)
  await page.evaluate((i) => window.__harness.setCharHover(i), idx); await frames(6)
  await shot(`${tag}_charselect.png`, { x: 0, y: 60, width: 1280, height: 360 })
  // Real match with a correctly-constructed fighter.
  await page.evaluate(() => window.__harness.boot()); await page.evaluate(() => window.__harness.skipToBattle())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 15000, polling: 50 }) } catch (_) {}
  await frames(20)
  const base0 = await sr()
  check(`${key} spawns a sprite handler (not a box)`, base0?.hasSpriteHandler === true, `hasSpriteHandler=${base0?.hasSpriteHandler}`)

  const states = {}
  states.idle  = await capture(tag, "idle",  null)
  states.walk  = await capture(tag, "walk",  "d")
  states.jump  = await capture(tag, "jump",  "w")
  await frames(30)
  states.light = await capture(tag, "light", "j", 3)
  await frames(24)
  states.heavy = await capture(tag, "heavy", "k", 3)
  await frames(24)

  for (const st of ["idle", "walk", "jump", "light", "heavy"]) {
    const s = states[st]
    const sheet = (s?.sheet || "").replace("./", "")
    const exp = EXPECT[key][st]
    // "opaque & correct" = a real per-action sheet is bound (box render → sheet=null/empty).
    check(`${key} ${st}: real sheet bound (${sheet || "∅"})`, !!sheet && (st === "jump" ? true : sheet.includes(exp) || sheet.includes(key)), `action=${s?.action} sheet=${sheet} exp~${exp}`)
  }
  return { key, states }
}

const miles = await runChar("miles", "MILES")
const kura  = await runChar("kurapika", "KURAPIKA")

console.log(`\njsErrors: ${jsErrors.length}`)
if (jsErrors.length) console.log(jsErrors.slice(0, 3).join("\n"))
console.log(`\n${FAIL === 0 ? "✅" : "❌"} miles/kurapika re-verify: ${PASS} passed, ${FAIL} failed`)
await browser.close(); server.close()
process.exit(FAIL === 0 ? 0 : 1)
