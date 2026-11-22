// harness/msv1_merge_netreplay.test.mjs — MSV1-MERGE Phase 4 #6: REPLAY + LAN with Shane & Dustin (windrangers): ONE match
// with a FORM SWAP (hold Charge + ↓↓ + J), the Ninja Mirror, Shadow Clones, an Earth Kunai trap and STORM AND STONE. Plus a replay
// of the CPU duo swapping on its own. Every duo / ninja GAME_STATE field must replay + lockstep bit-identically.
// (based on harness/msv1_netreplay.test.mjs)
//   1. REPLAY: a real-time Shane vs CPU Dustin (normal / adaptive) match driven by keys — Mirror (↓↓+Charge), swap, Shadow
//      Clones (←+Charge), streaks (→→) — recorded, then played back from seed + inputs: every state checkpoint
//      (which carries the ninja GAME_STATE via ninjaSnapshot) must match (zero desync).
//   2. LAN: two pages over the relay, host Shane vs joiner Dustin, BOTH driven by their own keyboards through the
//      same tools; the two sims' full ninja state (mirror identity, clones, streak, NP) must be identical on every
//      frame both pages were sampled on.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startLanServer } from "../net/lanServer.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d !== "" ? `  — ${typeof d === "string" ? d : JSON.stringify(d)}` : ""}`); };
const section = t => console.log(`── MSV1-MERGE ${t} ──`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const RELAY_PORT = 8799;
const relay = startLanServer({ port: RELAY_PORT, relay: true, log: () => {} });
await new Promise(r => relay.wss.once("listening", r));
const relayUrl = `ws://127.0.0.1:${RELAY_PORT}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const errors = []

const frameOf = p => p.evaluate(() => window.__harness.state().frame)
async function waitFrames(p, n) { const s = await frameOf(p); await p.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000 + n * 40, polling: 16 }) }
const ninjaSample = p => p.evaluate(() => {
  const T = window.__harness.ninjaTest, pr = window.__harness.online?.syncProbe?.() || null
  const st = w => { const f = T.raw(w), s = f?._ninja; return s ? JSON.stringify([Math.round(f.x), Math.round(f.y), f.health, Math.round((f.energy || 0) * 100), f.rosterKey, f._duo || null, { ...s, fx: undefined, prev: undefined, bubble: undefined }]) : null }
  return { frame: pr ? pr.frame : window.__harness.state().frame, a: st('p1'), b: st('p2'), m1: !!T.raw('p1')?._ninja?.mirror, m2: !!T.raw('p2')?._ninja?.mirror,
    c1: (T.raw('p1')?._ninja?.clones?.length || 0) + (T.raw('p1')?._ninja?.cloneJob ? 1 : 0), c2: (T.raw('p2')?._ninja?.clones?.length || 0) + (T.raw('p2')?._ninja?.cloneJob ? 1 : 0),
    k1: !!T.raw('p1')?._ninja?.streak, k2: !!T.raw('p2')?._ninja?.streak }
})
// one key "press" held for exactly `n` sim frames (real-time loop)
async function press(p, keys, n = 2) { for (const k of keys) await p.keyboard.down(k); await waitFrames(p, n); for (const k of [...keys].reverse()) await p.keyboard.up(k) }
async function dtap(p, k) { await press(p, [k], 2); await waitFrames(p, 3); await press(p, [k], 2) }
// usage counters straight from the sim (GAME_STATE): streaks / Mirrors / clone jobs started
const used = (p, w) => p.evaluate(w => { const f = window.__harness.ninjaTest.raw(w), s = f?._ninja, d = f?._duo; return s ? { why: d?.lastRefuse || null, streaks: s.streaks, mirrors: s.mirrors, clones: s.stats.cloneJobs || 0, traps: (s.stats.trapsSet || 0) + s.traps.length + (s._trapSeen || 0), swaps: d?.swaps || 0, ults: d?.ults || 0, cpuSwaps: d?.cpuSwaps || 0, form: f.rosterKey } : null }, w)
// press until the counter moves (a CPU hit can eat an input; every retry is still a real recorded key press)
const actionable = (p, w) => p.waitForFunction(w => { const f = window.__harness.ninjaTest.raw(w); return f && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.attacking && !f._ninja?.streak }, w, { timeout: 20000, polling: 16 }).catch(() => {})
async function until(p, w, key, act, tries = 8) { for (let i = 0; i < tries; i++) { await actionable(p, w); const a = (await used(p, w))?.[key] || 0; await act(); if (((await used(p, w))?.[key] || 0) > a) return true } return false }
// the ninja script both tests drive: Shadow Clones → streak → (NP regen) → Mirror → swap
// (← + Charge during a Mirror is a swap, and the Mirror costs 50 → the clones / streak come first)
async function ninjaScript(p, w, back, fwd) {
  await until(p, w, 'clones', async () => { await p.keyboard.down(back); await press(p, ['p'], 2); await p.keyboard.up(back); await waitFrames(p, 70) })   // ← + Charge → Shadow Clones (35)
  await until(p, w, 'streaks', async () => { await dtap(p, fwd); await waitFrames(p, 30) })                                                             // →→ streak (10)
  await p.waitForFunction(w => (window.__harness.ninjaTest.raw(w)?._ninja?.np || 0) >= 50, w, { timeout: 30000, polling: 50 })                       // NP regen 6/s → 50
  await until(p, w, 'mirrors', async () => { await dtap(p, 's'); await press(p, ['p'], 2); await waitFrames(p, 40) })                                // ↓↓ + Charge → Mirror
  await press(p, ['p'], 2); await waitFrames(p, 40)                                                                                                  // Charge alone → swap
}


const fwdKey = (p, w) => p.evaluate(w => { const T = window.__harness.ninjaTest, a = T.raw(w), b = T.raw(w === 'p1' ? 'p2' : 'p1'); return b.x >= a.x ? 'd' : 'a' }, w)
async function waitPlayback(p, rec) {   // until every recorded frame has been replayed (or a desync stops it)
  const t0 = Date.now()
  while (Date.now() - t0 < 240000) { const ps = await p.evaluate(() => window.__harness.replay.playbackState()); if (!ps || ps.desyncFrame != null || (ps.cursor >= ps.totalFrames && ps.frameCount >= (rec.frameCount || 0))) break; await sleep(250) }
  await waitFrames(p, 30)
}
async function swapKeys(p) { await p.keyboard.down('p'); await waitFrames(p, 1); await press(p, ['s'], 2); await waitFrames(p, 3); await press(p, ['s'], 2); await waitFrames(p, 1); await press(p, ['j'], 2); await waitFrames(p, 1); await p.keyboard.up('p') }   // hold Charge + ↓↓ + J
const formOf = (p, w) => p.evaluate(w => window.__harness.ninjaTest.raw(w)?.rosterKey, w)
async function toForm(p, w, k) { for (let i = 0; i < 6 && (await formOf(p, w)) !== k; i++) { await actionable(p, w); await p.waitForFunction(w => (window.__harness.ninjaTest.raw(w)?._ninja?.np || 0) >= 15 && !(window.__harness.ninjaTest.raw(w)?._duo?.cd > 0), w, { timeout: 20000, polling: 16 }).catch(() => {}); await swapKeys(p); await waitFrames(p, 30) } return (await formOf(p, w)) === k }
async function motionKeys(p, steps, btn) { for (const s of steps) { for (const k of s) await p.keyboard.down(k); await waitFrames(p, 2); for (const k of s) await p.keyboard.up(k) } await press(p, [btn], 2) }
const trapsSeen = {}
async function trapSet(p, w, back) {   // Dustin ↓↙← + Light (Earth Kunai)
  for (let i = 0; i < 6; i++) { await actionable(p, w); await p.waitForFunction(w => (window.__harness.ninjaTest.raw(w)?._ninja?.np || 0) >= 15, w, { timeout: 20000, polling: 16 }).catch(() => {})
    const bk = (await fwdKey(p, w)) === 'd' ? 'a' : 'd'; await motionKeys(p, [['s'], ['s', bk], [bk]], 'j'); await waitFrames(p, 30)
    if (await p.evaluate(w => (window.__harness.ninjaTest.raw(w)?._ninja?.traps?.length || 0) > 0, w)) { trapsSeen[w] = (trapsSeen[w] || 0) + 1; return true } }
  return false
}
async function walkTo(p, w, _f, dist = 90) { const fwd = await fwdKey(p, w); await p.keyboard.down(fwd); await p.waitForFunction(([w, d]) => { const T = window.__harness.ninjaTest, a = T.raw(w), b = T.raw(w === 'p1' ? 'p2' : 'p1'); return Math.abs(a.x - b.x) < d }, [w, dist], { timeout: 20000, polling: 16 }).catch(() => {}); await p.keyboard.up(fwd) }
async function buildMeter(p, w, fwd) {   // real kick strings until the meter is full (2 bars = 100)
  for (let i = 0; i < 40 && (await p.evaluate(w => window.__harness.ninjaTest.raw(w).energy, w)) < 100; i++) {
    await actionable(p, w); await walkTo(p, w, fwd)
    for (const k of ['j', 'k', 'k', 'k']) { await press(p, [k], 2); await waitFrames(p, 9) }
    await waitFrames(p, 20)
  }
  return (await p.evaluate(w => window.__harness.ninjaTest.raw(w).energy, w)) >= 100
}
async function tagUlt(p, w, fwd) {
  for (let i = 0; i < 4; i++) { await actionable(p, w); const a = (await used(p, w)).ults
    await motionKeys(p, [['s'], ['s', fwd], [fwd], ['s'], ['s', fwd], [fwd]], 'l'); /* Special + Heavy chord: heavy rides the same press window */
    if ((await used(p, w)).ults > a) { await waitFrames(p, 110); return true } }
  return false
}
async function tagUltChord(p, w, _f) {
  for (let i = 0; i < 4; i++) { await actionable(p, w); const fwd = await fwdKey(p, w); const a = (await used(p, w)).ults
    for (const s of [['s'], ['s', fwd], [fwd], ['s'], ['s', fwd], [fwd]]) { for (const k of s) await p.keyboard.down(k); await waitFrames(p, 2); for (const k of s) await p.keyboard.up(k) }
    await p.keyboard.down('l'); await p.keyboard.down('k'); await waitFrames(p, 2); await p.keyboard.up('k'); await p.keyboard.up('l')
    await waitFrames(p, 4); if ((await used(p, w)).ults > a) { await waitFrames(p, 110); return true } }
  return false
}
// the full duo script: Shadow Clones → streak → Mirror → Mirror swap → FORM SWAP to Dustin → trap → FORM SWAP back → meter → STORM AND STONE
async function duoScript(p, w, back, fwd, ult = true) {
  await until(p, w, 'clones', async () => { await p.keyboard.down(back); await press(p, ['p'], 2); await p.keyboard.up(back); await waitFrames(p, 70) })
  await until(p, w, 'streaks', async () => { await dtap(p, fwd); await waitFrames(p, 30) })
  await p.waitForFunction(w => (window.__harness.ninjaTest.raw(w)?._ninja?.np || 0) >= 50, w, { timeout: 30000, polling: 50 })
  await until(p, w, 'mirrors', async () => { await dtap(p, 's'); await press(p, ['p'], 2); await waitFrames(p, 40) })
  await press(p, ['p'], 2); await waitFrames(p, 40)
  await toForm(p, w, 'ns_yellow')
  await trapSet(p, w, back)
  await toForm(p, w, 'ns_red')
  if (ult) { await buildMeter(p, w, fwd); await tagUltChord(p, w, fwd) }
}

try {
  // ── 1. REPLAY (one match: swap + Mirror + clones + trap + Storm and Stone) ─────────────────────────────────────────
  section("REPLAY: Shane & Dustin vs training dummy — swap, Mirror, clones, trap, Storm and Stone; record → playback")
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on("pageerror", e => errors.push("replay: " + e.message))
  await page.goto(`${base}/index.html?harness=1&p1=windrangers&p2=spd_red`, { waitUntil: "load" })
  await page.waitForFunction(() => window.__harness && window.__harness.replay && window.__harness.ninjaTest, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.start({ mode: "training", difficulty: "dummy" }))
  await page.evaluate(() => window.__harness.skipToBattle())
  await waitFrames(page, 2)
  await duoScript(page, 'p1', 'a', 'd')
  await waitFrames(page, 60)
  const seen = await used(page, 'p1')
  const trapEver = trapsSeen.p1 || 0
  const rec = await page.evaluate(() => window.__harness.replay.stopAndGet())
  check("recording: input deltas + state checkpoints + seed", rec?.frames?.length >= 6 && rec?.states?.length >= 5 && rec?.seed > 0, `deltas=${rec?.frames?.length} checkpoints=${rec?.states?.length} p1=${rec?.p1Char}`)
  check("ONE match exercised a FORM SWAP, Mirror, clones, a trap and STORM AND STONE (sim counters)", seen.swaps >= 2 && seen.mirrors > 0 && seen.clones > 0 && seen.ults > 0 && trapEver > 0, { ...seen, trapSet: trapEver })
  check("the replay's checkpoints carry the duo GAME_STATE (form, cooldown, swap)", JSON.stringify(rec.states).includes('windrangers'), JSON.stringify(rec.states).slice(0, 100))
  const started = await page.evaluate(r => window.__harness.replay.play(r), rec)
  check("play() accepted the replay", started.ok === true, JSON.stringify(started))
  await page.evaluate(() => window.__harness.skipToBattle())
  await waitPlayback(page, rec)
  const ps = await page.evaluate(() => window.__harness.replay.playbackState())
  check(`ZERO desync — every checkpoint matched (${ps.matched}/${ps.checks})`, ps.checks >= 5 && ps.desyncFrame === null && ps.matched === ps.checks, ps)
  await page.close()

  // ── 1b. REPLAY: the CPU duo swaps on its own (ai.js → the real Charge + ↓↓ + J input) ─────────────────────────────────
  section("REPLAY: CPU Shane & Dustin (adaptive) swapping on its own, record → playback")
  const pc = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  pc.on("pageerror", e => errors.push("cpu: " + e.message))
  await pc.goto(`${base}/index.html?harness=1&p1=ns_red&p2=windrangers`, { waitUntil: "load" })
  await pc.waitForFunction(() => window.__harness && window.__harness.replay && window.__harness.ninjaTest, null, { timeout: 30000 })
  await pc.mouse.click(640, 360)
  await pc.evaluate(() => window.__harness.start({ mode: "vs", difficulty: "adaptive" }))
  await pc.evaluate(() => window.__harness.skipToBattle())
  await waitFrames(pc, 2)
  // P1 (plain Shane) zones from range then jumps in close, so the CPU sees both reasons to swap
  for (let i = 0; i < 6; i++) { await pc.keyboard.down('a'); await waitFrames(pc, 50); await pc.keyboard.up('a'); await press(pc, ['w'], 2); await waitFrames(pc, 40); await walkTo(pc, 'p1', 'd', 120); await waitFrames(pc, 60)
    if ((await used(pc, 'p2')).cpuSwaps >= 2) break }
  const cpu = await used(pc, 'p2')
  const rc = await pc.evaluate(() => window.__harness.replay.stopAndGet())
  check("the CPU duo swapped on its own (through the real input, cooldown-limited)", cpu.cpuSwaps >= 1 && cpu.swaps >= 1, cpu)
  await pc.evaluate(r => window.__harness.replay.play(r), rc); await pc.evaluate(() => window.__harness.skipToBattle())
  await waitPlayback(pc, rc)
  const pcs = await pc.evaluate(() => window.__harness.replay.playbackState())
  check(`CPU-swap replay ZERO desync (${pcs.matched}/${pcs.checks})`, pcs.checks >= 3 && pcs.desyncFrame === null && pcs.matched === pcs.checks, pcs)
  await pc.close()

  // ── 2. LAN ───────────────────────────────────────────────────────────────────────────────────────────────────
  section("LAN: host Shane & Dustin vs joiner Shane & Dustin, keyboards, lockstep")
  async function openGame(label) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    p.on("pageerror", e => errors.push(label + ": " + e.message))
    await p.goto(`${base}/index.html?harness=1&relay=${encodeURIComponent(relayUrl)}`, { waitUntil: "load" })
    await p.waitForFunction(() => window.__harness && window.__harness.online && window.__harness.ninjaTest, null, { timeout: 30000 })
    await p.mouse.click(640, 360)
    return p
  }
  const host = await openGame("host"), join = await openGame("join")
  await host.evaluate(() => window.__harness.online.hostStart())
  await host.waitForFunction(() => !!window.__harness.online.hostCode(), null, { timeout: 8000 })
  const code = await host.evaluate(() => window.__harness.online.hostCode())
  await join.evaluate(c => window.__harness.online.join(c), code)
  await host.waitForFunction(() => window.__harness.online.status() === "ready", null, { timeout: 8000 })
  await host.evaluate(() => window.__harness.online.hostStartMatch("windrangers", "windrangers", null))
  await join.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 8000 })
  await host.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 8000 })
  const keys = await Promise.all([host, join].map(p => p.evaluate(() => [window.__harness.ninjaTest.raw('p1')?._duo?.id, window.__harness.ninjaTest.raw('p2')?._duo?.id, window.__harness.ninjaTest.raw('p1')?.rosterKey, window.__harness.ninjaTest.raw('p2')?.rosterKey])))
  check("both pages run Shane & Dustin vs Shane & Dustin on the same seed", keys[0][0] === 'windrangers' && keys[0][1] === 'windrangers' && keys[1].join() === keys[0].join()
    && (await host.evaluate(() => window.__harness.online.seed())) === (await join.evaluate(() => window.__harness.online.seed())), keys)
  await host.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle())
  await join.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle())
  const SH = new Map(), SJ = new Map()
  let sampling = true
  const sampler = (async () => { while (sampling) { const [a, b] = await Promise.all([ninjaSample(host), ninjaSample(join)]); SH.set(a.frame, a); SJ.set(b.frame, b); await sleep(8) } })()
  await Promise.all([duoScript(host, 'p1', 'a', 'd', true), (async () => { await waitFrames(join, 20); await duoScript(join, 'p2', 'd', 'a', false) })()])
  await waitFrames(host, 60)
  sampling = false; await sampler
  let shared = 0, bad = 0, both = { m: 0, c: 0, k: 0 }, firstBad = null
  for (const [fr, a] of SH) { const b = SJ.get(fr); if (!b) continue; shared++
    if (a.a !== b.a || a.b !== b.b) { bad++; if (!firstBad) firstBad = { fr, host: (a.a || '').slice(0, 140), join: (b.a || '').slice(0, 140) } }
    if (a.m1 && a.m2) both.m++; if (a.c1 && a.c2) both.c++; if (a.k1 || a.k2) both.k++ }
  const ever = { host: await used(host, 'p1'), join: await used(host, 'p2') }
  check("LAN match: both duos swapped forms, used Mirror + clones; host also landed Storm and Stone", ever.host.swaps >= 2 && ever.join.swaps >= 2 && ever.host.mirrors > 0 && ever.join.mirrors > 0 && ever.host.clones > 0 && ever.host.ults > 0 && (trapsSeen.p1 || 0) > 0, { ...ever, trapsSeen })
  check(`shared frames compared (${shared})`, shared >= 50, { shared, both })
  check("LAN sims BIT-IDENTICAL on every shared frame (positions + HP + meter + form + full duo / ninja state)", bad === 0, firstBad || `${bad}/${shared}`)
  await host.screenshot({ path: "docs/msv1/screenshots_merge/MERGE_lan_host.png" }); await join.screenshot({ path: "docs/msv1/screenshots_merge/MERGE_lan_join.png" })
} catch (e) {
  check("ran to completion", false, e.stack || e.message)
} finally {
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "))
  await browser.close(); server.close(); await relay.close()
}
console.log(`\n${"═".repeat(30)}\n  MSV1-MERGE NET + REPLAY: ${PASS} passed, ${FAIL} failed\n${"═".repeat(30)}`)
process.exit(FAIL ? 1 : 0)
