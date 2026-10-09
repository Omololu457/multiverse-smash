// harness/sasuke_warsusano2_live.mjs — War-Susano'o TIER 2 (torso) verification (sasuke_sensei + adult).
// In the Susano'o eye-set: N = Torso Arrow (bow projectile), F = Claw Smash (melee), B = Blade Swing (melee).
// The bust materializes + follows (a short window). All costs MID (> the Tier-1 Arm Grab's 15). Teen excluded.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let perr = null; page.on("pageerror", e => { perr = e.message; console.log("  PAGEERROR:", e.message); });
const shot = n => page.screenshot({ path: path.join(OUT, `war2_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const war = (who = "p1") => page.evaluate(w => window.__harness.warSusano(w), who);
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name).filter(Boolean));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function reset() { await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.fillEnergy?.(); }); await waitFrames(2); }
async function boot(who) { perr = null; await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=naruto`, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); }); await waitFrames(4); }

// ───────────────────────── SASUKE (SENSEI) ─────────────────────────
await boot("sasuke_sensei");
ok(!perr, `[sensei] page loaded, no errors`);
await page.evaluate(() => window.__harness.setEyeSet?.("susanoo", "p1")); await waitFrames(2);
await page.evaluate(() => window.__harness.setP2X?.((window.__harness.p1Snap().x) + 180));

// TORSO ARROW (N + Special)
await reset(); const e0 = (await war()).energy;
await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(4);
let w = await war();
ok((await projNames()).some(n => /susanoArrow/i.test(n)), `[sensei] N+Special = Torso ARROW (bow projectile)`);
ok(w.torso > 0, `[sensei] firing a torso move summons the bust window (torso=${w.torso})`);
ok(Math.abs((e0 - w.energy) - 34) <= 2, `[sensei] Torso Arrow cost ~34 (> Arm Grab 15) (${e0}→${w.energy})`);
await shot("sensei_torso_arrow");

// CLAW SMASH (F + Special)
await reset(); await waitFrames(40); await page.evaluate(() => window.__harness.fillEnergy?.());
const e1 = (await war()).energy;
await page.evaluate(() => window.__harness.p1SpecialDir("F")); await waitFrames(4);
w = await war();
ok(w.move === "susanoClaw" || w.torsoFx === "claw", `[sensei] F+Special = Claw Smash (move=${w.move}, fx=${w.torsoFx})`);
ok(Math.abs((e1 - w.energy) - 32) <= 2, `[sensei] Claw Smash cost ~32 (${e1}→${w.energy})`);
await shot("sensei_torso_claw");

// BLADE SWING (B + Special)
await reset(); await waitFrames(40); await page.evaluate(() => window.__harness.fillEnergy?.());
const e2 = (await war()).energy;
await page.evaluate(() => window.__harness.p1SpecialDir("B")); await waitFrames(4);
w = await war();
ok(w.move === "susanoBlade" || w.torsoFx === "blade", `[sensei] B+Special = Blade Swing (move=${w.move}, fx=${w.torsoFx})`);
ok(Math.abs((e2 - w.energy) - 38) <= 2, `[sensei] Blade Swing cost ~38 — the priciest torso move (${e2}→${w.energy})`);
await shot("sensei_torso_blade");

// torso window ticks down + clears
await reset(); await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(4);
ok((await war()).torso > 0, `[sensei] torso window active after a torso move`);
await waitFrames(190);
ok((await war()).torso === 0, `[sensei] torso window expires (bust fades)`);

// ───────────────────────── SASUKE (ADULT) — allowlisted; torso via its own wiring is Phase 4 ──────────
await boot("sasuke_adult");
ok((await war()).allowed === true, `[adult] allowlisted for War-Susano'o`);

// ───────────────────────── TEEN — EXCLUDED ─────────────────────────
await boot("sasuke");
ok((await war()).allowed === false, `[teen] NOT allowlisted`);
await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(4);
ok((await war()).torso === 0 && !(await projNames()).some(n => /susanoArrow/i.test(n)), `[teen] cannot summon the torso / fire Torso Arrow`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/war2_*.png`);
process.exit(FAILS ? 1 : 0);
