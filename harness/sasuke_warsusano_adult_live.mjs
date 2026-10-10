// harness/sasuke_warsusano_adult_live.mjs — War-Susano'o PHASE 4: full kit wired onto sasuke_adult.
// Adult has NO eye-set, so Charge+Ultimate TOGGLES a "Susano'o stance": in it, Special = Tier-1/2 War moves
// and Ultimate = the Soldier (Tier 3). Arm Grab stays Forward+Grab. Verifies the whole flow + that his normal
// kit is unchanged OUTSIDE the stance, and that teen Sasuke still can't trigger any of it.
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
const shot = n => page.screenshot({ path: path.join(OUT, `war4_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const war = (who = "p1") => page.evaluate(w => window.__harness.warSusano(w), who);
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name).filter(Boolean));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function fill() { await page.evaluate(() => window.__harness.fillEnergy?.()); await waitFrames(1); }
async function reset() { await page.evaluate(() => { window.__harness.clearDojutsu?.("p1"); window.__harness.fillEnergy?.(); }); await waitFrames(2); }
async function chargeUlt() { await page.keyboard.down("p"); await waitFrames(2); await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2); await page.keyboard.up("p"); }
async function boot(who) { perr = null; await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=naruto`, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); }); await waitFrames(4); }

await boot("sasuke_adult");
ok(!perr, `[adult] page loaded, no errors`);
ok((await war()).allowed === true, `[adult] allowlisted for War-Susano'o`);
await page.evaluate(() => window.__harness.setP2X?.((window.__harness.p1Snap().x) + 200));

// NORMAL kit unchanged OUTSIDE the stance: neutral Special = Katon (spends chakra, no stance).
await reset(); const e0 = (await war()).energy;
await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(3);
ok((await war()).energy < e0 && (await war()).stance === 0, `[adult] OUTSIDE stance: normal Special (Katon) still fires — kit not displaced`);

// CHARGE + ULTIMATE → enter the Susano'o STANCE
await reset(); await chargeUlt(); await waitFrames(3);
ok((await war()).stance > 0, `[adult] Charge+Ultimate enters the Susano'o STANCE (stance=${(await war()).stance})`);
await shot("adult_stance");

// In stance: U+Special = Ribcage Guard
await fill(); const eg = (await war()).energy;
await page.evaluate(() => window.__harness.p1SpecialDir("U")); await waitFrames(3);
ok((await war()).guard > 0, `[adult] stance U+Special = Ribcage Guard (guard=${(await war()).guard})`);
// In stance: neutral Special = Torso Arrow
await page.evaluate(() => window.__harness.fillEnergy?.()); await waitFrames(30);
await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(4);
ok((await projNames()).some(n => /susanoArrow/i.test(n)) && (await war()).torso > 0, `[adult] stance Special = Torso Arrow (bust summons)`);
await shot("adult_torso");

// In stance: Ultimate → enter the SOLDIER (Tier 3)
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); }); await waitFrames(40);
if ((await war()).stance === 0) { await chargeUlt(); await waitFrames(3); }   // re-arm stance if the torso window lapsed it
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); }); await waitFrames(2);
await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(5);
let w = await war();
ok(w.soldier, `[adult] stance Ultimate → SOLDIER transformation (soldier=${w.soldier})`);
ok(w.canvasFrac >= 0.9 && /sasuke_susano_soldier/.test(w.skin || ""), `[adult] GIANT soldier body-swap (frac=${w.canvasFrac})`);
await shot("adult_soldier");

// In Soldier: Special = Arrow Volley
await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(12);
ok((await projNames()).some(n => /susanoArrow/i.test(n)), `[adult] Soldier Special = Arrow Volley`);

// In Soldier: Ultimate = Indra's Arrow → ends the form
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.healP1?.(); });
for (let i = 0; i < 30 && (await war()).attackCd > 0; i++) await waitFrames(2);
await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2);
ok((await war()).indra, `[adult] Soldier Ultimate = INDRA'S ARROW`);
await waitFrames(70);
ok(!(await war()).soldier && (await war()).canvasFrac === 0, `[adult] Indra's Arrow ends the Soldier (reverts)`);

// ── TEEN — still excluded ──
await boot("sasuke");
ok((await war()).allowed === false, `[teen] NOT allowlisted`);
await chargeUlt(); await waitFrames(3);
ok((await war()).stance === 0 && !(await war()).soldier, `[teen] Charge+Ultimate does NOT enter any War-Susano'o stance/soldier`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/war4_*.png`);
process.exit(FAILS ? 1 : 0);
