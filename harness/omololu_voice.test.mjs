// harness/omololu_voice.test.mjs — verify every omololu voice trigger fires the CORRECT pool, live.
// Spies on sound.playSfxFile (records the requested clip even when audio is muted/un-gestured), triggers
// each event through the real game path, and asserts the logged clip belongs to the expected pool.
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
import { OMOLOLU_VOICE, OMOLOLU_MATCHUP } from "../omololuVoice.js"
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
const spy = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).filter(f => /omololu_/.test(f)))
const clearSpy = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = [] })
// did any logged clip come from the expected pool?
const norm = f => String(f).replace(/^\.?\//, "")
const inPool = (log, pool) => { const want = new Set((OMOLOLU_VOICE[pool] || []).map(norm)); return log.some(c => want.has(norm(c))) }

try {
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=obito`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  // install the playSfxFile spy (records the requested filename; survives mute/gesture gate)
  await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)) } catch (_) {} return o(f, fb, x) } } })
  await waitFrames(3)

  console.log("\n── voice triggers ─────────────────────────────")
  // INTRO (+taunt folded in)
  // HIT-REACT — p2 hits omololu(p1)
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.clearHitVoiceCd?.("p1"); window.__harness.resetFighterInput?.("p1"); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 46); window.__harness.setP2Invuln?.(0) })
  await waitFrames(2); await clearSpy()
  await page.evaluate(() => window.__harness.p2Attack()); await waitFrames(24)
  ok(inPool(await spy(), "hit"), "HIT (taking damage) → hit clip", (await spy()).join(","))

  // LOW-HEALTH — drop p1 below 25%, then take a hit (its own once-guard, independent of hit-voice cd)
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.damageP1?.((p.maxHealth || 1150) * 0.82); window.__harness.resetFighterInput?.("p1"); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 46); window.__harness.setP2Invuln?.(0) })
  await waitFrames(2); await clearSpy()
  await page.evaluate(() => window.__harness.p2Attack()); await waitFrames(24)
  ok(inPool(await spy(), "lowHealth"), "LOW-HEALTH (crossing threshold) → lowHealth clip", (await spy()).join(","))
  await page.evaluate(() => window.__harness.healP1())

  // SPECIALS
  const readyP1 = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 }, null, { timeout: 4000 }).catch(() => {})
  await page.evaluate(() => { window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1") }); await readyP1(); await clearSpy()
  await page.evaluate(() => window.__harness.p1SpecialDir("D")); await waitFrames(3)
  ok(inPool(await spy(), "flashTime"), "SPECIAL Flash Time (Down+Special) → flashTime clip", (await spy()).join(","))
  await page.evaluate(() => window.__harness.p1SpecialDir("D"))   // toggle off

  await page.evaluate(() => { window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1") }); await readyP1(); await clearSpy()
  await page.evaluate(() => window.__harness.p1SpecialDir("B")); await waitFrames(3)
  ok(inPool(await spy(), "kamuiWarp"), "SPECIAL Kamui Warp (Back+Special) → kamuiWarp clip", (await spy()).join(","))

  await page.evaluate(() => { window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1") }); await readyP1(); await clearSpy()
  await page.keyboard.press("p"); await waitFrames(3)
  ok(inPool(await spy(), "kamuiIntangibility"), "SPECIAL Kamui Intangibility (P-tap) → kamuiIntangibility clip", (await spy()).join(","))
  await page.keyboard.press("p"); await waitFrames(2)   // toggle off (silent)

  await page.evaluate(() => { window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1") }); await readyP1(); await clearSpy()
  await page.keyboard.down("p"); await sleep(280); await page.keyboard.up("p"); await waitFrames(4)
  ok(inPool(await spy(), "kamuiDimension"), "SPECIAL Kamui Dimension (P-hold→release) → kamuiDimension clip", (await spy()).join(","))
  await waitFrames(70)

  // ULTIMATE activation + mid-sequence. resetKit clears any lingering Flash Time (which would frame-skip
  // p2 and stall the cadence tick) + heal p2 (the tick sits after the victim's hitstun early-return).
  await page.evaluate(() => { window.__harness.omololu.resetKit("p1"); window.__harness.healP1(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy() }); await readyP1(); await clearSpy()
  await page.evaluate(() => window.__harness.omololu.trigger("p1")); await waitFrames(4)
  ok(inPool(await spy(), "domainActivate"), "ULTIMATE activation → domainActivate clip", (await spy()).join(","))
  await clearSpy(); await waitFrames(680)   // run past the cadence midpoint (framesLeft ≤ 600 of 1200)
  ok(inPool(await spy(), "domainMid"), "ULTIMATE mid-sequence → domainMid clip", (await spy()).join(","))

  // WIN — force the match over with omololu (p1) the winner (forceMatchEnd("p1") → _checkMatchOver's
  // win-voice block, which is NOT story-gated). End the domain first so nothing holds up the transition.
  await page.evaluate(() => { window.__harness.omololu.endDomain(); window.__harness.omololu.resetKit("p1"); window.__harness.healP1(); window.__harness.healP2?.() })
  await waitFrames(3); await clearSpy()
  await page.evaluate(() => window.__harness.story.win()); await waitFrames(10)
  ok(inPool(await spy(), "win"), "WIN (omololu wins the match) → win clip", (await spy()).join(","))

  // INTRO — LAST, because forceIntro restarts the match into the INTRO screen. NOTE: omololu's intro beat
  // now plays his per-opponent MATCHUP line (this match is vs obito → OMOLOLU_MATCHUP.obito), REPLACING the
  // generic intro/taunt pool (which still bark on the char-select screen). See harness/omololu_matchup.test.mjs.
  await page.evaluate(() => { const s = window.__harness.__sound; if (!s._spied) { s._spied = true; s._sfxSpy = []; const o = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, x) => { try { s._sfxSpy.push(String(f)) } catch (_) {} return o(f, fb, x) } } })
  await clearSpy(); await page.evaluate(() => window.__harness.forceIntro && window.__harness.forceIntro()); await waitFrames(6)
  { const want = new Set((OMOLOLU_MATCHUP.obito || []).map(norm)); const log = await spy()
    ok(log.some(c => want.has(norm(c))), "INTRO (vs obito) → obito MATCHUP line", log.join(",")) }

  ok(jsErrors.length === 0, "no JS errors across the run", jsErrors[0] || "")
  console.log(`\nRESULT ${pass} pass / ${fail} fail`)
} catch (e) {
  console.error("HARNESS ERROR:", e); fail++
} finally {
  await browser.close(); server.close()
  process.exit(fail ? 1 : 0)
}
