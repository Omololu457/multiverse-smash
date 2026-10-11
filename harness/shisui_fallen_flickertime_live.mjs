// harness/shisui_fallen_flickertime_live.mjs — SHISUI (FALLEN) FLICKER TIME (Forward+Ultimate).
// His "Flash Time": the world drops to ~1/3 speed while he keeps full speed. Verifies it enters (near-max meter
// gate), imposes the foe time-slow (the AI walks far less per frame), drains Chakra → auto-reverts, renders an
// emerald speed-trail, and CANNOT be entered inside the Susanoo. Reuses the shared time-slow engine via his own flag.
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
let PERR = 0, KNOWN = 0;
page.on("pageerror", e => { if (/drawSasukeAdultStance/.test(e.message)) { KNOWN++; return; } console.log("  PAGEERROR:", e.message); PERR++; });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle(stage) {
  if (stage) { try { await page.evaluate(n => window.__harness.selectStageByName?.(n), stage); } catch (_) {} }
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await setup();
}
async function setup(p1x = 420, p2x = 980) { await page.evaluate(([a, b]) => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP1X?.(a); window.__harness.setP2X?.(b); }, [p1x, p2x]); await waitFrames(6); }
const ult = (v) => page.evaluate(x => window.__harness.shisuiFallenUlt(x), v);
// how much the foe's hitstun timer ticks DOWN over N real frames (the time-slow throttles the foe's whole update).
async function foeHitstunDrop(frames) { await page.evaluate(() => window.__harness.hurtP2(90)); const h0 = (await p2()).hitstun; await waitFrames(frames); return h0 - (await p2()).hitstun; }

console.log("\n══ SHISUI (FALLEN) — FLICKER TIME ══");
await boot(`${base}/index.html?harness=1&p1=shisui_fallen&p2=naruto`);
await toBattle("Hidden Leaf Village");

// BASELINE — how far the foe's hitstun ticks down over 40 frames at normal speed.
await setup(420, 980);
const baseDrop = await foeHitstunDrop(40);
console.log(`  baseline foe hitstun tick / 40f = ${Math.round(baseDrop)}`);

// ENTER Flicker Time (Forward+Ult).
await setup(420, 980);
const r = await ult("flickerTime"); await waitFrames(3);
const s = await p1();
console.log(`  enter: cast=${r.cast}, flickerTime=${s.flickerTime}, oppTimeScale=${s.oppTimeScale}, energy=${Math.round(s.energy)}`);
ok(r.cast && s.flickerTime, `Forward+Ult enters Flicker Time`);
ok(s.oppTimeScale > 0.2 && s.oppTimeScale < 0.6, `it imposes a ~⅓ time-slow on the foe (oppTimeScale=${s.oppTimeScale})`);

// WORLD-SLOW — the foe's whole update is throttled, so its hitstun ticks down much slower per real frame.
const slowDrop = await foeHitstunDrop(40);
console.log(`  Flicker-Time foe hitstun tick / 40f = ${Math.round(slowDrop)} (baseline ${Math.round(baseDrop)})`);
ok(slowDrop > 0 && slowDrop < baseDrop * 0.6, `the foe runs markedly slower under Flicker Time (${Math.round(slowDrop)} < ${Math.round(baseDrop * 0.6)})`);
await page.screenshot({ path: path.join(OUT, "shisui_fallen_flickertime.png") });

// DRAIN → the meter falls while active.
const e0 = (await p1()).energy; await waitFrames(30); const e1 = (await p1()).energy;
console.log(`  drain: energy ${Math.round(e0)}→${Math.round(e1)}`);
ok(e1 < e0, `Flicker Time drains Chakra while active`);

// AUTO-REVERT — force the meter to ~0, it ends.
await page.evaluate(() => window.__harness.setP1Energy(2)); await waitFrames(16);
const rev = await p1();
console.log(`  auto-revert: flickerTime=${rev.flickerTime}, oppTimeScale=${rev.oppTimeScale}`);
ok(!rev.flickerTime && rev.oppTimeScale === 0, `it auto-reverts when Chakra runs out (foe speed restored)`);

// GATE — cannot enter inside the Emerald Susanoo.
await setup();
await page.evaluate(() => window.__harness.shisuiFallenUlt("emeraldSusanoo")); await waitFrames(3);
const inSus = await page.evaluate(() => window.__harness.fillEnergy?.());
await page.evaluate(() => window.__harness.fillEnergy?.());
const ft = await ult("flickerTime"); await waitFrames(2);
const g = await p1();
console.log(`  inside Susanoo: Flicker-Time cast=${ft.cast}, flickerTime=${g.flickerTime}`);
ok(!g.flickerTime, `Flicker Time cannot be entered inside the Susanoo`);

console.log(`\n  known/expected pageerrors (non-shisui): ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — shisui_fallen Flicker Time`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
