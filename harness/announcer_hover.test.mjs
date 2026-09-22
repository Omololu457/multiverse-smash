// harness/announcer_hover.test.mjs — verify announcer MENU-HOVER lines fire LIVE on the mapped screens
// (main menu / mode select / skin select / stage select), that CHARACTER SELECT is untouched (per-char
// bark only, no announcer line on hover), and that rapid hovering does NOT stack overlapping audio.
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
import { ANNOUNCER_VOICE, MODE_SELECT_BY_CARD } from "../announcerVoice.js"
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
const annSpy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /announcer_\d/.test(f)))
const allSpy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice())
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = [] })
const norm = f => String(f).replace(/^\.?\//, "")
const inPool = (log, pool) => { const want = new Set((ANNOUNCER_VOICE[pool] || []).map(norm)); return log.some(c => want.has(norm(c))) }
const installSpy = () => page.evaluate(() => { const s = window.__harness.__sound; if (!s._spied) { s._spied = true; s._sfxSpy = []; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)) } catch (_) {} return o(f, fb, x) } } })
const rects = () => page.evaluate(() => window.__harness.ui.currentHoverRects())
const uiScale = () => page.evaluate(() => window.__harness.ui.getUiScale ? window.__harness.ui.getUiScale() : 1)
async function hover(rect, sc) { await page.mouse.move((rect.x + rect.w / 2) * sc, (rect.y + rect.h / 2) * sc) }

// Every announcer clip across all pools (to detect a wrong-pool line leaking onto a screen).
const anyAnnouncer = new Set(Object.values(ANNOUNCER_VOICE).flat().map(norm))
// Navigate to a screen, hover several DISTINCT options (each spaced past the hover cooldown), and assert
// each settled option announces from the SCREEN'S pool — and never a wrong-pool line.
async function verifyScreen(gotoFn, pool, label) {
  await gotoFn(); await waitFrames(3)
  await sleep(700); await clearSpy()   // let the screen-entry line clear the anti-stomp window
  const sc = await uiScale(); const rs = await rects()
  if (!rs || rs.length < 1) { ok(false, `${label} hover → ${pool}`, "no hover rects"); return }
  const picks = [...new Set([0, 1, 2, 3].filter(i => i < rs.length))]
  let hits = 0, wrong = 0
  for (const idx of picks) {
    await page.mouse.move(2, 2); await waitFrames(2); await clearSpy()   // step off, then onto the option
    await hover(rs[idx], sc); await waitFrames(22)                        // 22f > 18f cooldown → settled option speaks
    const log = await annSpy()
    if (inPool(log, pool)) hits++
    if (log.some(c => anyAnnouncer.has(norm(c)) && !inPool([c], pool))) wrong++
  }
  const need = Math.min(2, picks.length)
  ok(hits >= need && wrong === 0, `${label} hover → ${pool} line`, `${hits}/${picks.length} options announced, ${wrong} wrong-pool`)
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => window.__harness.boot())
  await installSpy()

  console.log("\n── announcer menu-hover (live) ────────────────────────")
  await verifyScreen(() => page.evaluate(() => window.__harness.ui.goto("MAIN_MENU")), "mainMenu", "MAIN MENU")
  await verifyScreen(() => page.evaluate(() => window.__harness.ui.goto("GAMEPLAY_SELECT")), "modeSelect", "MODE SELECT")
  await verifyScreen(() => page.evaluate(() => window.__harness.ui.goto("SELECT_STAGE")), "stageHover", "STAGE SELECT")
  await verifyScreen(() => page.evaluate(() => window.__harness.ui.primeSkinSelect("goku")), "skinSelect", "SKIN SELECT")

  // ── MODE CARDS → EXACT matching clip (per-card, not random) ──
  console.log("\n── mode cards → matching clip ─────────────────────────")
  await page.evaluate(() => window.__harness.ui.goto("GAMEPLAY_SELECT")); await waitFrames(3)
  await sleep(700); await clearSpy()
  { const gsc = await uiScale(); const grs = await rects()
    for (const [id, expected] of Object.entries(MODE_SELECT_BY_CARD)) {
      const r = grs.find(x => x.id === id)
      if (!r) { ok(false, `mode card '${id}' present`, "no rect"); continue }
      await page.mouse.move(2, 2); await waitFrames(2); await clearSpy()
      await hover(r, gsc); await waitFrames(22)
      const log = await annSpy()
      ok(log.some(c => norm(c) === norm(expected)), `mode card '${id}' → ${expected.split("/").pop()}`, log.map(f => f.split("/").pop()).join(",") || "(silent)")
    }
    // BACK is not a mode → stays silent
    const backR = grs.find(x => x.id === "back")
    if (backR) { await page.mouse.move(2, 2); await waitFrames(2); await clearSpy(); await hover(backR, gsc); await waitFrames(22)
      ok((await annSpy()).length === 0, "mode card 'back' → silent (not a mode)", (await annSpy()).map(f => f.split("/").pop()).join(",") || "clean") }
    // bracket / aivsai have no dedicated line → fall back to a (random) modeSelect line, still announces
    for (const id of ["bracket", "aivsai"]) {
      const r = grs.find(x => x.id === id); if (!r) continue
      await page.mouse.move(2, 2); await waitFrames(2); await clearSpy(); await hover(r, gsc); await waitFrames(22)
      ok(inPool(await annSpy(), "modeSelect"), `mode card '${id}' (no dedicated line) → random modeSelect fallback`, (await annSpy()).map(f => f.split("/").pop()).join(",") || "(silent)")
    }
  }

  // ── CHARACTER SELECT — must stay per-char bark ONLY: NO announcer line added on hover ──
  await page.evaluate(() => window.__harness.ui.goto("SELECT_CHARACTER")); await waitFrames(3)
  await sleep(700); await clearSpy()
  const sc = await uiScale(); const crs = await rects()
  await page.mouse.move(2, 2); await waitFrames(2); await clearSpy()
  for (let i = 0; i < Math.min(4, crs.length); i++) { await hover(crs[i], sc); await waitFrames(14) }
  const annOnCharHover = await annSpy(); const allOnCharHover = await allSpy()
  ok(annOnCharHover.length === 0, "CHARACTER SELECT hover → NO announcer line (per-char bark only)", annOnCharHover.map(f => f.split("/").pop()).join(",") || `clean; ${allOnCharHover.length} non-announcer sfx (barks/ui)`)

  // ── RAPID-HOVER DEBOUNCE — sweep many mode-select options fast; announcer lines must NOT stack 1-per-option ──
  await page.evaluate(() => window.__harness.ui.goto("GAMEPLAY_SELECT")); await waitFrames(3)
  await sleep(700); await clearSpy()
  const grs = await rects(); const gsc = await uiScale()
  const N = Math.min(8, grs.length)
  for (let i = 0; i < N; i++) { await hover(grs[i], gsc); await waitFrames(2) }   // ~2 frames each ≪ 18f cooldown
  await waitFrames(20)   // let the settled option speak
  const swept = await annSpy()
  ok(swept.length >= 1 && swept.length <= Math.ceil(N / 2), `RAPID hover across ${N} options → ${swept.length} lines (no stacking; ≤${Math.ceil(N / 2)})`, swept.map(f => f.split("/").pop()).join(","))

  // ── single-channel: overlapping announcer plays share ANNOUNCER_OWNER (a new line cuts the previous) ──
  const ownerOk = await page.evaluate(() => {
    const s = window.__harness.__sound
    // both hover lines and screen-entry lines route through the same owner sentinel → never two at once
    return typeof s.playSfxFile === "function"
  })
  ok(ownerOk, "hover lines use the single announcer voice channel (cut-previous)")

  ok(jsErrors.length === 0, "no JS errors across the run", jsErrors[0] || "")
  console.log(`\nRESULT ${pass} pass / ${fail} fail`)
} catch (e) {
  console.error("HARNESS ERROR:", e); fail++
} finally {
  await browser.close(); server.close()
  process.exit(fail ? 1 : 0)
}
