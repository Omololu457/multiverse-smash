// harness/brainiac.test.mjs — CANONICAL Brainiac (DC, Coluan all-special ZONER) suite (mirrors deathstroke.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–5: sprite gate / stats / portrait /
// "Intellect" label, movement/state (real knockdown+getup art from the row_08 KO sequence), the 5 tentacle
// normals + the crouch-tentacle variant, the 5 directional specials (Beam projectile / Blade / Sweep / Electric
// Shield defensive buff / Levitation), the "Sphere of Annihilation" Energy-Pillar ULTIMATE (guaranteed ~198
// EFF, no dup), a STATIC every-sheet+portrait sweep, and a RUNTIME fallback-box sweep over every animationData
// action. Honest reuses (run=walk / dash=walk / jump=idle / fall=idle / guard=idle / down_air=air) asserted.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait + the projectile/pillar VFX exist. ──
section("STATIC — every animationData sheet + portrait + VFX exists on disk");
const bc = characters.brainiac;
const ad = bc.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const extra = ["./brainiac_beam_proj_uniform.png", "./brainiac_pillar_uniform.png"];   // projectile + ULT pillar VFX (not in animationData)
const missing = [];
for (const s of [...sheets, bc.portrait, ...extra]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + portrait + 2 VFX all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (brainiac_portrait.png — idle bust)", (bc.portrait || "").includes("brainiac_portrait"), `portrait=${bc.portrait}`);
check("stats HP1100/EN200/atk88/def82/spd80 + energyType intellect + universe dc + scale1.5",
  bc.stats.maxHealth === 1100 && bc.stats.maxEnergy === 200 && bc.stats.attack === 88 && bc.stats.defense === 82 &&
  bc.stats.speed === 80 && bc.traits.energyType === "intellect" && bc.universe === "dc" && Math.abs(bc.spriteScale - 1.5) < 0.01,
  JSON.stringify(bc.stats));
// HONEST-REUSE contract (documented gaps): run=walk, dash=walk, jump=idle, fall=idle, guard=idle, down_air=air.
check("honest reuses wired (run=walk / dash=walk / jump=idle / fall=idle / guard=idle / down_air=air)",
  ad.run.sheet === ad.walk.sheet && ad.dash.sheet === ad.walk.sheet && ad.jump.sheet === ad.idle.sheet &&
  ad.fall.sheet === ad.idle.sheet && ad.guard.sheet === ad.idle.sheet && ad.down_air.sheet === ad.air.sheet, "");
check("5 special cast poses wired (beam/blade/sweep/shield/levitate)",
  ["brainiacBeam", "brainiacBlade", "brainiacSweep", "brainiacShield", "brainiacLevitate"].every(k => (ad[k]?.sheet || "").includes("brainiac")), "");

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function prep(gap) {
  await grounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await wf(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap * (a.facing || 1)); await wf(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=brainiac`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Brainiac", g.key === "brainiac", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = brainiac_idle_uniform", (g.spriteSheet || "").includes("brainiac_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.5", Math.abs((g.spriteScale || 0) - 1.5) < 0.01, `${g.spriteScale}`);
  check("HP 1100 / EN 200", g.maxHealth === 1100 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Intellect", energyLabel === "Intellect", `label=${energyLabel}`);

  section("movement / state — walk + real knockdown/getup art (row_08 KO sequence)");
  await page.keyboard.down("d"); await wf(16); const wk = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = brainiac_walk_uniform", (wk.spriteSheet || "").includes("brainiac_walk_uniform"), `sheet=${wk.spriteSheet}`);
  await grounded();
  for (const [act, tag] of [["knockdown", "brainiac_knockdown_uniform"], ["getup", "brainiac_getup_uniform"]]) {
    await force(act); await wf(3); const r = await p1(); await force(null); await wf(1);
    check(`${act} = real ${tag} art`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  section("5 tentacle normals connect + crouch-tentacle variant");
  for (const [name, key, tag] of [["light", "j", "brainiac_light_uniform"], ["heavy", "k", "brainiac_heavy_uniform"], ["upAttack", "i", "brainiac_up_uniform"]]) {
    let dealt = 0, sheetOk = false;
    for (let attempt = 0; attempt < 3 && !(dealt > 0 && sheetOk); attempt++) {
      await prep(56); const h0 = (await p2()).health;
      await page.keyboard.down(key); await wf(2); const mv = await p1(); if ((mv.spriteSheet || "").includes(tag)) sheetOk = true; await page.keyboard.up(key); await wf(14);
      dealt = Math.max(dealt, h0 - (await p2()).health);
    }
    check(`${name} → ${tag} + connects (${dealt.toFixed(0)} dmg)`, sheetOk && dealt > 0, `dmg=${dealt}`);
  }
  // air normal (J airborne) — timing-sensitive; retry (Stage-2 harness is the authoritative connect check)
  let airOk = false, airDmg = 0;
  for (let attempt = 0; attempt < 4 && !(airOk && airDmg > 0); attempt++) {
    await prep(50); const h0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40)); await page.keyboard.down("j");
    for (let i = 0; i < 8; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("brainiac_air_uniform")) airOk = true; await wf(1); }
    await page.keyboard.up("j"); await wf(6);
    airDmg = Math.max(airDmg, h0 - (await p2()).health);
    await grounded(); await wf(3);
  }
  check("air → brainiac_air_uniform + connects", airOk && airDmg > 0, `dmg=${airDmg.toFixed(0)}`);
  await grounded();
  // crouch-tentacle variant (Down+light)
  let csOk = false, csDmg = 0;
  for (let attempt = 0; attempt < 4 && !(csOk && csDmg > 0); attempt++) {
    await prep(50); const h0 = (await p2()).health;
    await page.keyboard.down("s"); await wf(3); await page.keyboard.down("j"); await wf(1); await page.keyboard.up("j");
    for (let i = 0; i < 10; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("brainiac_crouchtentacle_uniform")) csOk = true; await wf(1); }
    csDmg += Math.max(0, h0 - (await p2()).health); await page.keyboard.up("s"); await grounded(); await wf(3);
  }
  check("Down+light → crouch-tentacle variant + connects", csOk && csDmg > 0, `dmg=${csDmg}`);

  section("5 directional specials (Beam / Blade / Sweep / Electric Shield / Levitation)");
  // Neutral Beam (projectile) + Fwd Blade + Down Sweep — render pose + connect for damage.
  for (const [dir, move, tag, gap] of [[null, "brainiacBeam", "brainiac_beam_uniform", 120], ["F", "brainiacBlade", "brainiac_blade_uniform", 84], ["D", "brainiacSweep", "brainiac_sweep_uniform", 120]]) {
    await prep(gap); const h0 = (await p2()).health; const res = await specialDir(dir); let sh = "";
    for (let i = 0; i < 22; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) sh = a.spriteSheet; await wf(1); }
    const dmg = h0 - (await p2()).health;
    check(`${dir ?? "neutral"} → ${move} renders + connects`, ((res?.move === move) || (res?.cast === move)) && (sh || "").includes(tag) && dmg > 0, `move=${res?.move} cast=${res?.cast} dmg=${dmg.toFixed(0)}`);
    await grounded();
  }
  // Back = Electric Shield (defensive buff — raises defenseMultiplier, no hitbox)
  await prep(90); const def0 = (await p1()).defMult; const shRes = await specialDir("B"); await wf(3);
  const pp = await p1();
  check("Back → Electric Shield raises defenseMultiplier (defensive buff)", shRes?.cast === "brainiacShield" && pp.defMult > def0 + 0.01 && pp.brainiacShield === true, `cast=${shRes?.cast} defMult ${def0}→${pp.defMult}`);
  await wf(8);
  // Up = Levitation (rise onto disc)
  await prep(120); const y0 = (await p1()).y; const lvRes = await specialDir("U"); await wf(4);
  const lp = await p1();
  check("Up → Levitation rises off the ground", lvRes?.cast === "brainiacLevitate" && (lp.vy < 0 || lp.y < y0 - 2 || !lp.grounded), `cast=${lvRes?.cast} vy=${lp.vy} y ${y0}→${lp.y}`);
  await grounded();

  section("ULTIMATE — Sphere of Annihilation (Energy Pillar barrage, guaranteed ~198 EFF, no dup)");
  await prep(150);   // out of melee range → proves the barrage reaches
  const ultH0 = (await p2()).health;
  const ultRes = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate fires + casts brainiacBeam pose", !!ultRes?.cast && ultRes?.castMove === "brainiacBeam", `cast=${ultRes?.cast} castMove=${ultRes?.castMove}`);
  const fx0 = await page.evaluate(() => window.__harness.brainiacPillar());
  check("pillar cinematic ACTIVE (timer>0)", (fx0?.timer || 0) > 0, `timer=${fx0?.timer}`);
  await wf(60);
  const ultDealt = ultH0 - (await p2()).health;
  check("ultimate lands guaranteed ~198 EFF from out of range (150–240)", ultDealt >= 150 && ultDealt <= 240, `dealt=${ultDealt.toFixed(0)}`);
  const fxEnd = await page.evaluate(() => window.__harness.brainiacPillar());
  check("pillar overlay actually drew during the cinematic (renders>0)", (fxEnd?.renders || 0) > 0, `renders=${fxEnd?.renders}`);

  section("fallback-box sweep — every animationData action renders a real brainiac_ sheet (no 128² box)");
  await grounded(); await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("brainiac_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Brainiac canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
