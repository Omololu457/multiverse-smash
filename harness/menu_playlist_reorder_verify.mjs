// harness/menu_playlist_reorder_verify.mjs — FIX 1 evidence. Proves the menu-playlist reorder correctly
// affects playback (the audio is NOT stale) and that the NEW now-playing highlight makes it visible:
//   • the ► NOW-PLAYING highlight tracks the live song through a reorder (index follows the song)
//   • the current audio continues uninterrupted (currentTime keeps advancing, no restart)
//   • when the track ends, the NEXT track follows the REORDERED order
// Screenshots of the Settings playlist panel → harness/shots/menu_reorder/. Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "menu_reorder");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const stateF = () => page.evaluate(() => window.__harness.state());
const audio = () => page.evaluate(() => window.__harness.menuAudio());
const ct = () => page.evaluate(() => window.__harness.musicState().currentTime);
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(20);
  await page.mouse.click(640, 360);                          // gesture → autoplay gate
  await waitFrames(2);
  await page.evaluate(() => window.__harness.menuMusicStart());   // start the menu playlist
  await waitFrames(30); await page.waitForTimeout(500);
  await page.evaluate(() => window.__harness.showSettings());     // Settings screen = the reorder panel
  await waitFrames(4);

  const a0 = await audio(); const t0 = await ct();
  await shot("1_before_reorder.png");
  console.log("  now playing:", a0.playingFile.slice(0, 18), "| index", a0.index);
  check("now-playing highlight shows the live track (index 0)", a0.index === 0 && a0.active, `idx=${a0.index} active=${a0.active}`);

  // Reorder: move the CURRENTLY-PLAYING track DOWN (index 0 → 1)
  await page.evaluate(i => window.__harness.menuMove(i, +1), a0.index);
  await waitFrames(4); await page.waitForTimeout(400);
  const a1 = await audio(); const t1 = await ct();
  await shot("2_after_reorder_highlight_follows.png");
  check("SAME audio still playing (no restart/switch)", a1.playingFile === a0.playingFile, `${a0.playingFile.slice(0,14)} → ${a1.playingFile.slice(0,14)}`);
  check("currentTime kept advancing (continuity, not restarted)", t1 > t0, `${t0.toFixed(2)} → ${t1.toFixed(2)}`);
  check("now-playing highlight FOLLOWED the song to its new row (0 → 1)", a1.index === 1 && a1.order[1] === a0.playingFile, `idx=${a1.index}`);
  check("the reorder is reflected in the list order", a1.order[0] !== a0.order[0], `top now ${a1.order[0].slice(0,14)}`);

  // Prove the reorder affects PLAYBACK: end the current track → next follows the NEW order
  const expectedNext = a1.order[(a1.index + 1) % a1.order.length];
  await page.evaluate(() => window.__harness.menuSimulateTrackEnd());
  await waitFrames(10); await page.waitForTimeout(400);
  const a2 = await audio();
  await shot("3_next_track_follows_new_order.png");
  check("on track-end, NEXT track = the one after it in the REORDERED list", a2.playingFile === expectedNext, `playing ${a2.playingFile.slice(0,16)}, expected ${expectedNext.slice(0,16)}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} Menu playlist reorder: ${fails} failed check(s). Shots → harness/shots/menu_reorder/`);
} catch (e) {
  console.log("  ⚠️ error:", e.message, e.stack); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
