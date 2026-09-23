// harness/rickprime_rewind.test.mjs — Rick Prime "Temporal Rewind" ultimate (HIGH-RISK, touches core match
// state). Verifies: the rolling buffer fills; a mid-neutral rewind rolls back health/position/timer + banks
// the timer bonus; a post-damage rewind genuinely restores the opponent's health; the mid-cinematic edge
// case refuses cleanly (force flag AND a real detector flag AND the no-safe-snapshot path); the energy cost
// applies; and — the MOST important check — two identical runs rewind bit-identically (LAN determinism).
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
const ok = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const near = (a, b, tol) => Math.abs(a - b) <= tol
const state = () => page.evaluate(() => window.__harness.state())
const waitFrames = async n => { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 40000, polling: 16 }).catch(() => {}) }
const P = who => page.evaluate(w => { const f = window.__harness[w](); return f ? { health: f.health, x: Math.round(f.x), energy: Math.round(f.energy) } : null }, who)
const RB = () => page.evaluate(() => window.__harness.rewind.buffer())

async function boot(p1 = "rickPrime", p2 = "sasuke", seed = null) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  if (seed != null) await page.evaluate(s => window.__harness.rng.forceSeed(s), seed)   // pin the RNG stream (determinism run)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await waitFrames(3)
}

try {
  // ── CASE 1 — the rolling buffer fills ────────────────────────────────────────────
  console.log("\n── buffer ─────────────────────────────")
  await boot()
  await waitFrames(700)   // ~11.6s
  const b1 = await RB()
  ok("rolling buffer accumulates samples", b1.len >= 40 && b1.len <= b1.len, `len=${b1.len}`)
  ok("a target snapshot ~10s prior is available", b1.pick && near(b1.pick.ago, 600, 60), `ago=${b1.pick?.ago}`)
  ok("target snapshot is SAFE + carries roundTimer", b1.safeCount > 0 && b1.pick?.roundTimer > 0, `safe=${b1.safeCount} rt=${b1.pick?.roundTimer}`)

  // ── CASE 2 — mid-neutral rewind: position + round timer roll back, timer bonus applied ────
  console.log("\n── mid-neutral rewind (position + timer) ─────────────────────────────")
  await page.keyboard.down("d"); await waitFrames(40); await page.keyboard.up("d")   // walk p1 right so x changes vs 10s ago
  // ATOMIC: read the target snapshot + perform + measure in ONE evaluate so no frames pass between reading
  // `pick` and performing (else the re-pick at perform-time could land on a different sample).
  const c2 = await page.evaluate(() => {
    const preTimer = window.__harness.rewind.roundTimer()
    const pick = window.__harness.rewind.buffer().pick
    const r = window.__harness.rewind.perform("p1")
    const a = window.__harness.p1()
    return { preTimer, pick, r, x: Math.round(a.x), timer: window.__harness.rewind.roundTimer() }
  })
  ok("rewind performed (ok)", c2.r?.ok === true, JSON.stringify(c2.r))
  ok("p1 position rolled back to the snapshot", near(c2.x, Math.round(c2.pick.x.p1), 4), `x ${c2.x} vs snap ${Math.round(c2.pick.x.p1)}`)
  ok("round timer = rewound value + 10s bonus", near(c2.timer, c2.pick.roundTimer + 600, 4), `timer ${c2.timer} vs ${c2.pick.roundTimer}+600`)
  ok("net MORE time than before the rewind (bonus applied)", c2.timer > c2.preTimer, `after ${c2.timer} > before ${c2.preTimer}`)
  await page.screenshot({ path: path.join(OUT, "REWIND_after_neutral.png") })

  // ── CASE 3 — rewind after the opponent took heavy damage: their health genuinely restores ────
  console.log("\n── post-damage rewind (health restore) ─────────────────────────────")
  await boot()
  await waitFrames(700)
  // ATOMIC: snapshot-read + damage + perform + measure in one evaluate (no frames between → no re-pick race)
  const c3 = await page.evaluate(() => {
    const pick = window.__harness.rewind.buffer().pick        // p2 health ~10s ago (full)
    window.__harness.setP2Health(200)                          // heavy damage NOW (well below the snapshot)
    const low = window.__harness.p2().health
    const r = window.__harness.rewind.perform("p1")
    return { pick, low, r, restored: window.__harness.p2().health }
  })
  ok("opponent was low before rewind", c3.low <= 210, `p2 ${c3.low}`)
  ok("opponent health RESTORED to the snapshot", near(c3.restored, c3.pick.health.p2, 2) && c3.restored > c3.low + 100, `restored ${c3.restored} vs snap ${c3.pick.health.p2}`)

  // ── CASE 4 — EDGE CASE: refuse mid-cinematic (never produce a broken/frozen state) ────
  console.log("\n── edge case: mid-cinematic refusal ─────────────────────────────")
  await boot()
  await waitFrames(700)
  // 4a: forced cinematic gate (production gate) → the real ULT refuses, changes nothing (timer only ticks
  // normally, never JUMPS to snapshot+bonus; position unchanged)
  const before4 = await P("p1"); const t4 = await page.evaluate(() => window.__harness.rewind.roundTimer())
  const cast4 = await page.evaluate(() => { window.__harness.rewind.forceCinematic(true); window.__harness.fillEnergy?.(); const c = window.__harness.p1Ultimate().cast; window.__harness.rewind.forceCinematic(false); return c })
  const after4 = await P("p1"); const t4b = await page.evaluate(() => window.__harness.rewind.roundTimer())
  ok("ULT refuses while a cinematic is active (not cast)", cast4 === false, `cast=${cast4}`)
  ok("refused rewind did NOT roll state back (no position jump, timer didn't leap up)", after4.x === before4.x && t4b <= t4 + 1, `x ${before4.x}->${after4.x} t ${t4}->${t4b}`)
  // 4b: a REAL detector flag (p2.domainFrozen) blocks too — set+check+perform ATOMICALLY (updateDomains
  // resets domainFrozen every frame, so it must not span a frame boundary).
  const r4b = await page.evaluate(() => { window.__harness.rewind.realCine(true); const cine = window.__harness.rewind.cinematicActive(); const r = window.__harness.rewind.perform("p1"); window.__harness.rewind.realCine(false); return { cine, r } })
  ok("a REAL cinematic flag (domainFrozen) is detected + blocks the rewind", r4b.cine === true && r4b.r?.blocked === true && r4b.r?.reason === "cinematic-active", JSON.stringify(r4b))
  // 4c: no SAFE snapshot (the ENTIRE ~20s window was cinematic) → refuse, don't restore garbage. Force the
  // cinematic from boot and run past the whole window so every retained sample is unsafe.
  await boot()
  await page.evaluate(() => window.__harness.rewind.forceCinematic(true))
  await waitFrames(1260)   // > REWIND_WINDOW so any early safe sample ages out of the ring
  await page.evaluate(() => window.__harness.rewind.forceCinematic(false))   // cinematic clears, but all retained history is unsafe
  const rr4c = await page.evaluate(() => window.__harness.rewind.perform("p1"))
  ok("no-safe-snapshot path refuses cleanly", rr4c?.blocked === true && rr4c?.reason === "no-safe-snapshot", JSON.stringify(rr4c))

  // ── CASE 5 — energy cost (full ULT tier) applies through the real ult path ────
  console.log("\n── energy cost ─────────────────────────────")
  await boot()
  await waitFrames(700)
  const castE = await page.evaluate(() => { window.__harness.fillEnergy?.(); const before = Math.round(window.__harness.p1().energy); const c = window.__harness.p1Ultimate().cast; return { before, after: Math.round(window.__harness.p1().energy), cast: c } })
  ok("real ULT cast fired", castE.cast === true, JSON.stringify(castE))
  ok("energy cost (~100) applied, not refunded by the rewind", castE.after <= castE.before - 100 + 2, `energy ${castE.before}→${castE.after}`)

  // ── CASE 6 — DETERMINISM (LAN-safety): two identical runs rewind bit-identically ────
  console.log("\n── determinism (two identical runs) ─────────────────────────────")
  // SAME pinned seed + a stand dummy + identical scripted approach → identical deterministic sim. The rewind
  // + measurement run ATOMICALLY (no frames between) so the compared state is exactly the restored snapshot,
  // free of post-rewind wall-clock frame jitter. Identical hashes ⇒ the restore is deterministic (LAN-safe).
  const runOnce = async () => {
    await boot("rickPrime", "sasuke", 424242)
    await page.evaluate(() => window.__harness.rewind.armAt(44))   // fire the rewind IN-SIM at buffer len 44 (frame-exact)
    await page.waitForFunction(() => window.__harness.rewind.armResult() != null, null, { timeout: 40000, polling: 16 })
    return page.evaluate(() => window.__harness.rewind.armResult())   // { ok, hash } captured on the firing tick
  }
  const r1 = await runOnce(); const r2 = await runOnce()
  ok("frame-exact rewind fired in-sim (both runs)", r1?.ok === true && r2?.ok === true, `${r1?.ok}/${r2?.ok}`)
  ok("two identical runs → bit-identical restored state (no desync)", r1.hash === r2.hash, `\n     run1 ${r1.hash}\n     run2 ${r2.hash}`)

  ok("no JS errors across the run", jsErrors.length === 0, jsErrors[0] || "")
  console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`)
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++
} finally {
  await browser.close(); server.close()
  process.exit(FAIL ? 1 : 0)
}
