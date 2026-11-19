// harness/msv1_netreplay.test.mjs — MSV1 Phase 8: REPLAY + LAN with both ninjas (Mirror + Shadow Clones + Streaks).
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
const section = t => console.log(`── MSV1 ${t} ──`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const RELAY_PORT = 8798;
const relay = startLanServer({ port: RELAY_PORT, relay: true, log: () => {} });
await new Promise(r => relay.wss.once("listening", r));
const relayUrl = `ws://127.0.0.1:${RELAY_PORT}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const errors = []

const frameOf = p => p.evaluate(() => window.__harness.state().frame)
async function waitFrames(p, n) { const s = await frameOf(p); await p.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000 + n * 40, polling: 16 }) }
const ninjaSample = p => p.evaluate(() => {
  const T = window.__harness.ninjaTest, pr = window.__harness.online?.syncProbe?.() || null
  const st = w => { const f = T.raw(w), s = f?._ninja; return s ? JSON.stringify([Math.round(f.x), Math.round(f.y), f.health, { ...s, fx: undefined, prev: undefined, bubble: undefined }]) : null }
  return { frame: pr ? pr.frame : window.__harness.state().frame, a: st('p1'), b: st('p2'), m1: !!T.raw('p1')?._ninja?.mirror, m2: !!T.raw('p2')?._ninja?.mirror,
    c1: (T.raw('p1')?._ninja?.clones?.length || 0) + (T.raw('p1')?._ninja?.cloneJob ? 1 : 0), c2: (T.raw('p2')?._ninja?.clones?.length || 0) + (T.raw('p2')?._ninja?.cloneJob ? 1 : 0),
    k1: !!T.raw('p1')?._ninja?.streak, k2: !!T.raw('p2')?._ninja?.streak }
})
// one key "press" held for exactly `n` sim frames (real-time loop)
async function press(p, keys, n = 2) { for (const k of keys) await p.keyboard.down(k); await waitFrames(p, n); for (const k of [...keys].reverse()) await p.keyboard.up(k) }
async function dtap(p, k) { await press(p, [k], 2); await waitFrames(p, 3); await press(p, [k], 2) }
// usage counters straight from the sim (GAME_STATE): streaks / Mirrors / clone jobs started
const used = (p, w) => p.evaluate(w => { const s = window.__harness.ninjaTest.raw(w)?._ninja; return s ? { streaks: s.streaks, mirrors: s.mirrors, clones: s.stats.cloneJobs || 0 } : null }, w)
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

try {
  // ── 1. REPLAY ────────────────────────────────────────────────────────────────────────────────────────────────
  section("REPLAY: Shane vs CPU Dustin — Mirror + Clones + Streaks, record → playback")
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on("pageerror", e => errors.push("replay: " + e.message))
  await page.goto(`${base}/index.html?harness=1&p1=ns_red&p2=ns_yellow`, { waitUntil: "load" })
  await page.waitForFunction(() => window.__harness && window.__harness.replay && window.__harness.ninjaTest, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.start({ mode: "vs", difficulty: "adaptive" }))
  await page.evaluate(() => window.__harness.skipToBattle())
  await waitFrames(page, 2)
  await ninjaScript(page, 'p1', 'a', 'd')
  await waitFrames(page, 120)
  const seen = { shane: await used(page, 'p1'), cpuDustin: await used(page, 'p2') }
  const rec = await page.evaluate(() => window.__harness.replay.stopAndGet())
  check("recording: input deltas + state checkpoints + seed", rec?.frames?.length >= 6 && rec?.states?.length >= 5 && rec?.seed > 0, `deltas=${rec?.frames?.length} checkpoints=${rec?.states?.length}`)
  check("recorded match exercised Shane's Mirror, clones and streaks (sim counters)", seen.shane.mirrors > 0 && seen.shane.clones > 0 && seen.shane.streaks > 0, seen)
  check("the replay's checkpoints carry the ninja GAME_STATE (ninjaSnapshot)", JSON.stringify(rec.states).includes('"mirror"') || JSON.stringify(rec.states).includes('\\"np\\"'), JSON.stringify(rec.states[0]).slice(0, 120))
  const started = await page.evaluate(r => window.__harness.replay.play(r), rec)
  check("play() accepted the replay", started.ok === true, JSON.stringify(started))
  await page.evaluate(() => window.__harness.skipToBattle())
  await waitFrames(page, (rec.frameCount || 900) + 30)
  const ps = await page.evaluate(() => window.__harness.replay.playbackState())
  check(`ZERO desync — every checkpoint matched (${ps.matched}/${ps.checks})`, ps.checks >= 5 && ps.desyncFrame === null && ps.matched === ps.checks, ps)
  await page.close()

  // ── 2. LAN ───────────────────────────────────────────────────────────────────────────────────────────────────
  section("LAN: host Shane vs joiner Dustin, both on keyboards, lockstep")
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
  await host.evaluate(() => window.__harness.online.hostStartMatch("ns_red", "ns_yellow", null))
  await join.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 8000 })
  await host.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 8000 })
  const keys = await Promise.all([host, join].map(p => p.evaluate(() => [window.__harness.ninjaTest.raw('p1')?.rosterKey, window.__harness.ninjaTest.raw('p2')?.rosterKey])))
  check("both pages run ns_red vs ns_yellow on the same seed", keys[0].join() === "ns_red,ns_yellow" && keys[1].join() === keys[0].join()
    && (await host.evaluate(() => window.__harness.online.seed())) === (await join.evaluate(() => window.__harness.online.seed())), keys)
  await host.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle())
  await join.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle())
  const SH = new Map(), SJ = new Map()
  let sampling = true
  const sampler = (async () => { while (sampling) { const [a, b] = await Promise.all([ninjaSample(host), ninjaSample(join)]); SH.set(a.frame, a); SJ.set(b.frame, b); await sleep(8) } })()
  await Promise.all([ninjaScript(host, 'p1', 'a', 'd'), (async () => { await waitFrames(join, 20); await ninjaScript(join, 'p2', 'd', 'a') })()])
  await waitFrames(host, 60)
  sampling = false; await sampler
  let shared = 0, bad = 0, both = { m: 0, c: 0, k: 0 }, firstBad = null
  for (const [fr, a] of SH) { const b = SJ.get(fr); if (!b) continue; shared++
    if (a.a !== b.a || a.b !== b.b) { bad++; if (!firstBad) firstBad = { fr, host: (a.a || '').slice(0, 90), join: (b.a || '').slice(0, 90) } }
    if (a.m1 && a.m2) both.m++; if (a.c1 && a.c2) both.c++; if (a.k1 || a.k2) both.k++ }
  const ever = { shane: await used(host, 'p1'), dustin: await used(host, 'p2') }
  check("both ninjas used Mirror, Shadow Clones and Streaks during the LAN match (sim counters)", ['shane', 'dustin'].every(k => ever[k].mirrors > 0 && ever[k].clones > 0 && ever[k].streaks > 0), ever)
  check(`shared frames compared (${shared}); both Mirrors up together on ${both.m}`, shared >= 50, { shared, both })
  check("LAN sims BIT-IDENTICAL on every shared frame (positions + HP + full ninja state incl. the hidden Mirror identity)", bad === 0, firstBad || `${bad}/${shared}`)
  await host.screenshot({ path: "docs/msv1/screenshots/MSV1_lan_host.png" }); await join.screenshot({ path: "docs/msv1/screenshots/MSV1_lan_join.png" })
} catch (e) {
  check("ran to completion", false, e.stack || e.message)
} finally {
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "))
  await browser.close(); server.close(); await relay.close()
}
console.log(`\n${"═".repeat(30)}\n  MSV1 NET + REPLAY: ${PASS} passed, ${FAIL} failed\n${"═".repeat(30)}`)
process.exit(FAIL ? 1 : 0)
