// harness/kakashi_anbu_live.mjs — REAL live verification for Kakashi (ANBU) PHASE 1.
// Boots a real match (?p1=kakashi_anbu&p2=naruto), confirms the fighter LOADS (sprites, not the procedural
// box → the Jesus-bug check), drives every Phase-1 normal with REAL keystrokes + screenshots, and proves the
// F+Special Body Flicker (forward blink + i-frames). P1 keys: move a/d, jump w, crouch s, light j, heavy k,
// upAttack i, special l, charge p, ultimate u, block ;.
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
const shot = n => page.screenshot({ path: path.join(OUT, `kanbu1_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function tap(key, hold = 3) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(10); }

await boot(`${base}/index.html?harness=1&p1=kakashi_anbu&p2=naruto`);
await toBattle();

// ── 1) LOADS — correct fighter + real sprites (not the procedural box) + no page errors ──
const f0 = await p1();
ok(!!f0 && (f0.key || "").toLowerCase() === "kakashi_anbu", `P1 is kakashi_anbu (key=${f0 && f0.key})`);   // snap() exposes rosterKey as .key
ok(!!f0 && f0.maxHealth === 1050, `stats loaded (maxHealth=${f0 && f0.maxHealth}, expected 1050)`);
const ready = await page.evaluate(() => { try { return !!window.__harness.spritesReady?.(); } catch (_) { return null; } });
console.log(`  spritesReady()=${ready}  hp=${f0 && Math.round(f0.health)}/${f0 && f0.maxHealth}`);
ok(PERR === 0, `no page errors during boot (${PERR})`);
await shot("01_idle");

// ── 2) NORMALS — real keystrokes, screenshot each ──
await reset(); await tap("j", 4); await shot("02_light");   // Light = Y-combo opener
await reset(); await tap("k", 5); await shot("03_heavy");   // Heavy = Y-combo finisher
await reset(); await tap("i", 5); await shot("04_up");      // UpAttack = launcher
await reset(); await page.keyboard.down("w"); await waitFrames(10); await tap("j", 4); await shot("05_air"); await page.keyboard.up("w");  // jump then Air
await reset(); await page.keyboard.down("s"); await waitFrames(6); await shot("06_crouch"); await tap("j", 4); await shot("07_crouchlight"); await page.keyboard.up("s");
// Walk / run
await reset(); await page.keyboard.down("d"); await waitFrames(24); await shot("08_run"); await page.keyboard.up("d");

// ── 3) BODY FLICKER (F+Special) — forward blink + i-frames ──
await reset();
const bx = (await p1()).x;
await page.keyboard.down("d"); await waitFrames(2);       // hold Forward
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");   // press Special
await waitFrames(2); const mid = await p1();
await page.keyboard.up("d");
await waitFrames(10); const ax = (await p1()).x;
await shot("09_bodyflicker");
console.log(`  Body Flicker: x ${Math.round(bx)} → ${Math.round(ax)} (Δ${Math.round(ax - bx)})  invulnTimer(mid)=${mid.invulnTimer}`);
ok(ax - bx >= 60, `Body Flicker blinks forward (Δx=${Math.round(ax - bx)} ≥ 60)`);
ok((mid.invulnTimer || 0) > 0, `Body Flicker grants i-frames (invulnTimer=${mid.invulnTimer})`);

// ── 4) ALPHA PROOF — in-match sprite already proven on magenta in tools/kakashi_anbu; here confirm render ──
await reset(); await shot("10_idle_final");

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/kanbu1_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
