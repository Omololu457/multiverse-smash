// harness/sakura_live.mjs — REAL-INPUT live verification for Sakura Haruno.
// Boots a real match (?p1=sakura&p2=naruto), drives every move through real page.keyboard presses
// (j/k/i light/heavy/up, l special, u ultimate, a/d/w/s dirs), and screenshots each. Energy/HP deltas
// prove a move actually FIRED through input (not just a pose). Also captures the real select screen.
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
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
const shot = n => page.screenshot({ path: path.join(OUT, `sakura_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => { const f = window.__harness.p1() || {}; return { key: f.key, energy: Math.round(f.energy ?? -1), health: Math.round(f.health ?? -1), x: Math.round(f.x ?? 0), grounded: f.grounded }; });

// ── 1) REAL SELECT SCREEN (naruto roster incl. Sakura) ──
await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness && window.__harness.state, null, { timeout: 15000 });
const sel = await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
await new Promise(r => setTimeout(r, 400));
await shot("01_select");
console.log("select roster:", JSON.stringify(sel)?.slice(0, 200));

// ── 2) BOOT REAL MATCH: p1=sakura vs p2=naruto ──
await page.goto(`${base}/index.html?harness=1&p1=sakura&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
await waitFrames(4);
console.log("after boot p1:", JSON.stringify(await p1()));
await shot("02_idle");

async function refill() { await page.evaluate(() => window.__harness.fillEnergy?.()); await waitFrames(2); }
// playwright press() is too fast for the attack buffer — use key HOLDS. Screenshot WHILE held (mid-cast).
async function special(label, dir /* a/d/w/s or null */, shotAtFrame = 7, hold = 12) {
  await refill();
  const before = await p1();
  if (dir) { await page.keyboard.down(dir); await waitFrames(3); }
  await page.keyboard.down("l");
  await waitFrames(shotAtFrame);
  await shot(label);
  await waitFrames(Math.max(1, hold - shotAtFrame));
  await page.keyboard.up("l");
  if (dir) await page.keyboard.up(dir);
  await waitFrames(2);
  const after = await p1();
  console.log(`${label}: energy ${before.energy}→${after.energy} (Δ${after.energy - before.energy}) hp ${before.health}→${after.health}`);
  await waitFrames(40);
  return after.energy - before.energy;
}
async function holdKey(k, frames) { await page.keyboard.down(k); await waitFrames(frames); await page.keyboard.up(k); }

// ── 3) RUN (hold toward foe) ──
await refill();
await page.keyboard.down("d"); await waitFrames(14); await shot("03_run"); await page.keyboard.up("d"); await waitFrames(10);
console.log("run p1:", JSON.stringify(await p1()));

// ── 4) LIGHT combo string (Attack Combo) — hold-based taps ──
await refill();
await holdKey("j", 4); await waitFrames(2); await page.keyboard.down("j"); await waitFrames(5);
await shot("04_light_combo"); await page.keyboard.up("j"); console.log("light p1:", JSON.stringify(await p1())); await waitFrames(22);

// ── 5) HEAVY (orange-arc FX) ──
await refill(); await page.keyboard.down("k"); await waitFrames(5); await shot("05_heavy_fx"); await page.keyboard.up("k"); await waitFrames(24);

// ── 6) NEUTRAL special — Shannaro Rush ──
await special("06_special_neutral", null);

// ── 7) FWD special — Heaven-Spin Kick ──
await special("07_special_fwd", "d");

// ── 8) BACK special — Byakugou Seal (needs sub-max HP) ──
await page.evaluate(() => window.__harness.damageP1?.(260)); await waitFrames(2);
await special("08_byakugou", "a", 10, 18);

// ── 9) DOWN special — Summoning: Katsuyu ──
await special("09_katsuyu", "s", 9, 16);

// ── 10) ULTIMATE — Daichi no Sakebi ──
await waitFrames(40); await refill();   // clear Katsuyu's cooldown tail before the ult
const ub = await p1();
await page.keyboard.down("u"); await waitFrames(12); await shot("10_daichi_ult"); await page.keyboard.up("u"); await waitFrames(2);
const ua = await p1();
console.log(`10_daichi_ult: energy ${ub.energy}→${ua.energy} (Δ${ua.energy - ub.energy})`);
await waitFrames(30);

// ── 11) UP special best-effort — Cherry-Blossom Impact ──
await special("11_special_up", "w", 5, 8);

await browser.close(); server.close();
console.log("DONE — shots in harness/shots/sakura_*.png");
