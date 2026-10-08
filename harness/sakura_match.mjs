// harness/sakura_match.mjs — PLAY a real match as Sakura (p1) vs Naruto (p2).
// Drives real keyboard input: approach → light combos → heavy → specials → ultimate, repeating until
// the opponent is KO'd. Logs the HP progression and screenshots key beats + the win.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGEERR:", e.message));
const shot = n => page.screenshot({ path: path.join(OUT, `match_${n}.png`) });
const st = () => page.evaluate(() => window.__harness.state());
const P = () => page.evaluate(() => { const a = window.__harness.p1() || {}, b = window.__harness.p2() || {}; return { p1x: Math.round(a.x), p1hp: Math.round(a.health), p1e: Math.round(a.energy), p2x: Math.round(b.x), p2hp: Math.round(b.health), p2max: Math.round(b.maxHealth), facing: a.facing, dist: Math.round(Math.abs(a.x - b.x)) }; });
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}); }
async function hold(k, n) { await page.keyboard.down(k); await wf(n); await page.keyboard.up(k); }

await page.goto(`${base}/index.html?harness=1&p1=sakura&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.countdown <= 0 || s.gameState === "battle"; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await page.evaluate(() => window.__harness.fillEnergy?.());
await wf(6);
console.log("ROUND START:", JSON.stringify(await P()));
await shot("01_start");

// close distance: Sakura spawns to the RIGHT of Naruto here, so approach by holding toward foe.
async function approach(maxF = 120) {
  let f = 0;
  while (f < maxF) {
    const s = await P();
    if (s.dist < 110) break;
    const dir = s.p1x > s.p2x ? "a" : "d";   // move toward foe
    await hold(dir, 6); f += 6;
  }
}
async function comboString() {
  await hold("j", 4); await wf(2); await hold("j", 4); await wf(2); await hold("k", 5); await wf(6);
}
async function special(dir) { if (dir) await page.keyboard.down(dir); await page.keyboard.down("l"); await wf(12); await page.keyboard.up("l"); if (dir) await page.keyboard.up(dir); await wf(10); }

let beat = 2;
for (let round = 0; round < 34; round++) {
  const s = await P();
  console.log(`cycle ${round}: dist=${s.dist} p1hp=${s.p1hp} p2hp=${s.p2hp} p1e=${s.p1e}`);
  if (s.p2hp <= 0) { console.log("  >>> KO!"); break; }
  await approach();
  await comboString();
  if (round < 6) await shot(`${String(beat++).padStart(2, "0")}_combo${round}`);
  await page.evaluate(() => window.__harness.fillEnergy?.()); await wf(3);
  // fire the ultimate whenever meter is ready (every 3rd cycle), else alternate specials
  if (round % 3 === 2) {
    await wf(34); await page.evaluate(() => window.__harness.fillEnergy?.()); await wf(2);
    await page.keyboard.down("u"); await wf(12); if (round < 9) await shot(`${String(beat++).padStart(2, "0")}_ult${round}`); await page.keyboard.up("u"); await wf(22);
  } else {
    await special(round % 2 ? "d" : null);   // neutral Shannaro / Fwd Heaven-Kick
    if (round < 6) await shot(`${String(beat++).padStart(2, "0")}_special${round}`);
  }
  await wf(18);
}

await wf(30);
const end = await P();
await shot("99_end");
const winner = end.p2hp <= 0 ? "SAKURA (p1) WINS" : end.p1hp <= 0 ? "Naruto (p2) wins" : "time — compare HP";
console.log("ROUND END:", JSON.stringify(end));
console.log("RESULT:", winner, `(p1 ${end.p1hp}hp vs p2 ${end.p2hp}/${end.p2max}hp)`);
await browser.close(); server.close();
