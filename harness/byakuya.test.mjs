// harness/byakuya.test.mjs — CANONICAL Byakuya Kuchiki (Bleach) suite (mirrors mayuri.test.mjs / saitama.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 2–5: sprite gate / stats / portrait /
// "Reiatsu" label / attribution, movement, the 5 normals + crouch-variant, the specials (Petal Cast projectile,
// Straight Thrust, the Utsusemi Re-form teleport-strike, Shunpo i-frame blink), the Bankai ultimate cinematic
// (live fighter, charge→transform→thrust, guaranteed payoff), a STATIC sheet+portrait sweep, and a RUNTIME
// fallback-box sweep (every animationData action → a real byakuya_ sheet, no 128² box).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
import { PROJECT_ART_KEYS } from "../credits.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait + FX/projectile is a real file. ──
section("STATIC — every animationData sheet + portrait + FX/projectile exists on disk");
const byakuya = characters.byakuya;
const ad = byakuya.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
// Referenced in abilities.js / game.js (NOT animationData) — assert explicitly too.
const extra = [
  "./byakuya_petal_proj_uniform.png",                                     // Petal Cast projectile
  "./byakuya_petal_fx_uniform.png", "./byakuya_thrust_fx_uniform.png",    // drawByakuyaSpecialFx overlays
  "./byakuya_bankai_wings_grow_uniform.png", "./byakuya_bankai_wings_full_uniform.png", "./byakuya_bankai_blast_uniform.png",   // Bankai cinematic overlays
];
const missing = [];
for (const s of [...sheets, ...extra, byakuya.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + ${extra.length} FX/proj + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (byakuya_portrait.png)", (byakuya.portrait || "").includes("byakuya_portrait"), `portrait=${byakuya.portrait}`);
check("technician glass-cannon stats (HP1080/EN200/atk92/def86/spd92, reiatsu, scale1.1, crouchIdle)",
  byakuya.stats.maxHealth === 1080 && byakuya.stats.maxEnergy === 200 && byakuya.stats.attack === 92 && byakuya.stats.defense === 86 &&
  byakuya.stats.speed === 92 && Math.abs(byakuya.spriteScale - 1.1) < 0.01 && byakuya.traits.energyType === "reiatsu" && byakuya.movement?.crouchIdle === true,
  JSON.stringify(byakuya.stats));
check("attributed in credits (PROJECT_ART_KEYS)", PROJECT_ART_KEYS.includes("byakuya"), "");

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const bfx = () => page.evaluate(() => window.__harness.byakuyaFx("p1"));
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function prep(gap) {
  await grounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await wf(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap); await wf(2);
}
async function waitSheet(sheet, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await wf(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=byakuya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Byakuya", g.key === "byakuya", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = byakuya_idle_uniform", (g.spriteSheet || "").includes("byakuya_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.1", Math.abs((g.spriteScale || 0) - 1.1) < 0.01, `${g.spriteScale}`);
  check("HP 1080 / EN 200 (glass cannon)", g.maxHealth === 1080 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("byakuya"));
  check("portrait wired to ./byakuya_portrait.png", (portrait || "").includes("byakuya_portrait"), `portrait=${portrait}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Reiatsu", energyLabel === "Reiatsu", `label=${energyLabel}`);

  section("movement smoke (walk)");
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await page.keyboard.up("d"); await wf(3);
  check("forward movement → byakuya_walk_uniform", /byakuya_walk_uniform/.test(rn.spriteSheet || ""), `sheet=${rn.spriteSheet}`);

  section("normals — light connects + up-launcher launches");
  await prep(52);
  { const hp0 = (await p2()).health; await page.keyboard.down("j"); await waitSheet("byakuya_light_uniform"); await page.keyboard.up("j"); await wf(20);
    check("light connects", (await p2()).health < hp0, `hp0=${hp0}`); }
  await prep(52);
  { const hp0 = (await p2()).health; await page.keyboard.down("i"); await waitSheet("byakuya_up_uniform"); await page.keyboard.up("i"); await wf(6);
    const d2 = await p2(); check("up-attack launches P2 (airborne / vy<0)", !d2.grounded || d2.vy < -1, `grounded=${d2.grounded} vy=${(d2.vy || 0).toFixed(1)}`);
    await wf(16); check("up-attack connects", d2.health < hp0, `hp0=${hp0}`); }

  section("specials — Petal Cast projectile / Straight Thrust / Re-form teleport-strike / Shunpo i-frames");
  await prep(120);
  { const r = await specialDir(null); check("neutral → Petal Cast pose", r?.cast === "byakuyaPetalCast", `cast=${r?.cast}`);
    let saw = false; for (let i = 0; i < 16; i++) { if ((await projs()).some(p => (p.name || "").includes("byakuyaPetal"))) { saw = true; break; } await wf(1); }
    check("Petal Cast spawns petal projectiles", saw, ""); }
  await prep(56);
  { const hp0 = (await p2()).health; const r = await specialDir("D"); check("Down → Straight Thrust", (r?.move === "byakuyaThrust"), `move=${r?.move}`);
    await wf(24); check("Straight Thrust connects", (await p2()).health < hp0, `hp0=${hp0}`); }
  await prep(230);
  { const a0 = await p1(); const d0 = Math.abs((await p2()).x - a0.x); const hp0 = (await p2()).health;
    const r = await specialDir("U"); check("Up → Re-form vanish pose", r?.cast === "byakuyaReformVanish", `cast=${r?.cast}`);
    await waitSheet("byakuya_reform_overhead_uniform", 30);
    const a1 = await p1(); check("Re-form teleport closes the gap", Math.abs((await p2()).x - a1.x) < d0 - 40, `dist ${d0.toFixed(0)} → ${Math.abs((await p2()).x - a1.x).toFixed(0)}`);
    await wf(18); check("Re-form Overhead connects", (await p2()).health < hp0, `hp0=${hp0}`); }
  await prep(70);
  { const a0 = await p1(); const d0 = Math.abs((await p2()).x - a0.x);
    const r = await specialDir("B"); check("Back → Shunpo blink pose", r?.cast === "byakuyaShunpoOut", `cast=${r?.cast}`);
    check("Shunpo grants i-frames", ((await bfx())?.invuln || 0) > 0, "");
    await wf(10); check("Shunpo repositions away", Math.abs((await p2()).x - (await p1()).x) > d0 + 40, ""); }

  section("ULTIMATE — Bankai: Senbonzakura Kageyoshi (live-fighter cinematic, guaranteed payoff)");
  await prep(150);
  { const hp0 = (await p2()).health;
    const r = await page.evaluate(() => window.__harness.p1Ultimate());
    check("Bankai cast fires", !!r?.cast && r?.castMove === "byakuyaBankaiCharge", `cast=${r?.cast} castMove=${r?.castMove}`);
    check("cinematic timer running (drives wings overlay)", ((await bfx())?.bankaiTimer || 0) > 0, "");
    let sawT = false, sawH = false;
    for (let i = 0; i < 70; i++) { const s = await bfx(); if (s?.castMove === "byakuyaBankaiTransform") sawT = true; if (s?.castMove === "byakuyaBankaiThrust") sawH = true; await wf(1); }
    check("phases: charge → transform → thrust", sawT && sawH, `transform=${sawT} thrust=${sawH}`);
    for (let i = 0; i < 30 && (await p2()).health >= hp0; i++) await wf(1);
    const eff = hp0 - (await p2()).health;
    check("guaranteed payoff in cinematic-ult band (~150–260 EFF)", eff >= 150 && eff <= 300, `EFF=${eff.toFixed(0)}`);
    await wf(40); check("Bankai timer cleared after cinematic", ((await bfx())?.bankaiTimer || 0) === 0, ""); }

  section("RUNTIME fallback-box sweep — every animationData action resolves a real byakuya_ sheet");
  await grounded();
  const boxHit = [];
  for (const act of Object.keys(ad)) {
    await force(act); await wf(3); const r = await p1();
    if (!(r.spriteSheet || "").includes("byakuya_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await wf(1);
  }
  check(`all ${Object.keys(ad).length} animationData actions resolve a byakuya_ sheet (no 128² box)`, boxHit.length === 0, boxHit.join(" | "));

  section("integrity");
  check("no JS errors across the whole suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Byakuya canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
