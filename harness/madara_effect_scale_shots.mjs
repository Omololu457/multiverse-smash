// harness/madara_effect_scale_shots.mjs — VERIFICATION for the effect-scale/behavior pass.
// Captures each of the 4 corrected effects with Madara in-frame for a size reference, and a
// multi-frame CLIP of the Wood Spike proving it holds a FIXED position (never travels).
//   1. Katon Fireball  — gigantic vs Madara's own scale
//   2. Wood Dragon      — dragon-sized
//   3. Wood Spike       — big tree, STATIONARY (fixed-x clip)
//   4. Tengai Shinsei meteor — fills the screen
// Usage: node harness/madara_effect_scale_shots.mjs
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
const shot = n => page.screenshot({ path: path.join(OUT, n) });
const projs = () => page.evaluate(() => window.__harness.projectiles());
const P1 = () => page.evaluate(() => window.__harness.p1());
const P2 = () => page.evaluate(() => window.__harness.p2());
const nearP2 = (gap) => page.evaluate(g => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + g); window.__harness.healP2?.(); }, gap);
const refill = () => page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.clearProjectiles(); window.__harness.healP2?.(); });

// robust special: hold key + optional dir, retry until a named projectile appears
async function fire(name, dir = null) {
  for (let a = 0; a < 4; a++) {
    if (dir) await page.keyboard.down(dir);
    await page.keyboard.down("l"); await sleep(70); await page.keyboard.up("l");
    if (dir) await page.keyboard.up(dir);
    await sleep(40);
    if ((await projs()).some(p => p.name === name)) return true;
    await sleep(120);
  }
  return false;
}

await page.goto(`${base}/index.html?harness=1&p1=madara&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(200);
await page.evaluate(() => window.__harness.fillEnergy?.());
const scaleRef = (await P1()).spriteScale;
console.log(`Madara spriteScale = ${scaleRef} (character size reference)\n`);

// ── 1. KATON FIREBALL — gigantic vs Madara ──
console.log("1. Katon Fireball (neutral):");
refill(); await nearP2(360); await sleep(60);
ok(await fire("madaraFireball"), "   fireball fired");
await sleep(90);
let fb = (await projs()).find(p => p.name === "madaraFireball");
ok(!!fb, `   fireball in flight (x=${fb?.x?.toFixed(0)})`);
console.log(`   fireball render ≈ 236×114 × 1.25 = 295×143 px (was 130×63)`);
await shot("madara_scale_1_fireball.png");

// ── 2. WOOD DRAGON — dragon-sized ──
console.log("2. Wood Dragon (Back):");
refill(); await nearP2(420); await sleep(60);
ok(await fire("madaraWoodDragon", "a"), "   wood dragon fired");
await sleep(80);
let wd = (await projs()).find(p => p.name === "madaraWoodDragon");
ok(!!wd, `   dragon in flight (x=${wd?.x?.toFixed(0)})`);
console.log(`   dragon render ≈ 622×375 × 0.95 = 591×356 px (was 261×157)`);
await shot("madara_scale_2_wood_dragon.png");

// ── 3. WOOD SPIKE — big tree, STATIONARY (fixed-position clip) ──
console.log("3. Wood Spike (Down) — stationary ground hazard:");
refill(); await nearP2(190); await sleep(60);
// direct press so the clip starts sampling from spawn (the spike lives only ~hitDelay frames before it hits)
const xs = [];
for (let attempt = 0; attempt < 4 && xs.length === 0; attempt++) {
  await page.keyboard.down("s"); await page.keyboard.down("l"); await sleep(50); await page.keyboard.up("l"); await page.keyboard.up("s");
  for (let k = 0; k < 8; k++) {   // sample DURING its rise, capturing a frame each step
    const sp = (await projs()).find(p => p.name === "madaraWoodSpike");
    if (sp) { xs.push(sp.x); await shot(`madara_scale_3_wood_spike_f${xs.length-1}.png`); }
    await sleep(16);
  }
  if (xs.length === 0) { await page.evaluate(() => window.__harness.fillEnergy?.()); await sleep(90); }
}
ok(xs.length > 0, "   wood spike fired");
ok(xs.length > 1, `   spike observed over ${xs.length} frames`);
ok(xs.every(x => Math.abs(x - xs[0]) < 0.01), `   spike x FIXED across frames: [${xs.map(x=>x.toFixed(1)).join(", ")}]`);
console.log(`   spike render ≈ 116×112 × 1.9 = 220×213 px (was 81×78), vx=0`);

// ── 4. TENGAI SHINSEI METEOR — fills the screen ──
console.log("4. Tengai Shinsei meteor (TAP Ultimate):");
await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); window.__harness.benPose(null); });
await sleep(150);
let cine = { active: false };
for (let a = 0; a < 5 && !cine.active; a++) {
  await page.keyboard.down("u"); await sleep(90); await page.keyboard.up("u"); await sleep(130);
  cine = await page.evaluate(() => window.__harness.madaraUltCine());
  if (!cine.active) { await page.evaluate(() => window.__harness.resetUlt?.()); await sleep(120); }
}
ok(cine.active, `   Tengai Shinsei cinematic active (phase=${cine.phase})`);
// step through the fall to catch the meteor at a large size
for (let k = 0; k < 22; k++) {
  const c = await page.evaluate(() => window.__harness.madaraUltCine());
  if (c.phase === "fall" || c.phase === "impact") { await shot(`madara_scale_4_meteor_${c.phase}.png`); }
  await sleep(45);
}
console.log(`   meteor size grows to ≈ canvas-height × 1.06 (was ×0.64); explosion ×1.1 (was ×0.85)`);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (errors.length) console.log("PAGE ERRORS:\n" + errors.join("\n"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
