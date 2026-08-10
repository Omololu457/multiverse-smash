// harness/replay_save.test.mjs — Stage 11D: save/load round-trip + victory-screen Save button.
//
// Proves a replay survives serialization: record → JSON.stringify → JSON.parse → play, and the reloaded
// replay reproduces the match with ZERO desync (a saved .json file really is replayable). Also verifies
// the victory-screen "Save Replay" button is wired (present + returns saveReplay only when a replay
// exists).
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

  // ── record a driven segment, then SERIALIZE it ──
  section("record → JSON round-trip");
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(2);
  await page.keyboard.down("d"); await waitFrames(70);
  await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(70);
  await page.keyboard.up("d"); await waitFrames(30);
  const rec = await page.evaluate(() => window.__harness.replay.stopAndGet());
  await page.evaluate(() => { for (const k of ["d", "j"]) window.dispatchEvent(new KeyboardEvent("keyup", { key: k })); });

  const json = JSON.stringify(rec);
  let parsed = null, parseOk = true;
  try { parsed = JSON.parse(json); } catch { parseOk = false; }
  check("replay serializes to valid JSON", parseOk && typeof json === "string" && json.length > 0, `${json.length} bytes`);
  check("round-tripped replay is structurally identical", parseOk && JSON.stringify(parsed) === json, "");
  check("round-tripped keeps seed + frames + states", parsed?.seed === rec.seed && parsed?.frames?.length === rec.frames.length && parsed?.states?.length === rec.states.length, "");

  // ── play the RELOADED (parsed-from-JSON) replay → zero desync ──
  section("reloaded replay plays back with zero desync");
  const started = await page.evaluate(j => window.__harness.replay.playJson(j), json);
  check("playJson accepted the serialized replay", started.ok === true, JSON.stringify(started));
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(2);
  await waitFrames((rec.frameCount || 200) + 30);
  const ps = await page.evaluate(() => window.__harness.replay.playbackState());
  check("checkpoints compared", ps.checks >= 3, `checks=${ps.checks}`);
  check("ZERO desync from the reloaded file", ps.desyncFrame === null && ps.matched === ps.checks, `matched=${ps.matched}/${ps.checks} firstDesync=${ps.desyncFrame}`);

  // ── victory-screen Save-Replay button wiring ──
  section("victory Save-Replay button");
  const withReplay = await page.evaluate(() => window.__harness.replay.victorySaveHitTest(true));
  const withoutReplay = await page.evaluate(() => window.__harness.replay.victorySaveHitTest(false));
  check("button returns 'saveReplay' when a replay is available", withReplay === "saveReplay", `got=${withReplay}`);
  check("button absent (no saveReplay) when none available", withoutReplay !== "saveReplay", `got=${withoutReplay}`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  REPLAY SAVE/LOAD (Stage 11D): ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
