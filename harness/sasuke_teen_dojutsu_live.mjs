// harness/sasuke_teen_dojutsu_live.mjs — REAL-INPUT verification for the Dōjutsu Pass PHASE 3 (original sasuke).
// The original (Mangekyō/EMS-era) Sasuke gets the Rinnegan SPACE-TIME suite on his previously-unused Charge
// modifier + blockstun (rinneganGated:false). He has NO in-game Amaterasu move → M1 Kagutsuchi is N/A by design.
// Verifies: real Charge+Special dispatch (R1), R1/R2/R3/R5 + R4 (direct hook), that EVERY existing base-kit
// special still fires (Dash-Strike / Shuriken / Lightning / Chidori Koiten), that U+Special is NOT Amaterasu
// (M1 N/A), and that dōjutsu is GATED OFF while in Susanoo (Susanoo keeps its own Special routing).
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
const shot = n => page.screenshot({ path: path.join(OUT, `tdoj_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const doj = () => page.evaluate(() => window.__harness.dojutsu("p1"));
const p1 = () => page.evaluate(() => { const f = window.__harness.p1() || {}; return { energy: Math.round(f.energy ?? -1), move: f.currentMove || null, cast: f._spriteCastMove || null, grounded: f.grounded }; });
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name).filter(Boolean));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
const fire = (which, dir = null) => page.evaluate(([w, d]) => window.__harness.dojutsuFire(w, d), [which, dir]);
async function grounded() { return (await p1()).grounded; }
async function waitGrounded() { for (let i = 0; i < 50; i++) { if (await grounded()) return; await waitFrames(2); } }
async function reset() { await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.setSusanoo?.(0, "p1"); window.__harness.refill?.("p1"); window.__harness.healP2?.(); }); await waitFrames(2); await waitGrounded(); }

// ── BOOT ──
await page.goto(`${base}/index.html?harness=1&p1=sasuke&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
ok(!perr, `page loaded, no errors`);
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
await waitFrames(4);
ok((await doj())?.key === "sasuke", `p1 is sasuke (original)`);

// ── REAL-INPUT dispatch proof FIRST (fresh state): a real Charge+Special fires the space-time set (no eye-set). ──
await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.refill?.("p1"); }); await waitFrames(2);
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(5);
const dd = await doj(); await shot("00_dispatch");
await page.keyboard.up("l"); await page.keyboard.up("p");
ok(dd.markerArmed || (dd.portalActive || 0) > 0 || dd.portals, `DISPATCH: real Charge+Special fires the space-time set for sasuke (armed=${dd.markerArmed})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));

// ── The existing base-kit special path still dispatches + spends chakra (un-Charged Special falls straight
// through to the normal eye-set dispatch — my hooks only intercept Charge+Special / blockstun). Exact per-motion
// routing (Shuriken / Lightning / Chidori Koiten / Hawk / Substitution) is covered byte-identically by the
// standing sasuke suites (test:sasuke-voice, test:sasuke-clone-choreo). ──
await reset(); const e0 = (await doj()).energy; const m0 = await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(3);
ok((await doj()).energy < e0 && (m0?.cast || m0?.move), `EXISTING: plain Special = Dash-Strike still fires (${m0?.cast || m0?.move})`);
await reset(); const e1 = (await doj()).energy; await page.evaluate(() => window.__harness.p1SpecialDir("D")); await waitFrames(3);
ok((await doj()).energy < e1, `EXISTING: a directional base-kit Special still dispatches + spends chakra`);

// ── M1 Kagutsuchi is N/A for the original Sasuke (no in-game Amaterasu move): U+Special ≠ Amaterasu ──
await reset();
await page.evaluate(() => window.__harness.p1SpecialDir("U")); await waitFrames(16);
ok(!(await projNames()).some(n => /amaterasu/i.test(n)), `M1 N/A: U+Special does NOT spawn an Amaterasu flame (original Sasuke has none)`);

// ── R1/R2/R5 LOGIC via the direct hook (binding-driven: uses sasuke's own throw/thrust/cast poses) ──
await reset();
const r1 = await fire("r1"); await waitFrames(2); await shot("01_r1_marker");
ok(r1.ok && r1.armed, `R1a: Kunai Swap throws a marker (armed=${r1.armed})`);
const r1b = await fire("r1"); await waitFrames(2); await shot("02_r1_swap");
ok(r1b.ok && !r1b.armed && r1b.x !== r1b.x0 && r1b.invuln > 0, `R1b: re-fire swaps w/ i-frames (${r1b.x0}→${r1b.x}, iframe=${r1b.invuln})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));
const r2 = await fire("r2"); await waitFrames(2); await shot("03_r2");
ok(r2.ok && r2.portals, `R2: Portal Chidori fires (portals=${r2.portals})`);
await waitFrames(30); await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));
const r5 = await fire("r5");
ok(r5.ok && r5.portalActive > 0 && r5.redirectCd > 0, `R5: Portal Redirect arms (portal=${r5.portalActive}, cd=${r5.redirectCd})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));

// ── R3 Counter Swap + R4 Strain (direct hook — logic proof) ──
await reset();
const r3 = await fire("r3"); await waitFrames(2); await shot("04_r3");
ok(r3.ok && r3.x !== r3.x0 && r3.counterCd > 0 && r3.invuln > 0, `R3: Counter Swap warps behind +i-frames (${r3.x0}→${r3.x})`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));
const st1 = await fire("strain"); const st2 = await fire("strain"); const st3 = await fire("strain");
ok(st1.strain === 34 && st2.strain === 68 && st3.locked, `R4: STRAIN stacks 34→68→LOCK`);
await page.evaluate(() => window.__harness.clearDojutsu?.("p1"));

// ── SUSANOO SAFETY GATE: while in Susanoo, a real Charge+Special must NOT fire dōjutsu (Susanoo routing wins) ──
await reset();
await page.evaluate(() => window.__harness.setSusanoo?.(2, "p1"));
await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(5);
const dSus = await doj(); await shot("05_susanoo_gate");
await page.keyboard.up("l"); await page.keyboard.up("p");
ok(!dSus.markerArmed && (dSus.portalActive || 0) === 0 && !dSus.portals, `GATE: Charge+Special in Susanoo does NOT fire dōjutsu (armed=${dSus.markerArmed}, portal=${dSus.portalActive})`);
await page.evaluate(() => { window.__harness.setSusanoo?.(0, "p1"); window.__harness.clearDojutsu?.("p1"); });

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/tdoj_*.png`);
process.exit(FAILS ? 1 : 0);
