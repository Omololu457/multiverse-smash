// harness/net_online_lag.test.mjs — an online match the way it really happens: a LAPTOP and a PHONE (different
// screen sizes) over an INTERNET-like link (a proxy adds 60 ms each way between the friend and the relay).
// Proves the two reported problems are fixed:
//   1. "I'm in one place and he's in another" — the two sims stay BIT-IDENTICAL even though the screens differ
//      (every device simulates the same fixed arena, game.js NET_ARENA).
//   2. "too slow" — with the input delay picked from the measured round trips, the match runs at (near) full
//      speed; with the old fixed 2-frame delay the same link plays in slow motion (shown as the control).
//   node harness/net_online_lag.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startLanServer } from "../net/lanServer.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".ogg": "audio/ogg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };
const fileServer = await new Promise((r) => {
  const s = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]), fp = path.join(ROOT, u === "/" ? "/index.html" : u);
    if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d); });
  });
  s.listen(0, "127.0.0.1", () => r(s));
});
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RELAY_PORT = 8798, ONE_WAY_MS = 60;
const relay = startLanServer({ port: RELAY_PORT, relay: true, log: () => {} });
await new Promise((r) => relay.wss.once("listening", r));
// Latency proxy: every chunk, both directions, is held ONE_WAY_MS (order preserved) — an internet-like link.
const proxy = net.createServer((c) => {
  const up = net.connect(RELAY_PORT, "127.0.0.1");
  const pipe = (a, b) => { let chain = Promise.resolve(); a.on("data", (d) => { const t = Date.now() + ONE_WAY_MS; chain = chain.then(() => sleep(Math.max(0, t - Date.now()))).then(() => { if (!b.destroyed) b.write(d); }); }); a.on("close", () => chain.then(() => b.destroy())); a.on("error", () => {}); };
  c.setNoDelay(true); up.setNoDelay(true); pipe(c, up); pipe(up, c);
});
const proxyPort = await new Promise((r) => proxy.listen(0, "127.0.0.1", () => r(proxy.address().port)));

const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
async function openGame(label, viewport) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => console.log(`  ⚠️ [${label}] pageerror:`, e.message));
  await page.goto(`http://127.0.0.1:${fileServer.address().port}/index.html?harness=1&relay=${encodeURIComponent(`ws://127.0.0.1:${RELAY_PORT}`)}`, { waitUntil: "load", timeout: 180000 });
  await page.waitForFunction(() => window.__harness && window.__harness.online, null, { timeout: 120000 });
  await page.mouse.click(viewport.width / 2, viewport.height / 2);
  return page;
}
const probe = (p) => p.evaluate(() => window.__harness.online.syncProbe());

// One match: returns { speed (sim frames per 60 wall frames, slowest side), shared, mismatched, delay }
async function playOnce(host, join, peerRtt, label) {
  await host.evaluate(() => window.__harness.online.hostStart());
  await host.waitForFunction(() => ["waiting", "ready"].includes(window.__harness.online.status()), null, { timeout: 15000 });
  await join.evaluate((u) => window.__harness.online.join(u), `ws://127.0.0.1:${proxyPort}`);
  await join.waitForFunction(() => window.__harness.online.status() === "joined", null, { timeout: 15000 });
  await host.waitForFunction(() => window.__harness.online.status() === "ready", null, { timeout: 15000 });
  await join.waitForFunction(() => window.__harness.online.rtt() != null, null, { timeout: 15000 });
  await sleep(2500);   // a few round-trip samples
  const jrtt = await join.evaluate(() => window.__harness.online.rtt());
  await host.evaluate((r) => window.__harness.online.hostStartMatch("goku", "sasuke", null, r), peerRtt === "measured" ? jrtt : peerRtt);
  await join.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 15000 });
  const delays = await Promise.all([host, join].map((p) => p.evaluate(() => window.__harness.online.inputDelay())));
  const arenas = await Promise.all([host, join].map((p) => p.evaluate(() => window.__harness.online.arena())));
  await host.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle());
  await join.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle());
  await sleep(500);
  const H = [], J = [];
  const t0 = Date.now(); const s0 = await Promise.all([host, join].map((p) => p.evaluate(() => window.__harness.online.netStats())));
  for (let i = 0; Date.now() - t0 < 6000; i++) {
    if (i % 40 === 0) { await join.keyboard.up(i % 80 ? "a" : "d"); await join.keyboard.down(i % 80 ? "d" : "a"); }
    if (i % 25 === 0) await join.keyboard.press("w");
    if (i % 33 === 0) await host.keyboard.down("d"); if (i % 33 === 15) await host.keyboard.up("d");
    if (i % 30 === 7) await host.keyboard.press("j");
    const [a, b] = await Promise.all([probe(host), probe(join)]);
    if (a) H.push(a); if (b) J.push(b);
    await sleep(12);
  }
  const secs = (Date.now() - t0) / 1000;
  const s1 = await Promise.all([host, join].map((p) => p.evaluate(() => window.__harness.online.netStats())));
  // share of battle-loop passes that had to WAIT for the other player's input (worst side). CPU load slows both
  // pages equally-ish; this measures what the network + input delay do, which is what "too slow" was.
  const stall = Math.max(...[0, 1].map((i) => { const st = s1[i].stalled - s0[i].stalled, ad = s1[i].advanced - s0[i].advanced; return st / Math.max(1, st + ad) }));
  const fps = Math.min(...[0, 1].map((i) => s1[i].advanced - s0[i].advanced)) / secs;
  const speed = 1 - stall;
  const mapJ = new Map(J.map((s) => [s.frame, s]));
  let shared = 0, mismatched = 0, moved = new Set();
  for (const a of H) { const b = mapJ.get(a.frame); if (!b) continue; shared++; moved.add(a.p2x); if (a.p1x !== b.p1x || a.p1y !== b.p1y || a.p1h !== b.p1h || a.p2x !== b.p2x || a.p2y !== b.p2y || a.p2h !== b.p2h) mismatched++; }
  console.log(`    [${label}] joiner rtt ${jrtt} ms · input delay ${delays.join("/")} · waiting ${(stall * 100).toFixed(0)}% of frames · ${fps.toFixed(0)} sim fps (CPU-bound here) · shared ${shared} mismatched ${mismatched} · arenas ${JSON.stringify(arenas)}`);
  // leave the match on both
  await Promise.all([host, join].map((p) => p.evaluate(() => window.__harness.online.leave ? window.__harness.online.leave() : null).catch(() => null)));
  return { speed, shared, mismatched, delays, arenas, jrtt, moved: moved.size };
}

try {
  const hostA = await openGame("laptop", { width: 1440, height: 900 });
  const joinA = await openGame("phone", { width: 844, height: 390 });
  const fixed = await playOnce(hostA, joinA, "measured", "adaptive");
  check("friend's round trip measured over the slow link", fixed.jrtt >= 2 * ONE_WAY_MS * 0.8, `${fixed.jrtt} ms`);
  check("both devices use the SAME input delay, raised for the slow link", fixed.delays[0] === fixed.delays[1] && fixed.delays[0] > 2, fixed.delays.join("/"));
  check("both devices simulate the same fixed arena (laptop + phone screens)", fixed.arenas.every((a) => a.fixed && a.w === fixed.arenas[0].w && a.h === fixed.arenas[0].h), JSON.stringify(fixed.arenas));
  check("fighters actually moved during the sample", fixed.moved > 3, `${fixed.moved} distinct positions`);
  check("SAME PLACE on both screens: bit-identical on every shared frame", fixed.shared >= 3 && fixed.mismatched === 0, `${fixed.mismatched}/${fixed.shared}`);
  check("FULL SPEED over the slow link: the game almost never waits for the other player (≤ 15% of frames)", fixed.speed >= 0.85, `waiting ${(100 - fixed.speed * 100).toFixed(0)}%`);
  await hostA.close(); await joinA.close();

  // Control: the old fixed 2-frame delay on the same link → slow motion (shows the test can tell).
  const hostB = await openGame("laptop", { width: 1440, height: 900 });
  const joinB = await openGame("phone", { width: 844, height: 390 });
  await hostB.evaluate(() => window.__harness.online.forceDelay && window.__harness.online.forceDelay(2));
  const old = await playOnce(hostB, joinB, 0, "old 2-frame delay");
  check("control: the old 2-frame delay waits far more on the same link (the slow-motion bug)", old.speed < fixed.speed - 0.15, `waiting ${(100 - old.speed * 100).toFixed(0)}% vs ${(100 - fixed.speed * 100).toFixed(0)}%`);
} catch (e) {
  check("no unexpected error", false, e.stack || e.message);
} finally {
  await browser.close(); fileServer.close(); proxy.close(); await relay.close();
}
console.log(`\nNET ONLINE LAG: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
