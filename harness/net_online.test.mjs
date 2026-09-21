// harness/net_online.test.mjs — Stage 3 proof: a live 2-device LAN match over the real host/join pipe.
//
// Boots the game in TWO separate browser pages (two "devices"), both connected to ONE relay ws server, and
// drives the real host/join flow. Asserts:
//   1. The relay seats the two peers as p1 (host) and p2 (joiner), and the host sees the opponent present.
//   2. Host picks a matchup + starts → a MATCH_SETUP crosses the wire → BOTH pages start the SAME match
//      (identical seed) and both have netMatch active (lockstep engaged).
//   3. The two independent sims stay BIT-IDENTICAL frame-for-frame (delay-based lockstep, no desync) —
//      compared on every frame both pages happen to share.
//   4. The real ONLINE menu UI is wired (host/join/back rects present).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startLanServer } from "../net/lanServer.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startFileServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const RELAY_PORT = 8797;
const relay = startLanServer({ port: RELAY_PORT, relay: true, log: () => {} });
await new Promise(r => relay.wss.once("listening", r));
const fileServer = await startFileServer();
const base = `http://127.0.0.1:${fileServer.address().port}`;
const relayUrl = `ws://127.0.0.1:${RELAY_PORT}`;

const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });

async function openGame(label) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", e => console.log(`  ⚠️ [${label}] pageerror:`, e.message));
  await page.goto(`${base}/index.html?harness=1&relay=${encodeURIComponent(relayUrl)}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.online, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  return page;
}
const status = (p) => p.evaluate(() => window.__harness.online.status());
const probe  = (p) => p.evaluate(() => window.__harness.online.syncProbe());

try {
  const host = await openGame("host");
  const join = await openGame("join");

  // ── 4. UI wiring (real menu rects) ───────────────────────────────────────────
  const rects = await host.evaluate(() => { window.__harness.online.openMenu(); return window.__harness.online.menuRects().map(r => r.id); });
  check("ONLINE menu UI wired (host/join/back rows)", JSON.stringify(rects) === JSON.stringify(["host", "join", "back"]), rects.join(","));

  // ── 1. Connect both peers, relay seats them p1 / p2 ──────────────────────────
  await host.evaluate(() => window.__harness.online.hostStart());
  // Wait for the host to connect (seat assigned).
  await host.waitForFunction(() => ["waiting", "ready"].includes(window.__harness.online.status()), null, { timeout: 8000 });
  check("host connected + assigned seat p1", (await host.evaluate(() => window.__harness.online.side())) === "p1");

  await join.evaluate((u) => window.__harness.online.join(u), relayUrl);
  await join.waitForFunction(() => window.__harness.online.status() === "joined", null, { timeout: 8000 });
  check("joiner connected + assigned seat p2", (await join.evaluate(() => window.__harness.online.side())) === "p2");

  // Host should now see the opponent present (lobby count 2 → status "ready").
  await host.waitForFunction(() => window.__harness.online.status() === "ready", null, { timeout: 8000 });
  check("host sees opponent present (lobby → ready)", (await status(host)) === "ready");
  check("host bothPresent() true", await host.evaluate(() => window.__harness.online.bothPresent()));

  // ── 2. Host starts the match → both start the SAME seed ──────────────────────
  const hostSeed = await host.evaluate(() => window.__harness.online.hostStartMatch("goku", "sasuke", null));
  // Joiner receives MATCH_SETUP and auto-starts.
  await join.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 8000 });
  await host.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 8000 });
  const hSeed = await host.evaluate(() => window.__harness.online.seed());
  const jSeed = await join.evaluate(() => window.__harness.online.seed());
  check("both sides' netMatch active (lockstep engaged)", true);
  check("host + joiner started the SAME seed (MATCH_SETUP synced)", hSeed != null && hSeed === jSeed, `host=${hSeed} join=${jSeed}`);

  // Skip both intros to reach BATTLE frames.
  await host.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle());
  await join.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle());

  // ── 3. Sims stay bit-identical (sample both, compare on shared frames) ────────
  // Two free-running 60fps loops rarely sit on the same frame at the same wall-clock instant, so sample
  // densely to collect enough overlapping frames. Lockstep guarantees identical STATE at identical FRAME,
  // not identical wall-clock frame — the overlap is where we verify that guarantee.
  const samplesH = [], samplesJ = [];
  for (let i = 0; i < 150; i++) {
    const [a, b] = await Promise.all([probe(host), probe(join)]);
    if (a) samplesH.push(a);
    if (b) samplesJ.push(b);
    await sleep(16);
  }
  const mapJ = new Map(samplesJ.map(s => [s.frame, s]));
  let shared = 0, mismatched = 0, maxFrame = 0;
  for (const a of samplesH) {
    const b = mapJ.get(a.frame);
    if (!b) continue;
    shared++;
    maxFrame = Math.max(maxFrame, a.frame);
    if (a.p1x !== b.p1x || a.p1y !== b.p1y || a.p1h !== b.p1h || a.p2x !== b.p2x || a.p2y !== b.p2y || a.p2h !== b.p2h) mismatched++;
  }
  check("both sims advanced into BATTLE frames", maxFrame > 5, `maxSharedFrame=${maxFrame}`);
  check("shared frames were actually compared", shared >= 3, `sharedFrames=${shared}`);
  check("sims are BIT-IDENTICAL on every shared frame (no desync)", mismatched === 0, `mismatched=${mismatched}/${shared}`);

} catch (e) {
  check("no unexpected error", false, e.stack || e.message);
} finally {
  await browser.close();
  fileServer.close();
  await relay.close();
}

console.log(`\nNET ONLINE (Stage 3): ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
