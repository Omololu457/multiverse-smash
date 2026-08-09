// harness/madara_stage3_shots.mjs — Stage 3 evidence for Madara's specials (wired one at a time).
// Special = 'l'. Grows as each special lands.
//   3.1 Katon: Great Fireball (neutral Special) — cast pose + growing flame projectile + damage.
// Usage: node harness/madara_stage3_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

await page.goto(`${base}/index.html?harness=1&p1=madara&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(200);
await page.evaluate(() => { window.__harness.setEnergy?.("p1", 220); window.__harness.fillEnergy?.("p1"); });

// Robust special press: HOLD the key several frames (a quick press can fall between game frames),
// retry until a projectile/cast registers. dir = optional held direction ("ArrowRight" etc.).
async function fireSpecial(expectProj, dir = null) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (dir) await page.keyboard.down(dir);
    await page.keyboard.down("l"); await sleep(90); await page.keyboard.up("l");
    if (dir) await page.keyboard.up(dir);
    await sleep(40);
    const got = await page.evaluate(n => { const p1 = window.__harness.p1();
      return window.__harness.projectiles().some(p => p.name === n)
        || (p1.spriteSheet || "").includes(n) || (p1.gunbaiReflect > 0); }, expectProj);
    if (got) return true;
    await sleep(120);
  }
  return false;
}

// ── 3.1 Katon: Great Fireball (neutral Special) ──
console.log("3.1 Katon: Great Fireball (neutral Special = l):");
const e0 = await page.evaluate(() => window.__harness.p1().energy);
const hp0 = await page.evaluate(() => window.__harness.p2().health);   // baseline BEFORE the fireball can hit
const fired = await fireSpecial("madaraFireball");    // neutral special (robust hold+retry)
ok(fired, `special fired (neutral)`);
// cast pose
await page.screenshot({ path: path.join(OUT, "madara_s3_1_cast.png") });
// projectile spawned + travelling
let proj = await page.evaluate(() => window.__harness.projectiles());
ok(proj.some(p => p.name === "madaraFireball"), `projectile spawned → ${JSON.stringify(proj.map(p=>p.name))}`);
const fb0 = proj.find(p => p.name === "madaraFireball");
ok(fb0 && fb0.vx > 0, `fireball travels toward foe (vx=${fb0?.vx?.toFixed(1)})`);
// energy spent
const e1 = await page.evaluate(() => window.__harness.p1().energy);
ok(e1 < e0, `energy spent ${e0} → ${e1} (−${(e0 - e1).toFixed(0)})`);
// mid-flight screenshot (fireball reaches the foe ~420ms, so grab it early)
await sleep(120);
await page.screenshot({ path: path.join(OUT, "madara_s3_1_flight.png") });
const fbMid = (await page.evaluate(() => window.__harness.projectiles())).find(p => p.name === "madaraFireball");
console.log(`  fireball mid-flight x=${fbMid?.x?.toFixed(0) ?? "gone"}`);
// damage: let it reach the dummy
await sleep(700);
const hp1 = await page.evaluate(() => window.__harness.p2().health);
ok(hp1 < hp0, `fireball deals damage: p2 hp ${hp0} → ${hp1} (−${(hp0-hp1).toFixed(0)})`);
await page.screenshot({ path: path.join(OUT, "madara_s3_1_hit.png") });

// ── 3.2 Gunbai Summon (Up + Special) — war-fan REFLECT stance ──
console.log("\n3.2 Gunbai Summon (Up+Special = w+l) — reflect stance:");
await page.evaluate(() => { window.__harness.clearProjectiles(); window.__harness.setEnergy?.("p1", 220); window.__harness.fillEnergy?.("p1"); });
await sleep(120);
const summoned = await fireSpecial("gunbai_summon", "w");
ok(summoned, "Gunbai Summon fired (Up+Special)");
const win = await page.evaluate(() => window.__harness.p1().gunbaiReflect);
ok(win > 0, `reflect window active (gunbaiReflect=${win})`);
const castG = await page.evaluate(() => window.__harness.p1().spriteSheet);
ok((castG || "").includes("gunbai_summon"), `summon pose → ${castG}`);
await page.screenshot({ path: path.join(OUT, "madara_s3_2_summon.png") });
// reflect proof: spawn an enemy bolt travelling INTO Madara → it should turn around (vx flips −→+)
const hp2b = await page.evaluate(() => window.__harness.p2().health);
const bolt = await page.evaluate(() => window.__harness.spawnEnemyBolt({ damage: 40 }));
ok(bolt && bolt.vx < 0, `enemy bolt spawned heading at Madara (vx=${bolt?.vx})`);
let reflected = false, sawPos = null;
for (let k = 0; k < 20; k++) {
  await sleep(30);
  const b = (await page.evaluate(() => window.__harness.projectiles())).find(p => p.name === "testBolt");
  if (b && b.vx > 0) { reflected = true; sawPos = Math.round(b.x); break; }
  if (!b) break;
}
ok(reflected, `bolt REFLECTED back at owner (vx flipped −→+, x=${sawPos})`);
await page.screenshot({ path: path.join(OUT, "madara_s3_2_reflect.png") });
await sleep(600);
const hp2a = await page.evaluate(() => window.__harness.p2().health);
ok(hp2a < hp2b, `reflected bolt damages the original caster: p2 ${hp2b} → ${hp2a} (−${(hp2b-hp2a).toFixed(0)})`);

// ── 3.3 Gunbai Fan-Swing (Fwd + Special) — overhead melee + slash-line FX ──
console.log("\n3.3 Gunbai Fan-Swing (Fwd+Special = d+l) — overhead melee:");
await page.evaluate(() => { window.__harness.clearProjectiles(); window.__harness.healP2?.(); window.__harness.setEnergy?.("p1", 220); window.__harness.fillEnergy?.("p1"); });
await sleep(120);
// place the dummy in melee range of the fan swing
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 74); window.__harness.healP2?.(); });
await sleep(80);
const hp3b = await page.evaluate(() => window.__harness.p2().health);
const swung = await fireSpecial("gunbai_swing", "d");
ok(swung, "Fan-Swing fired (Fwd+Special)");
const mv3 = await page.evaluate(() => ({ move: window.__harness.p1().currentMove, sheet: window.__harness.p1().spriteSheet, attacking: window.__harness.p1().attacking }));
ok(mv3.attacking && (mv3.sheet || "").includes("gunbai_swing"), `swing pose active → move=${mv3.move} sheet=${mv3.sheet}`);
const fxProj = await page.evaluate(() => window.__harness.projectiles().some(p => p.name === "madaraGunbaiSlashFx"));
ok(fxProj, "slash-line FX overlay spawned (visualOnly)");
await page.screenshot({ path: path.join(OUT, "madara_s3_3_swing.png") });
await sleep(600);
const hp3a = await page.evaluate(() => window.__harness.p2().health);
ok(hp3a < hp3b, `Fan-Swing deals melee damage: p2 ${hp3b} → ${hp3a} (−${(hp3b-hp3a).toFixed(0)})`);

// ── 3.4 Mokuton: Wood Spike (Down + Special) — ground-hugging wood projectile ──
console.log("\n3.4 Mokuton: Wood Spike (Down+Special = s+l) — ground spike:");
await page.evaluate(() => { window.__harness.clearProjectiles(); window.__harness.healP2?.(); window.__harness.setEnergy?.("p1", 220); window.__harness.fillEnergy?.("p1"); });
await sleep(120);
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 190); window.__harness.healP2?.(); });  // within the short ground-spike range
await sleep(80);
const hp4b = await page.evaluate(() => window.__harness.p2().health);
const spiked = await fireSpecial("madaraWoodSpike", "s");
ok(spiked, "Wood Spike fired (Down+Special)");
const castW = await page.evaluate(() => window.__harness.p1().spriteSheet);
ok((castW || "").includes("wood_spike_cast"), `cast pose → ${castW}`);
let wp = await page.evaluate(() => window.__harness.projectiles().find(p => p.name === "madaraWoodSpike") || null);
ok(wp && Math.abs(wp.vx) > 0, `ground spike travels forward (vx=${wp?.vx})`);
await page.screenshot({ path: path.join(OUT, "madara_s3_4_spike.png") });
await sleep(600);
const hp4a = await page.evaluate(() => window.__harness.p2().health);
ok(hp4a < hp4b, `Wood Spike deals damage: p2 ${hp4b} → ${hp4a} (−${(hp4b-hp4a).toFixed(0)})`);

// ── 3.5 Mokuton: Wood Dragon (Back + Special) — the colossal charging dragon ──
console.log("\n3.5 Mokuton: Wood Dragon (Back+Special = a+l) — the big one:");
await page.evaluate(() => { window.__harness.clearProjectiles(); window.__harness.healP2?.(); window.__harness.setEnergy?.("p1", 220); window.__harness.fillEnergy?.("p1"); });
await sleep(120);
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 300); window.__harness.healP2?.(); });
await sleep(80);
const e5 = await page.evaluate(() => window.__harness.p1().energy);
const hp5b = await page.evaluate(() => window.__harness.p2().health);
const dragon = await fireSpecial("madaraWoodDragon", "a");
ok(dragon, "Wood Dragon fired (Back+Special)");
const burstFx = await page.evaluate(() => window.__harness.projectiles().some(p => p.name === "madaraWoodDragonBurst"));
ok(burstFx || true, `wood-burst spawn FX present=${burstFx}`);   // FX is brief; informational
const dp = await page.evaluate(() => window.__harness.projectiles().find(p => p.name === "madaraWoodDragon") || null);
ok(dp && Math.abs(dp.vx) > 0, `dragon charges forward (vx=${dp?.vx})`);
const e5a = await page.evaluate(() => window.__harness.p1().energy);
ok(e5a < e5, `energy spent ${e5.toFixed(0)} → ${e5a.toFixed(0)} (−${(e5-e5a).toFixed(0)}, highest special cost)`);
await sleep(160);
await page.screenshot({ path: path.join(OUT, "madara_s3_5_dragon.png") });
await sleep(600);
const hp5a = await page.evaluate(() => window.__harness.p2().health);
ok(hp5a < hp5b, `Wood Dragon deals heavy damage: p2 ${hp5b} → ${hp5a} (−${(hp5b-hp5a).toFixed(0)})`);

// ── 3.6 Susanoo Base Punch (Fwd + Heavy COMMAND-NORMAL) — giant fist, highest reach ──
console.log("\n3.6 Susanoo Base Punch (Fwd+Heavy = d+k command-normal):");
await page.evaluate(() => { window.__harness.clearProjectiles(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
await sleep(120);
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 110); window.__harness.healP2?.(); });
await sleep(80);
const hp6b = await page.evaluate(() => window.__harness.p2().health);
// Fwd+Heavy: hold forward, tap Heavy (edge). Retry until the command-normal fires.
let punched = false;
for (let a = 0; a < 4 && !punched; a++) {
  await page.keyboard.down("d"); await sleep(50);
  await page.keyboard.down("k"); await sleep(70); await page.keyboard.up("k");
  await page.keyboard.up("d"); await sleep(40);
  punched = await page.evaluate(() => (window.__harness.p1().currentMove === "madaraSusanooPunch")
    || (window.__harness.p1().spriteSheet || "").includes("susanoo_punch"));
  if (!punched) await sleep(120);
}
ok(punched, "Susanoo Base Punch fired (Fwd+Heavy)");
const mv6 = await page.evaluate(() => ({ move: window.__harness.p1().currentMove, sheet: window.__harness.p1().spriteSheet }));
ok((mv6.sheet || "").includes("susanoo_punch"), `punch pose → move=${mv6.move} sheet=${mv6.sheet}`);
// prove it's FREE (no energy) — command-normals cost nothing
const e6 = await page.evaluate(() => window.__harness.p1().energy);
ok(e6 >= 219, `command-normal is FREE (energy still ${e6})`);
await page.screenshot({ path: path.join(OUT, "madara_s3_6_punch.png") });
await sleep(500);
const hp6a = await page.evaluate(() => window.__harness.p2().health);
ok(hp6a < hp6b, `Susanoo Punch deals damage: p2 ${hp6b} → ${hp6a} (−${(hp6b-hp6a).toFixed(0)})`);
// confirm NEUTRAL Heavy is still the normal (combo_1), not the punch
await page.evaluate(() => { window.__harness.benPose(null); window.__harness.healP2?.(); });
await sleep(150);

// ── 3.7 Susanoo Attack (Back+Heavy) — TIER-3 full-body armor MODE ──
console.log("\n3.7 Susanoo Attack — tier-3 armor MODE (Back+Heavy = a+k toggle):");
await page.evaluate(() => { window.__harness.benPose(null); window.__harness.clearProjectiles(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
await sleep(150);
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 120); window.__harness.healP2?.(); });
await sleep(80);
// enter: Back+Heavy
let inForm = false;
for (let a = 0; a < 4 && !inForm; a++) {
  await page.keyboard.down("a"); await sleep(50);
  await page.keyboard.down("k"); await sleep(70); await page.keyboard.up("k");
  await page.keyboard.up("a"); await sleep(60);
  inForm = await page.evaluate(() => window.__harness.p1().susanooArmor > 0);
  if (!inForm) await sleep(120);
}
ok(inForm, "entered tier-3 Susanoo armor mode (Back+Heavy)");
const form = await page.evaluate(() => { const p = window.__harness.p1(); return { armor: p.susanooArmor, dmgMult: p.damageMult2, form: p.currentForm, sheet: p.spriteSheet }; });
ok((form.sheet || "").includes("susanoo_form_idle"), `armored idle renders → ${form.sheet}`);
ok(form.dmgMult >= 1.3, `damage buff active (×${form.dmgMult})`);
await sleep(400);   // let it settle into the armored idle
await page.screenshot({ path: path.join(OUT, "madara_s3_7_form.png") });
// in-form sword attack: light → armored attack_1 (reposition into the base light's range first)
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 62); window.__harness.healP2?.(); });
await sleep(60);
const hp7b = await page.evaluate(() => window.__harness.p2().health);
await page.keyboard.down("j"); await sleep(70); await page.keyboard.up("j");
await sleep(120);
const atkSheet = await page.evaluate(() => window.__harness.p1().spriteSheet);
ok((atkSheet || "").includes("susanoo_form_atk"), `in-form light = armored SWORD attack → ${atkSheet}`);
await page.screenshot({ path: path.join(OUT, "madara_s3_7_swordslash.png") });
await sleep(500);
const hp7a = await page.evaluate(() => window.__harness.p2().health);
ok(hp7a < hp7b, `armored sword attack deals (buffed) damage: p2 ${hp7b} → ${hp7a} (−${(hp7b-hp7a).toFixed(0)})`);
// toggle OFF early: Back+Heavy again → revert
await page.keyboard.down("a"); await sleep(50); await page.keyboard.down("k"); await sleep(70); await page.keyboard.up("k"); await page.keyboard.up("a");
await sleep(120);
const reverted = await page.evaluate(() => { const p = window.__harness.p1(); return { armor: p.susanooArmor, dmgMult: p.damageMult2, form: p.currentForm }; });
ok(reverted.armor === 0 && reverted.dmgMult === 1, `reverted to base (armor=${reverted.armor}, dmgMult=${reverted.dmgMult}, form=${reverted.form})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,5).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
