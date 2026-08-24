// harness/iron_man_3.test.mjs — CANONICAL Iron Man 3 (Marvel, GBA "Invincible Iron Man", ripper Mr. L) suite
// (mirrors iron_man_2.test.mjs). Single-entry registration + integrity + FULL-KIT gate across Stages 1–6:
// sprite gate / stats / portrait / "Repulsor" label, movement/state (Running=walk/run/dash — no separate Walk;
// fall=jump, guard=crouch reuses; real knockdown/getup; intro=Start-of-Level + win=End-of-Level are OWN art),
// 5 normals + crouch variant (all 5 Shooting contexts preserved individually; down_air is OWN art), NO command
// chain (Stage 3 = none), the Stage-4 kit (3-TIER CHARGE Basic/Charged/Supercharged w/ real per-tier art +
// Super Laser beam + Super Move spin-burst), the "Super Nova" screen-clear ULTIMATE (~198 EFF sure-hit), a
// STATIC every-sheet+portrait sweep, and a RUNTIME fallback-box sweep. Honest reuses + procedural-FX gaps asserted.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

section("STATIC — every animationData sheet + portrait exists on disk");
const im = characters.iron_man_3;
const ad = im.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const missing = [];
for (const s of [...sheets, im.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
// projectile sheets (spawnProjectile, not in animationData) must also ship on disk
const projSheets = ["iron_man_3_basic_shot_uniform.png", "iron_man_3_charged_shot_uniform.png", "iron_man_3_supercharged_shot_uniform.png", "iron_man_3_super_laser_uniform.png"];
const missingProj = projSheets.filter(s => !(fs.existsSync(path.join(ROOT, s)) && fs.statSync(path.join(ROOT, s)).size > 128));
check(`${sheets.length} anim sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("all 4 charge/beam projectile sheets present (basic/charged/supercharged/laser)", missingProj.length === 0, missingProj.join(", "));
check("portrait wired (iron_man_3_portrait.png — classic helmet bust)", (im.portrait || "").includes("iron_man_3_portrait"), `portrait=${im.portrait}`);
check("stats HP1200/EN200/atk90/def90/spd92 + energyType repulsor + universe marvel + scale2.5",
  im.stats.maxHealth === 1200 && im.stats.maxEnergy === 200 && im.stats.attack === 90 && im.stats.defense === 90 &&
  im.stats.speed === 92 && im.traits.energyType === "repulsor" && im.universe === "marvel" && Math.abs(im.spriteScale - 2.5) < 0.01,
  JSON.stringify(im.stats));
// HONEST-REUSE contract (documented): walk=run (no separate Walk), dash=run, fall=jump, guard=crouch.
check("honest reuses wired (walk=run / dash=run / fall=jump / guard=crouch)",
  ad.walk.sheet === ad.run.sheet && ad.dash.sheet === ad.run.sheet && ad.fall.sheet === ad.jump.sheet && ad.guard.sheet === ad.crouch.sheet, "");
check("intro = OWN art (Start of Level — NOT an idle reuse)", (ad.intro?.sheet || "").includes("iron_man_3_intro_uniform") && ad.intro.sheet !== ad.idle.sheet, `intro=${ad.intro?.sheet}`);
check("win = OWN art (End of Level — NOT a reuse)", (ad.win?.sheet || "").includes("iron_man_3_win_uniform"), `win=${ad.win?.sheet}`);
check("down_air = OWN art (Shooting Double-Jump — distinct from air; all 5 Shooting contexts preserved)", (ad.down_air?.sheet || "").includes("iron_man_3_down_air") && ad.down_air.sheet !== ad.air.sheet, `down_air=${ad.down_air?.sheet}`);
check("ultimate = 'Super Nova', cost 100", im.ultimate?.name === "Super Nova" && im.ultimate?.cost === 100, JSON.stringify(im.ultimate));

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const specialDir = (dir) => page.evaluate(d => window.__harness.ironMan3Special(d), dir);
async function prep(gap) {
  await grounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await wf(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap * (a.facing || 1)); await wf(2);
}
async function waitSheet(sheet, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await wf(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=iron_man_3`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Iron Man 3", g.key === "iron_man_3", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = iron_man_3_idle_uniform", (g.spriteSheet || "").includes("iron_man_3_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.5", Math.abs((g.spriteScale || 0) - 2.5) < 0.01, `${g.spriteScale}`);
  check("HP 1200 / EN 200", g.maxHealth === 1200 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Repulsor", energyLabel === "Repulsor", `label=${energyLabel}`);

  section("movement / state — Running=walk/run/dash (no separate Walk); guard=crouch; real knockdown/getup; OWN intro+win");
  await page.keyboard.down("d"); await wf(16); const wk = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = iron_man_3_run_uniform (Running serves walk)", (wk.spriteSheet || "").includes("iron_man_3_run_uniform"), `sheet=${wk.spriteSheet}`);
  await grounded();
  for (const [act, tag] of [["run", "iron_man_3_run_uniform"], ["dash", "iron_man_3_run_uniform"], ["crouch", "iron_man_3_crouch_uniform"], ["guard", "iron_man_3_crouch_uniform"], ["knockdown", "iron_man_3_knockdown_uniform"], ["getup", "iron_man_3_getup_uniform"], ["intro", "iron_man_3_intro_uniform"], ["win", "iron_man_3_win_uniform"]]) {
    await force(act); await wf(3); const r = await p1(); await force(null); await wf(1);
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  section("5 normals connect + crouch variant (Shooting contexts)");
  for (const [name, key, tag] of [["light", "j", "iron_man_3_light_uniform"], ["heavy", "k", "iron_man_3_heavy_uniform"], ["upAttack", "i", "iron_man_3_up_uniform"]]) {
    let dealt = 0, sheetOk = false;
    for (let attempt = 0; attempt < 3 && !(dealt > 0 && sheetOk); attempt++) {
      await prep(50); const h0 = (await p2()).health;
      await page.keyboard.down(key); await wf(2); const mv = await p1(); if ((mv.spriteSheet || "").includes(tag)) sheetOk = true; await page.keyboard.up(key); await wf(12);
      dealt = Math.max(dealt, h0 - (await p2()).health);
    }
    check(`${name} → ${tag} + connects (${dealt.toFixed(0)} dmg)`, sheetOk && dealt > 0, `dmg=${dealt}`);
  }
  let airOk = false, airDmg = 0;
  for (let attempt = 0; attempt < 4 && !(airOk && airDmg > 0); attempt++) {
    await prep(44); const h0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(38)); await page.keyboard.down("j");
    for (let i = 0; i < 8; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("iron_man_3_air_uniform")) airOk = true; await wf(1); }
    await page.keyboard.up("j"); await wf(6);
    airDmg = Math.max(airDmg, h0 - (await p2()).health);
    await grounded(); await wf(3);
  }
  check("air → iron_man_3_air_uniform + connects", airOk && airDmg > 0, `dmg=${airDmg.toFixed(0)}`);
  let csOk = false, csDmg = 0;
  for (let attempt = 0; attempt < 5 && !(csOk && csDmg > 0); attempt++) {
    await prep(46); const h0 = (await p2()).health;
    await page.keyboard.down("s"); await wf(3); await page.keyboard.down("j"); await wf(1); await page.keyboard.up("j");
    const mv = await waitSheet("iron_man_3_crouchlight_uniform", 12); if ((mv.spriteSheet || "").includes("iron_man_3_crouchlight_uniform")) csOk = true;
    await wf(16); csDmg = Math.max(csDmg, h0 - (await p2()).health);
    await page.keyboard.up("s"); await grounded(); await wf(3);
  }
  check("Down+light → crouch variant (Shooting Crouching) + connects", csOk && csDmg > 0, `dmg=${csDmg}`);

  section("Stage 4 — 3-TIER CHARGE (real per-tier art) + Super Laser + Super Move");
  {
    // 3-tier charge — each tier carries its OWN on-sheet projectile art
    const tierArt = { S: "basic_shot", C: "charged_shot", X: "supercharged_shot" };
    let allTiersOk = true, detail = [];
    for (const t of ["S", "C", "X"]) {
      await prep(120); const h0 = (await p2()).health;
      const res = await page.evaluate(tt => window.__harness.ironMan3Repulsor(tt), t);
      let sheet = ""; for (let f = 0; f < 22 && !sheet; f++) { await wf(1); const rp = (await projs()).find(p => (p.name || "").includes("ironMan3Repulsor")); if (rp) sheet = rp.sheet || ""; }
      await wf(20);
      const dmg = h0 - (await p2()).health;
      const ok = res?.cast === "ironMan3Repulsor" && sheet.includes(tierArt[t]) && dmg > 0;
      if (!ok) allTiersOk = false; detail.push(`${t}:${sheet.split("/").pop()}/${dmg.toFixed(0)}`);
      await grounded(); await wf(4);
    }
    check("3-tier charge fires distinct real per-tier art (basic/charged/supercharged) + all connect", allTiersOk, detail.join(" "));
  }
  {
    await prep(90); const h0 = (await p2()).health;
    await specialDir("F");
    let sawLaser = false; for (let f = 0; f < 26 && !sawLaser; f++) { await wf(1); sawLaser = (await projs()).some(p => (p.name || "").includes("ironMan3SuperLaser")); }
    await wf(22);
    check("Super Laser (F) spawns the beam + connects", sawLaser && (h0 - (await p2()).health) > 0, `dmg=${(h0 - (await p2()).health).toFixed(0)}`);
    await grounded(); await wf(6);
  }
  {
    await prep(46); const h0 = (await p2()).health;
    const res = await specialDir("U");
    const mv = await waitSheet("iron_man_3_super_move_uniform");
    await wf(22);
    check("Super Move (U) → ironMan3SuperMove spin-burst + connects", (mv.spriteSheet || "").includes("iron_man_3_super_move_uniform") && (h0 - (await p2()).health) > 0, `move=${res?.move} dmg=${(h0 - (await p2()).health).toFixed(0)}`);
    await grounded(); await wf(6);
  }

  section("ULTIMATE — Super Nova (guaranteed screen-clear sure-hit ~198 EFF from out of range)");
  await prep(160);
  const ultH0 = (await p2()).health;
  const ultRes = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate fires (Super Nova) + casts ironMan3SuperMove trigger pose", !!ultRes?.cast && ultRes?.castMove === "ironMan3SuperMove", `cast=${ultRes?.cast} castMove=${ultRes?.castMove}`);
  let novaLit = false; for (let f = 0; f < 40 && !novaLit; f++) { await wf(1); const nv = await page.evaluate(() => window.__harness.ironMan3Nova()); if (nv && nv.timer > 0) novaLit = true; }
  check("ultimate lights the SCREEN-FILLING nova overlay", novaLit, "");
  await wf(48);
  const ultDealt = ultH0 - (await p2()).health;
  check("ultimate lands guaranteed ~198 EFF from out of range (150–240)", ultDealt >= 150 && ultDealt <= 240, `dealt=${ultDealt.toFixed(0)}`);

  section("fallback-box sweep — every animationData action renders a real iron_man_3_ sheet (no 128² box)");
  await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("iron_man_3_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Iron Man 3 canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
