// harness/announcer_voice.test.mjs — verify the generic announcer fires the CORRECT category at each core
// match-flow moment. Spies on sound.playSfxFile (records requested clip even when muted), triggers each
// event through the real game path, asserts the logged clip belongs to the expected pool (randomized).
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
let pass = 0, fail = 0
const ok = (c, n, d = "") => { (c ? pass++ : fail++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const state = () => page.evaluate(() => window.__harness.state())
const waitFrames = async n => { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
const spy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /announcer_\d/.test(f)))
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = [] })
const norm = f => String(f).replace(/^\.?\//, "")
const inPool = (log, pool) => { const want = new Set((ANNOUNCER_VOICE[pool] || []).map(norm)); return log.some(c => want.has(norm(c))) }
const installSpy = () => page.evaluate(() => { const s = window.__harness.__sound; if (!s._spied) { s._spied = true; s._sfxSpy = []; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)) } catch (_) {} return o(f, fb, x) } } })

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=sasuke`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await installSpy()   // BEFORE boot, so we catch the VS + Fight lines fired during match start

  console.log("\n── announcer triggers ─────────────────────────────")
  // VS — fired by the real match-start flow (startMatch → INTRO)
  await clearSpy()
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await waitFrames(8)
  ok(inPool(await spy(), "vs"), "VS screen (match start) → vs clip", (await spy()).filter(c => inPool([c], "vs")).join(","))
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))

  // 5+ HIT COMBO — land repeated lights so comboCounter crosses tier 1 (5) → comboMilestone (priority)
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetOffenseVoice?.("p1"); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 40); window.__harness.setP2Invuln?.(0) })
  await waitFrames(2); await clearSpy()
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 40); window.__harness.setP2Invuln?.(0); window.__harness.p1ForceLight?.() })
    await waitFrames(10)
    if ((await page.evaluate(() => window.__harness.p1()?.comboCounter || window.__harness.p2()?.comboCounter || 0)) >= 5) break
  }
  ok(inPool(await spy(), "comboMilestone"), "5+ HIT COMBO → comboMilestone clip", (await spy()).join(","))

  // LOW HEALTH — drop p1 under the threshold (same trigger as the music crossfade). Non-priority, so
  // clear the anti-stomp gap FIRST, THEN clear the spy, THEN drop HP (the announce fires on the transition).
  await page.evaluate(() => window.__harness.healP2?.())
  await sleep(1700); await clearSpy()
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.damageP1?.((p.maxHealth || 1150) * 0.88) })
  await waitFrames(10)
  ok(inPool(await spy(), "lowHealth"), "LOW HEALTH (crossing threshold) → lowHealth clip", (await spy()).join(","))

  // VICTORY — force the match over (forceMatchEnd → _checkMatchOver; not gated by training)
  await clearSpy()
  await page.evaluate(() => window.__harness.story.win()); await waitFrames(10)
  ok(inPool(await spy(), "victory"), "VICTORY screen → victory clip", (await spy()).join(","))

  // ROUND START "Fight!" — skipToBattle fast-forwards the live 3-2-1 countdown, so verify the pool via the
  // fire hook (the trigger is wired at the real countdown===1 site — game.js BATTLE update).
  await sleep(1700); await clearSpy(); await page.evaluate(() => window.__harness.announcer.fire("fight")); await waitFrames(2)
  ok(inPool(await spy(), "fight"), "ROUND START pool plays 'Fight!' (wired at countdown===1)", (await spy()).join(","))

  // CHARACTER SELECT (screen entry) — the state-transition announcer. Wait out the gap first (non-priority).
  await sleep(1700); await clearSpy()
  await page.evaluate(() => window.__harness.ui.goto("SELECT_CHARACTER")); await waitFrames(4)
  ok(inPool(await spy(), "charSelect"), "CHARACTER SELECT entered → charSelect clip", (await spy()).join(","))

  // KO + PERFECT — a REAL round KO. checkRoundEnd SKIPS training mode, so boot a fresh NON-training (vs)
  // match; heal p1 (→ perfect), set p2 to 1 HP, land a killing light (retry against the easy AI).
  await page.evaluate(() => window.__harness.bootVs())
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await waitFrames(6)
  let koOk = false, perfOk = false
  for (let i = 0; i < 5 && !koOk; i++) {
    await page.evaluate(() => { window.__harness.setRoundWins?.(0, 0); window.__harness.healP1?.(); window.__harness.setP2Health?.(1); window.__harness.setP2Invuln?.(0); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 38) })
    await clearSpy()
    await page.evaluate(() => window.__harness.p1ForceLight?.())
    await waitFrames(70)
    const l = await spy(); if (inPool(l, "ko")) koOk = true; if (inPool(l, "perfect")) perfOk = true
  }
  ok(koOk, "KO → ko clip (real round KO, non-training)")
  ok(perfOk, "PERFECT ROUND (winner untouched) → perfect clip")

  ok(jsErrors.length === 0, "no JS errors across the run", jsErrors[0] || "")
  console.log(`\nRESULT ${pass} pass / ${fail} fail`)
} catch (e) {
  console.error("HARNESS ERROR:", e); fail++
} finally {
  await browser.close(); server.close()
  process.exit(fail ? 1 : 0)
}
