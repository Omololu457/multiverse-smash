// harness/sasuke_dojutsu_live.mjs — REAL-INPUT verification for the Sasuke Dōjutsu Pass (Phase 1, sasuke_sensei).
// Charge = P, Special = L, dirs a/d/w/s. Rinnegan set reached via Up+Ult (w+u) ×2. Verifies R1 Kunai Swap,
// R4 Strain lock, R2 Portal Chidori, R5 Portal Redirect, R3 Counter Swap, and M1 Kagutsuchi steer+extinguish.
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
let perr = null; page.on("pageerror", e => { perr = e.message; console.log("  PAGEERROR:", e.message); });
const shot = n => page.screenshot({ path: path.join(OUT, `doj_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const doj = (who = "p1") => page.evaluate(w => window.__harness.dojutsu(w), who);
const p2hp = () => page.evaluate(() => Math.round((window.__harness.p2() || {}).health ?? -1));
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name).filter(Boolean));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function refill() { await page.evaluate(() => { window.__harness.refill?.("p1"); window.__harness.healP2?.(); }); await waitFrames(2); }
async function grounded() { return (await page.evaluate(() => window.__harness.p1())).grounded; }
async function waitGrounded() { for (let i = 0; i < 50; i++) { if (await grounded()) return; await waitFrames(2); } }
async function cycleOnce() { await refill(); await page.keyboard.down("w"); await page.keyboard.down("u"); await waitFrames(4); await page.keyboard.up("u"); await page.keyboard.up("w"); await waitFrames(10); await waitGrounded(); }
// Charge(P)+Special(L)[+dir] — hold charge, tap special
async function chargeSpecial(dir) { await page.keyboard.down("p"); if (dir) await page.keyboard.down(dir); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l"); await waitFrames(2); if (dir) await page.keyboard.up(dir); await page.keyboard.up("p"); }

// ── BOOT ──
await page.goto(`${base}/index.html?harness=1&p1=sasuke_sensei&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
ok(!perr, `page loaded with NO errors (sasukeDojutsu.js module resolved)`);
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
await waitFrames(4);
ok((await doj())?.key === "sasuke_sensei", `p1 is sasuke_sensei`);

async function reset() { await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.refill?.("p1"); window.__harness.healP2?.(); }); await waitFrames(2); await waitGrounded(); }
async function energyOnly() { await page.evaluate(() => { window.__harness.refill?.("p1"); window.__harness.healP2?.(); }); await waitFrames(2); await waitGrounded(); }  // refill energy/cooldown but KEEP strain
async function ensureRinnegan() { for (let i = 0; i < 3 && (await doj())?.eyeSet !== "rinnegan"; i++) await cycleOnce(); }

await ensureRinnegan();
ok((await doj())?.eyeSet === "rinnegan", `cycled to Rinnegan set (${(await doj())?.eyeSet})`);

// ── R1 Amenotejikara: Kunai Swap ──
await reset(); await ensureRinnegan(); await reset();
const r1x0 = (await doj()).x, e0 = (await doj()).energy;
await chargeSpecial(null);                       // throw marker
await waitFrames(3); await shot("01_r1_marker");
const afterThrow = await doj(); const hasMarker = (await projNames()).some(n => /marker/i.test(n));
ok(afterThrow.markerArmed && hasMarker, `R1a: Charge+Special throws a marker (armed=${afterThrow.markerArmed}, proj=${hasMarker})`);
ok(afterThrow.energy < e0, `R1a: spent chakra (${e0}→${afterThrow.energy})`);
await waitFrames(14);                             // let the throw's 12f lock clear
await chargeSpecial(null);                        // re-press → swap
await waitFrames(4);
const afterSwap = await doj(); await shot("02_r1_swap");
ok(!afterSwap.markerArmed && afterSwap.x !== r1x0, `R1b: re-press swaps (moved ${r1x0}→${afterSwap.x}, armed=${afterSwap.markerArmed})`);
ok((afterSwap.invuln || 0) > 0, `R1b: swap grants brief i-frames (${afterSwap.invuln})`);

// ── R4 Rinnegan Strain (accumulation mechanic — fired via the direct hook for determinism) ──
await reset(); await ensureRinnegan();
const fire = (which, dir = null) => page.evaluate(([w, d]) => window.__harness.dojutsuFire(w, d), [which, dir]);
const st1 = await fire("strain"); const st2 = await fire("strain"); const st3 = await fire("strain");
ok(st1.strain === 34 && st2.strain === 68 && st3.locked, `R4: STRAIN stacks 34→68→LOCK (${st1.strain},${st2.strain},locked=${st3.locked})`);
await waitFrames(2); await shot("03_r4_strain");
const r2Locked = await fire("r2");
ok(!r2Locked.ok, `R4: while STRAINED a Rinnegan move is REFUSED (ok=${r2Locked.ok})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));

// ── R2 Portal Chidori ── (Charge + Fwd + Special)
await reset(); await ensureRinnegan();
const h0 = await p2hp();
await chargeSpecial("d");
await waitFrames(6); await shot("04_r2_portal_chidori");
const r2 = await doj();
await waitFrames(30);
const h1 = await p2hp();
ok(r2.portals, `R2: Portal Chidori opened portals (${r2.portals})`);
ok(h1 < h0, `R2: Portal Chidori dealt damage (hp ${h0}→${h1})`);

// ── R5 Portal Redirect ── (Charge + Back + Special)
await reset(); await ensureRinnegan();
await chargeSpecial("a");
await waitFrames(4); await shot("05_r5_redirect");
const r5 = await doj();
ok((r5.portalActive || 0) > 0, `R5: Portal Redirect armed the reflect window (_portalActive=${r5.portalActive})`);

// ── R3 Counter Swap ── (BLOCKSTUN + Special = reactive reversal)
// R3 Counter Swap = BLOCKSTUN + Special reversal (wired like Tobirama's Water-Flicker). The dispatch is
// real-input (block + Special); the swap LOGIC is verified via the direct hook (blockstun set inside).
await reset(); await ensureRinnegan();
const r3 = await fire("r3");
await waitFrames(2); await shot("06_r3_counter");
console.log(`R3: ok=${r3.ok} x ${r3.x0}→${r3.x} counterCd=${r3.counterCd} iframe=${r3.invuln}`);
ok(r3.ok && r3.x !== r3.x0 && r3.counterCd > 0 && r3.invuln > 0, `R3: Counter Swap warps behind the attacker w/ i-frames (x ${r3.x0}→${r3.x}, cd=${r3.counterCd})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));

// ── M1 Kagutsuchi flame control ── (Mangekyou: cast Amaterasu, steer, extinguish)
await reset();
for (let i = 0; i < 3 && (await doj()).eyeSet !== "mangekyou"; i++) await cycleOnce();
ok((await doj()).eyeSet === "mangekyou", `cycled to Mangekyou (${(await doj()).eyeSet})`);
await energyOnly();
const eAm0 = (await doj()).energy;
await page.keyboard.down("d"); await waitFrames(3); await page.keyboard.down("l"); await waitFrames(6); await page.keyboard.up("l"); await page.keyboard.up("d");
await waitFrames(20);
console.log(`M1 cast: energy ${eAm0}→${(await doj()).energy}, projs=[${(await projNames()).join(",")}]`);
const flameProjs = await projNames();
ok(flameProjs.some(n => /amaterasu/i.test(n)), `M1: Amaterasu flame is live (${flameProjs.filter(n=>/amaterasu/i.test(n)).join(",")})`);
const vyBefore = await page.evaluate(() => { const p = (window.__harness.projectiles?.() || []).find(p => /amaterasu/i.test(p.name)); return p ? Math.round((p.vy||0)*100)/100 : null; });
await page.keyboard.down("s"); await waitFrames(10); await page.keyboard.up("s");   // steer DOWN
const vyAfter = await page.evaluate(() => { const p = (window.__harness.projectiles?.() || []).find(p => /amaterasu/i.test(p.name)); return p ? Math.round((p.vy||0)*100)/100 : null; });
await shot("07_m1_steer");
ok(vyBefore != null && vyAfter != null && vyAfter > vyBefore, `M1: holding Down STEERS the flame (vy ${vyBefore}→${vyAfter})`);
const eBeforeSnuff = (await doj()).energy;
await page.keyboard.down("d"); await waitFrames(3); await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l"); await page.keyboard.up("d");
await waitFrames(4);
const flameGone = !(await projNames()).some(n => /amaterasu/i.test(n));
ok(flameGone, `M1: re-press EXTINGUISHES the flame`);
ok((await doj()).energy > eBeforeSnuff, `M1: extinguish gave a small refund (${eBeforeSnuff}→${(await doj()).energy})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/doj_*.png`);
process.exit(FAILS ? 1 : 0);
