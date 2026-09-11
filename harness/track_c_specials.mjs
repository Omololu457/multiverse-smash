// harness/track_c_specials.mjs — LIVE verification for Track C (thinnest-kit fixes): the ONE new special
// added to each of gohan / gotenks / bardock. Real match, real special dispatch (the same triggerSpecial
// path a keyboard press drives), real projectiles + damage. Asserts move/cast + connect + energy band + art.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projectiles = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function boot(pc) {
  await page.goto(`${base}/index.html?harness=1&p1=${pc}&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await waitFrames(6);
}
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); });
  await page.evaluate(() => window.__harness.setEnergy(200));
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  // ── C1 GOHAN — Back = Ki Blast projectile (new ranged/zoning answer) ───────────────────────────────
  await boot("gohan");
  await prep(210);
  const gE0 = (await p1()).energy, gH0 = (await p2()).health;
  await page.evaluate(() => window.__harness.hurtP2(60));
  const gCast = await page.evaluate(() => window.__harness.p1SpecialDir("B"));
  const gCost = gE0 - (await p1()).energy;   // read immediately (energy regens ~0.1/frame — measure before the travel wait)
  check("C1 Gohan Back special casts (heavy reuse pose)", gCast?.cast === "heavy", JSON.stringify(gCast));
  let sawKi = false; for (let i = 0; i < 20 && !sawKi; i++) { if ((await projectiles()).some(p => (p.name || "").includes("gohanKiBlast"))) sawKi = true; await waitFrames(1); }
  check("C1 Gohan Ki Blast spawns a real projectile (gohanKiBlast)", sawKi, "");
  for (let i = 0; i < 20; i++) await waitFrames(1);
  const gDmg = gH0 - (await p2()).health;
  check(`C1 Ki Blast connects at range (dmg ${gDmg.toFixed(0)})`, gDmg > 0, `dmg=${gDmg}`);
  check(`C1 Ki Blast energy cost in medium-projectile band (real 26; measured ${gCost.toFixed(1)})`, gCost >= 25 && gCost <= 28, `cost=${gCost}`);
  // neutral still Meteor Kick (unchanged), no projectile
  await prep(46); const mH0 = (await p2()).health;
  await page.evaluate(() => window.__harness.hurtP2(60));   // freeze the dummy so the lunge connects
  const gN = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  check("C1 Gohan neutral special UNCHANGED = Meteor Kick", gN?.move === "meteorKick", JSON.stringify(gN));
  let mProj = 0; for (let i = 0; i < 12; i++) { mProj = Math.max(mProj, (await projectiles()).length); await waitFrames(1); }
  check("C1 Meteor Kick still melee-only (no projectile)", mProj === 0 && (mH0 - (await p2()).health) > 0, `proj=${mProj}`);
  await page.screenshot({ path: path.join(OUT, "TRACKC_gohan_kiblast.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });

  // ── C2 GOTENKS — Up = Rising Kick (anti-air / reversal) ───────────────────────────────────────────
  await boot("gotenks");
  await prep(44);
  const gkE0 = (await p1()).energy, gkH0 = (await p2()).health;
  await page.evaluate(() => window.__harness.hurtP2(40));
  const rk = await page.evaluate(() => window.__harness.p1SpecialDir("U"));
  const rkCost = gkE0 - (await p1()).energy;   // read immediately (before regen accrues over the launch wait)
  check("C2 Gotenks Up special = Rising Kick (gotenksRisingKick)", rk?.move === "gotenksRisingKick", JSON.stringify(rk));
  let rkProj = 0, launched = false;
  for (let i = 0; i < 16; i++) { rkProj = Math.max(rkProj, (await projectiles()).length); const q = await p2(); if ((q.vy || 0) < -3 || q.isLaunched) launched = true; await waitFrames(1); }
  const rkDmg = gkH0 - (await p2()).health;
  check(`C2 Rising Kick connects (dmg ${rkDmg.toFixed(0)})`, rkDmg > 0, `dmg=${rkDmg}`);
  check("C2 Rising Kick LAUNCHES the opponent (anti-air function)", launched, "");
  check(`C2 Rising Kick is melee (no projectile) + cost in-band (real 24; measured ${rkCost.toFixed(1)})`, rkProj === 0 && rkCost >= 23 && rkCost <= 26, `proj=${rkProj} cost=${rkCost}`);
  // neutral still Ki Blast, Down still Ki Charge (unchanged)
  await prep(120);
  const gkN = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  check("C2 Gotenks neutral special UNCHANGED = Ki Blast", gkN?.cast === "gotenksKiBlast", JSON.stringify(gkN));
  await page.screenshot({ path: path.join(OUT, "TRACKC_gotenks_risingkick.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });

  // ── C3 BARDOCK — Back = thrown Blade Wave projectile (new ranged/zoning answer) ────────────────────
  await boot("bardock");
  await prep(210);
  const bE0 = (await p1()).energy, bH0 = (await p2()).health;
  await page.evaluate(() => window.__harness.hurtP2(60));
  const bCast = await page.evaluate(() => window.__harness.p1SpecialDir("B"));
  const bCost = bE0 - (await p1()).energy;   // read immediately (before regen accrues over the travel wait)
  check("C3 Bardock Back special casts (heavy sword-slash reuse pose)", bCast?.cast === "heavy", JSON.stringify(bCast));
  let sawWave = false; for (let i = 0; i < 20 && !sawWave; i++) { if ((await projectiles()).some(p => (p.name || "").includes("bardockBladeWave"))) sawWave = true; await waitFrames(1); }
  check("C3 Bardock Blade Wave spawns a real projectile (bardockBladeWave)", sawWave, "");
  for (let i = 0; i < 20; i++) await waitFrames(1);
  const bDmg = bH0 - (await p2()).health;
  check(`C3 Blade Wave connects at range (dmg ${bDmg.toFixed(0)})`, bDmg > 0, `dmg=${bDmg}`);
  check(`C3 Blade Wave energy cost in medium-projectile band (real 24; measured ${bCost.toFixed(1)})`, bCost >= 23 && bCost <= 26, `cost=${bCost}`);
  // neutral still Rebellion Rush (unchanged), no projectile
  await prep(60); const brH0 = (await p2()).health;
  await page.evaluate(() => window.__harness.hurtP2(60));   // freeze the dummy so the lunge connects
  const bN = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  check("C3 Bardock neutral special UNCHANGED = Rebellion Rush", bN?.move === "bardockRebellion", JSON.stringify(bN));
  let brProj = 0; for (let i = 0; i < 12; i++) { brProj = Math.max(brProj, (await projectiles()).length); await waitFrames(1); }
  check("C3 Rebellion Rush still melee-only (no projectile)", brProj === 0 && (brH0 - (await p2()).health) > 0, `proj=${brProj}`);
  await page.screenshot({ path: path.join(OUT, "TRACKC_bardock_bladewave.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });

  check("no JS errors during Track C live run", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
} catch (e) {
  check("harness completed without throwing", false, String(e));
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
