// harness/shizuku_phase2_live.mjs — REAL live verification for Shizuku PHASE 2 (Blinky specials + Belly).
// Boots ?p1=shizuku&p2=gaara (gaara = a real projectile zoner for the eat/pull/disarm tests). Proves:
//  • all 5 directional specials FIRE + drive the right cast pose
//  • BLINKY'S BELLY guard-eat: blocking swallows an incoming projectile (no chip) → belly pip fills
//  • BELLY SPIT: refires the stored projectile as Shizuku's OWN (owner flips)
//  • FORGETFUL: a stored item expires (~8s) → belly clears + "...I forgot." pop
//  • BLINKY PULL: reels the opponent closer + eats a projectile in the suction cone
//  • DISARM: locks the zoner — a projectile it deploys during the window is vacuumed
// P1 keys: move a/d, jump w, crouch s, light j, heavy k, upAttack i, special l, ultimate u, block ;.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `shz2_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sz = (who = "p1") => page.evaluate(w => window.__harness.shizukuState(w), who);
const projs = () => page.evaluate(() => window.__harness.projectiles());
const specialDir = dir => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await reset(); }
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.resetFighterInput?.("p2"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.clearProjectiles?.(); }); await waitFrames(6); }

await boot(`${base}/index.html?harness=1&p1=shizuku&p2=gaara`);
await toBattle();

const f0 = await p1();
ok(!!f0 && (f0.key || "").toLowerCase() === "shizuku", `P1 is shizuku (key=${f0 && f0.key})`);
ok(PERR === 0, `no page errors at boot (${PERR})`);

// ── 1) ALL 5 DIRECTIONAL SPECIALS FIRE + drive the right cast pose ──
await reset(); let r = await specialDir(null); ok(r?.cast === "shizukuPhantom", `N+Special → Phantom Jab Rush (cast=${r?.cast})`); await shot("01_phantom");
await reset(); r = await specialDir("F");  ok(r?.cast === "shizukuPull",    `F+Special → Blinky Pull (cast=${r?.cast})`);    await shot("02_pull");
await reset(); r = await specialDir("B");  ok(r?.cast === "shizukuSmash",   `B+Special → Blinky Smash (cast=${r?.cast})`);   await shot("03_smash");
await reset(); r = await specialDir("D");  ok(r?.cast === "shizukuSpit",    `D+Special → Belly Spit feint (empty) (cast=${r?.cast})`); await shot("04_spit_feint");
await reset(); r = await specialDir("U");  ok(r?.cast === "shizukuPull",    `U+Special → Disarm suction (cast=${r?.cast})`); await shot("05_disarm");

// ── 2) BLINKY'S BELLY — guard-eat a projectile (NO chip) → pip fills ──
await reset();
const hp0 = (await p1()).health;
await page.keyboard.down(";");                    // block
await waitFrames(3);
await page.evaluate(() => window.__harness.enemyProjAtP1(60));   // enemy projectile spawned AT p1
await waitFrames(4);
const sEat = await sz("p1"); const hp1 = (await p1()).health;
await page.keyboard.up(";");
ok(sEat.belly >= 1, `guard-eat stored a projectile (belly=${sEat.belly})`);
ok(sEat.projOpp === 0, `the opponent projectile was swallowed off the field (projOpp=${sEat.projOpp})`);
ok(Math.round(hp1) === Math.round(hp0), `NO chip damage taken on the eat (hp ${Math.round(hp0)}→${Math.round(hp1)})`);
await shot("06_belly_eat_pip");

// ── 3) BELLY SPIT — refire the stored projectile as Shizuku's OWN ──
// Push the foe FAR first so the spat projectile doesn't instantly connect+despawn before we read it.
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 520); } catch (_) {} });
await waitFrames(2);
const before = await sz("p1");
await specialDir("D");
await waitFrames(1);                               // read the same frame it spawns (before it can travel/hit)
const after = await sz("p1");
ok(before.belly >= 1 && after.belly === before.belly - 1, `Belly Spit consumed the oldest stored item (belly ${before.belly}→${after.belly})`);
ok(after.projSelf >= 1, `Belly Spit launched a projectile OWNED BY shizuku (projSelf=${after.projSelf})`);
await shot("07_belly_spit");

// ── 4) FORGETFUL — a stored item expires (~8s) → belly clears + "...I forgot." ──
await reset();
await page.keyboard.down(";"); await waitFrames(3);
await page.evaluate(() => window.__harness.enemyProjAtP1(50)); await waitFrames(4);
await page.keyboard.up(";");
const held = await sz("p1");
ok(held.belly >= 1, `stored an item to age out (belly=${held.belly}, forget=${held.bellyOldestForget})`);
await waitFrames(495);                             // > SZ_BELLY_FORGET (480)
const expired = await sz("p1");
ok(expired.belly === 0, `item FORGOTTEN after ~8s (belly=${expired.belly})`);
await shot("08_forgot");

// ── 5) BLINKY PULL — reels the opponent closer + eats a cone projectile ──
await reset();
await page.evaluate(() => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 320); } catch (_) {} });
await waitFrames(2);
const gap0 = Math.abs((await p2()).x - (await p1()).x);
// Spawn the cone projectile AND fire the pull atomically (one evaluate → no frame advances between,
// so the projectile is still live when the suction runs and p1 can't be knocked into hitstun first).
await page.evaluate(() => { window.__harness.enemyProjAtP1(40); window.__harness.p1SpecialDir("F"); });
const sPull = await sz("p1");
await waitFrames(28);                              // let the reel complete
const gap1 = Math.abs((await p2()).x - (await p1()).x);
ok(sPull.belly >= 1, `Blinky Pull ate the cone projectile (belly=${sPull.belly})`);
ok(gap1 < gap0 - 40, `Blinky Pull reeled the opponent IN (gap ${Math.round(gap0)}→${Math.round(gap1)})`);
await shot("09_pull_reel");

// ── 6) DISARM — lock the zoner: a projectile it deploys in the window is vacuumed ──
await reset();
await page.evaluate(() => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 120); } catch (_) {} });
await waitFrames(2);
await specialDir("U");
await waitFrames(2);
const dz = await sz("p1");
ok(dz.oppDisarmed > 0, `Disarm applied the lockout (oppDisarmed=${dz.oppDisarmed} frames)`);
// The disarmed opponent deploys a projectile (owner=p2) → Blinky vacuums it during the window.
await page.evaluate(() => window.__harness.enemyProjAtP1(40));
await waitFrames(6);
const dz2 = await sz("p1");
ok(dz2.projOpp === 0, `the disarmed zoner's projectile was VACUUMED (projOpp=${dz2.projOpp})`);
await shot("10_disarm_vacuum");

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/shz2_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
