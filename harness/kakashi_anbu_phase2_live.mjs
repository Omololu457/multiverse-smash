// harness/kakashi_anbu_phase2_live.mjs — REAL live verification for Kakashi (ANBU) PHASE 2.
// Sharingan toggle (Charge-tap) + drain→fatigue, Raikiri (neutral-Special charge-hold → dash → strike;
// tracking gated on Sharingan), and the Full-Charge Raikiri ultimate (neutral U). Real keystrokes.
// P1 keys: move a/d, jump w, crouch s, light j, heavy k, special l, charge p, ultimate u, block ;.
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
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `kanbu2_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
const ks = () => page.evaluate(() => window.__harness.kakashiAnbu.state());
const hp2 = () => page.evaluate(() => Math.round((window.__harness.p2() || {}).health));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(6); }
const sharOff = async () => { const s = await ks(); if (s.sharingan) { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3); } };

await boot(`${base}/index.html?harness=1&p1=kakashi_anbu&p2=naruto`);
await toBattle();

// ── 1) SHARINGAN toggle (Charge-TAP) ──
await reset();
let s = await ks(); ok(!s.sharingan, `Sharingan starts OFF`);
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3);
s = await ks(); ok(s.sharingan, `Charge-tap toggles Sharingan ON (sharingan=${s.sharingan})`); await shot("01_sharingan_on");
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3);
s = await ks(); ok(!s.sharingan, `Charge-tap again toggles Sharingan OFF`);

// ── 2) SHARINGAN drain → shutoff + fatigue ──
await reset();
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3);   // toggle ON (full chakra)
const sOn = await ks(); ok(sOn.sharingan, `Sharingan ON (energy=${sOn.energy})`);
await waitFrames(20);
const sDrain = await ks(); ok(sDrain.energy < 200 && sDrain.sharingan, `Sharingan DRAINS chakra while active (energy=${sDrain.energy})`);
await page.evaluate(() => window.__harness.setEnergy?.(3));                 // force near-empty while active
await waitFrames(30);
const sFat = await ks();
ok(!sFat.sharingan, `drains to 0 → Sharingan shuts OFF (energy=${sFat.energy})`);
ok(sFat.fatigue > 0 && sFat.speedMult < 1, `0 chakra → FATIGUED (fatigue=${sFat.fatigue}, speedMult=${sFat.speedMult})`);
await shot("02_fatigue");

// ── 3) RAIKIRI (neutral Special, charge-hold → dash → strike) — Sharingan OFF ──
await reset(); await sharOff();
await page.keyboard.down("d"); await waitFrames(26); await page.keyboard.up("d"); await waitFrames(2);   // walk into range
let before = await hp2();
await page.keyboard.down("l"); await waitFrames(4); let c = await ks(); await shot("03_raikiri_charge");
ok(c.raikiriCharging, `holding neutral Special → Raikiri CHARGING (frames=${c.raikiriChargeFrames})`);
await waitFrames(16); await page.keyboard.up("l"); await waitFrames(3);
let d = await ks(); await shot("04_raikiri_dash");
ok(d.raikiriDashing || d.move === "raikiri_dash" || d.move === "raikiri_strike", `release → DASH/strike (move=${d.move}, tracking=${d.raikiriTracking})`);
ok(!d.raikiriTracking, `Sharingan OFF → dash is STRAIGHT (tracking=${d.raikiriTracking})`);
await waitFrames(26); let after = await hp2();
ok(after < before, `Raikiri connects in range (hp2 ${before}→${after})`);

// ── 4) RAIKIRI tracking gate — Sharingan ON → dash TRACKS ──
await reset();
let son = (await ks()).sharingan;
if (!son) { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3); son = (await ks()).sharingan; }
ok(son, `Sharingan ON for tracking test`);
await page.keyboard.down("d"); await waitFrames(26); await page.keyboard.up("d"); await waitFrames(2);
const sonb = await hp2();
await page.keyboard.down("l"); await waitFrames(8); await page.keyboard.up("l"); await waitFrames(1);
const td = await ks(); await shot("05_raikiri_track");
ok(td.raikiriTracking, `Sharingan ON → Raikiri dash TRACKS (tracking=${td.raikiriTracking})`);
await waitFrames(26); ok((await hp2()) < sonb, `tracking Raikiri connects`);

// ── 5) FULL-CHARGE RAIKIRI ULTIMATE (neutral U) ──
await reset(); await sharOff();
const ub = await hp2();
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(4);
const u1 = await ks(); await shot("06_ult_cutin");
ok(u1.ultCutin > 0 || u1.move === "raikiri_charge" || u1.move === "raikiri_loop", `Ultimate fires — cut-in/charge (cutin=${u1.ultCutin}, move=${u1.move})`);
await waitFrames(70); const ua = await hp2(); await shot("07_ult_after");
ok(ua < ub - 80, `Full-Charge Raikiri deals big guaranteed damage (hp2 ${ub}→${ua})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/kanbu2_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
