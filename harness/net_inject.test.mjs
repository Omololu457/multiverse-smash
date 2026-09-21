// harness/net_inject.test.mjs — Stage 2 proof: the OPT-IN game-loop hooks actually inject remote input and
// stall on missing input, IN THE REAL GAME LOOP, without disturbing standalone play.
//
// Boots a real match in a browser (same rig as the replay tests), then begins a LAN match against a SCRIPTED
// MOCK peer (no socket, no real second player) via __harness.net.beginMock. Asserts:
//   1. Injection: the mock peer's constant mask is written onto the REMOTE fighter every frame (the game hook
//      drives p2 from the net session, exactly like replay playback drives it from a recording).
//   2. No false stall: with the peer supplying input, the sim advances frames normally.
//   3. Stall: when the peer WITHHOLDS input from a frame, the lockstep gate HOLDS updateBattle — the battle
//      frame counter plateaus (never guesses, never desyncs).
//   4. Release: ending the LAN match lets the sim advance again — i.e. the standalone path resumes untouched.
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

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️ pageerror:", e.message));
const frameNow = () => page.evaluate(() => window.__harness.net.frame());
async function waitFrames(n) { const s = await frameNow(); await page.waitForFunction(([a, b]) => window.__harness.net.frame() >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=killua&p2=killua`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.net && window.__harness.replay, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(3);

  // The remote mask we'll have the mock peer hold: press RIGHT + LIGHT (both are standard bound controls).
  const MASK = await page.evaluate(() => window.__harness.replay.encode({ right: true, light: true }));

  // ── 1 & 2. INJECTION + NO FALSE STALL ──────────────────────────────────────
  await page.evaluate((m) => window.__harness.net.beginMock({ localSide: "p1", inputDelay: 2, remoteConst: m }), MASK);
  const began = await page.evaluate(() => window.__harness.net.isActive());
  check("LAN match active (mock peer, local=p1)", began === true);

  const fBefore = await frameNow();
  await waitFrames(12);   // if injection stalled falsely this would time out
  const fAfter = await frameNow();
  check("sim advances normally while peer supplies input (no false stall)", fAfter >= fBefore + 12, `Δframe=${fAfter - fBefore}`);

  // Sample the mask currently held on the REMOTE fighter (p2) across a few frames — the hook re-injects it
  // every frame, so it must equal the peer's mask.
  let injectedEveryFrame = true, sample = null;
  for (let i = 0; i < 4; i++) {
    sample = await page.evaluate(() => window.__harness.net.liveMask("p2"));
    if (sample !== MASK) injectedEveryFrame = false;
    await waitFrames(2);
  }
  check("remote fighter (p2) is driven by the peer's injected mask every frame", injectedEveryFrame, `got ${sample} want ${MASK}`);

  await page.evaluate(() => window.__harness.net.end());

  // ── 3. STALL on withheld input ─────────────────────────────────────────────
  await waitFrames(2);
  const f0 = await frameNow();
  const WITHHOLD = f0 + 30;   // peer supplies input up to here, then withholds → sim should plateau at this frame
  await page.evaluate(([w]) => window.__harness.net.beginMock({ localSide: "p1", inputDelay: 2, remoteConst: 0, withholdFrom: w }), [WITHHOLD]);
  // Let it run into the withhold and settle. (Can't use waitFrames — the whole point is the frame STOPS.)
  await page.waitForTimeout(600);
  const fa = await frameNow();
  await page.waitForTimeout(400);
  const fb = await frameNow();
  check("sim STALLS when peer withholds input (frame counter plateaus)", fa === fb, `fa=${fa} fb=${fb}`);
  check("stall held at the withheld frame (not before, not past)", fa === WITHHOLD, `plateau=${fa} expected=${WITHHOLD}`);

  // ── 4. RELEASE — standalone path resumes ───────────────────────────────────
  await page.evaluate(() => window.__harness.net.end());
  await page.waitForTimeout(300);
  const fc = await frameNow();
  check("ending the LAN match releases the stall — sim advances again", fc > fb, `fb=${fb} fc=${fc}`);
  check("no longer in a LAN match (standalone path restored)", (await page.evaluate(() => window.__harness.net.isActive())) === false);

} catch (e) {
  check("no unexpected error", false, e.message);
} finally {
  await browser.close();
  server.close();
}

console.log(`\nNET INJECT (Stage 2): ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
