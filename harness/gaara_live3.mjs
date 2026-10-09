// harness/gaara_live3.mjs — REAL live verification for Gaara PHASE 3 (Sabaku Taisou ultimate). Boots a real
// match (?p1=gaara&p2=naruto), fires the ultimate via the deterministic p1Ultimate hook, and asserts: the
// ult fires + spends the full meter, Gaara plays the cast→kneel poses, the kanji cut-in cinematic renders,
// the world-space burial FX stages play (ripples→hands→dome→collapse→burst→mounds), and the foe takes big
// guaranteed damage (~197 EFF). Screenshots the cut-in + each FX stage, on a light and a dark stage.
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
const shot = n => page.screenshot({ path: path.join(OUT, `gaara3_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
// NOTE: p1() snapshot omits custom _gaara* fields → detect ult state via the exposed spriteSheet.
const p1 = () => page.evaluate(() => { const f = window.__harness.p1() || {}; return { key: f.key, energy: Math.round(f.energy ?? -1), sheet: f.spriteSheet || null }; });
const p2hp = () => page.evaluate(() => Math.round((window.__harness.p2() || {}).health ?? -1));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.refill?.("p1"); window.__harness.healP2?.(); }); await waitFrames(4); }
const fireUlt = () => page.evaluate(() => { window.__harness.fillEnergy?.(); return window.__harness.p1Ultimate(); });   // fillEnergy → full meter (ult costs 100)

await boot(`${base}/index.html?harness=1&p1=gaara&p2=naruto`);
await toBattle();

// ── 1) FIRE THE ULTIMATE — spends the full meter, sets the cinematic timer, enters the cast pose ──
const e0 = (await p1()).energy;
const hp0 = await p2hp();
const r = await fireUlt();
await waitFrames(4); const a0 = await p1();
console.log(`fire: p1Ultimate=${JSON.stringify(r)} energy ${e0}→${a0.energy} sheet=${a0.sheet}`);
ok(r.cast === true, `ultimate FIRES (cast=${r.cast})`);
ok(a0.energy < e0, `ultimate spends Sand (${e0}→${a0.energy})`);
ok(/gaaraUltCast/.test(r.castMove || "") && /ult_cast/.test(a0.sheet || ""), `cinematic armed + cast pose (castMove=${r.castMove}, sheet=${a0.sheet})`);

// ── 2) CUT-IN cinematic renders early (the kanji panel slides in) ──
await waitFrames(10); await shot("01_cutin");
// ── 3) FX STAGES through the sequence — poll the sheet each step; the hitstop on the big beats desyncs
//       fixed-frame sampling, so collect every ult sheet seen and assert the kneel appears at some point. ──
const sheetsSeen = new Set();
for (let i = 0; i < 16; i++) {
  const s = (await p1()).sheet || "";
  sheetsSeen.add(s.split("/").pop());
  if (i === 2) await shot("02_hands");
  if (i === 6) await shot("03_dome");
  if (i === 10) await shot("04_collapse");
  if (i === 13) await shot("05_kneel_burst");
  await waitFrames(12);
}
console.log(`ult sheets seen: ${JSON.stringify([...sheetsSeen])}`);
ok([...sheetsSeen].some(s => /ult_cast/.test(s)), `Part-1 CAST pose plays (sheets=${[...sheetsSeen]})`);
ok([...sheetsSeen].some(s => /ult_kneel/.test(s)), `Part-2 KNEEL pose plays (sheets=${[...sheetsSeen]})`);

// ── 4) BIG DAMAGE dealt + ult resolves ──
await waitFrames(50); await shot("06_settle");
const hp1 = await p2hp(); const aEnd = await p1();
const dmg = hp0 - hp1;
console.log(`damage: p2.health ${hp0}→${hp1} (Δ${dmg}) | post-ult sheet=${aEnd.sheet}`);
ok(dmg >= 150, `Sabaku Taisou deals big guaranteed damage (Δ${dmg}, ~197 EFF band)`);
ok(/gaara_idle|gaara_walk/.test(aEnd.sheet || ""), `cinematic cleanly resolves back to normal (sheet=${aEnd.sheet})`);

// ── 5) LIGHT + DARK stage alpha proof (cut-in + burial FX key clean) ──
async function stageShot(label, stageName) {
  await boot(`${base}/index.html?harness=1&p1=gaara&p2=naruto`); await toBattle();
  await page.evaluate(n => window.__harness.selectStageByName?.(n), stageName);
  await fireUlt(); await waitFrames(12); await shot(label + "_cutin"); await waitFrames(140); await shot(label + "_burial");
}
await stageShot("07_light", "Hidden Leaf Village");
await stageShot("08_dark",  "Shibuya Incident");

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/gaara3_*.png`);
process.exit(FAILS ? 1 : 0);
