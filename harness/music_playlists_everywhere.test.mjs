// harness/music_playlists_everywhere.test.mjs — ready-made playlists (one click = whole playlist) + the
// 'In Matches Too' toggle (menu playlist keeps playing through a match, never restarting; OFF = stage music).
// harness/custom_playlist.test.mjs — player-authored CUSTOM PLAYLIST (third music source).
// Verifies: the browser lists all 179 songs (windowed + scrollable, not one screen); building &
// saving a custom playlist stores real persisted data; it SURVIVES a page reload; selecting the
// "custom" source plays ONLY the chosen songs; the editable model re-opens pre-checked; an empty
// custom playlist falls back to default with a message; and the default + personalized sources are
// untouched by all of this.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const OUT = path.join(ROOT, "harness", "shots", "music_playlists"); fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness && !!window.__harness.library, null, { timeout: 60000 });
await page.mouse.click(640, 360); await P(() => window.__harness.boot());
const ms = () => P(() => { const s = window.__harness.musicState(); const a = window.__harness.menuAudio(); return { src: s.fileSrc, t: s.currentTime ?? null, paused: s.paused, menuActive: a.active, idx: a.index } });
await P(() => window.__harness.showSettings()); await page.waitForTimeout(800);
await page.screenshot({ path: OUT + "/settings_off.png" });
await page.mouse.click(24 + 178 + 70, 336 + 13); await page.waitForTimeout(300);
await page.screenshot({ path: OUT + "/settings_on.png" });
check("toggle ON is saved", await P(() => JSON.parse(localStorage.getItem("multiverse-smash-music") || "{}").menuEverywhere) === true);
const before = await ms(); await page.waitForTimeout(1500);
const st = await P(() => window.__harness.playStageMusicNow()); await page.waitForTimeout(1500);
const after = await ms();
check("ON: match start keeps the SAME menu song", after.src === before.src && after.menuActive, `${before.src} → ${after.src}`);
check("ON: the song is not restarted", after.t > before.t, `t ${before.t} → ${after.t}`);
// library screen
await P(() => window.__harness.library.open()); await page.waitForTimeout(300);
await page.screenshot({ path: OUT + "/library_all.png" });
// click the Carti & Rage playlist name (row 3) then its box
const sideX = Math.max(16, 640 - (240 + 14 + 620) / 2);
const rowY = (i) => 116 + i * (36 + 4) + 18;
await page.mouse.click(sideX + 60, rowY(3)); await page.waitForTimeout(200);
await page.mouse.click(sideX + 240 - 18, rowY(3)); await page.waitForTimeout(200);
await page.screenshot({ path: OUT + "/library_rage.png" });
const saved = await P(() => window.__harness.library.save());
check("one click on a playlist box selects the whole playlist", saved.custom.length === 25 && saved.custom.every(f => /carti|backr00ms|pain 1993|uzi|dex|sheck|pissy|nine vicious|calabasas|subliminals/i.test(f)), `${saved.custom.length}`);
// toggle OFF → stage music returns on next match
await P(() => window.__harness.showSettings()); await page.waitForTimeout(300);
await page.mouse.click(24 + 178 + 70, 336 + 13); await page.waitForTimeout(300);
await P(() => window.__harness.playStageMusicNow()); await page.waitForTimeout(800);
{ const off = await ms(); check("OFF: matches play their own stage music again", /JJk_3/.test(off.src || "") && !off.menuActive, off.src); }
check("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`
${pass} passed, ${fail} failed`);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
