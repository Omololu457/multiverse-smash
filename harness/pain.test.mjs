// harness/pain.test.mjs — CANONICAL full-kit test for Pain (Nagato's Deva Path).
// Consolidates every stage: movement/state + normals + command chain + 3 gravity specials + Dedera +
// all 5 assists (selector) + the Chibaku Tensei ultimate (with the explicit duplicate-render guard).
// Usage: node harness/pain.test.mjs   (npm run test:pain)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

await page.goto(`${base}/index.html?harness=1&p1=pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

const sheet = () => page.evaluate(() => window.__harness.p1().spriteSheet);
const st = () => page.evaluate(() => { const p = window.__harness.p1(), q = window.__harness.p2(); return { sheet: p.spriteSheet, move: p.currentMove, p2hp: q?.health, p2x: q?.x, p1x: p.x, gap: Math.abs((q?.x||0)-(p.x||0)), facing: p.facing||1 }; });
const tap = async (k, ms=55) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
const prep = async (dx=140) => { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.setP1Energy?.(210); }); await sleep(70); if (dx!=null) { await page.evaluate(d => { const p=window.__harness.p1(); window.__harness.setP2X?.(p.x + (p.facing||1)*d); }, dx); await sleep(60); } };
const facingRight = (await st()).facing === 1;
const FWD = facingRight ? "d" : "a", AWAY = facingRight ? "a" : "d";

// ── 1. POSE RENDERS — every animation resolves its own sheet (no fallback box) ──
console.log("MOVEMENT / STATE + NORMALS + CAST POSES (benPose):");
const POSES = {
  idle:"pain_idle_uniform", run:"pain_run_uniform", dash:"pain_dash_uniform", jump:"pain_jump_uniform",
  guard:"pain_block_uniform", hurt:"pain_hit_uniform", knockdown:"pain_stand_up_uniform",
  light:"pain_light_uniform", heavy:"pain_heavy_uniform", up:"pain_up_uniform", air:"pain_air_uniform",
  air_heavy:"pain_airheavy_uniform", down_air:"pain_downair_uniform",
  painJab:"pain_jab_uniform", painCombo1:"pain_combo1_uniform", painCombo2:"pain_combo2_uniform", painCombo3:"pain_combo3_uniform",
  painAlmightyPushCast:"pain_almighty_push_uniform", painAlmightyPullCast:"pain_almighty_pull_uniform", painSuperPushCast:"pain_super_push_uniform",
  painDederaCast:"pain_dedera_cast_uniform", painDederaRise:"pain_dedera_rise_uniform", painChibakuCast:"pain_chibaku_cast_uniform",
};
for (const [pose, exp] of Object.entries(POSES)) {
  await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose);
  await sleep(90);
  const s = await sheet();
  ok(s && s.includes(exp), `${pose} → ${exp}`);
}
await page.evaluate(() => window.__harness.benPose(null)); await sleep(100);

// ── 2. NORMALS + COMMAND CHAIN (real input) ──
console.log("NORMALS + Fwd+Heavy REKKA CHAIN:");
await prep(null);
await tap("k"); let r = await (async()=>{const t=Date.now();let l;while(Date.now()-t<700){l=await st();if(l.sheet?.includes("pain_heavy_uniform"))return l;await sleep(16);}return l;})();
ok(r.sheet?.includes("pain_heavy_uniform") && r.move!=="painCombo1", `neutral Heavy → normal heavy`);
await prep(46);   // point-blank so every rekka stage connects → the chain reliably reaches combo3
const hpC0 = (await st()).p2hp;
await page.keyboard.down(FWD); await sleep(60);
const seen = new Set();
for (let t=0;t<18;t++){ await tap("k",42); for(let i=0;i<11;i++){ await sleep(11); const s=await st(); if(s.move) seen.add(s.move); } }
await page.keyboard.up(FWD);
const hpC1 = (await st()).p2hp;
ok(seen.has("painCombo1")&&seen.has("painCombo2")&&seen.has("painCombo3"), `Fwd+Heavy rekka chained combo1→2→3 (saw ${[...seen].filter(m=>m?.startsWith("painCombo")).join(",")})`);
ok(hpC1 < hpC0 - 40, `combo chain connected (dealt ${Math.round(hpC0-hpC1)})`);

// ── 3. GRAVITY SPECIALS ──
console.log("GRAVITY SPECIALS (Push / Pull / Super Push):");
await prep(120); await sleep(200); let b = await st();
// Almighty Push is now GLOBAL range + ZERO damage (invisible force): fire neutral Special; retry once if a
// stale buffer ate the first press. Expect shove-away (gap grows) with HP UNCHANGED (force-only).
let a = b, castPush = false;
for (let attempt = 0; attempt < 2 && !(a.gap > b.gap + 20); attempt++) {
  if (attempt > 0) { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.setP1Energy?.(210); }); await sleep(150); b = await st(); }
  await tap("l",60);
  for (let i=0;i<30;i++){ await sleep(18); const s = await st(); if (s.sheet?.includes("pain_almighty_push")) castPush = true; a = s; if (a.gap > b.gap + 20) break; }
}
ok(castPush && a.gap > b.gap + 20, `Almighty Push (neutral) → global shove-away (gap ${Math.round(b.gap)}→${Math.round(a.gap)})`);
ok(Math.abs(a.p2hp - b.p2hp) < 0.5, `Almighty Push → ZERO damage / force-only (HP ${Math.round(b.p2hp)}→${Math.round(a.p2hp)})`);
await prep(110); b = await st();
await page.keyboard.down(AWAY); await sleep(55); await tap("l",50); await page.keyboard.up(AWAY); await sleep(600); a = await st();
ok((b.p2x - a.p2x) * b.facing > 40, `Almighty Pull (Back) → reeled foe toward Pain`);
await prep(160); b = await st();
await page.keyboard.down("s"); await sleep(60); await tap("l",50);
let ground=false; for(let i=0;i<30;i++){ await sleep(14); const projs=await page.evaluate(()=>(window.__harness.projectiles?.()||[]).map(p=>p.sheet).filter(Boolean)); if(projs.some(x=>x.includes("pain_super_push_ground"))) ground=true; }
await page.keyboard.up("s"); await sleep(300); a = await st();
ok(ground && a.gap > b.gap + 20, `Super Push (Down) → debris ground-effect + stronger shove`);

// ── 4. DEDERA DOUBLE ATTACK (Fwd+Special sequence) ──
console.log("DEDERA DOUBLE ATTACK (Fwd+Special):");
await prep(230); b = await st();
await page.keyboard.down(FWD); await sleep(70); await tap("l",50); await page.keyboard.up(FWD);
let castD=false,bird=false,boom=false;
for(let i=0;i<80;i++){ await sleep(15); const s=await st(); if(s.sheet?.includes("pain_dedera_cast")) castD=true; const projs=await page.evaluate(()=>(window.__harness.projectiles?.()||[]).map(p=>p.sheet).filter(Boolean)); if(projs.some(x=>x.includes("pain_dedera_bird")))bird=true; if(projs.some(x=>x.includes("pain_dedera_explosion")))boom=true; }
a = await st();
ok(castD && bird, `Dedera cast → clay-bird projectile`);
ok(boom && a.p2hp < b.p2hp - 15, `clay-bird explosion on connect + damage (dealt ${Math.round(b.p2hp-a.p2hp)})`);

// ── 5. SIX PATHS SUMMON — 5-assist selector picks the right companion each time ──
console.log("SIX PATHS SUMMON (Charge + slot → correct assist):");
const summonIds = () => page.evaluate(() => (window.__harness.summons?.() || []).map(s => s.summonId || s.id));
const ASSISTS = [["itachi","w"],["konan","a"],["sasori","d"],["sasuke","s"],["tobi","j"]];
for (let i=0;i<ASSISTS.length;i++){
  const [key,slot]=ASSISTS[i];
  if(i>0) await sleep(2800);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); }); await sleep(80);
  await page.keyboard.down("p"); await sleep(60); await tap(slot,50);
  let spawned=null; for(let t=0;t<24;t++){ await sleep(14); const ids=await summonIds(); const h=ids.find(x=>x&&x.startsWith("painAssist_")); if(h) spawned=h; }
  await page.keyboard.up("p");
  ok(spawned === "painAssist_"+key, `Charge+${slot} → ${spawned} (expected painAssist_${key})`);
}

// ── 6. CHIBAKU TENSEI ULTIMATE + DUPLICATE-RENDER GUARD ──
console.log("CHIBAKU TENSEI ULTIMATE (freeze cinematic + duplicate-render guard):");
const cine = () => page.evaluate(() => window.__harness.painUltCine?.() || null);
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.setP1Energy?.(210); const p=window.__harness.p1(); window.__harness.setP2X?.(p.x + (p.facing||1)*180); }); await sleep(80);
const hpU0 = (await st()).p2hp;
await tap("u",60);
const phases=new Set(); let everActive=false,struck=false,castU=false,struckCount=0,prevStruck=false;
for(let i=0;i<200;i++){ await sleep(20); const c=await cine();
  if(c?.active){ everActive=true; if(c.phase)phases.add(c.phase); if(c.struck){struck=true; if(!prevStruck)struckCount++;} prevStruck=!!c.struck; if((await sheet())?.includes("pain_chibaku_cast"))castU=true; }
  else if(everActive) break; }
await sleep(200); const cAfter=await cine(); const hpU1=(await st()).p2hp; const droppedU=Math.round(hpU0-hpU1);
ok(everActive && ["cast","rise","slam","settle"].every(p=>phases.has(p)), `ultimate ran all phases (${[...phases].join(",")})`);
ok(castU, `caster plays arms-raised cast pose through the freeze`);
ok(struck && droppedU>120 && droppedU<320, `guaranteed devastation landed ONCE (dealt ${droppedU}, single payoff)`);
ok(struckCount === 1, `DUPLICATE-RENDER GUARD: damage beat fired EXACTLY once (struck transitions=${struckCount})`);
ok(cAfter && cAfter.active === false, `cinematic ended cleanly → combat resumes`);

console.log(`\n════════════════════════════════════════`);
console.log(`  PAIN CANONICAL: ${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
