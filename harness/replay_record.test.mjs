// harness/replay_record.test.mjs — Stage 11B: input recording.
//
// Proves the recorder captures a replayable input stream:
//   1. Recording auto-starts at match start with the right metadata (seed, chars, skins, stage, mode,
//      version, balanceStamp).
//   2. Inputs are DELTA-encoded — a frame is written only when a fighter's held-control mask CHANGES
//      (press adds a frame, holding does NOT, release adds a frame), so a 99s match stays tiny.
//   3. The bitmask reflects the actually-held controls and round-trips through encode/decode.
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
const cur = () => page.evaluate(() => window.__harness.replay.current());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=killua`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.replay, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── (1) recording metadata ──
  section("recording starts with metadata");
  const seed = await page.evaluate(() => window.__harness.rng.seed());
  const rec = await cur();
  check("recording is active", await page.evaluate(() => window.__harness.replay.recording()), "");
  check("replay version = 1", rec?.version === 1, `v=${rec?.version}`);
  check("balanceStamp present", typeof rec?.balanceStamp === "string" && rec.balanceStamp.length > 0, `stamp=${rec?.balanceStamp}`);
  check("seed matches match seed", rec?.seed === seed, `rec=${rec?.seed} match=${seed}`);
  check("p1Char recorded = killua", rec?.p1Char === "killua", `p1=${rec?.p1Char}`);
  check("p2Char recorded (non-null)", !!rec?.p2Char, `p2=${rec?.p2Char}`);
  check("mode + rounds recorded", rec?.mode === "training" && rec?.rounds > 0, `mode=${rec?.mode} rounds=${rec?.rounds}`);
  check("frames is an array", Array.isArray(rec?.frames), "");

  // ── (2) delta encoding ──
  section("delta encoding — frames written only on CHANGE");
  await page.evaluate(() => window.__harness.replay); // no-op keepalive
  await waitFrames(20);                                   // idle: dummy P2 stands → masks stable
  const baseFrames = (await cur()).frames.length;

  await page.keyboard.down("d"); await waitFrames(2);     // press right → a change
  const afterPress = (await cur()).frames.length;
  check("pressing a control appends a delta frame", afterPress > baseFrames, `base=${baseFrames} afterPress=${afterPress}`);

  await waitFrames(20);                                   // HOLD right → no new deltas
  const afterHold = (await cur()).frames.length;
  check("holding does NOT append frames", afterHold === afterPress, `afterPress=${afterPress} afterHold=${afterHold}`);

  // mask reflects the held control (right = bit 1)
  const heldMask = await page.evaluate(() => window.__harness.replay.rawMask("p1"));
  const heldDecoded = await page.evaluate(m => window.__harness.replay.decode(m), heldMask);
  check("mask reflects held 'right'", heldDecoded.right === true && heldMask === 2, `mask=${heldMask}`);

  await page.keyboard.up("d"); await waitFrames(3);       // release → a change
  const afterRelease = (await cur()).frames.length;
  check("releasing appends a delta frame", afterRelease > afterHold, `afterHold=${afterHold} afterRelease=${afterRelease}`);

  // ── (3) round-trip + compactness ──
  section("round-trip + compactness");
  const rt = await page.evaluate(() => { const r = window.__harness.replay; const raw = { left: false, right: true, light: true, block: true }; return { m: r.encode(raw), d: r.decode(r.encode(raw)) }; });
  check("encode/decode round-trips", rt.d.right && rt.d.light && rt.d.block && !rt.d.left, JSON.stringify(rt));
  const final = await cur();
  check("delta frames << total battle frames", final.frames.length < final.frameCount / 2, `deltas=${final.frames.length} totalFrames=${final.frameCount}`);
  check("every frame entry is {f,p1,p2}", final.frames.every(e => typeof e.f === "number" && typeof e.p1 === "number" && typeof e.p2 === "number"), "");
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  REPLAY RECORD (Stage 11B): ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
