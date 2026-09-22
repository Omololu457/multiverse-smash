// harness/omololu_matchup.test.mjs — verify omololu's per-opponent MATCHUP trash talk fires LIVE at the
// intro/VS beat. Boots a real omololu-vs-X match per opponent, spies on sound.playSfxFile, forces the intro
// voice beat, and asserts the clip that plays is that opponent's SPECIFIC line — or, for an unnamed/no-line
// or hard-excluded (apparent-minor) opponent, a GENERIC fallback line (never the pointed one, never silence).
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
import { OMOLOLU_MATCHUP, OMOLOLU_MATCHUP_GENERIC } from "../omololuVoice.js"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let pass = 0, fail = 0
const ok = (c, n, d = "") => { (c ? pass++ : fail++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const state = () => page.evaluate(() => window.__harness.state())
const waitFrames = async n => { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }).catch(() => {}) }
const spy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /omololu_matchup_/.test(f)))
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = [] })
const norm = f => String(f).replace(/^\.?\//, "")
const inPool = (log, pool) => { const want = new Set((pool || []).map(norm)); return log.some(c => want.has(norm(c))) }
const installSpy = () => page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)) } catch (_) {} return o(f, fb, x) } } })

// Boot omololu vs `opp`, fire the intro/VS beat, return the matchup clips that played.
async function matchupClips(opp) {
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=${opp}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await installSpy(); await waitFrames(3); await clearSpy()
  await page.evaluate(() => window.__harness.forceIntro && window.__harness.forceIntro())
  await waitFrames(8)
  return spy()
}

try {
  console.log("\n── omololu MATCHUP trash talk (per opponent, live) ─────────────")

  // NAMED opponents → their SPECIFIC line (5+ required by the task). goku_black is a FORM key — proves the
  // pools are keyed by the real rosterKey, not collapsed to base goku.
  const named = ["goku", "obito", "saitama", "batman", "baki", "goku_black"]
  for (const key of named) {
    const log = await matchupClips(key)
    ok(inPool(log, OMOLOLU_MATCHUP[key]), `vs ${key} → SPECIFIC matchup line`, log.join(",") || "(none)")
  }

  // HARD-EXCLUDED opponent (naruto = apparent minor): a clip STILL plays, but it must be a GENERIC one —
  // NOT naruto's pointed line (which exists in the pool so the clip is used, but is suppressed at runtime).
  {
    const log = await matchupClips("naruto")
    ok(inPool(log, OMOLOLU_MATCHUP_GENERIC) && !inPool(log, OMOLOLU_MATCHUP["naruto"]),
       "vs naruto (hard-excluded) → GENERIC line, NOT the pointed one", log.join(",") || "(none)")
  }

  // NO-LINE opponent (sukuna's line was never recorded) → generic fallback, not silence. Same code path as
  // a fully-unnamed opponent.
  {
    const log = await matchupClips("sukuna")
    ok(inPool(log, OMOLOLU_MATCHUP_GENERIC), "vs sukuna (no recorded line) → GENERIC fallback (not silent)", log.join(",") || "(none)")
  }

  // Reverse side: omololu as P2 still gets his matchup line against the P1 opponent. The harness boot jumps
  // straight to battle (no live intro cinematic) and forceIntro only drives P1 — so drive P2's intro-voice
  // beat through the same maybeFireIntroVoice path via the fireIntroVoice("p2") hook.
  {
    await page.goto(`${base}/index.html?harness=1&p1=saitama&p2=omololu`, { waitUntil: "load" })
    await page.waitForFunction(() => !!window.__harness)
    await page.mouse.click(20, 20)
    await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
    try { await page.waitForFunction(() => window.__harness.spriteReady("p2")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
    await installSpy(); await waitFrames(3); await clearSpy()
    await page.evaluate(() => window.__harness.fireIntroVoice("p2")); await waitFrames(4)
    ok(inPool(await spy(), OMOLOLU_MATCHUP["saitama"]), "omololu as P2 vs saitama → SPECIFIC line", (await spy()).join(",") || "(none)")
  }

  ok(jsErrors.length === 0, "no JS errors across the run", jsErrors[0] || "")
  console.log(`\nRESULT ${pass} pass / ${fail} fail`)
} catch (e) {
  console.error("HARNESS ERROR:", e); fail++
} finally {
  await browser.close(); server.close()
  process.exit(fail ? 1 : 0)
}
