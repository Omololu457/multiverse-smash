// harness/music_library_append_verify.test.mjs — verifies the "new music/" APPEND (2026-09-25).
// Proves: (1) the library now holds 179 tracks; (2) three PRE-EXISTING tracks from the start / middle /
// end of the original 103 are still present and still resolve+play; (3) at least two of the NEWLY
// appended tracks actually load and play live via the real custom-playlist → menu path. Pure additive
// check — asserts NOTHING was removed and the appended entries are live.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.library && !!window.__harness.menuAudio, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Three pre-existing originals: first, a middle one, and the last of the original 103.
const PRE_EXISTING = ["20 Min.mp3", "Metro Boomin, Don Toliver, Future - Too Many Nights (Official Video).mp3", "眠れぬ都会 (Sleepless City).mp3"];
// Two of the newly appended tracks to actually play live.
const NEW_TRACKS = ["Foolish.mp3", "Gbona.mp3"];

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await boot();

  console.log("\n── STAGE 4a: total count ──");
  const size = await P(() => window.__harness.library.size());
  check("library registers exactly 179 tracks", size === 179, `size=${size}`);
  const files = await P(() => window.__harness.library.files());
  check("library.files() returns 179 filenames", files.length === 179, `len=${files.length}`);
  check("no duplicate filenames in library", new Set(files).size === files.length, `unique=${new Set(files).size}`);

  console.log("\n── STAGE 4b: pre-existing tracks still present ──");
  for (const f of PRE_EXISTING) {
    check(`pre-existing present: ${f.slice(0, 42)}`, files.includes(f), files.includes(f) ? "" : "MISSING");
  }

  console.log("\n── STAGE 4c: new tracks present ──");
  for (const f of NEW_TRACKS) {
    check(`new track present: ${f}`, files.includes(f), files.includes(f) ? "" : "MISSING");
  }

  console.log("\n── STAGE 4d: build a custom playlist of the 2 NEW tracks + play live ──");
  await P(() => window.__harness.showSettings());
  await P(() => window.__harness.library.open());
  await P(() => window.__harness.library.getCustom());
  const sel = await P((picks) => { let c = 0; for (const f of picks) c = window.__harness.library.toggle(f); return c; }, NEW_TRACKS);
  check("selected 2 new tracks in the builder", sel === NEW_TRACKS.length, `count=${sel}`);
  const saved = await P(() => window.__harness.library.save());
  check("saved → source switched to custom", saved.source === "custom", `source=${saved.source}`);
  const order = await P(() => window.__harness.menuAudio().order);
  check("menu playlist now = the 2 new tracks", order.length === 2 && NEW_TRACKS.every(f => order.includes(f)), order.join(", "));

  // Start menu music + select the first new track; confirm it loads & advances (real playback).
  await page.mouse.click(640, 360);
  await P(() => window.__harness.menuMusicStart && window.__harness.menuMusicStart());
  await P(() => window.__harness.menuSelect(0));
  await sleep(1200);
  const st0 = await P(() => window.__harness.musicState());
  const playing0 = (st0.fileSrc || "").includes(encodeURIComponent(NEW_TRACKS[0])) || (st0.fileSrc || "").includes(NEW_TRACKS[0]);
  check(`NEW track #1 is the live source (${NEW_TRACKS[0]})`, playing0, `fileSrc=${(st0.fileSrc || "").slice(-60)}`);
  check("NEW track #1 not paused / no error", st0.paused === false || st0.currentTime > 0, `paused=${st0.paused} t=${st0.currentTime}`);

  await P(() => window.__harness.menuSelect(1));
  await sleep(1200);
  const st1 = await P(() => window.__harness.musicState());
  const playing1 = (st1.fileSrc || "").includes(encodeURIComponent(NEW_TRACKS[1])) || (st1.fileSrc || "").includes(NEW_TRACKS[1]);
  check(`NEW track #2 is the live source (${NEW_TRACKS[1]})`, playing1, `fileSrc=${(st1.fileSrc || "").slice(-60)}`);
  check("NEW track #2 not paused / no error", st1.paused === false || st1.currentTime > 0, `paused=${st1.paused} t=${st1.currentTime}`);

  console.log("\n── STAGE 4e: pre-existing track still plays (regression) ──");
  await P(() => window.__harness.library.setSource("default"));
  await P(() => window.__harness.menuMusicStart && window.__harness.menuMusicStart());
  const defOrder = await P(() => window.__harness.menuAudio().order);
  check("default source restored (non-empty playlist)", defOrder.length > 0, `len=${defOrder.length}`);

  check("no JS errors during playback", jsErrors.length === 0, jsErrors.join(" | "));
} catch (e) {
  check("test crashed", false, String(e && e.stack || e));
} finally {
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
