// harness/madara.test.mjs — canonical full-kit test for MADARA UCHIHA (Stage 6).
// Covers: registration · all 5 normals + air_heavy · all 7 specials individually ·
// both Ultimate tiers + the energy-gate test · duplicate-render guard on both cinematics.
// Keys: Move A/D · Jump W · Down S · Light J · Heavy K · Special L · Ultimate U.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const P1 = () => page.evaluate(() => window.__harness.p1());
const P2 = () => page.evaluate(() => window.__harness.p2());
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
const reset = () => page.evaluate(() => { window.__harness.clearProjectiles(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.benPose(null); });
const waitIdle = async () => { for (let i=0;i<40;i++){ const p = await P1(); if (!p.attacking && (p.attackPhase === "idle" || !p.attackPhase) && !p.currentMove) return; await sleep(60); } };
const nearP2 = (gap) => page.evaluate(g => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + g); window.__harness.healP2?.(); }, gap);

// robust special: HOLD the special key (a press can fall between game frames) + optional held direction; retry.
async function special(needle, dir = null) {
  for (let a = 0; a < 4; a++) {
    if (dir) await page.keyboard.down(dir);
    await page.keyboard.down("l"); await sleep(90); await page.keyboard.up("l");
    if (dir) await page.keyboard.up(dir);
    await sleep(50);
    const got = await page.evaluate(n => { const p = window.__harness.p1();
      return window.__harness.projectiles().some(x => x.name === n) || (p.spriteSheet||"").includes(n) || p.gunbaiReflect > 0 || p.attacking; }, needle);
    if (got) return true;
    await sleep(120);
  }
  return false;
}
async function cmd(dir, btn) { // command-normal: hold direction, tap attack
  for (let a = 0; a < 4; a++) {
    await page.keyboard.down(dir); await sleep(50);
    await page.keyboard.down(btn); await sleep(70); await page.keyboard.up(btn);
    await page.keyboard.up(dir); await sleep(50);
    if (await page.evaluate(() => window.__harness.p1().attacking || window.__harness.p1().susanooArmor > 0 || window.__harness.p1().currentMove)) return true;
    await sleep(110);
  }
  return false;
}

await page.goto(`${base}/index.html?harness=1&p1=madara&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(200);

// ── REGISTRATION ──
console.log("REGISTRATION:");
const reg = await page.evaluate(() => { const p = window.__harness.p1(); return { key: p.key, ready: p.spriteReady, scale: p.spriteScale, hp: p.maxHealth, en: p.maxEnergy }; });
ok(reg.key === "madara", `loads as madara (key=${reg.key})`);
ok(reg.ready, `sprites decoded (spriteReady=${reg.ready})`);
ok(Math.abs(reg.scale - 1.89) < 0.01, `spriteScale 1.89 (${reg.scale})`);   // HEIGHT-REF: canon 179cm → target ~112px (was 1.8)
ok(reg.hp === 1180 && reg.en === 220, `stats HP1180/En220 (${reg.hp}/${reg.en})`);
ok(fs.existsSync(path.join(ROOT, "madara_portrait.png")), "portrait file exists");

// ── NORMALS (pose render via benPose + one live connect) ──
console.log("\nNORMALS:");
for (const [pose, sheet] of Object.entries({ light:"slap_uniform", heavy:"combo_1_uniform", up:"up_attack_uniform", air:"air_combo_1_uniform", air_heavy:"susanoo_grab_air_uniform" })) {
  await page.evaluate(a => window.__harness.benPose(a), pose);
  await sleep(150);
  const s = await page.evaluate(() => window.__harness.p1().spriteSheet);
  ok((s||"").includes(sheet), `normal ${pose} → ${s}`);
}
await page.evaluate(() => window.__harness.benPose(null)); await sleep(120);
await nearP2(60);
let hp0 = (await P2()).health;
await page.keyboard.down("j"); await sleep(70); await page.keyboard.up("j"); await sleep(400);
ok((await P2()).health < hp0, `light connects for damage (${hp0}→${(await P2()).health})`);

// ── SPECIALS (all 7, individually) ──
console.log("\nSPECIALS (7):");
// 1 Katon Fireball (neutral)
await reset(); await nearP2(300); hp0 = (await P2()).health;
ok(await special("madaraFireball"), "1. Katon Fireball fires (neutral)");
ok((await projNames()).includes("madaraFireball"), "   fireball projectile spawned");
await sleep(800); ok((await P2()).health < hp0, `   fireball damages (${hp0}→${(await P2()).health})`);
// 2 Gunbai Summon (Up) — reflect
await reset(); await sleep(80);
ok(await special("gunbai_summon", "w"), "2. Gunbai Summon fires (Up)");
ok((await P1()).gunbaiReflect > 0, "   reflect window active");
const b2 = (await P2()).health;
const bolt = await page.evaluate(() => window.__harness.spawnEnemyBolt({ damage: 40 }));
let reflected = false;
for (let k=0;k<20;k++){ await sleep(30); const p=(await page.evaluate(()=>window.__harness.projectiles().find(x=>x.name==="testBolt")||null)); if (p && p.vx>0){reflected=true;break;} if(!p)break; }
ok(reflected, "   incoming bolt REFLECTED (vx flipped)"); await sleep(500);
ok((await P2()).health < b2, "   reflected bolt hits the caster");
// 3 Gunbai Fan-Swing (Fwd)
await reset(); await nearP2(74); hp0 = (await P2()).health;
ok(await special("gunbai_swing", "d"), "3. Gunbai Fan-Swing fires (Fwd)");
ok((await projNames()).includes("madaraGunbaiSlashFx"), "   slash-line FX overlay spawned");
await sleep(500); ok((await P2()).health < hp0, `   fan-swing melee damages (${hp0}→${(await P2()).health})`);
// 4 Mokuton Wood Spike (Down) — STATIONARY ground hazard: erupts in place under the opponent and
// recedes WITHOUT ever moving position (vx: 0), rising for a `hitDelay` startup before it strikes.
await reset(); await nearP2(190); hp0 = (await P2()).health;
let spikeSamples = [];
for (let attempt = 0; attempt < 4 && spikeSamples.length === 0; attempt++) {
  await page.keyboard.down("s"); await page.keyboard.down("l"); await sleep(60); await page.keyboard.up("l"); await page.keyboard.up("s");
  for (let k = 0; k < 10; k++) {   // sample the spike DURING its rise, before it connects + despawns
    const sp = await page.evaluate(() => window.__harness.projectiles().find(p => p.name === "madaraWoodSpike") || null);
    if (sp) spikeSamples.push({ x: sp.x, vx: sp.vx });
    await sleep(16);
  }
  if (spikeSamples.length === 0) { await page.evaluate(() => window.__harness.fillEnergy?.()); await sleep(100); }
}
ok(spikeSamples.length > 0, "4. Wood Spike fires + ground spike projectile spawned (Down)");
ok(spikeSamples.every(s => s.vx === 0), "   spike is STATIONARY (vx === 0 — never travels)");
ok(spikeSamples.length > 1 && spikeSamples.every(s => Math.abs(s.x - spikeSamples[0].x) < 0.01), "   spike holds a FIXED position through its animation");
await sleep(700); ok((await P2()).health < hp0, `   wood spike damages (${hp0}→${(await P2()).health})`);
// 5 Mokuton Wood Dragon (Back)
await reset(); await nearP2(300); hp0 = (await P2()).health;
ok(await special("madaraWoodDragon", "a"), "5. Wood Dragon fires (Back)");
ok((await projNames()).includes("madaraWoodDragon"), "   dragon projectile spawned");
await sleep(800); ok((await P2()).health < hp0, `   wood dragon damages (${hp0}→${(await P2()).health})`);
// 6 Susanoo Base GRAB (Fwd+Heavy — Tier 1: a REAL resolveGrab command-grab, not a strike).
// A grab clears `attacking`, so poll for the grab STATE inside its 28-frame window (proof it's
// the resolveGrab pipeline, not a hitbox) rather than relying on the attacking-keyed cmd() helper.
await reset(); await nearP2(90); hp0 = (await P2()).health;
let grabbedSeen = false;
for (let attempt = 0; attempt < 4 && !grabbedSeen; attempt++) {
  await page.keyboard.down("d"); await sleep(50);
  await page.keyboard.down("k"); await sleep(50); await page.keyboard.up("k"); await page.keyboard.up("d");
  for (let i = 0; i < 18; i++) { if ((await P2()).isGrabbed) { grabbedSeen = true; break; } await sleep(20); }
  if (!grabbedSeen) await sleep(120);
}
ok(grabbedSeen, "6. Susanoo Base Grab enters real grab state (isGrabbed, not a strike)");
await sleep(700); ok((await P2()).health < hp0, `   grab throw damages on release (${hp0}→${(await P2()).health})`);
// 7 Susanoo Attack tier-3 armor mode (Back+Heavy)
await reset(); await waitIdle(); await sleep(80);
ok(await cmd("a", "k"), "7. Susanoo Attack armor MODE enters (Back+Heavy)");
ok((await P1()).susanooArmor > 0, "   armor-mode active");
ok((await P1()).damageMult2 >= 1.3, "   armor damage buff active");
await page.keyboard.down("a"); await sleep(50); await page.keyboard.down("k"); await sleep(70); await page.keyboard.up("k"); await page.keyboard.up("a"); await sleep(120);
ok((await P1()).susanooArmor === 0, "   Back+Heavy re-press reverts the mode");

// ── ULTIMATE (both tiers + gate + duplicate-render) ──
console.log("\nULTIMATE (tiered):");
const cine = () => page.evaluate(() => window.__harness.madaraUltCine());
const tapUlt  = async () => { await page.keyboard.down("u"); await sleep(90);  await page.keyboard.up("u"); };
const holdUlt = async () => { await page.keyboard.down("u"); await sleep(380); await page.keyboard.up("u"); };
const waitCineEnd = () => page.waitForFunction(() => !window.__harness.madaraUltCine().active, null, { timeout: 5000 }).catch(()=>{});
// TAP → Tengai Shinsei (retry: the Ultimate bails for a frame if Madara is still settling from the prior mode test)
await page.evaluate(() => { window.__harness.benPose(null); window.__harness.resetUlt(); window.__harness.healP2?.(); });
await waitIdle(); await sleep(150);
hp0 = (await P2()).health;
let c = { active: false };
for (let a = 0; a < 4 && !c.active; a++) {
  await tapUlt(); await sleep(140); c = await cine();
  if (!c.active) { await page.evaluate(() => window.__harness.resetUlt()); await waitIdle(); await sleep(120); }
}
ok(c.active && c.casterKey === "madara", `TAP → Tengai Shinsei cinematic active (phase=${c.phase})`);
// duplicate-render guard: the caster resolves to a REAL cast action (not the 128²-box fallback = the "ghost copies" root cause) and isn't clipped.
const mT = await page.evaluate(() => ({ act: window.__harness.renderInfo("p1")?.action, m: window.__harness.measureSprite("p1") }));
ok(mT.act === "madaraTengaiCast" && mT.m && !mT.m.clipped, `TAP cinematic: single real cast pose, not clipped (action=${mT.act}, clipped=${mT.m?.clipped})`);
await waitCineEnd();
ok((await P2()).health < hp0 - 200, `   Tengai Shinsei meteor deals heavy damage (−${(hp0-(await P2()).health).toFixed(0)})`);
// GATE — HOLD at 150 (<180) must NOT enter Complete Susanoo
await page.evaluate(() => window.__harness.resetUlt()); await page.evaluate(() => { window.__harness.setEnergy(150); window.__harness.healP2?.(); }); await sleep(80);
await holdUlt(); await sleep(120);
ok((await P1()).completeSusanoo === 0, "GATE: HOLD at 150 energy does NOT enter Complete Susanoo");
ok((await cine()).active, "   held-below-gate fell back to the TAP cinematic");
await waitCineEnd();
// HOLD at full → Complete Susanoo giant
await page.evaluate(() => window.__harness.resetUlt()); await page.evaluate(() => window.__harness.healP2?.()); await sleep(60);
await holdUlt(); await sleep(200);
const g = await page.evaluate(() => { const p = window.__harness.p1(); return { c: p.completeSusanoo, frac: p.canvasHeightFrac, dmg: p.damageMult2, sheet: p.spriteSheet }; });
ok(g.c > 0, "HOLD (≥180) → Complete Susanoo giant entered");
ok(g.frac && g.frac > 0.5, `   giant sizing active (_canvasHeightFrac=${g.frac})`);
ok((g.sheet||"").includes("complete_idle"), "   giant body renders");
// ghost-copies guard: the giant renders as ONE big coherent sprite (a real action → NOT the 128²-box
// fallback, and camera-scaled large via _canvasHeightFrac → not the clipped multi-copy blob).
const mG = await page.evaluate(() => ({ act: window.__harness.renderInfo("p1")?.action, m: window.__harness.measureSprite("p1") }));
ok(mG.act === "idle" && mG.m && mG.m.contentH > 150, `   giant is one big real sprite, no ghost-copies (action=${mG.act}, drawnH=${mG.m?.contentH})`);
await nearP2(180); hp0 = (await P2()).health;
await page.keyboard.down("j"); await sleep(80); await page.keyboard.up("j"); await sleep(500);
ok((await P2()).health < hp0, `   giant sword swing connects (−${(hp0-(await P2()).health).toFixed(0)})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
