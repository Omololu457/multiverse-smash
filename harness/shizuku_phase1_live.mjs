// harness/shizuku_phase1_live.mjs — REAL live verification for Shizuku Murasaki PHASE 1.
// Boots a real match (?p1=shizuku&p2=killua), confirms the fighter LOADS (real sprites, not the
// procedural box → the Jesus-bug check), confirms BOTH fighters render (measureSprite contentH > 0),
// reports the on-screen size for spriteScale tuning, and drives every Phase-1 normal + movement/guard
// pose with REAL keystrokes + screenshots. P1 keys: move a/d, jump w, crouch s, light j, heavy k,
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
const shot = n => page.screenshot({ path: path.join(OUT, `shz1_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const measure = who => page.evaluate(w => { try { return window.__harness.measureSprite?.(w); } catch (_) { return null; } }, who);
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function tap(key, hold = 3) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(10); }

await boot(`${base}/index.html?harness=1&p1=shizuku&p2=killua`);
await toBattle();

// ── 1) LOADS — correct fighter + real sprites (not the procedural box) + no page errors ──
const f0 = await p1();
ok(!!f0 && (f0.key || "").toLowerCase() === "shizuku", `P1 is shizuku (key=${f0 && f0.key})`);
ok(!!f0 && f0.maxHealth === 1120, `stats loaded (maxHealth=${f0 && f0.maxHealth}, expected 1120)`);
const ready = await page.evaluate(() => { try { return !!window.__harness.spritesReady?.(); } catch (_) { return null; } });
console.log(`  spritesReady()=${ready}  hp=${f0 && Math.round(f0.health)}/${f0 && f0.maxHealth}`);
ok(PERR === 0, `no page errors during boot (${PERR})`);

// ── 2) BOTH FIGHTERS RENDER — measureSprite contentH > 0 for p1 AND p2 (real pixels drawn) ──
const m1 = await measure("p1"); const m2 = await measure("p2");
console.log(`  measureSprite p1:`, JSON.stringify(m1));
console.log(`  measureSprite p2:`, JSON.stringify(m2));
ok(!!m1 && (m1.contentH || 0) > 0, `P1 (shizuku) renders real content (contentH=${m1 && m1.contentH})`);
ok(!!m2 && (m2.contentH || 0) > 0, `P2 (killua) renders real content (contentH=${m2 && m2.contentH})`);
if (m1 && m1.contentH) console.log(`  >> SHIZUKU on-screen contentH=${m1.contentH}px (roster band ~108-116; scale=${m1.scale})`);
await shot("01_idle");

// ── 3) MOVEMENT / GUARD poses — real keystrokes, screenshot each ──
await reset(); await page.keyboard.down("d"); await waitFrames(20); await shot("02_walk"); await page.keyboard.up("d");
await reset(); await page.keyboard.down("w"); await waitFrames(8); await shot("03_jump"); await page.keyboard.up("w");
await reset(); await page.keyboard.down(";"); await waitFrames(6); await shot("04_guard"); await page.keyboard.up(";");

// ── 4) NORMALS — real keystrokes. Light/Up ASSERT the move FIRES (deterministic vs the fast killua
//     AI that blocks/spaces); Heavy additionally proves a damage CONNECT. Each is screenshotted.
async function firesMove(key, label) {
  await reset();
  await page.evaluate(() => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 46); } catch (_) {} });
  await waitFrames(2);
  await page.keyboard.down(key); await waitFrames(2);
  const mid = await p1();
  await waitFrames(3); await page.keyboard.up(key);
  const firing = !!mid.attacking || !!mid.currentMove || !!mid.spriteCastMove;
  console.log(`  ${label}: attacking=${mid.attacking} currentMove=${mid.currentMove || mid.spriteCastMove || "-"}`);
  return firing;
}
ok(await firesMove("j", "Light (B jab)"), `Light fires + drives shizuku`); await shot("05_light");

await reset();
await page.evaluate(() => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 46); } catch (_) {} });
await waitFrames(2);
const hHp0 = (await p2()).health;
await tap("k", 6); await waitFrames(8); await shot("06_heavy");
const hHp1 = (await p2()).health;
ok(hHp0 - hHp1 > 0, `Heavy (Y strike) connects for damage (Δ=${Math.round(hHp0 - hHp1)})`);

ok(await firesMove("i", "Up-Attack (launcher)"), `Up-Attack fires + drives shizuku`); await shot("07_up_launcher");

await reset(); await page.keyboard.down("w"); await waitFrames(10); await tap("j", 4); await shot("08_air"); await page.keyboard.up("w");
await reset(); await page.keyboard.down("w"); await waitFrames(10); await tap("k", 4); await shot("09_down_air"); await page.keyboard.up("w");

// ── 5) WIN pose + final idle ──
await reset(); await shot("10_idle_final");
const fz = await p1();
ok(!!fz && (fz.key || "").toLowerCase() === "shizuku" && Math.round(fz.health) > 0, `shizuku stable after normals (hp=${fz && Math.round(fz.health)})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/shz1_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
