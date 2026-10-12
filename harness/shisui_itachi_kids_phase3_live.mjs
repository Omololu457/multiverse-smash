// harness/shisui_itachi_kids_phase3_live.mjs — REAL-INPUT live verification, PHASE 3 (Twin Flicker ultimate).
// Proves: the Ultimate is GATED on a FULL Training Bond (bond < 5 → refuses, no damage); at bond 5 it FIRES
// (cut-in appears, bond is consumed to 0, the opponent takes the 4-strike + kunai-rain damage); it REFUSES
// when the fighter is KO'd (eliminated). Uses window.__harness.sikState / sikSetBond.
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
const shot = n => page.screenshot({ path: path.join(OUT, `shisui_itachi_kids_p3_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sik = () => page.evaluate(() => window.__harness.sikState("p1"));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.refill?.("p1"); }); await waitFrames(4); }
async function heal() { await page.evaluate(() => { window.__harness.refill?.("p1"); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); }); await waitFrames(2); }
async function pressUlt() { await page.evaluate(() => window.__harness.resetFighterInput?.("p1")); await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(3); }
const setBond = n => page.evaluate(v => window.__harness.sikSetBond(v, "p1"), n);

await boot(`${base}/index.html?harness=1&p1=shisui_itachi_kids&p2=sasuke`);
await toBattle();
const b1 = await p1();
ok(b1.key === "shisui_itachi_kids", `p1 is shisui_itachi_kids (${b1.key})`);
await page.evaluate(() => { const h = window.__harness; if (h.setP2X) h.setP2X((h.p1().x || 0) + 120); });

// ── 1) BOND GATE — bond < 5 → Ultimate REFUSES (no choreography, no damage) ──
await heal(); await setBond(2);
const rHpA0 = (await p2()).health;
await pressUlt(); await waitFrames(6);
let s = await sik();
const rHpA1 = (await p2()).health;
await shot("01_gate_blocked");
ok(s && s.ult == null && s.bond === 2, `Ultimate REFUSES at bond 2 (ult=${s && s.ult} bond=${s && s.bond})`);
ok(Math.abs(rHpA0 - rHpA1) < 2, `no damage dealt when ult is gated off (Δ=${Math.round(rHpA0 - rHpA1)})`);

// ── 2) FULL BOND — Ultimate FIRES: cut-in, bond consumed, opponent takes damage ──
await heal(); await setBond(5);
const bond5 = (await sik()).bond;
ok(bond5 === 5, `bond filled to 5 (${bond5})`);
const rHpB0 = (await p2()).health;
await pressUlt();
let sFire = await sik();
await shot("02_ult_fire");
ok(sFire && (sFire.ult != null || sFire.cutin > 0), `Twin Flicker FIRES (ult=${JSON.stringify(sFire && sFire.ult)} cutin=${sFire && sFire.cutin})`);
ok(sFire && sFire.bond === 0, `full Training Bond consumed → 0 (bond=${sFire && sFire.bond})`);
await waitFrames(40); await shot("02b_ult_strikes");
await waitFrames(90);   // let all 4 strikes + kunai rain resolve
const rHpB1 = (await p2()).health;
await shot("02c_ult_done");
ok(rHpB0 - rHpB1 > 60, `Twin Flicker deals ultimate-tier damage (Δ=${Math.round(rHpB0 - rHpB1)})`);
const sAfter = await sik();
ok(sAfter && sAfter.ult == null, `ult choreography cleans up (no softlock; ult=${sAfter && sAfter.ult})`);

// ── 3) KO REFUSAL — a full bond does NOT fire the ult once the fighter is KO'd (health 0) ──
await heal(); await setBond(5);
await page.evaluate(() => { try { window.__harness.koP1(); } catch (_) {} });   // p1.health = 0
await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(2);
const sKO = await sik();
await shot("03_ko_refuse");
// refused = bond was NOT consumed (still 5) and no ult choreography started
ok(sKO == null || (sKO.ult == null && sKO.bond === 5), `Ultimate refuses while KO'd — bond NOT consumed (bond=${sKO && sKO.bond} ult=${sKO && sKO.ult})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/shisui_itachi_kids_p3_*.png`);
process.exit(FAILS ? 1 : 0);
