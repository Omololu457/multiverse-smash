// harness/pain_stage3_shots.mjs — Stage 3 evidence for Pain's 3 gravity specials.
// (1) benPose cast-pose renders (painAlmightyPushCast / painAlmightyPullCast / painSuperPushCast).
// (2) Functional real-keyboard test of each SEPARATE special:
//     - Neutral Special (l)        → Almighty Push: opponent shoved AWAY + damage.
//     - Back+Special (away + l)    → Almighty Pull:  opponent reeled TOWARD Pain (gap shrinks).
//     - Down+Special (s + l)       → Super Push: opponent shoved away + the debris GROUND-EFFECT overlay
//                                     (painSuperPushGround) spawns under Pain.
// Usage: node harness/pain_stage3_shots.mjs
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
const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

await page.goto(`${base}/index.html?harness=1&p1=pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── 1. Cast-pose renders ──
const EXP = {
  painAlmightyPushCast: "pain_almighty_push_uniform.png",
  painAlmightyPullCast: "pain_almighty_pull_uniform.png",
  painSuperPushCast:    "pain_super_push_uniform.png",
};
console.log("CAST POSE RENDER (benPose):");
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a), pose);
  await sleep(150);
  const s = await page.evaluate(() => window.__harness.p1().spriteSheet);
  await page.screenshot({ path: path.join(OUT, `pain_s3_${pose}.png`) });
  ok(s && s.includes(sheet), `${pose} → ${s}`);
}
await page.evaluate(() => window.__harness.benPose(null));
await sleep(120);

// ── 2. Functional (real keys) ──
const S = () => page.evaluate(() => { const p = window.__harness.p1(), q = window.__harness.p2(); const projs = window.__harness.projectiles?.() || []; return { p1x: p.x, p2x: q?.x, p2hp: q?.health, gap: Math.abs((q?.x||0)-(p.x||0)), facing: p.facing||1, en: p.energy, projSheets: projs.map(pr => pr.sheet).filter(Boolean) }; });
const placeP2 = (dx) => page.evaluate((d) => { const p=window.__harness.p1(); window.__harness.setP2X?.(p.x + (p.facing||1)*d); }, dx);
// resetFighterInput clears comboCounter/combo state too — resolveGrab (the Pull) bails on
// attacker.comboCounter > 0, which a prior special's hit leaves set, so reset it each time.
const prep = async () => { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.fillEnergy?.(); window.__harness.setP1Energy?.(210); }); await sleep(80); };
const facingRight = (await S()).facing === 1;
const AWAY = facingRight ? "a" : "d";   // Back = away from the opponent
console.log(`\nFUNCTIONAL (Special=l, Back=${AWAY}, Down=s):`);

// (a) NEUTRAL — Almighty Push: opponent shoved AWAY + damaged
await prep(); await placeP2(150); await sleep(60);
let before = await S();
await page.keyboard.down("l"); await sleep(60); await page.keyboard.up("l");
await sleep(500);
let after = await S();
await page.screenshot({ path: path.join(OUT, "pain_s3_push.png") });
ok(after.gap > before.gap + 20, `Almighty Push → shoved AWAY (gap ${Math.round(before.gap)}→${Math.round(after.gap)})`);
ok(Math.abs(after.p2hp - before.p2hp) < 0.5, `Almighty Push → ZERO damage (force-only; p2 HP ${Math.round(before.p2hp)}→${Math.round(after.p2hp)})`);

// (b) BACK — Almighty Pull: opponent reeled TOWARD Pain (p2 moves toward Pain).
// Hold Back only briefly (register the direction), then RELEASE before the reel so Pain doesn't just
// walk away and inflate the gap. Track p2's absolute x closing toward p1.
await prep(); await placeP2(110); await sleep(60);    // close enough that Pain's brief back-step keeps the foe in grab range
before = await S();
await page.keyboard.down(AWAY); await sleep(55);      // register Back in directionHistory (brief — don't walk far)
await page.keyboard.down("l"); await sleep(50);
// confirm the PULL cast (not the neutral push) fired
let castSheet = null;
for (let i = 0; i < 10; i++) { const s = await page.evaluate(() => window.__harness.p1().spriteSheet); if (s && (s.includes("pull") || s.includes("push"))) { castSheet = s; break; } await sleep(15); }
await page.keyboard.up("l"); await page.keyboard.up(AWAY);
await sleep(650);   // let the reel ease in + settle (Back released, so no walk-away)
after = await S();
await page.screenshot({ path: path.join(OUT, "pain_s3_pull.png") });
ok(castSheet?.includes("pull"), `Back+Special fired the PULL cast (not push) — ${castSheet}`);
// p2 pulled toward Pain: with facing 1 (Pain left of foe) the foe's x DECREASES toward Pain.
const p2Toward = (before.p2x - after.p2x) * before.facing;
ok(p2Toward > 40, `Almighty Pull → foe reeled ${Math.round(p2Toward)}px TOWARD Pain (gap ${Math.round(before.gap)}→${Math.round(after.gap)})`);

// (c) DOWN — Super Almighty Push: ground-effect overlay spawns + bigger shove
await prep(); await placeP2(160); await sleep(60);
before = await S();
await page.keyboard.down("s"); await sleep(170);   // populate directionHistory with Down
await page.keyboard.down("l"); await sleep(60); await page.keyboard.up("l");
// sample projectiles during the effect window
let groundSeen = false;
for (let i = 0; i < 30; i++) { await sleep(15); const s = await S(); if (s.projSheets.some(x => x.includes("pain_super_push_ground"))) { groundSeen = true; if (i > 4) await page.screenshot({ path: path.join(OUT, "pain_s3_superpush.png") }); break; } }
await page.keyboard.up("s");
await sleep(400);
after = await S();
if (!groundSeen) await page.screenshot({ path: path.join(OUT, "pain_s3_superpush.png") });
ok(groundSeen, `Super Push → debris GROUND-EFFECT overlay spawned (pain_super_push_ground)`);
ok(after.gap > before.gap + 25, `Super Push → shoved AWAY (gap ${Math.round(before.gap)}→${Math.round(after.gap)})`);
ok(after.p2hp < before.p2hp - 10, `Super Push → damage (p2 HP ${Math.round(before.p2hp)}→${Math.round(after.p2hp)})`);

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,10).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
