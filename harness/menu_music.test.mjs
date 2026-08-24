// harness/menu_music.test.mjs — regression for the MENU-MUSIC selection bug.
// BUG: choosing a different song in the Settings "MENU MUSIC" panel didn't change what's
// playing. ROOT CAUSE: the panel was reorder-ONLY — the click handler hit-tested only the
// ▲/▼ arrows (sound.moveMenuTrack, which deliberately keeps the current song playing), the
// row body had no handler, and SoundManager had no "play this song now" method at all.
// FIX: SoundManager.selectMenuTrack(index) + a row-body click that calls it.
// This test proves 3 sequential DIFFERENT selections each switch the live track (not just
// the first), that mute + volume survive a switch, and that auto-advance/loop still works.
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
const audio = () => P(() => window.__harness.menuAudio());
const muted = () => P(() => window.__harness.menuMuted());
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.menuSelect, null, { timeout: 15000 });
  await page.mouse.click(640, 360);   // first-gesture unlock (audio)
  await P(() => window.__harness.boot());
  await P(() => window.__harness.menuMusicStart());
  await sleep(120);

  const order = (await audio()).order;
  check("playlist has ≥4 tracks to exercise switching", order.length >= 4, `n=${order.length}`);
  const a0 = await audio();
  check("menu music started on track 0", a0.index === 0 && a0.playingFile === order[0], `idx=${a0.index} file=${a0.playingFile}`);

  console.log("\n── CLICK-TO-PLAY: 3 DIFFERENT selections in sequence each switch the live track ──");
  // Deliberately non-adjacent, all distinct, none equal to the currently-playing index at pick time.
  const picks = [2, 4, 1];
  for (const i of picks) {
    const started = await P((k) => window.__harness.menuSelect(k), i);
    await sleep(80);
    const a = await audio();
    check(`select #${i} (${order[i].slice(0, 22)}…) → live track switched`,
      started === true && a.index === i && a.playingFile === order[i] && a.active === true,
      `started=${started} idx=${a.index} file=${a.playingFile}`);
  }

  console.log("\n── volume + mute persist across a track switch ──");
  await P(() => window.__harness.__sound.setVolume(0.8, 0.3));   // music volume SETTING = 0.3
  await P(() => window.__harness.menuSelect(0));
  await sleep(60);
  // Assert the persistent volume SETTING (_musicVol), not the element's instantaneous volume — the
  // latter is animated by the existing fade/duck system and is transient right after a switch.
  const volSetting = await P(() => window.__harness.__sound._musicVol);
  check("music volume SETTING (0.3) preserved across switch", Math.abs(volSetting - 0.3) < 0.001, `_musicVol=${volSetting}`);

  await P(() => window.__harness.__sound.setMusicMuted(true));
  await P(() => window.__harness.menuSelect(3));
  await sleep(60);
  const mA = await muted();
  check("mute state preserved after switch (element stays muted)", mA.musicMuted === true && mA.elMuted === true, JSON.stringify(mA));
  await P(() => window.__harness.__sound.setMusicMuted(false));
  const mB = await muted();
  check("unmute after switch works", mB.musicMuted === false && mB.elMuted === false, JSON.stringify(mB));

  console.log("\n── auto-advance / loop still works, continuing FROM the selected song ──");
  await P(() => window.__harness.menuSelect(2));
  await sleep(60);
  await P(() => window.__harness.menuSimulateTrackEnd());   // fire the onended auto-advance
  await sleep(60);
  const adv = await audio();
  check("track after #2 ends auto-advances to #3", adv.index === 3 && adv.playingFile === order[3], `idx=${adv.index}`);

  const last = order.length - 1;
  await P((k) => window.__harness.menuSelect(k), last);
  await sleep(60);
  await P(() => window.__harness.menuSimulateTrackEnd());
  await sleep(60);
  const wrap = await audio();
  check("playlist WRAPS from last track back to #0", wrap.index === 0 && wrap.playingFile === order[0], `idx=${wrap.index}`);

  console.log("\n── reorder path (▲/▼) still keeps the CURRENT song playing (unchanged behaviour) ──");
  await P(() => window.__harness.menuSelect(1));
  await sleep(60);
  const beforeMove = (await audio()).playingFile;
  await P(() => window.__harness.menuMove(1, +1));   // move current song down one slot
  const afterMove = (await audio()).playingFile;
  check("reorder keeps the same song playing (cursor pinned)", beforeMove === afterMove, `${beforeMove} vs ${afterMove}`);

  console.log("\n── no JS errors ──");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error(e); fail++;
} finally {
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
