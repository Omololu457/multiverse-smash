// harness/ichigo.test.mjs — CONSOLIDATED full-kit test for Ichigo Kurosaki (Bleach).
// The Stage-5 closing suite: exercises EVERY move built across Stages 1-4 in one run —
//   • registration + portrait loads (no 404) + movement/state + both intros + 8-way dash pose
//   • 5 standard normals (light/heavy/up/air/down_air)
//   • expanded "Zangetsu" command system (Fwd+Heavy rekka R1→R2→R3, Down/Back+Heavy, Fwd+Light, Dash+Heavy)
//   • 5 specials (Getsuga projectile / Charged / Hollow Getsuga / Hollow Rising / Aerial Getsuga)
//   • Getsuga Tenshō ultimate (2-part freeze-cinematic, guaranteed launch)
// (Deep per-stage assertions live in ichigo_stage{2,3,4}_shots.mjs + ichigo_dirdash.mjs.)
// Usage: node harness/ichigo.test.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [], net404 = [];
page.on("pageerror", e => jsErrors.push(String(e)));
page.on("console", m => { if (m.type() === "error") jsErrors.push(m.text()); });
page.on("response", r => { if (r.status() === 404) net404.push(r.url().split("/").pop()); });

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.ichigoCmd());
const cine = () => page.evaluate(() => window.__harness.ichigoUltCine());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
async function waitPose(needle, maxF = 22) { for (let i = 0; i < maxF; i++) { const a = await p1(); if (has(a, needle)) return a; await waitFrames(1); } return await p1(); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
async function reset(gap = 50) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
// robust command-normal opener: hold dir (if any) + tap button, wait for the pose sheet
async function fireCmd(dir, btn, sheet, gap = 50) {
  await reset(gap); const hp0 = (await p2()).health;
  if (dir) { await page.keyboard.down(dir); await waitFrames(2); }
  await page.keyboard.down(btn); await waitFrames(2); await page.keyboard.up(btn);
  const pose = await waitPose(sheet, 18);
  if (dir) await page.keyboard.up(dir);
  await waitFrames(14);
  return { pose, dmg: hp0 - (await p2()).health };
}

await page.goto(`${base}/index.html?harness=1&p1=ichigo&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// ── REGISTRATION + PORTRAIT ──
section("Registration + portrait");
const cs = await page.evaluate(() => window.__harness.showCharSelect("bleach", "training"));
check("Ichigo in the Bleach universe roster", cs.roster.includes("ichigo"), `roster=[${cs.roster.join(",")}]`);
const portraitOk = await page.evaluate(async () => { const img = new Image(); img.src = "./ichigo_portrait.png"; try { await img.decode(); return img.naturalWidth > 0 && img.naturalHeight > 0; } catch { return false; } });
check("portrait loads (no 404)", portraitOk && !net404.includes("ichigo_portrait.png"), `w×h ok=${portraitOk}`);

await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── MOVEMENT / STATE + intros + 8-way dash pose ──
section("Movement / state + intros + directional dash");
for (const [pose, sheet] of [["idle","idle_uniform"],["run","run_uniform"],["jump","jump_uniform"],["guard","block_uniform"],["dash","dash_uniform"],["charge","charge_uniform"],["intro1","intro_1_uniform"],["intro2","intro_2_uniform"]]) {
  await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose); await waitFrames(3);
  check(`${pose} → ${sheet}`, has(await p1(), sheet), `sheet=${((await p1()).spriteSheet||"").split("/").pop()}`);
}
await page.evaluate(() => window.__harness.benPose(null));
{ const info = await page.evaluate(() => window.__harness.ichigoDashPose(0)); await waitFrames(3);
  check("8-way dash pose (dashDir) renders", has(await p1(), "dash_But_in_different_directions_uniform"), `action=${info?.action}`);
  await page.evaluate(() => window.__harness.ichigoDashPose(null)); }

// ── 5 STANDARD NORMALS ──
section("Standard normals");
for (const [nm, key, sheet, g] of [["light","j","foward_sword-slash_uniform",44],["heavy","k","sword_combo_1_uniform",54],["up","i","up_attack_uniform",44]]) {
  await reset(g); const hp0 = (await p2()).health; await page.keyboard.down(key);
  const mv = await waitPose(sheet, 20); await page.keyboard.up(key); await waitFrames(12);
  check(`${nm} → ${sheet} + connects`, has(mv, sheet) && hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`);
}
await reset(40);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("j");
  const mv = await waitPose("launch_attack_2_uniform", 16); await page.keyboard.up("j"); await waitFrames(12);
  check("air → launch_attack_2_uniform + connects", has(mv, "launch_attack_2_uniform") && hp0 - (await p2()).health > 0); }
await reset(30);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(54)); await page.keyboard.down("s"); await page.keyboard.down("j");
  const mv = await waitPose("down_air_attack_uniform", 14); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(12);
  check("down_air → down_air_attack_uniform + connects", has(mv, "down_air_attack_uniform") && hp0 - (await p2()).health > 0); }

// ── EXPANDED COMMAND SYSTEM ──
section("Zangetsu command system");
// Fwd+Heavy rekka chain
await reset(52);
{ const chain = []; await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 70; i++) { const c = await cmd(); if (c?.move && !chain.includes(c.move)) chain.push(c.move);
    if (chain.includes("ichigoRekka3")) break;
    if (c?.rekkaNext && c?.connected && c?.phase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); } else await waitFrames(1); }
  await page.keyboard.up("d"); await waitFrames(14);
  check("Fwd+Heavy rekka R1→R2→R3", chain[0] === "ichigoRekka1" && chain.includes("ichigoRekka2") && chain.includes("ichigoRekka3"), `chain=[${chain.join("→")}]`); }
{ const r = await fireCmd("s","k","down_attack_uniform",50);        check("Down+Heavy → down_attack (low sweep) + connects", has(r.pose,"down_attack_uniform") && r.dmg > 0, `dmg=${r.dmg}`); }
{ const r = await fireCmd("a","k","launch_attack_1_uniform",46);    check("Back+Heavy → launch_attack_1 (launcher) + connects", has(r.pose,"launch_attack_1_uniform") && r.dmg > 0, `dmg=${r.dmg}`); }
{ const r = await fireCmd("d","j","front_attack_punch_uniform",40); check("Fwd+Light → front_attack_punch (jab) + connects", has(r.pose,"front_attack_punch_uniform") && r.dmg > 0, `dmg=${r.dmg}`); }
await reset(70);
{ const hp0 = (await p2()).health; await page.keyboard.down("d"); await page.keyboard.up("d"); await waitFrames(1); await page.keyboard.down("d");
  await waitFrames(1); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const mv = await waitPose("double_dash_combo_uniform", 18); await page.keyboard.up("d"); await waitFrames(14);
  check("Dash+Heavy → double_dash_combo + connects", has(mv, "double_dash_combo_uniform") && hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`); }

// ── 5 SPECIALS ──
section("Specials (Getsuga / Charged / Hollow Getsuga / Hollow Rising / Aerial)");
// Neutral = Getsuga Tenshō projectile (independent collision, retry-robust first press)
await reset(220);
{ const e0 = (await p1()).energy; let pose = await p1(), spawned = null;
  for (let a = 0; a < 5; a++) { await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(2); pose = await waitPose("specail_2_uniform", 8); if (has(pose,"specail_2_uniform")) break; await waitFrames(6); }
  for (let i = 0; i < 12 && !spawned; i++) { spawned = (await projs()).find(p => p.name === "ichigo_getsuga"); if (!spawned) await waitFrames(1); }
  const hp0 = (await p2()).health; for (let i = 0; i < 40 && !((await p2()).health < hp0); i++) await waitFrames(1);
  check("Getsuga Tenshō: cast + projectile spawns + connects at range", has(pose,"specail_2_uniform") && !!spawned && (hp0 - (await p2()).health) > 0 && (e0 - (await p1()).energy) > 0, `spent=${Math.round(e0 - (await p1()).energy)}`); }
{ const r = await fireCmd("d","l","specail_1_uniform",56);            check("Fwd+Special → Charged Getsuga Slash + connects", has(r.pose,"specail_1_uniform") && r.dmg > 0, `dmg=${r.dmg}`); }
{ const r = await fireCmd("s","l","super_sword_attack_uniform",52);   check("Down+Special → Hollow Getsuga (dark super) + connects", has(r.pose,"super_sword_attack_uniform") && r.dmg > 0, `dmg=${r.dmg}`); }
// Up+Special MUST be simultaneous (w+l same frame) so the engine suppresses the jump (Yuji-Pillar pattern).
// Retry-robust: if the keydowns straddle a frame boundary the jump can slip through, so re-attempt.
{ let pose = null, dmg = 0;
  for (let attempt = 0; attempt < 5 && dmg <= 0; attempt++) {
    await reset(46); const hp0 = (await p2()).health;
    await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    pose = await waitPose("super_up_attack_uniform", 16); await page.keyboard.up("w"); await waitFrames(14);
    dmg = hp0 - (await p2()).health;
  }
  check("Up+Special → Hollow Rising (dark super) + connects", has(pose,"super_up_attack_uniform") && dmg > 0, `dmg=${dmg}`); }
await reset(40);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(60)); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const mv = await waitPose("air_attack_specail_uniform", 16); await waitFrames(12);
  check("airborne Special → Aerial Getsuga Dive + connects", has(mv, "air_attack_specail_uniform") && hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`); }

// ── ULTIMATE ──
section("Ultimate — Getsuga Tenshō (2-part freeze-cinematic)");
await reset(60);   // ensure P1 is grounded + actionable after the prior AIRBORNE special
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1"); });
await waitFrames(4);
{ const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 520); await waitFrames(2);
  const e0 = (await p1()).energy, hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.ichigoUltCine()?.active, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const on = await cine();
  check("ultimate activates freeze-cinematic on real caster", on.active === true && on.casterKey === "ichigo");
  check("ultimate spends 100 reiatsu", Math.round(e0 - (await p1()).energy) === 100);
  let p1seen = false, p2seen = false;
  for (let i = 0; i < 40 && !p1seen; i++) { if (/ichigoUlt1/.test((await cine()).castMove || "")) p1seen = true; else await waitFrames(1); }
  for (let i = 0; i < 60 && !p2seen; i++) { const s = await cine(); if (!s.active) break; if (/ichigoUlt2/.test(s.castMove || "")) p2seen = true; else await waitFrames(1); }
  check("plays part_1 (dash-slash) → part_2 (uppercut) continuous", p1seen && p2seen);
  await page.waitForFunction(() => window.__harness.ichigoUltCine()?.active === false, null, { timeout: 6000, polling: 16 }).catch(() => {});
  check("GUARANTEED range-independent Getsuga (~198 = 330×0.60 at 520px)", hp0 - (await p2()).health >= 180, `dmg=${hp0 - (await p2()).health}`);
  check("cinematic ends → combat resumes (not stuck)", (await cine()).active === false); }

check("no JS page errors (ex-portrait, now extracted)", jsErrors.filter(e => !/portrait/.test(e)).length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
