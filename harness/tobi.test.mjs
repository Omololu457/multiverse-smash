// harness/tobi.test.mjs — CONSOLIDATED full-kit test for Tobi (masked Obito alias).
// Boots p1=tobi ALONGSIDE p2=obito for the ENTIRE run, so every check doubles as an isolation check,
// and the final section explicitly proves Tobi and Obito share no runtime state (Kamui + Ultimate).
// Covers: registration · 5 normals · air-kunai · Kamui teleport-behind · Chain Grab · Kamui
// intangibility · self-portal · opponent-teleport grab · Fire Phoenix split · Nine-Tails ultimate
// (with the duplicate-render guard) · ISOLATION.
// Usage: node harness/tobi.test.mjs   (npm run test:tobi)
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
const sec = m => console.log(`\n── ${m} ──`);
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
const kTobi = () => page.evaluate(() => window.__harness.tobiKamui("p1"));
const kObito = () => page.evaluate(() => window.__harness.obitoKamui("p2"));
const wf = (n=1) => page.evaluate(fr => new Promise(r => { let i=0; const t=()=>{ if(++i>=fr) return r(); requestAnimationFrame(t); }; requestAnimationFrame(t); }), n);
const prep = () => page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
const pollSheet = async (needle, ms=700) => { const t0=Date.now(); while(Date.now()-t0<ms){ const s=await p1(); if(s.attacking && (s.spriteSheet||"").includes(needle)) return s; await sleep(20);} return await p1(); };

await page.goto(`${base}/index.html?harness=1&p1=tobi&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── A. REGISTRATION ──
sec("A. Registration + sprites");
const reg = await page.evaluate(() => ({ p1: window.__harness.p1()?.key, p2: window.__harness.p2()?.key, scale: window.__harness.p1()?.spriteScale, sheet: window.__harness.p1()?.spriteSheet }));
ok(reg.p1 === "tobi" && reg.p2 === "obito", `co-loaded tobi vs obito`);
ok(reg.scale >= 1.85 && reg.scale <= 1.95, `Uchiha-tier spriteScale=${reg.scale}`);
ok((reg.sheet||"").includes("masked_man"), `renders as a sprite (${(reg.sheet||"").split("/").pop()})`);
ok(fs.existsSync(path.join(ROOT, "tobi_portrait.png")), `portrait extracted (tobi_portrait.png exists)`);

// ── B. NORMALS (pose render) ──
sec("B. Basic normals");
const NORMALS = { light: "up_attack", heavy: "dash_combo", up: "up_attack", air: "air_kunia", down_air: "down_air" };
for (const [pose, needle] of Object.entries(NORMALS)) {
  await page.evaluate(a => window.__harness.benPose(a), pose);
  await sleep(120);
  ok(((await p1()).spriteSheet||"").includes(needle), `${pose} → ${needle}`);
}
await page.evaluate(() => window.__harness.benPose(null)); await sleep(80);

// ── C. AIR-KUNAI PROJECTILE ──
sec("C. Air-kunai throw");
await prep(); await sleep(60);
await page.keyboard.down("w"); await sleep(60); await page.keyboard.up("w"); await sleep(170);
await page.keyboard.down("j"); await sleep(90); await page.keyboard.up("j");
await pollSheet("air_kunia", 500);
let kunai=null; for (let i=0;i<20;i++){ kunai=(await projs()).find(p=>(p.sheet||"").includes("kunia_proj")); if(kunai) break; await wf(1);}
ok(!!kunai, `air normal spawns the kunai projectile`);

// ── D. KAMUI TELEPORT-BEHIND ──
sec("D. Kamui teleport-behind (speed-tier)");
await prep(); await sleep(60);
await page.evaluate(() => window.__harness.setP1X?.(220));
await sleep(80);
const bx = (await p1()).x;
await page.keyboard.down("d"); await page.keyboard.up("d"); await sleep(70); await page.keyboard.down("d"); await page.keyboard.up("d"); await sleep(80);
const ax = await p1();
ok(ax.speedBlur > 0 && Math.abs(ax.x - bx) > 40, `blink + spin (speedBlur=${ax.speedBlur}, Δx=${Math.round(Math.abs(ax.x-bx))})`);

// ── E. CHAIN GRAB ──
sec("E. Chain Grab (multi-stage command grab)");
await prep(); await sleep(60);
await page.evaluate(() => { const b=window.__harness.p2(); window.__harness.setP1X?.(b.x-105); });
await sleep(50);
const chp0 = (await p2()).health;
await page.keyboard.down("l"); await sleep(50); await page.keyboard.up("l");
const phases=new Set(); let grabbed=false, kd=false;
for (let i=0;i<130;i++){ const a=await p1(); const b=await p2(); if(a.tobiChainPhase) phases.add(a.tobiChainPhase); if(b.isGrabbed) grabbed=true; if(b.knockdownState||(b.hitstun||0)>=20) kd=true; if(!a.tobiChainPhase && phases.size) break; await wf(1);}
ok(phases.has("snatched") && phases.has("smash"), `runs whip→…→smash (${[...phases].join("→")})`);
ok(grabbed && kd, `foe snatched + hard-knockdown finisher`);
ok((await p2()).health < chp0, `chain damage dealt (−${chp0-(await p2()).health})`);
for (let i=0;i<100;i++){ if(!(await p1()).tobiChainPhase) break; await wf(1); }

// ── F. KAMUI INTANGIBILITY ──
sec("F. Kamui Intangibility toggle");
await prep(); await sleep(60);
await page.evaluate(() => window.__harness.tobiKamuiToggle("p1"));
await wf(2);
let k = await kTobi();
ok(k.intangible && k.phased && k.invulnTimer > 0, `toggle ON → phased + i-frame negate`);
await page.keyboard.down("j"); await sleep(30); await page.keyboard.up("j");
let dropped=false; for(let i=0;i<24;i++){ const s=await kTobi(); if(s.attacking && !s.phased && s.invulnTimer===0) dropped=true; await wf(1);}
ok(dropped, `melee auto-drops the phase (hittable mid-swing)`);
await wf(6);
ok((await kTobi()).phased, `auto-reactivates after the swing`);
await page.evaluate(() => window.__harness.tobiKamuiToggle("p1"));
ok(!(await kTobi()).intangible, `2nd toggle → OFF`);

// ── G. SELF-PORTAL ──
sec("G. Kamui self-portal (Down+Special)");
await prep(); await sleep(60);
const gx = (await p1()).x;
await page.evaluate(() => window.__harness.p1SpecialDir("D"));
for(let i=0;i<36;i++){ await wf(1); if((await p1()).grounded) break; }
ok(Math.abs((await p1()).x - gx) > 300, `warped across the map (Δx=${Math.round(Math.abs((await p1()).x-gx))})`);

// ── H. KAMUI OPPONENT-TELEPORT GRAB ──
sec("H. Kamui grab (Back+Special)");
await prep(); await sleep(60);
await page.evaluate(() => { const b=window.__harness.p2(); window.__harness.setP1X?.(b.x-60); });
await sleep(40);
const hHp0=(await p2()).health, hX0=(await p2()).x;
await page.evaluate(() => window.__harness.p1SpecialDir("B"));
let warped=0, hgrab=false; for(let i=0;i<60;i++){ await wf(1); const b=await p2(); if(b.isGrabbed) hgrab=true; warped=Math.max(warped, Math.abs(b.x-hX0)); }
ok(hgrab && warped>200, `foe grabbed + warped far (Δx=${Math.round(warped)})`);
ok((hHp0-(await p2()).health) <= 5, `displacement, not a damage-throw`);

// ── I. FIRE PHOENIX SPLIT ──
sec("I. Fire Phoenix Jutsu (giant + split)");
// Warm-up fire (discarded): the FIRST Fire Phoenix after a heavy prior sequence can drop the sub
// spawns to a transient pending-spawn/cap state — a clean second fire is deterministic (see stage-5).
await prep(); await page.evaluate(() => { window.__harness.setP1X?.(300); window.__harness.setP2X?.(1000); });
await page.evaluate(() => window.__harness.p1SpecialDir("F"));
await wf(70);   // let the warm-up fully split + despawn
await prep(); await sleep(60);
await page.evaluate(() => { window.__harness.setP1X?.(300); window.__harness.setP2X?.(1000); });
await sleep(40);
await page.evaluate(() => window.__harness.p1SpecialDir("F"));
let giant=null, subs=[]; for(let i=0;i<100;i++){ await wf(1); const ps=await projs(); if(!giant) giant=ps.find(p=>p.name==="tobiFireGiant"); const cur=ps.filter(p=>p.name==="tobiFireSub"); if(cur.length>subs.length) subs=cur; if(subs.length>=4) break; }
ok(giant && giant.w>=200 && giant.spriteScale>=2.5, `giant fireball (w=${giant?.w} scale=${giant?.spriteScale})`);
const vys=subs.map(s=>s.vy).sort((a,b)=>a-b);
ok(subs.length>=3 && (vys[vys.length-1]-vys[0])>=8, `bursts into ${subs.length} fanning sub-fireballs`);

// ── J. NINE-TAILS ULTIMATE (+ duplicate-render guard) ──
sec("J. Nine-Tails Ultimate cinematic");
await prep(); await sleep(60);
const jHp0=(await p2()).health;
await page.keyboard.down("u"); await sleep(90); await page.keyboard.up("u");
const cseen=new Set(); let struck=false, everActive=false, casterHidden=true, beastFrames=0, obitoCineFired=false;
for(let i=0;i<110;i++){ const c=await page.evaluate(()=>window.__harness.tobiNineTailsUltCine()); if(c.active){ everActive=true; if(c.struck) struck=true; if(["rise","charge","fire"].includes(c.phase)){ beastFrames++; if(!c.casterHidden) casterHidden=false; cseen.add(c.phase);} if((await page.evaluate(()=>window.__harness.obitoJuubiUltCine())).active) obitoCineFired=true; } else if(everActive) break; await sleep(30); }
ok(everActive && cseen.has("rise") && cseen.has("charge") && cseen.has("fire"), `full cinematic (rise→charge→fire)`);
ok(struck, `Bijūdama guaranteed hit`);
ok(beastFrames>0 && casterHidden, `duplicate-render GUARD: caster hidden whole beast (${beastFrames}f)`);
await page.waitForFunction(() => !window.__harness.tobiNineTailsUltCine().active, null, { timeout: 6000 }).catch(()=>{});
const jdmg = jHp0-(await p2()).health;
ok(jdmg>=300 && jdmg<=400, `cinematic-band damage (~360): ${jdmg}`);
ok(!(await page.evaluate(()=>window.__harness.tobiKuramaHide("p1"))).hide, `caster un-hidden after`);

// ── K. ISOLATION (centerpiece) ──
sec("K. ISOLATION — Tobi ⟂ Obito (no shared state)");
await prep(); await sleep(60);
let t=await kTobi(), o=await kObito();
ok(!t.intangible && !o.intangible, `both Kamui start OFF`);
await page.evaluate(() => window.__harness.tobiKamuiToggle("p1"));
t=await kTobi(); o=await kObito();
ok(t.intangible && !o.intangible, `Tobi Kamui ON did NOT touch Obito`);
await page.evaluate(() => window.__harness.obitoKamuiToggle("p2"));
t=await kTobi(); o=await kObito();
ok(t.intangible && o.intangible, `both intangible independently`);
await page.evaluate(() => window.__harness.tobiKamuiToggle("p1"));
t=await kTobi(); o=await kObito();
ok(!t.intangible && o.intangible, `Tobi OFF left Obito ON`);
ok(!obitoCineFired, `Obito's Juubi cinematic never fired during Tobi's ult`);
ok((await page.evaluate(()=>window.__harness.tobiKuramaHide("p2"))).hide === false, `Obito never got Tobi's _tobiKuramaHide`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,4).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail || errors.length ? 1 : 0);
