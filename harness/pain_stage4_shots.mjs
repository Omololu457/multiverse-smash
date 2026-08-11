// harness/pain_stage4_shots.mjs — Stage 4 evidence for Pain's Dedera Double Attack (Fwd+Special).
// (1) benPose cast/rise pose renders (painDederaCast Deidara-cameo, painDederaRise).
// (2) Functional real-keyboard test of the full sequence: Fwd+Special → Dedera cast fires → clay-bird
//     projectile (pain_dedera_bird) travels → on connecting with the foe the star-flash/fireball
//     explosion (pain_dedera_explosion, the projectile `impact` bloom) spawns + the foe takes damage.
// Usage: node harness/pain_stage4_shots.mjs
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

// ── 1. Cast/rise pose renders ──
const EXP = { painDederaCast: "pain_dedera_cast_uniform.png", painDederaRise: "pain_dedera_rise_uniform.png" };
console.log("CAST POSE RENDER (benPose):");
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a), pose);
  await sleep(150);
  const s = await page.evaluate(() => window.__harness.p1().spriteSheet);
  await page.screenshot({ path: path.join(OUT, `pain_s4_${pose}.png`) });
  ok(s && s.includes(sheet), `${pose} → ${s}`);
}
await page.evaluate(() => window.__harness.benPose(null));
await sleep(120);

// ── 2. Functional (real keys): Fwd+Special sequence ──
const S = () => page.evaluate(() => { const p = window.__harness.p1(), q = window.__harness.p2(); const projs = window.__harness.projectiles?.() || []; return { sheet: p.spriteSheet, p2hp: q?.health, facing: p.facing||1, projSheets: projs.map(pr => pr.sheet).filter(Boolean) }; });
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.setP1Energy?.(210); });
await sleep(80);
const facingRight = (await S()).facing === 1;
const FWD = facingRight ? "d" : "a";
// place the foe in the bird's path (bird travels ~12px/frame)
await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X?.(p.x + (p.facing||1)*230); });
await sleep(60);
const before = await S();
console.log(`\nFUNCTIONAL (Fwd+Special = ${FWD}+l):`);

// tap Fwd to register the direction, then Special
await page.keyboard.down(FWD); await sleep(70);
await page.keyboard.down("l"); await sleep(50); await page.keyboard.up("l");
await page.keyboard.up(FWD);

// sample the sequence: cast sheet → bird projectile → explosion impact
let castSeen = false, birdSeen = false, boomSeen = false, boomShot = false;
for (let i = 0; i < 90; i++) {
  await sleep(15);
  const s = await S();
  if (s.sheet && s.sheet.includes("pain_dedera_cast")) castSeen = true;
  if (s.projSheets.some(x => x.includes("pain_dedera_bird"))) birdSeen = true;
  if (s.projSheets.some(x => x.includes("pain_dedera_explosion"))) { boomSeen = true; if (!boomShot) { await page.screenshot({ path: path.join(OUT, "pain_s4_explosion.png") }); boomShot = true; } }
}
if (!boomShot) await page.screenshot({ path: path.join(OUT, "pain_s4_explosion.png") });
const after = await S();
ok(castSeen, `Fwd+Special → Dedera cast fired (Deidara-cameo pose)`);
ok(birdSeen, `clay-bird projectile spawned (pain_dedera_bird)`);
ok(boomSeen, `explosion effect bloomed on connect (pain_dedera_explosion impact)`);
ok(after.p2hp < before.p2hp - 15, `clay-bird CONNECTED — foe HP ${Math.round(before.p2hp)}→${Math.round(after.p2hp)}`);

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,10).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
