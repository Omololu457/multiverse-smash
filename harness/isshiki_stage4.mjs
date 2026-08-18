// harness/isshiki_stage4.mjs
// STAGE 4 evidence: Isshiki's 2 bonus finishers + the Ultimate cinematic.
//   Finisher 1 (Back+Special)     — Daikokuten rod BARRAGE (3-rod spread), connects.
//   Finisher 2 (airborne Special) — aerial DASH-SLASH (long-reach lunge), connects.
//   Ultimate  (U, ≥100 Karma)     — "Daikokuten Barrage": inline camera-focus cinematic, the LIVE fighter
//     holds the ult windup cast while giant rods rain down for a GUARANTEED nuke (no duplicate instance).
// Screenshots → harness/shots/isshiki_stage4_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `isshiki_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=isshiki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("isshiki").animationData);

  // ── FINISHER 1 (Back+Special) — Daikokuten rod barrage ──
  console.log("\n── Finisher 1 (Back+Special): Daikokuten rod barrage ──");
  check("isshikiFin1Cast wired", (ad.isshikiFin1Cast?.sheet || "").includes("isshiki_fin1_cast_uniform"), `sheet=${ad.isshikiFin1Cast?.sheet}`);
  let f1Cast = null, f1Spent = 0, f1Fx = false, f1Dmg = 0;
  for (let attempt = 0; attempt < 5 && !(f1Fx && f1Dmg >= 40); attempt++) {
    await prep(140);
    const en0 = (await p1()).energy, hp0 = (await p2()).health;
    const res = await page.evaluate(() => window.__harness.p1SpecialDir("B"));
    const en1 = (await p1()).energy; f1Cast = res?.cast; f1Spent = en0 - en1;
    await waitFrames(4); await shot("finisher1_cast");
    const hit = await page.waitForFunction(() => window.__harness.projectiles().some(p => p.name === "isshikiFin1"), null, { timeout: 2000, polling: 16 }).catch(() => null);
    if (hit) { f1Fx = true; await shot("finisher1_fx"); }
    for (let i = 0; i < 40; i++) await waitFrames(1);
    f1Dmg = Math.max(f1Dmg, hp0 - (await p2()).health);
  }
  check("cast pose = isshikiFin1Cast", f1Cast === "isshikiFin1Cast", `cast=${f1Cast}`);
  check("spent ~50 Karma", Math.abs(f1Spent - 50) <= 2.5, `Δ=${f1Spent.toFixed(1)}`);
  check("rod-barrage projectile spawned (isshikiFin1)", f1Fx, "");
  check("Finisher 1 connects (barrage dmg ≥ 40)", f1Dmg >= 40, `dmg=${f1Dmg.toFixed(1)}`);

  // ── FINISHER 2 (airborne Special) — aerial dash-slash ──
  console.log("\n── Finisher 2 (airborne Special): aerial dash-slash ──");
  check("isshikiFin2 wired", (ad.isshikiFin2?.sheet || "").includes("isshiki_fin2_uniform"), `sheet=${ad.isshikiFin2?.sheet}`);
  let f2Cast = null, f2Spent = 0, f2Dmg = 0;
  for (let attempt = 0; attempt < 5 && f2Dmg < 30; attempt++) {
    await prep(58);
    await page.evaluate(() => window.__harness.liftP1(50));
    const en0 = (await p1()).energy, hp0 = (await p2()).health;
    const res = await page.evaluate(() => window.__harness.p1SpecialDir(null));   // airborne → Finisher 2 (dir ignored)
    const en1 = (await p1()).energy; f2Cast = res?.cast || (await p1()).castMove; f2Spent = en0 - en1;
    await waitFrames(4); await shot("finisher2");
    for (let i = 0; i < 18; i++) await waitFrames(1);
    f2Dmg = Math.max(f2Dmg, hp0 - (await p2()).health);
  }
  check("move = isshikiFin2 (dash-slash)", f2Cast === "isshikiFin2", `move=${f2Cast}`);
  check("spent ~45 Karma", Math.abs(f2Spent - 45) <= 2.5, `Δ=${f2Spent.toFixed(1)}`);
  check("Finisher 2 connects (dmg ≥ 30)", f2Dmg >= 30, `dmg=${f2Dmg.toFixed(1)}`);

  // ── ULTIMATE (U) — Daikokuten Barrage cinematic ──
  console.log("\n── Ultimate: Daikokuten Barrage (inline camera-focus cinematic, live fighter) ──");
  await prep(120);
  const uEn0 = (await p1()).energy, uHp0 = (await p2()).health;
  check("has ≥100 Karma for the ultimate", uEn0 >= 100, `energy=${uEn0}`);
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const uEn1 = (await p1()).energy;
  // sample through the cinematic: caster ult cast sprite + rod-rain projectile + guaranteed damage
  let ultCastSeen = null, ultRodsSeen = false, minHp = uHp0, shotCast = false, shotRods = false;
  for (let i = 0; i < 60; i++) {
    const a = await p1();
    if (a.castMove === "isshikiUltCast" && (a.spriteSheet || "").includes("isshiki_ult_cast_uniform")) { ultCastSeen = a.spriteSheet; if (!shotCast) { await shot("ult_cast"); shotCast = true; } }
    if ((await projs()).some(p => p.name === "isshikiUltRods" || (p.sheet || "").includes("isshiki_ult_rods_uniform"))) { ultRodsSeen = true; if (!shotRods) { await shot("ult_rods"); shotRods = true; } }
    minHp = Math.min(minHp, (await p2()).health);
    await waitFrames(1);
  }
  check("ult cost spent (~100)", uEn0 - uEn1 >= 95, `spent=${(uEn0 - uEn1).toFixed(0)}`);
  check("LIVE fighter renders the ult windup cast (isshikiUltCast — no dup instance)", (ultCastSeen || "").includes("isshiki_ult_cast_uniform"), `sheet=${ultCastSeen}`);
  check("Daikokuten rod-rain payoff spawned (isshiki_ult_rods = effects.png)", ultRodsSeen, "");
  check("ultimate dealt heavy GUARANTEED damage (≥ 120)", uHp0 - minHp >= 120, `dmg=${(uHp0 - minHp).toFixed(1)}`);
  check("ultimate started its cooldown", (await p1()).ultCooldown > 0, `cd=${(await p1()).ultCooldown}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
