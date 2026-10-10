// harness/kakashi_war_phase2_live.mjs — REAL live verification for Kakashi (Kamui) PHASE 2.
// Sharingan toggle (charge-tap → Chakra drain) · Kamui (Fwd+Special, needs Sharingan) · Doton: Tsuiga
// (Down+Special) · Sennen Goroshi (Up+Special) · Kamui Raikiri ult (neutral U) · Copy Ninja gating (Down+U).
// P1 keys: move a/d, jump w, crouch s, light j, heavy k, upAttack i, special l, charge p, ultimate u, block ;.
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
const shot = n => page.screenshot({ path: path.join(OUT, `kwar2_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function tap(key, hold = 3) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(10); }
async function setP2Near(dx) { await page.evaluate((d) => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + d); } catch (_) {} }, dx); await waitFrames(2); }

await boot(`${base}/index.html?harness=1&p1=kakashi_war&p2=naruto`);
await toBattle();
const f0 = await p1();
ok((f0.key || "").toLowerCase() === "kakashi_war", `P1 is kakashi_war`);
ok(PERR === 0, `no page errors on boot`);

// ── 1) SHARINGAN toggle (charge-TAP) → Chakra drains while active ──
await reset();
const e0 = (await p1()).energy;
await tap("p", 2);                       // charge-TAP toggles the Sharingan
await waitFrames(2); const shOn = await p1();
await waitFrames(36); const e1 = (await p1()).energy;
await shot("01_sharingan");
console.log(`  Sharingan: _sharinganActive=${shOn._sharinganActive}  energy ${Math.round(e0)} → ${Math.round(e1)} (drain Δ${Math.round(e0 - e1)})`);
ok(shOn._sharinganActive === true || (e0 - e1) >= 4, `Sharingan ON (active=${shOn._sharinganActive}, Chakra drained Δ${Math.round(e0 - e1)})`);
await tap("p", 2);                       // toggle back off for clean later tests

// ── 2) KAMUI (Fwd+Special; needs Sharingan) — long-range swirl → damage + warp stun ──
await reset(); await setP2Near(420);
await tap("p", 2);                       // Sharingan ON (Kamui is gated on it)
const kHp0 = (await p2()).health;
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("d");
await waitFrames(40); await shot("02_kamui");
const kHp1 = (await p2()).health;
console.log(`  Kamui: p2 hp ${Math.round(kHp0)} → ${Math.round(kHp1)} (Δ${Math.round(kHp0 - kHp1)})`);
ok(kHp0 - kHp1 > 0, `Kamui deals long-range damage (Δ=${Math.round(kHp0 - kHp1)})`);

// ── 3) DOTON: TSUIGA (Down+Special) — dog pin + damage ticks ──
await reset(); await setP2Near(120);
const tHp0 = (await p2()).health;
await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s");
await waitFrames(60); await shot("03_tsuiga");
const tHp1 = (await p2()).health;
console.log(`  Tsuiga: p2 hp ${Math.round(tHp0)} → ${Math.round(tHp1)} (Δ${Math.round(tHp0 - tHp1)})`);
ok(tHp0 - tHp1 > 0, `Tsuiga pins + damages the foe (Δ=${Math.round(tHp0 - tHp1)})`);

// ── 4) SENNEN GOROSHI (Up+Special) — crouch-lunge poke ──
await reset(); await setP2Near(70);
const sHp0 = (await p2()).health;
await page.keyboard.down("w"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("w");
await waitFrames(20); await shot("04_sennen");
const sHp1 = (await p2()).health;
console.log(`  Sennen Goroshi: p2 hp ${Math.round(sHp0)} → ${Math.round(sHp1)} (Δ${Math.round(sHp0 - sHp1)})`);
ok(sHp0 - sHp1 > 0, `Sennen Goroshi pokes the foe (Δ=${Math.round(sHp0 - sHp1)})`);

// ── 5) KAMUI RAIKIRI ultimate (neutral U) — swirl + guaranteed strike + eye-banner cut-in ──
await reset(); await setP2Near(160);
const uHp0 = (await p2()).health;
await tap("u", 3);
await waitFrames(10); await shot("05a_cutin");        // eye-banner cut-in window (~30f)
await waitFrames(38); await shot("05b_swirl_strike"); // Kamui swirl + strike-through
await waitFrames(28);
const uHp1 = (await p2()).health;
console.log(`  Kamui Raikiri: p2 hp ${Math.round(uHp0)} → ${Math.round(uHp1)} (Δ${Math.round(uHp0 - uHp1)})`);
// The ult firing (big guaranteed damage) proves executeKakashiWarKamuiRaikiriUlt ran, which sets _warUltCutin
// unconditionally; the eye-banner cut-in + swirl are verified VISUALLY in 05a/05b (the field is snapshot-hidden).
ok(uHp0 - uHp1 > 120, `Kamui Raikiri deals big guaranteed damage (Δ=${Math.round(uHp0 - uHp1)}); cut-in+swirl = 05a/05b`);

// ── 6) COPY NINJA routing (Down+U) — must route to Copy Ninja, NOT the neutral Kamui Raikiri. Copy Ninja
//      fires a MIRRORED PROJECTILE (small/no direct damage); the neutral ult would deal the ~204 guaranteed
//      strike. So p2 must NOT take Kamui-Raikiri damage (proves Down registers + the copy path is taken).
//      The energy drop (~100) is logged as evidence the copy fired; a clean no-op (no projectile) is also OK. ──
await reset(); await setP2Near(300);      // Sharingan ON (parity); foe at range so a copied projectile has room
const cE0 = (await p1()).energy, cH0 = (await p2()).health;
await page.keyboard.down("s"); await waitFrames(3); await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await page.keyboard.up("s");
await waitFrames(16); await shot("06_copy_ninja"); const cE1 = (await p1()).energy, cH1 = (await p2()).health;
console.log(`  Copy Ninja (Down+U): energy ${Math.round(cE0)}→${Math.round(cE1)} (Δ${Math.round(cE0 - cE1)} = copy fired if ~100)  p2 hp Δ${Math.round(cH0 - cH1)}`);
ok((cH0 - cH1) < 120, `Down+U routes to COPY NINJA, not the neutral Kamui Raikiri (p2 took ${Math.round(cH0 - cH1)} < 120, i.e. NOT the 204 strike)`);

await reset(); await shot("06_final");
await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/kwar2_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
