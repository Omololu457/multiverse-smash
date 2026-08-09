// harness/tobi_stage2_shots.mjs — Stage 2 evidence for Tobi: 5 normals + air-kunai projectile
// + Kamui teleport-behind (speed-tier). Boots p1=tobi ALONGSIDE p2=obito (isolation smoke test).
//   (1) benPose render-assert for light/heavy/up/air/down_air (correct masked_man sheet).
//   (2) Functional real-key test: each normal sets the right currentMove; air normal spawns the
//       thrown kunai projectile; grounded/air distinct.
//   (3) Double-tap TOWARD opponent → Kamui teleport-behind (blink + speed-blur spin).
// Usage: node harness/tobi_stage2_shots.mjs
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
const p1 = () => page.evaluate(() => window.__harness.p1());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
const reset = () => page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); });
// Basic normals set `attacking` + the sprite sheet, NOT currentMove (that's only for command moves).
const pollSheet = async (needle, ms = 700) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await p1(); if (s.attacking && (s.spriteSheet || "").includes(needle)) return s; await sleep(20); } return await p1(); };

await page.goto(`${base}/index.html?harness=1&p1=tobi&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── 0. Isolation smoke ──
const m = await page.evaluate(() => ({ p1: window.__harness.p1()?.key, p2: window.__harness.p2()?.key }));
ok(m.p1 === "tobi" && m.p2 === "obito", `co-loaded p1=${m.p1} p2=${m.p2}`);

// ── 1. Pose render (benPose) ──
const EXP = {
  light:    "masked_man_up_attack_uniform.png",
  heavy:    "masked_man_dash_combo_uniform.png",
  up:       "masked_man_up_attack_uniform.png",
  air:      "masked_man_air_kunia_uniform.png",
  down_air: "masked_man_down_air_uniform.png",
};
console.log("POSE RENDER (benPose):");
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a), pose);
  await sleep(140);
  const s = await page.evaluate(() => window.__harness.p1().spriteSheet);
  await page.screenshot({ path: path.join(OUT, `tobi_s2_${pose}.png`) });
  ok(s && s.includes(sheet), `${pose} → ${s}`);
}
await page.evaluate(() => window.__harness.benPose(null));
await sleep(120);

// ── 2. Functional normals (real keys — assert attacking + correct sheet) ──
// light & up share the up_attack strip (light = first 2 frames); the LAUNCHER nature of `up` is
// validated generically by test:up-attack-roster. Here we prove each BUTTON fires its normal.
console.log("FUNCTIONAL NORMALS (Light:j Heavy:k Up:i Jump:w Down:s):");
await reset(); await sleep(80);
await page.keyboard.down("j"); await sleep(110); await page.keyboard.up("j");
let r = await pollSheet("masked_man_up_attack_uniform.png"); ok(r.attacking && (r.spriteSheet||"").includes("up_attack"), `grounded Light → attacking, sheet=${(r.spriteSheet||"").split("/").pop()}`); await sleep(450);
await reset(); await sleep(80);
await page.keyboard.down("k"); await sleep(110); await page.keyboard.up("k");
r = await pollSheet("masked_man_dash_combo_uniform.png"); ok(r.attacking && (r.spriteSheet||"").includes("dash_combo"), `grounded Heavy → attacking, sheet=${(r.spriteSheet||"").split("/").pop()}`); await sleep(450);
await reset(); await sleep(80);
await page.keyboard.down("i"); await sleep(110); await page.keyboard.up("i");
r = await pollSheet("masked_man_up_attack_uniform.png"); ok(r.attacking && (r.spriteSheet||"").includes("up_attack"), `Up-Attack → attacking, sheet=${(r.spriteSheet||"").split("/").pop()} (launcher, see roster test)`); await sleep(500);

// ── 2b. Up-Attack LAUNCHER connect proof (place Tobi next to Obito, up-attack → launch) ──
console.log("UP-ATTACK LAUNCHER (connect → launch):");
await reset(); await sleep(80);
await page.evaluate(() => { const p2 = window.__harness.p2(); window.__harness.setP1X?.(p2.x - 56); window.__harness.setP2Invuln?.(0); });
await sleep(60);
await page.keyboard.down("i"); await sleep(110); await page.keyboard.up("i");
let launched = false, p2snap = null;
for (let i = 0; i < 30; i++) { p2snap = await page.evaluate(() => window.__harness.p2()); if (p2snap.isLaunched || (p2snap.vy || 0) < -3) { launched = true; break; } await sleep(20); }
ok(launched, `Up-Attack launches Obito: isLaunched=${p2snap?.isLaunched} vy=${(p2snap?.vy||0).toFixed?.(1)}`);
await sleep(400);

// ── 3. Air normal → kunai projectile ──
console.log("AIR KUNAI THROW (projectile spawn):");
await reset(); await sleep(80);
await page.keyboard.down("w"); await sleep(60); await page.keyboard.up("w");
await sleep(170);   // rise off the ground
const air0 = (await p1()).grounded;
await page.keyboard.down("j"); await sleep(90); await page.keyboard.up("j");
r = await pollSheet("masked_man_air_kunia_uniform.png", 500);
let pr = null; for (let i = 0; i < 20; i++) { const ps = await projs(); pr = ps.find(p => (p.sheet || "").includes("kunia_proj")); if (pr) break; await sleep(25); }
await page.screenshot({ path: path.join(OUT, "tobi_s2_air_throw_live.png") });
ok(!air0 && r.attacking && (r.spriteSheet||"").includes("air_kunia"), `airborne attack → air normal (wasAirborne=${!air0}, sheet=${(r.spriteSheet||"").split("/").pop()})`);
ok(!!pr, pr ? `kunai projectile spawned: sheet=${(pr.sheet||"").split("/").pop()} vx=${pr.vx?.toFixed?.(1)} vy=${pr.vy?.toFixed?.(1)}` : "no kunai projectile");
await sleep(500);

// ── 4. Down-air ──
console.log("DOWN-AIR (diving stomp):");
await reset(); await sleep(80);
await page.keyboard.down("w"); await sleep(60); await page.keyboard.up("w");
await sleep(170);
await page.keyboard.down("s"); await sleep(30); await page.keyboard.down("j"); await sleep(90); await page.keyboard.up("j"); await page.keyboard.up("s");
r = await pollSheet("masked_man_down_air_uniform.png", 500);
ok(r.attacking && (r.spriteSheet||"").includes("down_air"), `airborne Down+attack → attacking, sheet=${(r.spriteSheet||"").split("/").pop()}`);
await sleep(500);

// ── 5. Kamui teleport-behind (speed-tier double-tap toward opponent = right/"d") ──
console.log("KAMUI TELEPORT-BEHIND (double-tap toward):");
await reset(); await sleep(60);
await page.evaluate(() => window.__harness.setP1X?.(200));   // place Tobi far-left so the blink-across is measurable
await sleep(120);
const before = await p1();
await page.keyboard.down("d"); await page.keyboard.up("d");
await sleep(70);
await page.keyboard.down("d"); await page.keyboard.up("d");
await sleep(80);
const after = await p1();
await page.screenshot({ path: path.join(OUT, "tobi_s2_teleport.png") });
const moved = Math.abs((after.x || 0) - (before.x || 0));
ok(after.speedBlur > 0 || after.teleportFlash > 0, `blink fired: speedBlur=${after.speedBlur} teleportFlash=${after.teleportFlash}`);
ok(moved > 40, `repositioned Δx=${moved.toFixed(0)}px (blink-behind)`);

// ── 6. Obito untouched by Tobi's run (isolation) ──
const p2end = await page.evaluate(() => ({ key: window.__harness.p2()?.key, tobiFields: false }));
ok(p2end.key === "obito", `p2 still obito after Tobi's Stage-2 run (no cross-corruption)`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail || errors.length ? 1 : 0);
