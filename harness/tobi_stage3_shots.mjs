// harness/tobi_stage3_shots.mjs — Stage 3 evidence for Tobi's CHAIN GRAB (multi-stage command grab).
// Boots p1=tobi ALONGSIDE p2=obito (isolation). Proves:
//   (1) benPose render-assert for the 4 chain cast poses (correct masked_man sheets).
//   (2) CONNECT: neutral Special near the foe runs whip→reach→snatched→smash; the foe is snatched
//       (isGrabbed), takes chain damage, the dust FX spawns, and it ends in a hard knockdown.
//   (3) WHIFF: neutral Special far from the foe reaches then recovers with NO snatch / no damage.
// Usage: node harness/tobi_stage3_shots.mjs
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
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
const prep = () => page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });

await page.goto(`${base}/index.html?harness=1&p1=tobi&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

const m0 = await page.evaluate(() => ({ p1: window.__harness.p1()?.key, p2: window.__harness.p2()?.key }));
ok(m0.p1 === "tobi" && m0.p2 === "obito", `co-loaded p1=${m0.p1} p2=${m0.p2}`);

// ── 1. Pose render (benPose) ──
const EXP = {
  tobiChainGrab:     "masked_man_chain_grab_uniform.png",
  tobiChainAttack1:  "masked_man_chain_attack1_uniform.png",
  tobiChainSnatched: "masked_man_chain_snatched_uniform.png",
  tobiChainSmash:    "masked_man_chain_smash_uniform.png",
};
console.log("POSE RENDER (benPose):");
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a), pose);
  await sleep(140);
  const s = await page.evaluate(() => window.__harness.p1().spriteSheet);
  await page.screenshot({ path: path.join(OUT, `tobi_s3_${pose}.png`) });
  ok(s && s.includes(sheet), `${pose} → ${s}`);
}
await page.evaluate(() => window.__harness.benPose(null));
await sleep(120);

// ── 2. CONNECT — chain grab lands the full sequence ──
console.log("CHAIN GRAB CONNECT (whip→reach→snatched→smash):");
await prep(); await sleep(80);
// place Tobi within chain reach of Obito
await page.evaluate(() => { const b = window.__harness.p2(); window.__harness.setP1X?.(b.x - 105); });
await sleep(60);
const hp0 = (await p2()).health;
await page.keyboard.down("l"); await sleep(50); await page.keyboard.up("l");
const phases = new Set(); let sawGrab = false, sawFx = false, sawKd = false, shotTaken = false;
for (let i = 0; i < 130; i++) {
  const a = await p1(); const b = await p2();
  if (a.tobiChainPhase) phases.add(a.tobiChainPhase);
  if (b.isGrabbed) sawGrab = true;
  if (b.knockdownState || (b.hitstun || 0) >= 20) sawKd = true;   // latch the hard-knockdown before it resolves
  if (!sawFx) { const ps = await projs(); if (ps.some(p => (p.sheet||"").includes("chain_smash_fx"))) sawFx = true; }
  if (a.tobiChainPhase === "snatched" && !shotTaken) { await page.screenshot({ path: path.join(OUT, "tobi_s3_snatched_live.png") }); shotTaken = true; }
  if (!a.tobiChainPhase && phases.size) break;   // sequence ended
  await sleep(16);
}
await page.screenshot({ path: path.join(OUT, "tobi_s3_smash_live.png") });
const bEnd = await p2();
ok(phases.has("whip") && phases.has("reach"), `startup phases seen: ${[...phases].join("→")}`);
ok(phases.has("snatched") && phases.has("smash"), `snatch+finisher phases seen`);
ok(sawGrab, `foe was snatched (isGrabbed latched during the combo)`);
ok(bEnd.health < hp0, `foe took chain damage: ${hp0} → ${bEnd.health} (−${hp0 - bEnd.health})`);
ok(sawFx, `hard-smash dust FX spawned (masked_man_chain_smash_fx)`);
ok(sawKd, `foe hit hard knockdown during the smash (kd/hitstun latched)`);
await sleep(400);

// ── 3. WHIFF — foe airborne when the chain reaches → snag misses, recover, no snatch/damage ──
// (A pure distance-whiff isn't possible in 1v1: a camera-coupled max-separation clamp keeps both
// fighters ~within chain reach. resolveGrab requires the defender to be grounded, so an airborne
// foe is the real whiff condition.)
console.log("CHAIN GRAB WHIFF (foe airborne):");
await prep(); await sleep(80);
await page.evaluate(() => { const b = window.__harness.p2(); window.__harness.setP1X?.(b.x - 105); });
await sleep(40);
const whp0 = (await p2()).health;
await page.keyboard.down("l"); await sleep(30); await page.keyboard.up("l");
await page.evaluate(() => window.__harness.setP2Air?.());   // pop foe airborne before the chain's snag window
const wphases = new Set();
for (let i = 0; i < 90; i++) { const a = await p1(); if (a.tobiChainPhase) wphases.add(a.tobiChainPhase); if (!a.tobiChainPhase && wphases.size) break; await page.evaluate(() => { const b = window.__harness.p2(); if (b && (b.vy||0) > -2) window.__harness.setP2Air?.(); }); await sleep(16); }
const whpEnd = (await p2()).health;
ok(wphases.has("reach") && !wphases.has("snatched"), `whiff: reached but never snatched (${[...wphases].join("→")})`);
ok(whpEnd === whp0, `whiff dealt no damage (${whp0} → ${whpEnd})`);

// ── 4. Isolation ──
const p2k = (await p2()).key;
ok(p2k === "obito", `p2 still obito after Tobi's Stage-3 run`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail || errors.length ? 1 : 0);
