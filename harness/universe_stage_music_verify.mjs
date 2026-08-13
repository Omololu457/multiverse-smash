// harness/universe_stage_music_verify.mjs — VERIFY each new universe stage's (placeholder) music ACTUALLY
// loads (HTTP 200) and plays — not a silent 404 → procedural fallback. One stage at a time (each track
// loads before switching to avoid abort noise). Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const resp = new Map();     // filename → status
const warnings = [];
page.on("response", r => { if (/\.mp3(\?|$)/i.test(r.url())) resp.set(decodeURIComponent(r.url().replace(base, "").replace(/^\//, "")), r.status()); });
page.on("console", m => { if (/\[sound\]/i.test(m.text())) warnings.push(m.text()); });

const stateF = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

const EXPECT = [
  ["Soul Society",       "jhene__aiko_-_stay_ready__instrumental_.mp3"],
  ["Gotham Rooftops",    "Future___Young_Thug_-_No_Cap__Official_Audio_.mp3"],
  ["Woodsboro",          "Noble_f3mii_Instrumental.mp3"],
  ["Heaven's Arena",     "Rochelle_Jordan_-_Lowkey___sped_up__.mp3"],
  ["Viltrumite Warzone", "needybounce.mp3"],
  ["Command Center",     "neddy sped up.mp3"],
  ["PK Academy",         "Rema_-_Dumebi.mp3"],
  ["Analysis Nexus",     "love_nwantiti__feat__Dj_Yo____AX_EL___Remix_.mp3"],
];

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(20);
  await page.mouse.click(640, 360);   // gesture → autoplay gate
  await waitFrames(2);

  for (const [stage, file] of EXPECT) {
    const wired = await page.evaluate(n => window.__harness.selectStageByName(n), stage);
    warnings.length = 0;
    await page.evaluate(() => window.__harness.playStageMusicNow());
    // wait for THIS track to become the active file + start playing
    await page.waitForFunction(f => { const ms = window.__harness.musicState(); return ms.fileSrc && ms.fileSrc.includes(f) && ms.paused === false; }, file.slice(0, 24), { timeout: 8000, polling: 50 }).catch(() => {});
    await waitFrames(30); await page.waitForTimeout(300);
    const ms = await page.evaluate(() => window.__harness.musicState());
    const status = resp.get(file);
    console.log(`── ${stage}`);
    check(`wired music = "${file}"`, wired.music === file, `got "${wired.music}"`);
    check(`HTTP 200 (not 404 → not a silent fallback)`, status === 200, `status=${status}`);
    check(`active track = this file + playing`, !!ms.fileSrc && ms.fileSrc.includes(file.slice(0, 20)) && ms.paused === false, `fileSrc=${ms.fileSrc} paused=${ms.paused} t=${ms.currentTime?.toFixed?.(2)}`);
    check(`no [sound] load-failure warning`, warnings.length === 0, warnings.join(" | "));
  }

  console.log(`\n${fails === 0 ? "✅" : "❌"} Universe stage music: ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message, e.stack); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
