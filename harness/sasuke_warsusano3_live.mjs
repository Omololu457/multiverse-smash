// harness/sasuke_warsusano3_live.mjs — War-Susano'o TIER 3 (Soldier transformation). Susano'o-set ULTIMATE.
// Verifies: giant body-swap (as big as teen's Susanoo), Susanoo HP, Arrow Volley / Wing Dash, Indra's Arrow
// (ends the form), exit/revert, and that the original teen Sasuke is EXCLUDED.
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
const shot = n => page.screenshot({ path: path.join(OUT, `war3_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const war = (who = "p1") => page.evaluate(w => window.__harness.warSusano(w), who);
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name).filter(Boolean));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function tapUlt() { await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2); }
async function boot(who) { perr = null; await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=naruto`, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); }); await waitFrames(4); }

// ───────────────────────── SASUKE (SENSEI) ─────────────────────────
await boot("sasuke_sensei");
ok(!perr, `[sensei] page loaded, no errors`);
await page.evaluate(() => window.__harness.setEyeSet?.("susanoo", "p1")); await waitFrames(2);
await page.evaluate(() => window.__harness.setP2X?.((window.__harness.p1Snap().x) + 560)); await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.healP1?.(); });   // p2 out of reach so the HP pool survives for the full test

// ENTER SOLDIER — Susano'o-set Ultimate
await tapUlt(); await waitFrames(4);
let w = await war();
ok(w.soldier, `[sensei] Susano'o-set Ultimate → SOLDIER transformation (soldier=${w.soldier})`);
ok(/sasuke_susano_soldier/.test(w.skin || ""), `[sensei] body-swaps to the soldier sheet (${(w.skin || "").split("/").pop()})`);
ok(w.canvasFrac >= 0.9, `[sensei] GIANT scale ≈ teen Susanoo (canvasFrac=${w.canvasFrac})`);
ok(w.soldierHP > 0, `[sensei] has a Susanoo HP pool (HP=${w.soldierHP})`);
await shot("sensei_soldier");

// ARROW VOLLEY — neutral Special
await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(12);
ok((await projNames()).some(n => /susanoArrow/i.test(n)), `[sensei] Special = Arrow Volley (arrows)`);
await shot("sensei_soldier_volley");
await waitFrames(30);

// WING DASH — Forward + Special (REAL keys: hold forward + tap special, so _specialHeldDir reads "F")
for (let i = 0; i < 40 && (await war()).attackCd > 0; i++) await waitFrames(2);   // wait actionable
const x0 = await page.evaluate(() => Math.round(window.__harness.p1Snap().x));
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("d");
await waitFrames(3);
const x1 = await page.evaluate(() => Math.round(window.__harness.p1Snap().x));
w = await war();
ok(w.wing || Math.abs(x1 - x0) > 20, `[sensei] Forward+Special = Wing Dash (wing=${w.wing}, moved ${x0}→${x1})`);
await shot("sensei_soldier_wing");

// INDRA'S ARROW — re-press Ultimate (when actionable) → fires + ENDS the form
for (let i = 0; i < 40 && (await war()).attackCd > 0; i++) await waitFrames(2);
if (!(await war()).soldier) { await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); }); await waitFrames(2); await tapUlt(); await waitFrames(5); }   // re-enter if the pool broke (clear ult cooldown first)
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.healP1?.(); }); await waitFrames(2);
await tapUlt(); await waitFrames(2);
w = await war();
ok(w.indra, `[sensei] re-press Ultimate = INDRA'S ARROW (indra=${w.indra})`);
await shot("sensei_soldier_indra");
await waitFrames(70);
w = await war();
ok(!w.soldier && w.canvasFrac === 0, `[sensei] Indra's Arrow ENDS the transformation (reverts to base, canvasFrac=${w.canvasFrac})`);

// ───────────────────────── TEEN — EXCLUDED ─────────────────────────
await boot("sasuke");
ok((await war()).allowed === false, `[teen] NOT allowlisted`);
await tapUlt(); await waitFrames(4);
ok(!(await war()).soldier, `[teen] cannot enter the War-Susano'o Soldier`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/war3_*.png`);
process.exit(FAILS ? 1 : 0);
