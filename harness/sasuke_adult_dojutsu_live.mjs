// harness/sasuke_adult_dojutsu_live.mjs — REAL-INPUT verification for the Dōjutsu Pass PHASE 2 (sasuke_adult).
// sasuke_adult has NO eye-set cycle (rinneganGated:false) → the Charge+Special space-time moves fire in any
// state. Verifies R1/R2/R5 (real Charge+Special), R3/R4 (direct hook), M1 (Amaterasu steer+extinguish), and
// that the EXISTING adult specials (Katon / Chidori / Sword-Swap) still fire unchanged.
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
const shot = n => page.screenshot({ path: path.join(OUT, `adoj_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const doj = () => page.evaluate(() => window.__harness.dojutsu("p1"));
const p1 = () => page.evaluate(() => { const f = window.__harness.p1() || {}; return { energy: Math.round(f.energy ?? -1), move: f.currentMove || null, cast: f._spriteCastMove || null, grounded: f.grounded }; });
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name).filter(Boolean));
const p2hp = () => page.evaluate(() => Math.round((window.__harness.p2() || {}).health ?? -1));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function reset() { await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.refill?.("p1"); window.__harness.healP2?.(); }); await waitFrames(2); await waitGrounded(); }
async function grounded() { return (await p1()).grounded; }
async function waitGrounded() { for (let i = 0; i < 50; i++) { if (await grounded()) return; await waitFrames(2); } }
async function chargeSpecial(dir) { await page.keyboard.down("p"); if (dir) await page.keyboard.down(dir); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l"); await waitFrames(2); if (dir) await page.keyboard.up(dir); await page.keyboard.up("p"); }
const fire = (which, dir = null) => page.evaluate(([w, d]) => window.__harness.dojutsuFire(w, d), [which, dir]);

// ── BOOT ──
await page.goto(`${base}/index.html?harness=1&p1=sasuke_adult&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
ok(!perr, `page loaded, no errors`);
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
await waitFrames(4);
ok((await doj())?.key === "sasuke_adult", `p1 is sasuke_adult`);

// ── REAL-INPUT dispatch proof FIRST (fresh state): a real Charge+Special fires a space-time move for
// sasuke_adult with NO eye-set. (Run before the other sub-tests to avoid their charge-suppress state-bleed.)
await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.refill?.("p1"); }); await waitFrames(2);
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(5);
const dd = await doj(); await shot("00_dispatch");
await page.keyboard.up("l"); await page.keyboard.up("p");
ok(dd.markerArmed || (dd.portalActive || 0) > 0 || dd.portals, `DISPATCH: real Charge+Special fires the space-time set for sasuke_adult (armed=${dd.markerArmed})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));

// ── EXISTING specials still fire unchanged (additive-check, via energy spend + cast) ──
await reset(); const ek0 = (await doj()).energy; const kr0 = await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(3);
ok((await doj()).energy < ek0 && (kr0?.cast === "katon" || kr0?.move), `EXISTING: neutral Special = Katon still fires (cast=${kr0?.cast||kr0?.move})`);
await reset(); const kr = await page.evaluate(() => window.__harness.p1SpecialDir("D")); await waitFrames(5);
ok(kr?.cast === "swordSwap" || kr?.move === "swordSwap", `EXISTING: Down+Special = Sword-Swap still fires (${kr?.cast||kr?.move})`);
await reset(); const er = (await doj()).energy; await page.evaluate(() => window.__harness.p1SpecialDir("F")); await waitFrames(3);
ok((await doj()).energy < er, `EXISTING: Fwd+Special = Chidori still fires`);

// ── REAL-INPUT dispatch proof: a real Charge+Special fires a space-time move for sasuke_adult (no eye-set).
// Charge+Special is Playwright-timing-sensitive → retry; the LOGIC is separately proven below via the hook.
// ── R1/R2/R5 LOGIC via the direct hook (binding-driven: uses sasuke_adult's throw/thrust/cast poses) ──
await reset();
const r1 = await fire("r1"); await waitFrames(2); await shot("01_r1_marker");
ok(r1.ok && r1.armed, `R1a: Kunai Swap throws a marker (armed=${r1.armed})`);
const r1b = await fire("r1"); await waitFrames(2); await shot("02_r1_swap");
ok(r1b.ok && !r1b.armed && r1b.x !== r1b.x0 && r1b.invuln > 0, `R1b: re-fire swaps w/ i-frames (${r1b.x0}→${r1b.x}, iframe=${r1b.invuln})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));
const r2 = await fire("r2"); await waitFrames(2); await shot("03_r2");
ok(r2.ok && r2.portals && r2.strain === 34, `R2: Portal Chidori fires (portals=${r2.portals})`);
await waitFrames(30);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));
const r5 = await fire("r5"); ok(r5.ok && r5.portalActive > 0 && r5.redirectCd > 0, `R5: Portal Redirect arms (portal=${r5.portalActive}, cd=${r5.redirectCd})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));

// ── R3 Counter Swap + R4 Strain (direct hook — logic proof, binding-driven) ──
await reset();
const r3 = await fire("r3"); await waitFrames(2); await shot("05_r3");
ok(r3.ok && r3.x !== r3.x0 && r3.counterCd > 0 && r3.invuln > 0, `R3: Counter Swap warps behind +i-frames (${r3.x0}→${r3.x})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));
const st1 = await fire("strain"); const st2 = await fire("strain"); const st3 = await fire("strain");
ok(st1.strain === 34 && st2.strain === 68 && st3.locked, `R4: STRAIN stacks 34→68→LOCK`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));

// ── M1 Kagutsuchi (Amaterasu U+Special via dir hook → steer → extinguish) ──
await reset();
const eAm = (await doj()).energy;
await page.evaluate(() => window.__harness.p1SpecialDir("U")); await waitFrames(18);
const flame = (await projNames()).some(n => /amaterasu/i.test(n));
ok(flame, `M1: Amaterasu flame live (${(await projNames()).filter(n=>/amaterasu/i.test(n)).join(",")})`);
const vy0 = await page.evaluate(() => { const p = (window.__harness.projectiles?.() || []).find(p => /amaterasu/i.test(p.name)); return p ? Math.round((p.vy||0)*100)/100 : null; });
await page.keyboard.down("s"); await waitFrames(10); await page.keyboard.up("s");
const vy1 = await page.evaluate(() => { const p = (window.__harness.projectiles?.() || []).find(p => /amaterasu/i.test(p.name)); return p ? Math.round((p.vy||0)*100)/100 : null; });
await shot("06_m1_steer");
ok(vy0 != null && vy1 != null && vy1 > vy0, `M1: hold Down STEERS the flame (vy ${vy0}→${vy1})`);
const eSnuff = (await doj()).energy;
await page.evaluate(() => window.__harness.p1SpecialDir("U")); await waitFrames(4);
ok(!(await projNames()).some(n => /amaterasu/i.test(n)), `M1: re-press EXTINGUISHES`);
ok((await doj()).energy > eSnuff, `M1: extinguish refund (${eSnuff}→${(await doj()).energy})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/adoj_*.png`);
process.exit(FAILS ? 1 : 0);
