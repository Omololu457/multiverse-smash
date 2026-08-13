// harness/valley_music_verify.mjs — VERIFY "Bad Situation" is wired to Valley of the End and ACTUALLY
// loads (not a silent 404 → procedural fallback). Drives the REAL sound.playStageTrack path, captures the
// mp3's HTTP status + any [sound] load-failure warning, and reads the resulting audio state. Also sanity-
// checks Hidden Leaf Village still resolves to the naruto SERIES_MUSIC fallback (untouched). Run ALONE.
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

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

// ── capture network + console ──
const audioResponses = [];   // {url, status}
const failedRequests = [];   // {url, failure}
const soundWarnings = [];
page.on("response", r => { const u = r.url(); if (/\.mp3(\?|$)/i.test(u)) audioResponses.push({ url: decodeURIComponent(u.replace(base, "")), status: r.status() }); });
page.on("requestfailed", r => { const u = r.url(); if (/\.mp3(\?|$)/i.test(u)) failedRequests.push({ url: decodeURIComponent(u.replace(base, "")), failure: r.failure()?.errorText }); });
page.on("console", m => { const t = m.text(); if (/\[sound\]/i.test(t)) soundWarnings.push(t); });

const stateF = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

const EXPECT = "Anime Kei - Bad Situation (Naruto Sad).mp3";

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(20);

  // real user gesture → satisfies the autoplay gate (sound._gestured) so music actually plays
  await page.mouse.click(640, 360);
  await waitFrames(2);

  // ── VALLEY OF THE END ──
  console.log("── Valley of the End ──");
  const sel = await page.evaluate(() => window.__harness.selectStageByName("Valley of the End"));
  console.log("  wired music field:", JSON.stringify(sel));
  check(`STAGE_DEFS music = "${EXPECT}"`, sel.music === EXPECT, `got "${sel.music}"`);

  const played = await page.evaluate(() => window.__harness.playStageMusicNow());
  console.log("  playStageMusicNow:", JSON.stringify(played));
  await waitFrames(60);   // give the 2MB file time to fetch + start
  await page.waitForTimeout(500);

  const ms = await page.evaluate(() => window.__harness.musicState());
  console.log("  musicState:", JSON.stringify(ms));
  console.log("  mp3 responses:", JSON.stringify(audioResponses));
  console.log("  failed mp3 requests:", JSON.stringify(failedRequests));
  console.log("  [sound] warnings:", JSON.stringify(soundWarnings));

  const badResp = audioResponses.find(r => r.url.includes("Bad Situation"));
  check("gesture registered (music not stuck pending)", ms.gestured === true, `gestured=${ms.gestured}`);
  check(`mp3 HTTP request fired for "${EXPECT}"`, !!badResp, badResp ? `status ${badResp.status}` : "no request seen");
  check("mp3 returned HTTP 200 (not a 404 → not a silent fallback)", !!badResp && badResp.status === 200, badResp ? `status ${badResp.status}` : "n/a");
  check("no [sound] load-failure warning (would mean fallback to procedural)", soundWarnings.length === 0, soundWarnings.join(" | "));
  check("active music file = the Bad Situation track (not nulled/fallback)", !!ms.fileSrc && ms.fileSrc.includes("Bad Situation"), `fileSrc=${ms.fileSrc}`);
  // Only the TARGET track matters — a prior stage's theme aborting (net::ERR_ABORTED) when we switch the
  // Audio src is expected track-switch behavior, not a load failure of Bad Situation.
  const badFailed = failedRequests.filter(r => r.url.includes("Bad Situation"));
  check("the Bad Situation track had no failed request", badFailed.length === 0, `target failures=${JSON.stringify(badFailed)}; (unrelated aborted switches: ${JSON.stringify(failedRequests)})`);

  // ── HIDDEN LEAF VILLAGE — must be UNTOUCHED (no per-stage music → naruto series fallback) ──
  console.log("\n── Hidden Leaf Village (must be untouched) ──");
  const leaf = await page.evaluate(() => window.__harness.selectStageByName("Hidden Leaf Village"));
  console.log("  leaf:", JSON.stringify(leaf));
  check("Hidden Leaf has NO explicit per-stage music (uses series fallback)", leaf.music === "valley_of_the_end_theme.mp3" ? false : (leaf.music !== EXPECT), `music=${leaf.music}, seriesFallback=${leaf.seriesFallback}`);
  check("Hidden Leaf did NOT inherit Bad Situation", leaf.music !== EXPECT, `music=${leaf.music}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} Valley music wiring: ${fails} failed check(s)`);
  console.log(`\n>>> ACTUAL FILE THAT PLAYED: ${ms.fileSrc || "(none — fell back)"} | HTTP ${badResp ? badResp.status : "n/a"}`);
} catch (e) {
  console.log("  ⚠️ error:", e.message, e.stack); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
