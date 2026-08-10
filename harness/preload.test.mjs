// harness/preload.test.mjs — Stage 10 asset-preload verification.
//
// Reproduces the real bug (first-use _FALLBACK render while a PNG is still decoding) by DELAYING every
// image response ~300ms via page.route, then proving the Stage-10 preloader defeats it:
//   • the INTRO→BATTLE transition is GATED on preload completion (never enters BATTLE early),
//   • preloadDone() resolves with ZERO failures and a non-trivial decoded-sheet count,
//   • the delay is genuinely in effect (preload takes real wall-clock time — the test has teeth),
//   • after preload, firing specials/ult renders REAL sheets (never the null-sheet fallback box).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const IMG_DELAY_MS = 300;   // artificial per-image latency — makes decode-vs-first-use a real race

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });

// Fire every image request through a ~300ms delay so sheets are NOT instantly ready.
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route("**/*.png", async route => { await new Promise(r => setTimeout(r, IMG_DELAY_MS)); await route.continue(); });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

// Fire a move and sample the sprite each frame for `frames`, returning every (action, spriteSheet) seen
// while the fighter is mid-attack. A fallback render surfaces here as spriteSheet === null.
async function fireAndSample(key, frames = 26) {
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.healP2?.(); });
  const samples = [];
  await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key);
  for (let i = 0; i < frames; i++) {
    const a = await p1();
    if (a.attacking || a.currentMove || a.castMove) samples.push({ action: a.action, sheet: a.spriteSheet, frames: a.spriteFrames });
    await waitFrames(1);
  }
  return samples;
}

async function testChar(charKey, expectToken) {
  section(`${charKey.toUpperCase()} — gated preload + no first-use fallback`);

  await page.goto(`${base}/index.html?harness=1&p1=${charKey}&p2=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 });
  await page.mouse.click(640, 360);

  // start() begins the match WITH the intro (so the INTRO→BATTLE gate is exercised). Time it.
  const t0 = Date.now();
  await page.evaluate(() => window.__harness.start());

  // GATE: while preload is pending the game must NOT be in BATTLE. Sample across several frames.
  let brokeGateEarly = false;
  for (let i = 0; i < 10; i++) {
    const ready = await page.evaluate(() => window.__harness.preloadReady());
    const gs    = (await stateF()).gameState;
    if (!ready && gs === "battle") { brokeGateEarly = true; break; }
    if (ready) break;
    await waitFrames(1);
  }
  check("never enters BATTLE before preload is ready", !brokeGateEarly, "");

  // Await the preload Promise and inspect its result.
  const result = await page.evaluate(() => window.__harness.preloadDone());
  const elapsed = Date.now() - t0;
  const progress = await page.evaluate(() => window.__harness.preloadProgress());
  const failures = await page.evaluate(() => window.__harness.preloadFailures());

  check(`preload decoded a non-trivial sheet count (${progress.total})`, progress.total > 10, `total=${progress.total}`);
  check("preload reports ZERO failures", failures.length === 0, failures.length ? failures.map(f => `${f.path}(${f.error})`).slice(0, 6).join(" | ") : "");
  check(`image delay was actually in effect (${elapsed}ms ≥ ${IMG_DELAY_MS}ms)`, elapsed >= IMG_DELAY_MS - 50, `elapsed=${elapsed}ms`);
  check("preloadReady flag set after done", await page.evaluate(() => window.__harness.preloadReady()), "");

  // Idle sheet after preload must be the REAL char sheet, never the fallback box.
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(2);
  const idle = await p1();
  check("idle renders a real sheet (not fallback box)", !!idle.spriteSheet && (idle.spriteSheet || "").includes(expectToken), `sheet=${idle.spriteSheet}`);

  // Fire neutral special + ultimate immediately; every mid-move frame must have a real (non-null) sheet.
  const samples = [...await fireAndSample("l"), ...await fireAndSample("u")];
  const fellBack = samples.filter(s => !s.sheet);   // null sheet === the 128² _FALLBACK box
  check(`no _FALLBACK on first special/ult use (${samples.length} attack frames sampled)`,
    fellBack.length === 0, fellBack.length ? `${fellBack.length} fallback frames: ${[...new Set(fellBack.map(s => s.action))].join(",")}` : "");
}

try {
  // Two of the heaviest asset users: Netero (giant Guanyin form) and Vegeta (transform ladder + beams).
  await testChar("netero", "netero");
  await testChar("vegeta", "vegeta");

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  PRELOAD (Stage 10): ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
