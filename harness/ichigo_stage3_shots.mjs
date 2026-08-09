// harness/ichigo_stage3_shots.mjs — Stage 3 evidence for Ichigo Kurosaki's specials.
// Proves each of the 5 direction-branched specials fires the right pose + connects/spawns:
//   Neutral = Getsuga Tenshō (blue crescent projectile, INDEPENDENT collision — spawns, travels, hits)
//   Forward = Charged Getsuga Slash (advancing power slash)   Down = Hollow Getsuga (dark super)
//   Up      = Hollow Rising (dark super launcher)             Air  = Aerial Getsuga Dive
// Usage: node harness/ichigo_stage3_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
page.on("console", m => { if (m.type() === "error") jsErrors.push(m.text()); });

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.ichigoCmd());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
async function waitPose(needle, maxF = 26) { for (let i = 0; i < maxF; i++) { const a = await p1(); if (has(a, needle)) return a; await waitFrames(1); } return await p1(); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function reset(gap = 56) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=ichigo&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// ── 1. GETSUGA TENSHŌ (neutral) — projectile spawns, travels, connects with independent collision ──
console.log("\n── 1. Getsuga Tenshō (neutral crescent projectile) ──");
await reset(220);   // far apart → the projectile must TRAVEL to connect (proves independent collision)
{ const e0 = (await p1()).energy;
  // Fire the special; retry the tap until it registers (guards against a countdown/warmup frame swallowing the first press).
  let pose = await p1(), spawned = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(2);
    pose = await waitPose("specail_2_uniform", 8);
    if (has(pose, "specail_2_uniform")) break;
    await waitFrames(6);
  }
  // The crescent releases ~7 frames into the cast — poll a few frames for it to appear.
  for (let i = 0; i < 12 && !spawned; i++) { spawned = (await projs()).find(p => p.name === "ichigo_getsuga"); if (!spawned) await waitFrames(1); }
  await page.screenshot({ path: path.join(OUT, "ichigo_s3_getsuga_cast.png") });
  const hp0 = (await p2()).health;
  for (let i = 0; i < 40 && !((await p2()).health < hp0); i++) await waitFrames(1);
  const dmg = hp0 - (await p2()).health;
  check("cast pose = specail_2", has(pose, "specail_2_uniform"), `sheet=${(pose.spriteSheet||"").split("/").pop()}`);
  check("projectile spawned + travels", !!spawned, spawned ? `x=${Math.round(spawned.x)} vx=${spawned.vx} sheet=${(spawned.sheet||"").split("/").pop()}` : "none");
  check("Getsuga connects at range (independent collision)", dmg > 0, `dmg=${dmg}  energy spent=${e0 - (await p1()).energy}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s3_getsuga_hit.png") }); }

// ── 2. CHARGED GETSUGA SLASH (Forward) ──
console.log("\n── 2. Charged Getsuga Slash (Forward) ──");
await reset(56);
{ const hp0 = (await p2()).health; await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const pose = await waitPose("specail_1_uniform", 16); await page.keyboard.up("d"); await waitFrames(16);
  check("Fwd+Special → specail_1 (charged slash) + connects", has(pose, "specail_1_uniform") && hp0 - (await p2()).health > 0, `move=${(await cmd())?.move} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s3_charged.png") }); }

// ── 3. HOLLOW GETSUGA (Down super, dark form) ──
console.log("\n── 3. Hollow Getsuga (Down super) ──");
await reset(52);
{ const hp0 = (await p2()).health; await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const pose = await waitPose("super_sword_attack_uniform", 16); await page.keyboard.up("s"); await waitFrames(16);
  check("Down+Special → super_sword_attack (Hollow Getsuga) + connects", has(pose, "super_sword_attack_uniform") && hp0 - (await p2()).health > 0, `move=${(await cmd())?.move} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s3_hollow_getsuga.png") }); }

// ── 4. HOLLOW RISING (Up super, dark form) — simultaneous Up+Special suppresses the jump ──
console.log("\n── 4. Hollow Rising (Up super) ──");
await reset(46);
{ const hp0 = (await p2()).health; await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const pose = await waitPose("super_up_attack_uniform", 16); await page.keyboard.up("w"); await waitFrames(16);
  check("Up+Special → super_up_attack (Hollow Rising) + connects", has(pose, "super_up_attack_uniform") && hp0 - (await p2()).health > 0, `move=${(await cmd())?.move} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s3_hollow_rising.png") }); }

// ── 5. AERIAL GETSUGA DIVE (airborne special) ──
console.log("\n── 5. Aerial Getsuga Dive (air special) ──");
await reset(40);
{ const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(60)); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const pose = await waitPose("air_attack_specail_uniform", 16); await waitFrames(14);
  check("airborne Special → air_attack_specail (dive) + connects", has(pose, "air_attack_specail_uniform") && hp0 - (await p2()).health > 0, `move=${(await cmd())?.move} dmg=${hp0 - (await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "ichigo_s3_air_getsuga.png") }); }

check("no JS page errors (ex-portrait 404)", jsErrors.filter(e => !/portrait/.test(e)).length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
