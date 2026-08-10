// harness/replay_playback.test.mjs — Stage 11C: replay playback + desync check + reject-on-mismatch.
//
// Records a driven match segment, then plays the finalized replay back from its seed + input stream and
// verifies the playback reproduces the recorded fighter state bit-identically at every checkpoint (zero
// desync). Also proves a replay from a different balance/version is refused.
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

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️ pageerror:", e.message));
const stateF = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=killua&p2=killua`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.replay, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // ── RECORD a driven segment ──
  section("record a driven match segment");
  // Use start()+skipToBattle (NOT boot(), which force-fills P1 energy AFTER startMatch — an external
  // mutation outside the recorded frame stream that playback can't reproduce). Real matches start clean.
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(2);
  // Drive P1: walk right across a checkpoint, attack, idle — produces non-trivial, reproducible motion.
  await page.keyboard.down("d"); await waitFrames(70);
  await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(60);
  await page.keyboard.up("d"); await waitFrames(70);
  const rec = await page.evaluate(() => window.__harness.replay.stopAndGet());
  await page.evaluate(() => { for (const k of ["d", "j"]) window.dispatchEvent(new KeyboardEvent("keyup", { key: k })); });
  check("recording captured input deltas", Array.isArray(rec?.frames) && rec.frames.length >= 2, `deltas=${rec?.frames?.length}`);
  check("recording captured state checkpoints", Array.isArray(rec?.states) && rec.states.length >= 3, `checkpoints=${rec?.states?.length}`);
  check("replay has a seed", Number.isFinite(rec?.seed) && rec.seed > 0, `seed=${rec?.seed}`);

  // ── REJECT-ON-MISMATCH (no side effects — validate returns before startMatch) ──
  section("reject-on-mismatch");
  check("valid replay validates ok", (await page.evaluate(r => window.__harness.replay.validate(r), rec)).ok === true, "");
  const badBal = await page.evaluate(r => window.__harness.replay.validate({ ...r, balanceStamp: "WRONG" }), rec);
  check("mismatched balanceStamp is refused", badBal.ok === false && /balance/i.test(badBal.reason), `reason=${badBal.reason}`);
  const badVer = await page.evaluate(r => window.__harness.replay.play({ ...r, version: 999 }), rec);
  check("mismatched version is refused by play()", badVer.ok === false, `res=${JSON.stringify(badVer)}`);

  // ── PLAYBACK reproduces the recorded state (zero desync) ──
  section("playback reproduces recorded state (zero desync)");
  const started = await page.evaluate(r => window.__harness.replay.play(r), rec);
  check("play() accepted the replay", started.ok === true, JSON.stringify(started));
  await page.evaluate(() => window.__harness.skipToBattle());   // align to the recorded (intro-skipped) start
  await waitFrames(2);
  check("playback mode is active", await page.evaluate(() => window.__harness.replay.isPlayback()), "");
  await waitFrames((rec.frameCount || 200) + 30);               // run past every recorded checkpoint
  const ps = await page.evaluate(() => window.__harness.replay.playbackState());
  check("state checkpoints were compared", ps.checks >= 3, `checks=${ps.checks}`);
  check("ZERO desync — every checkpoint matched", ps.desyncFrame === null && ps.matched === ps.checks, `matched=${ps.matched}/${ps.checks} firstDesync=${ps.desyncFrame}`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  REPLAY PLAYBACK (Stage 11C): ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
