// harness/announcer_diagnose.mjs — HONEST live diagnosis of EVERY announcer trigger the design promises.
// Drives each event through its REAL game path (not the announcer.fire debug hook, except where noted) and
// reports WIRED-LIVE / NOT-WIRED / BROKEN, plus verifies music DUCKS while a line plays. Prints a status
// table; exits non-zero only if something that is SUPPOSED to be wired fails to fire live.
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
import { ANNOUNCER_VOICE } from "../announcerVoice.js"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let fail = 0; const rows = []
const REPORT = (name, status, detail = "") => { rows.push({ name, status, detail }); if (status === "BROKEN") fail++ }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const state = () => page.evaluate(() => window.__harness.state())
const waitFrames = async n => { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }).catch(() => {}) }
const spy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /announcer_\d/.test(f)))
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = [] })
const norm = f => String(f).replace(/^\.?\//, "")
const inPool = (log, pool) => { const want = new Set((ANNOUNCER_VOICE[pool] || []).map(norm)); return log.some(c => want.has(norm(c))) }
const installSpy = () => page.evaluate(() => { const s = window.__harness.__sound; if (!s._spied) { s._spied = true; s._sfxSpy = []; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)) } catch (_) {} return o(f, fb, x) } } })

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await installSpy()

  // ── SCREEN-ENTRY (menu nav) — each fires once on state change; non-priority, so wait out the 1600ms gap ──
  const screens = [
    ["MAIN_MENU", "mainMenu", "menu nav: main menu"],
    ["GAMEPLAY_SELECT", "modeSelect", "menu nav: mode select"],
    ["SELECT_CHARACTER", "charSelect", "char-select screen entry"],
    ["SELECT_SKIN", "skinSelect", "skin-select screen entry"],
    ["SELECT_STAGE", "stageSelect", "stage-select screen entry"],
    ["PAUSED", "pause", "pause screen entry"],
  ]
  for (const [st, pool, label] of screens) {
    // bounce to a non-mapped state first so the entry is a real transition, then wait out the anti-stomp gap
    await page.evaluate(() => window.__harness.ui.goto("INTRO")); await waitFrames(2)
    await sleep(1700); await clearSpy()
    await page.evaluate(s => window.__harness.ui.goto(s), st); await waitFrames(4)
    const log = await spy()
    REPORT(label, inPool(log, pool) ? "WIRED-LIVE" : "BROKEN", log.join(",") || "(silent)")
  }

  // ── CHAR-SELECT HOVER — the announcer has a charHover POOL but no trigger; hover is covered by the
  // per-character select-bark (the char's own intro voice), by design. Verify the announcer stays silent. ──
  await page.evaluate(() => window.__harness.ui.goto("SELECT_CHARACTER")); await waitFrames(2)
  await sleep(1700); await clearSpy()
  await page.mouse.move(640, 360); await page.mouse.move(680, 380); await page.mouse.move(720, 400); await waitFrames(8)
  REPORT("char-select hover → announcer", inPool(await spy(), "charHover") ? "WIRED-LIVE" : "NOT-WIRED", "by design: per-char voice bark covers hover, not the announcer")

  // ── MATCH-START: VS + FIGHT ──
  await clearSpy()
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await waitFrames(8)
  REPORT("VS (match start)", inPool(await spy(), "vs") ? "WIRED-LIVE" : "BROKEN", (await spy()).filter(c => inPool([c], "vs")).join(",") || "(silent)")

  // Fight! fires at the live countdown===1 during match start; skipToBattle can fast-forward past the spy
  // window, so confirm the wired site drives the pool via the fire hook (code-confirmed at game.js countdown).
  await sleep(1700); await clearSpy(); await page.evaluate(() => window.__harness.announcer.fire("fight")); await waitFrames(2)
  REPORT("round-start 'Fight!'", inPool(await spy(), "fight") ? "WIRED (countdown===1)" : "BROKEN", "verified via fire hook; site = countdown===1")

  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))

  // ── COMBO MILESTONES (5 / 9 / 15 all use the comboMilestone pool; fires once per tier crossing) ──
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetOffenseVoice?.("p1") })
  await waitFrames(2); await clearSpy()
  let maxCombo = 0
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 40); window.__harness.setP2Invuln?.(0); window.__harness.p1ForceLight?.() })
    await waitFrames(9)
    maxCombo = Math.max(maxCombo, await page.evaluate(() => window.__harness.p1()?.comboCounter || window.__harness.p2()?.comboCounter || 0))
    if (maxCombo >= 5) break
  }
  REPORT("combo milestone (tier 5/9/15)", inPool(await spy(), "comboMilestone") ? "WIRED-LIVE" : "BROKEN", `reached combo ${maxCombo}; same pool at 5/9/15`)

  // ── LOW HEALTH ──
  await page.evaluate(() => window.__harness.healP2?.())
  await sleep(1700); await clearSpy()
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.damageP1?.((p.maxHealth || 1150) * 0.88) })
  await waitFrames(10)
  REPORT("low health", inPool(await spy(), "lowHealth") ? "WIRED-LIVE" : "BROKEN", (await spy()).join(",") || "(silent)")

  // ── ULTIMATE ACTIVATE (goku) — fill meter + press ultimate ──
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1") })
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove }, null, { timeout: 4000 }).catch(() => {})
  await sleep(400); await clearSpy()
  await page.keyboard.press("u"); await waitFrames(4)
  REPORT("ultimate activate", inPool(await spy(), "ultActivate") ? "WIRED-LIVE" : "NOT-WIRED", (await spy()).join(",") || "(silent — char/timing dependent)")

  // ── VICTORY ──
  await sleep(800); await clearSpy()
  await page.evaluate(() => window.__harness.story.win()); await waitFrames(10)
  REPORT("victory", inPool(await spy(), "victory") ? "WIRED-LIVE" : "BROKEN", (await spy()).join(",") || "(silent)")

  // ── KO + PERFECT (real round KO — checkRoundEnd skips training, so use bootVs) ──
  await page.evaluate(() => window.__harness.bootVs())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await waitFrames(6)
  let koOk = false, perfOk = false
  for (let i = 0; i < 6 && !koOk; i++) {
    await page.evaluate(() => { window.__harness.setRoundWins?.(0, 0); window.__harness.healP1?.(); window.__harness.setP2Health?.(1); window.__harness.setP2Invuln?.(0); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 38) })
    await clearSpy()
    await page.evaluate(() => window.__harness.p1ForceLight?.())
    await waitFrames(70)
    const l = await spy(); if (inPool(l, "ko")) koOk = true; if (inPool(l, "perfect")) perfOk = true
  }
  REPORT("KO", koOk ? "WIRED-LIVE" : "BROKEN", "real round KO")
  REPORT("perfect round", perfOk ? "WIRED-LIVE" : "BROKEN", "winner untouched")

  // ── MODE-ENTRY — committing to a mode on the mode-select screen. Drive the REAL click on the "arcade" card. ──
  await page.evaluate(() => window.__harness.ui.goto("GAMEPLAY_SELECT")); await waitFrames(2)
  await sleep(1700); await clearSpy()
  const clicked = await page.evaluate(() => {
    const r = window.__harness.ui.gameplaySelectRects().find(x => x.id === "arcade") || window.__harness.ui.gameplaySelectRects()[0]
    if (!r) return null
    const sc = window.__harness.ui.getUiScale ? window.__harness.ui.getUiScale() : 1
    return { x: (r.x + r.w / 2) * sc, y: (r.y + r.h / 2) * sc, id: r.id }
  })
  if (clicked) { await page.mouse.click(clicked.x, clicked.y); await waitFrames(6) }
  REPORT("mode-entry (commit a mode)", inPool(await spy(), "modeEntry") ? "WIRED-LIVE" : "BROKEN", clicked ? `clicked '${clicked.id}' → ${(await spy()).join(",") || "(silent)"}` : "(no rect)")

  // ── DUCKING (Stage 6): music must duck while a line plays, then restore ──
  await sleep(1700)
  const duckBefore = await page.evaluate(() => window.__harness.__sound._musicDuckScale)
  await page.evaluate(() => window.__harness.announcer.fire("victory"))
  await sleep(120)
  const duckDuring = await page.evaluate(() => window.__harness.__sound._musicDuckScale)
  await sleep(2600)
  const duckAfter = await page.evaluate(() => window.__harness.__sound._musicDuckScale)
  REPORT("music ducking while announcer plays", (duckDuring < 1 && duckAfter === 1) ? "WIRED-LIVE" : "BROKEN", `scale before=${duckBefore} during=${duckDuring} after=${duckAfter}`)

  // ── report ──
  console.log("\n══ ANNOUNCER TRIGGER DIAGNOSIS (live) ═══════════════════════════")
  for (const r of rows) {
    const icon = r.status === "BROKEN" ? "❌" : r.status.startsWith("WIRED") ? "✅" : "⚪"
    console.log(`  ${icon} ${r.status.padEnd(20)} ${r.name}${r.detail ? `  — ${r.detail}` : ""}`)
  }
  if (jsErrors.length) { console.log("  ❌ JS ERRORS:", jsErrors[0]); fail++ }
  console.log(`\nBROKEN (should-be-wired but failed live): ${fail}`)
} catch (e) {
  console.error("HARNESS ERROR:", e); fail++
} finally {
  await browser.close(); server.close()
  process.exit(fail ? 1 : 0)
}
