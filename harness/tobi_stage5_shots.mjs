// harness/tobi_stage5_shots.mjs — Stage 5 evidence for Tobi's FIRE PHOENIX JUTSU (Forward+Special).
// Proves the GENUINE multi-projectile split the real art supports:
//   (1) benPose the fire cast pose.
//   (2) Fire → a GIANT (screen-filling) main fireball travels forward.
//   (3) Mid-flight it BURSTS into an explosion + a FAN of independent sub-fireball projectiles
//       (distinct trajectories, own hitboxes) — not VFX-only.
//   (4) It deals damage on contact.
// Usage: node harness/tobi_stage5_shots.mjs
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
const wf = (n=1) => page.evaluate(fr => new Promise(r => { let i=0; const t=()=>{ if(++i>=fr) return r(); requestAnimationFrame(t); }; requestAnimationFrame(t); }), n);
const prep = () => page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });

await page.goto(`${base}/index.html?harness=1&p1=tobi&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);
ok((await p1()).key === "tobi", `p1 = tobi`);

// ── 1. Cast pose ──
await page.evaluate(() => window.__harness.benPose("tobiFireCast"));
await sleep(140);
ok(((await p1()).spriteSheet || "").includes("fire_cast"), `cast pose → ${(await p1()).spriteSheet}`);
await page.evaluate(() => window.__harness.benPose(null));
await sleep(100);

// ── 2. Fire — giant main fireball ──
console.log("FIRE PHOENIX (Forward+Special):");
await prep(); await sleep(80);
await page.evaluate(() => { const b = window.__harness.p2(); window.__harness.setP2X?.(b.x + 200); });   // clear the flight path so the main can travel & split
const info = await page.evaluate(() => window.__harness.p1SpecialDir("F"));
ok((info?.cast || "") === "tobiFireCast", `cast = ${info?.cast}`);
let giant = null; for (let i = 0; i < 20; i++) { await wf(1); giant = (await projs()).find(p => p.name === "tobiFireGiant"); if (giant) break; }
ok(!!giant, giant ? `giant fireball spawned (${(giant.sheet||"").split("/").pop()})` : "no giant fireball");
ok(giant && giant.w >= 200 && giant.spriteScale >= 2.5, `genuinely LARGE (w=${giant?.w} scale=${giant?.spriteScale})`);
ok(giant && Math.sign(giant.vx) === ((await p1()).facing || 1), `travels forward (vx=${giant?.vx})`);
await wf(6);
await page.screenshot({ path: path.join(OUT, "tobi_s5_giant.png") });

// ── 3. Split → explosion + fan of sub-fireballs ──
console.log("SPLIT (burst → sub-fireballs):");
let subs = [], burst = null;
for (let i = 0; i < 70; i++) {
  await wf(1);
  const ps = await projs();
  const cur = ps.filter(p => p.name === "tobiFireSub");
  if (cur.length > subs.length) subs = cur;
  if (!burst) burst = ps.find(p => p.name === "tobiFireBurst");
  if (subs.length >= 4 && burst) { await page.screenshot({ path: path.join(OUT, "tobi_s5_split.png") }); break; }
}
ok(subs.length >= 3, `main burst into ${subs.length} independent sub-fireballs`);
const vys = subs.map(s => s.vy).sort((a,b)=>a-b);
ok(subs.length >= 2 && (vys[vys.length-1] - vys[0]) >= 8, `sub-fireballs FAN OUT (distinct trajectories, vy ${vys[0]?.toFixed(1)}…${vys[vys.length-1]?.toFixed(1)})`);
ok(!!burst, `explosion FX at the burst (${burst ? (burst.sheet||"").split("/").pop() : "none"})`);

// ── 4. Damage on contact ──
console.log("DAMAGE:");
await prep(); await sleep(80);
await page.evaluate(() => { const b = window.__harness.p2(); window.__harness.setP1X?.(b.x - 260); });   // p2 ahead, in the fireball's path
const dHp0 = (await p2()).health;
await page.evaluate(() => window.__harness.p1SpecialDir("F"));
let dmgSeen = false;
for (let i = 0; i < 90; i++) { await wf(1); if ((await p2()).health < dHp0) { dmgSeen = true; break; } }
const dEnd = (await p2()).health;
ok(dmgSeen, `Fire Phoenix dealt damage on contact (${dHp0} → ${dEnd}, −${dHp0 - dEnd})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail || errors.length ? 1 : 0);
