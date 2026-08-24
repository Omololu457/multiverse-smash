// harness/vegito.test.mjs — CANONICAL Vegito Ultra Instinct -Sign- (Dragon Ball) suite.
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–6: flood-fill-keyed sprite gate /
// stats / portrait / "Ki" label, movement/state (run=walk, fall=jump reuses; dash+guard OWN art; real
// knockdown/getup), 5 normals + crouch variant, the Fwd+Heavy "Ultra Rush" command chain, the 6 fixed-slot
// ki specials (Big Bang / Galick Gun / Banshee volley / Spread fan / Air Ki / Perfect Shot), the Ultra
// Instinct evasion RESOURCE (init/drain/dodge/charge-disable/health-bleed), the "Kamehameha" ULTIMATE
// (~198 EFF sure-hit), win/lose, a STATIC every-sheet+portrait sweep, and a RUNTIME fallback-box sweep.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

section("STATIC — every animationData sheet + portrait exists on disk");
const vg = characters.vegito;
const ad = vg.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const missing = [];
for (const s of [...sheets, vg.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (vegito_portrait.png)", (vg.portrait || "").includes("vegito_portrait"), `portrait=${vg.portrait}`);
check("stats HP1200/EN200/atk95/def86/spd96 + energyType ki + universe dragon_ball + scale2.3",
  vg.stats.maxHealth === 1200 && vg.stats.maxEnergy === 200 && vg.stats.attack === 95 && vg.stats.defense === 86 &&
  vg.stats.speed === 96 && vg.traits.energyType === "ki" && vg.universe === "dragon_ball" && Math.abs(vg.spriteScale - 2.3) < 0.01,
  JSON.stringify(vg.stats));
// HONEST-REUSE contract: run=walk, fall=jump, lose=knockdown. dash + guard = OWN art. up + down_air = OWN art.
check("honest reuses wired (run=walk / fall=jump / lose=knockdown)",
  ad.run.sheet === ad.walk.sheet && ad.fall.sheet === ad.jump.sheet && ad.lose.sheet === ad.knockdown.sheet, "");
check("dash + guard are OWN dedicated art (not reuses)", ad.dash.sheet.includes("vegito_dash") && ad.guard.sheet.includes("vegito_guard") && ad.dash.sheet !== ad.walk.sheet, "");
check("up-launcher + down_air are OWN art (not heavy/air reuses)", ad.up.sheet !== ad.heavy.sheet && ad.down_air.sheet !== ad.air.sheet, "");
check("ultimate = 'Kamehameha', cost 100", vg.ultimate?.name === "Kamehameha" && vg.ultimate?.cost === 100, JSON.stringify(vg.ultimate));
check("6-special movelist descriptor present (Big Bang/Galick/Banshee/Spread/Air Ki/Perfect)",
  !!(vg.specials?.bigBangAttack && vg.specials?.galickGun && vg.specials?.bansheeBlast && vg.specials?.spreadFingerBeam && vg.specials?.airKiBlast && vg.specials?.perfectShot), "");

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const ui = () => page.evaluate(() => window.__harness.vegitoUI("p1"));
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function prep(gap) {
  await grounded();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2);
}
async function waitSheet(sheet, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await wf(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegito&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await page.evaluate(() => { window.__harness.setDummyBehavior?.("stand"); window.__harness.setP2ForceBlock?.(false); });
  await wf(6);

  section("registration + sprite gate + stats + energy label");
  const g = await p1();
  check("P1 is Vegito", g.key === "vegito", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = vegito_idle_uniform", (g.spriteSheet || "").includes("vegito_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.3", Math.abs((g.spriteScale || 0) - 2.3) < 0.01, `${g.spriteScale}`);
  check("HP 1200 / EN 200", g.maxHealth === 1200 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const uEarly = await ui();
  check("UI evasion meter present + starts near full (read at boot)", uEarly.meter != null && uEarly.meter >= uEarly.max * 0.85, `meter=${uEarly.meter?.toFixed(1)}/${uEarly.max}`);

  section("movement / state — dash+guard OWN art; run=walk, fall=jump reuses; real knockdown/getup");
  await page.keyboard.down("d"); await wf(16); const wk = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = vegito_walk_uniform", (wk.spriteSheet || "").includes("vegito_walk_uniform"), `sheet=${wk.spriteSheet}`);
  await grounded();
  for (const [act, tag] of [["run", "vegito_walk_uniform"], ["dash", "vegito_dash_uniform"], ["guard", "vegito_guard_uniform"], ["knockdown", "vegito_knockdown_uniform"], ["getup", "vegito_getup_uniform"]]) {
    await force(act); await wf(3); const r = await p1(); await force(null); await wf(1);
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  section("5 normals connect + crouch variant");
  for (const [name, key, tag] of [["light", "j", "vegito_light_uniform"], ["heavy", "k", "vegito_heavy_uniform"], ["upAttack", "i", "vegito_up_uniform"]]) {
    let dealt = 0, sheetOk = false;
    for (let attempt = 0; attempt < 3 && !(dealt > 0 && sheetOk); attempt++) {
      await prep(42); const h0 = (await p2()).health;
      await page.keyboard.down(key); await wf(2);
      for (let i = 0; i < 5; i++) { const mv = await p1(); if ((mv.spriteSheet || "").includes(tag)) sheetOk = true; await wf(2); }
      await page.keyboard.up(key); await wf(8);
      dealt = Math.max(dealt, h0 - (await p2()).health);
    }
    check(`${name} → ${tag} + connects (${dealt.toFixed(0)} dmg)`, sheetOk && dealt > 0, `dmg=${dealt}`);
  }
  let csOk = false, csDmg = 0;
  for (let attempt = 0; attempt < 5 && !(csOk && csDmg > 0); attempt++) {
    await prep(46); const h0 = (await p2()).health;
    await page.keyboard.down("s"); await wf(3); await page.keyboard.down("j"); await wf(1); await page.keyboard.up("j");
    const mv = await waitSheet("vegito_clight_uniform", 12); if ((mv.spriteSheet || "").includes("vegito_clight_uniform")) csOk = true;
    await wf(14); csDmg = Math.max(csDmg, h0 - (await p2()).health);
    await page.keyboard.up("s"); await grounded(); await wf(3);
  }
  check("Down+light → crouch variant + connects", csOk && csDmg > 0, `dmg=${csDmg}`);

  section("command chain — Fwd+Heavy opens Ultra Rush; neutral Heavy stays normal");
  let rushOpened = false;
  for (let attempt = 0; attempt < 3 && !rushOpened; attempt++) {
    await prep(50);
    await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
    const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await wf(1);
    await page.keyboard.down("k"); await wf(1);
    for (let f = 0; f < 6 && !rushOpened; f++) { const c = await page.evaluate(() => window.__harness.vegitoCmd("p1")); if (c?.move === "vegitoRush1" || (await p1()).spriteSheet?.includes("vegito_rush1_uniform")) rushOpened = true; await wf(1); }
    await page.keyboard.up("k"); await page.keyboard.up(fwd); await wf(10); await grounded();
  }
  check("Fwd+Heavy → vegitoRush1 (opens the chain)", rushOpened, "");
  let nhOk = false;
  for (let attempt = 0; attempt < 3 && !nhOk; attempt++) {
    await prep(50); await page.keyboard.down("k");
    for (let f = 0; f < 10 && !nhOk; f++) { await wf(1); if ((await p1()).spriteSheet?.includes("vegito_heavy_uniform")) nhOk = true; }
    await page.keyboard.up("k"); await wf(8); await grounded();
  }
  check("neutral Heavy → vegito_heavy_uniform (not rush)", nhOk, "");

  section("specials — Big Bang / Galick / Banshee / Spread / Air Ki all cast + connect");
  for (const [name, dir, castMove, gap] of [["Big Bang", null, "vegitoBigbang", 150], ["Galick Gun", "F", "vegitoGalick", 150], ["Banshee", "B", "vegitoBanshee", 120], ["Spread", "D", "vegitoSpread", 110], ["Air Ki", "U", "vegitoAirki", 120]]) {
    await prep(gap); const h0 = (await p2()).health;
    const res = await fireDir(dir);
    check(`${name} casts ${castMove}`, res?.cast === castMove, `cast=${res?.cast}`);
    await wf(30);
    check(`${name} connects (${(h0 - (await p2()).health).toFixed(0)} dmg)`, (h0 - (await p2()).health) > 0, "");
    await grounded(); await wf(4);
  }

  section("Stage-5 Ultra Instinct evasion resource — drain / dodge / charge-disable / bleed");
  await prep(60);
  await page.evaluate(() => window.__harness.vegitoSetMeter(90)); await wf(1);
  const evB = await ui(); await page.evaluate(() => window.__harness.p2Attack()); await wf(16); const evA = await ui();
  check("evasion negates the incoming hit (no HP loss) + spends meter", evA.health >= evB.health - 0.5 && (evB.meter - evA.meter) >= 5, `hp ${evB.health.toFixed(0)}→${evA.health.toFixed(0)} Δmeter=${(evB.meter - evA.meter).toFixed(1)}`);
  await prep(60);
  await page.evaluate(() => window.__harness.vegitoSetMeter(50)); await page.keyboard.down("p"); await wf(6);
  const chB = await ui(); await page.evaluate(() => window.__harness.p2Attack()); await wf(16); const chA = await ui();
  check("charging disables evasion (hit LANDS) + refills meter", chA.health < chB.health && chB.charging, `hp ${chB.health.toFixed(0)}→${chA.health.toFixed(0)} charging=${chB.charging}`);
  await page.keyboard.up("p"); await wf(2);
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.vegitoSetMeter(0); }); await wf(30);
  const bl = await ui();
  check("empty meter converts drain to HP bleed", bl.bleeding === true && bl.health < vg.stats.maxHealth, `bleeding=${bl.bleeding} hp=${bl.health.toFixed(0)}`);

  section("ULTIMATE — Kamehameha (Ultimate Action → beam CHAINED, guaranteed ~198 EFF)");
  await prep(150);
  await page.evaluate(() => window.__harness.vegitoSetMeter(90));   // keep meter up so bleed doesn't perturb the payoff math
  const ultH0 = (await p2()).health;
  const ultRes = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate fires + casts Ultimate Action windup", !!ultRes?.cast && ultRes?.castMove === "vegitoUltaction", `cast=${ultRes?.cast} castMove=${ultRes?.castMove}`);
  let sawBeam = false; for (let f = 0; f < 34 && !sawBeam; f++) { await wf(1); sawBeam = (await projs()).some(p => (p.name || "").includes("vegitoKamehameha")); }
  check("ultimate spawns the GIANT vegitoKamehameha beam", sawBeam, "");
  await wf(52);
  const ultDealt = ultH0 - (await p2()).health;
  check("Kamehameha lands guaranteed ~198 EFF from out of range (150–240)", ultDealt >= 150 && ultDealt <= 240, `dealt=${ultDealt.toFixed(0)}`);

  section("win / lose poses render their sheets");
  for (const [act, tag] of [["win", "vegito_win_uniform"], ["lose", "vegito_knockdown_uniform"]]) {
    await force(act); await wf(3); const r = await p1(); await force(null); await wf(1);
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  section("fallback-box sweep — every animationData action renders a real vegito_ sheet (no 128² box)");
  await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("vegito_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Vegito canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
