// harness/kakashi_anbu_phase4_live.mjs — REAL live verification for Kakashi (ANBU) PHASE 4.
// Copy Ninja (Down+Ult, mirrors the foe's recent projectile), Mangekyō Awakening (auto at ≤25% HP w/ Sharingan)
// → Kamui Rift (Up+Ult, spatial-distortion DoT) + EXHAUSTION, and the KO/Brutality/Domain/rewind refusal.
// p2 = gwen (her neutral special manaBolt is a subtype:"projectile", so Copy Ninja has something to mirror).
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
const shot = n => page.screenshot({ path: path.join(OUT, `kanbu4_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
const ks = () => page.evaluate(() => window.__harness.kakashiAnbu.state());
const hp2 = () => page.evaluate(() => Math.round((window.__harness.p2() || {}).health));
const projCount = () => page.evaluate(() => (window.__harness.projectiles?.() || []).filter(p => !p.visualOnly).length);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(8); }   // heal to full → clears once-per-round awakening
const sharOn = async () => { if (!(await ks()).sharingan) { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.up("p"); await waitFrames(3); } return (await ks()).sharingan; };
const ult = v => page.evaluate(variant => window.__harness.kakashiAnbu.ult(variant), v);

await boot(`${base}/index.html?harness=1&p1=kakashi_anbu&p2=gwen`);
await toBattle();

// ── 1) COPY NINJA — no-op without Sharingan / copy-ready ──
await reset();
const c0 = await ult("copyNinja");
ok(!c0.ok && c0.spent === 0, `Copy Ninja no-op without Sharingan/copy-ready (ok=${c0.ok}, spent=${c0.spent})`);

// ── 2) COPY-READY tracking — the foe firing a projectile makes Copy "ready" ──
await reset();
await page.evaluate(() => window.__harness.kakashiAnbu.oppFireProjectile(null));   // gwen neutral manaBolt
let crPeak = 0; for (let i = 0; i < 22; i++) { await waitFrames(2); crPeak = Math.max(crPeak, (await ks()).copyReady); if (crPeak > 0) break; }
ok(crPeak > 0, `Copy READY after the foe fires a projectile (copyReady peaked ${crPeak})`);

// ── 3) COPY NINJA fires a mirrored copy ──
await reset(); await sharOn();
await page.evaluate(() => window.__harness.kakashiAnbu.armCopy());
const c1 = await ult("copyNinja");
let cCap = null, projSeen = 0; for (let i = 0; i < 30; i++) { await waitFrames(2); cCap = cCap || (await ks()).copyCapture; projSeen = Math.max(projSeen, await projCount()); if (cCap && projSeen > 0) break; }
await shot("01_copy_ninja");
ok(c1.ok, `Copy Ninja fires with Sharingan + copy-ready (ok=${c1.ok})`);
ok(!!cCap && projSeen > 0, `Copy Ninja spawns a mirrored projectile (capture=${cCap}, proj seen=${projSeen})`);

// ── 4) MANGEKYŌ AWAKENING — auto at ≤25% HP with Sharingan ON ──
await reset(); await sharOn();
await page.evaluate(() => window.__harness.setP1HealthRaw(200));   // ~19% of 1050
await waitFrames(4); const aw = await ks(); await shot("02_awakening");
ok(aw.mangekyou && aw.kamuiUnlocked, `Mangekyō AWAKENING at low HP (mangekyou=${aw.mangekyou}, kamuiUnlocked=${aw.kamuiUnlocked})`);

// ── 5) KAMUI RIFT — refused BEFORE awakening (fresh round) ──
await reset();   // heal to full → awakening cleared, Kamui re-locked
const k0 = await ult("kamuiRift");
ok(!k0.ok && !k0.kamuiRift, `Kamui Rift locked before the awakening (ok=${k0.ok})`);

// ── 6) KAMUI RIFT after awakening → DoT, then EXHAUSTION ──
await reset(); await sharOn();
await page.evaluate(() => window.__harness.setP1HealthRaw(200)); await waitFrames(4);
ok((await ks()).kamuiUnlocked, `Kamui unlocked after re-awakening`);
await page.evaluate(() => window.__harness.healP2());
const kb = await hp2();
const k1 = await ult("kamuiRift"); await waitFrames(20); await shot("03_kamui_rift");
ok(k1.ok && k1.kamuiRift, `Kamui Rift opens (ok=${k1.ok}, rift=${k1.kamuiRift})`);
ok((await hp2()) < kb, `Kamui Rift DoT damages the foe (hp2 ${kb}→${await hp2()})`);
await waitFrames(70); const ex = await ks(); await shot("04_exhaustion");
ok(ex.kamuiExhaust > 0 && ex.energy < 25 && ex.speedMult < 1, `EXHAUSTION after Kamui (exhaust=${ex.kamuiExhaust}, energy=${ex.energy}, speed=${ex.speedMult})`);

// ── 7) CINEMATIC REFUSAL — Kamui refused during a cinematic (rewind active) ──
await reset(); await sharOn();
await page.evaluate(() => window.__harness.setP1HealthRaw(200)); await waitFrames(4);
await page.evaluate(() => window.__harness.kakashiAnbu.setRewind(true)); await waitFrames(2);
const kr = await ult("kamuiRift");
ok(!kr.ok && !kr.kamuiRift, `Kamui Rift REFUSED during a cinematic (rewind) (ok=${kr.ok})`);
await page.evaluate(() => window.__harness.kakashiAnbu.setRewind(false));

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/kanbu4_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
