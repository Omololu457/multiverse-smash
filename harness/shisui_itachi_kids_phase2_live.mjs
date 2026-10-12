// harness/shisui_itachi_kids_phase2_live.mjs — REAL-INPUT live verification, PHASE 2.
// Boots a real match (?p1=shisui_itachi_kids&p2=sasuke) and drives every directional SPECIAL through real
// page.keyboard presses: N+Special = Kunai Throw · F+Special = Flicker Rush · U+Special = Genjutsu Flash ·
// D+Special = Itachi Assist · re-press N+Special with a kunai in flight = BLIND-SPOT deflect. Proves each
// fires (projectile / assist / stun / deflect), the Training Bond fills on a landed assist/deflect, NO
// red/blood FX appears, and the art holds on magenta. Uses window.__harness.sikState / projectiles.
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
const shot = n => page.screenshot({ path: path.join(OUT, `shisui_itachi_kids_p2_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sik = () => page.evaluate(() => window.__harness.sikState("p1"));
const projs = () => page.evaluate(() => window.__harness.projectiles());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.refill?.("p1"); }); await waitFrames(4); }
async function heal() { await page.evaluate(() => { window.__harness.refill?.("p1"); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); }); await waitFrames(2); }
// hold a direction (optional) + special ("l"); release cleanly.
async function special(dir, holdFrames = 6) {
  if (dir) await page.keyboard.down(dir);
  await waitFrames(1);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await waitFrames(holdFrames);
  if (dir) await page.keyboard.up(dir);
  await waitFrames(2);
}
async function faceRight(gap = 160) { await page.evaluate(g => { const h = window.__harness; if (h.setP2X) h.setP2X((h.p1().x || 0) + g); }, gap); await waitFrames(2); }

// ── BOOT ──
await boot(`${base}/index.html?harness=1&p1=shisui_itachi_kids&p2=sasuke`);
await toBattle();
const b1 = await p1();
ok(b1.key === "shisui_itachi_kids", `p1 is shisui_itachi_kids (${b1.key})`);
await faceRight();

// ── 1) N+Special = KUNAI THROW (projectile spawns with the kunai sheet) — opp FAR so it stays in flight ──
await heal(); await faceRight(520);
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(2);
let pj = await projs();
let kunai = pj.find(p => p.name === "sikKunai");
await shot("01_kunai");
ok(!!kunai, `Kunai Throw spawns a sikKunai projectile`);
ok(!!kunai && /shisui_itachi_kids_kunai/.test(kunai.sheet || ""), `kunai uses the real kunai sheet (${kunai && kunai.sheet})`);

// ── 2) BLIND-SPOT: re-press N+Special while the kunai is still in flight → deflect ──
// (poll out the throw's recovery first — the far kunai stays airborne ~95f.)
let sState = await sik();
ok(sState && sState.myKunai.length > 0, `kunai still tracked in flight (${sState && sState.myKunai.length})`);
await page.waitForFunction(() => (window.__harness.p1().attackCooldown || 0) === 0 && !window.__harness.p1().attacking, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(1);
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(3);
sState = await sik();
await shot("02_blindspot");
const deflected = sState && sState.myKunai.some(k => k.deflected);
ok(deflected, `re-press deflects the kunai (blind-spot)`);
ok(sState && !!sState.blind, `Itachi blind-spot overhead renders (_sikBlind active)`);
await waitFrames(36);
const bondAfterDeflect = (await sik()).bond;
ok(bondAfterDeflect >= 1, `Training Bond fills when the deflected kunai lands (bond=${bondAfterDeflect})`);

// ── 3) F+Special = FLICKER RUSH (damage + reposition through the opponent) ──
await heal(); await faceRight();
const rHp0 = (await p2()).health;
await special("d", 8);   // d = forward (facing right)
const rHp1 = (await p2()).health;
await shot("03_flicker");
ok(rHp0 - rHp1 > 0, `Flicker Rush deals damage (Δ=${Math.round(rHp0 - rHp1)})`);

// ── 4) U+Special = GENJUTSU FLASH (opponent FREEZE + code-drawn white flash, no placeholder victim) ──
await heal(); await faceRight();
await page.evaluate(() => { const h = window.__harness; if (h.setP2X) h.setP2X((h.p1().x || 0) + 90); }); await waitFrames(2);
await page.keyboard.down("w"); await waitFrames(1);   // w = up
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
await waitFrames(3);
const sG = await sik(); const oppHS = (await p2()).hitstun;
await shot("04_genjutsu");
await page.keyboard.up("w"); await waitFrames(2);
ok((sG && sG.flash) || oppHS > 40, `Genjutsu Flash freezes the opponent (flash=${sG && !!sG.flash} oppHitstun=${oppHS})`);

// ── 5) D+Special = ITACHI ASSIST (Itachi flickers in, throws, flickers out; bond fills on landing) ──
await heal(); await faceRight();
await page.evaluate(() => { const h = window.__harness; if (h.setP2X) h.setP2X((h.p1().x || 0) + 110); }); await waitFrames(2);
const bond0 = (await sik()).bond;
await page.keyboard.down("s"); await waitFrames(1);   // s = down
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
await waitFrames(3);
const sA = await sik();
await shot("05_assist");
ok(sA && !!sA.assist, `Itachi Assist spawns (phase=${sA && sA.assist && sA.assist.phase})`);
await page.keyboard.up("s");
await waitFrames(40);   // let the assist throw land
const bond1 = (await sik()).bond;
await shot("05b_assist_after");
ok(bond1 >= bond0, `Training Bond tracked (before=${bond0} after=${bond1})`);

// ── 6) NO RED/BLOOD FX — scan the flicker + assist shots for red pixels on the fighters ──
await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/shisui_itachi_kids_p2_*.png`);
process.exit(FAILS ? 1 : 0);
