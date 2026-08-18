// Stage 4 — Kamui Portal-Reflect (Block+Special) build+verify for Obito & Tobi.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const who = process.argv[2] === "tobi" ? "tobi" : "obito";
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const stance = () => page.evaluate(() => window.__harness.portalReflect("p1"));
const projs = () => page.evaluate(() => window.__harness.projectiles());
const hp = (s) => page.evaluate((w) => (w === "p2" ? window.__harness.p2() : window.__harness.p1())?.health, s);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(OUT, `portal_${who}_${name}.png`) }); }
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`); };

await page.goto(`${base}/index.html?harness=1&mode=training&p1=${who}&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); window.__harness.fillEnergy?.(); });
await waitFrames(30);
await page.evaluate(() => new Promise(res => { const i = new Image(); i.onload = res; i.onerror = res; i.src = "./obito_portal_reflect.png"; }));   // preload the portal art for headless
await waitFrames(2);

async function castStance() {   // Block + Special
  await page.keyboard.down(";"); await waitFrames(3);
  const s = await page.evaluate(() => window.__harness.p1Snap?.());
  await page.evaluate(() => window.__harness.p1SpecialDir(null));   // trigger special while blocking → portal-reflect
  await waitFrames(1);
  await page.keyboard.up(";");
  return s?.blocking;
}

console.log(`\n════ ${who.toUpperCase()} — Kamui Portal-Reflect (Block+Special) ════`);
const wasBlocking = await castStance();
await waitFrames(2);
let st = await stance();
check("Block+Special opened the portal stance", !!st?.stance, `blocking=${wasBlocking} startup=${st?.startup} active=${st?.active}`);
// advance into the ACTIVE window
for (let i=0;i<12 && (await stance()).active<=0;i++) await waitFrames(1);
st = await stance();
check("stance reaches an ACTIVE reflect window", st.active > 0, `active=${st.active}`);
await shot("stance_active");

// fire a projectile from p2 straight at p1 DURING the active window
const p1hpBefore = await hp("p1"), p2hpBefore = await hp("p2");
const fired = await page.evaluate(() => window.__harness.firePortalTestProj("p1", 40));
// sample the projectile just after collision → its vx should REVERSE (now heading back at p2)
let reversed=false, reflected=false;
for (let i=0;i<10;i++){ await waitFrames(1); const ps=await projs(); const b=ps.find(p=>p.name==="portalTestBolt"); if(b){ if(Math.sign(b.vx)===Math.sign(-fired.vx)){ reversed=true; } } const s2=await stance(); if(s2.reflectHit>0) reflected=true; if(reversed) break; }
await shot("reflect_moment");
check("incoming projectile is REFLECTED (velocity reversed back at attacker)", reversed, `fired vx=${fired?.vx}`);
check("portal registered the reflect (reflectHit pop)", reflected, "");
// caster took NO damage (negated)
await waitFrames(2);
const p1hpMid = await hp("p1");
check("caster NEGATES it (no self damage)", p1hpMid >= p1hpBefore - 0.01, `p1 hp ${p1hpBefore}→${p1hpMid}`);
// let the reflected bolt travel back and connect on p2 (the original attacker)
let p2hit=false;
for (let i=0;i<40;i++){ await waitFrames(2); if ((await hp("p2")) < p2hpBefore - 0.5){ p2hit=true; break; } }
const p2hpAfter = await hp("p2");
check("reflected projectile CONNECTS on the original attacker (p2 takes counter-damage)", p2hit, `p2 hp ${p2hpBefore}→${p2hpAfter}`);
await shot("counter_landed");

// ── timing risk: a projectile fired OUTSIDE the active window is NOT reflected (hits the caster) ──
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); });
await waitFrames(6);
// wait out any lingering stance
for (let i=0;i<40 && (await stance()).stance;i++) await waitFrames(2);
const noStanceHp = await hp("p1");
const firedNo = await page.evaluate(() => window.__harness.firePortalTestProj("p1", 40));   // NO stance up
let hitCaster=false;
for (let i=0;i<12;i++){ await waitFrames(1); if ((await hp("p1")) < noStanceHp - 0.5){ hitCaster=true; break; } }
check("NOT always-on: with no active stance, the projectile HITS the caster (real timing risk)", hitCaster, `p1 hp ${noStanceHp}→${await hp("p1")}`);

check("no JS errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL?1:0);
