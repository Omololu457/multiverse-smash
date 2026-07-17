// harness/toji_gun.test.mjs — Phase 4: Gun-stance real normals (RANGED via projectiles).
// 5A Snap Shot (chip projectile), 5B Aimed Shot (FEINT, no projectile, cancelable), 5C Tracer
// Round (heavy projectile, hard knockback). Confirms fire/travel/connect/damage + feint.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const OUT=path.join(ROOT,"harness","shots");fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".mp4":"video/mp4",".json":"application/json",".csv":"text/csv"};
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const server=await srv();const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true});const page=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[];page.on("pageerror",e=>jsErrors.push(String(e)));
const ts=()=>page.evaluate(()=>window.__harness.tojiState("p1"));
const p1=()=>page.evaluate(()=>window.__harness.p1());
const p2=()=>page.evaluate(()=>window.__harness.p2());
const proj=()=>page.evaluate(()=>window.__harness.projectiles());
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:8});}
async function tapKey(k){await page.keyboard.down(k);await wf(2);await page.keyboard.up(k);}
async function waitIdle(){for(let i=0;i<200;i++){if((await ts()).canAct)return;await wf(1);}}
async function placeMid(){const a=await p1();await page.evaluate(x=>window.__harness.setP2X(x),Math.round(a.x+a.w+120));await page.evaluate(()=>window.__harness.healP2());await wf(1);}

try{
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=toji`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());await wf(5);
  await tapKey("p"); await wf(3); await tapKey("p"); await wf(3);   // blade→chain→gun
  check("switched to GUN stance", (await ts()).stance==="gun", `stance=${(await ts()).stance}`);

  section("5A Snap Shot (J) — fast chip projectile: fires, travels, connects");
  await placeMid(); let hp=(await p2()).health; await waitIdle(); await tapKey("j"); await wf(1);
  let pr=await proj(); const snap=pr.find(p=>p.name==="snapShot");
  check("5A spawns a snapShot projectile (ranged, not melee)", !!snap, `projectiles=${JSON.stringify(pr.map(p=>p.name))}`);
  check("snap projectile aimed forward (vx>0)", !!snap && snap.vx>0, snap?`vx=${snap.vx.toFixed(1)}`:"");
  const x0=snap?snap.x:null; await page.screenshot({path:path.join(OUT,"TOJI_gun_snap.png")});
  await wf(6); const pr2=await proj(); const snap2=pr2.find(p=>p.name==="snapShot");
  check("snap projectile TRAVELS", (snap2==null&&x0!=null)||(snap2&&snap2.x>x0), snap2?`x ${x0?.toFixed(0)}→${snap2.x.toFixed(0)}`:"resolved (connected)");
  await wf(30); const dmg5a=hp-(await p2()).health;
  check("Snap Shot connects for LOW chip damage", dmg5a>0 && dmg5a<=25, `−${dmg5a} (chip, < melee)`);
  await wf(20);

  section("5B Aimed Shot (K) — FEINT: aim pose, NO projectile, cancelable");
  await placeMid(); const before2=await proj(); await waitIdle(); await tapKey("k"); await wf(1);
  check("5B plays the aim animation (aimedShot)", (await ts()).move==="aimedShot", `move=${(await ts()).move}`);
  const after2=await proj();
  check("5B fires NO projectile (feint / no muzzle flash)", after2.filter(p=>p.name==="aimedShot").length===0 && after2.length<=before2.length+0, `projectiles=${JSON.stringify(after2.map(p=>p.name))}`);
  await page.screenshot({path:path.join(OUT,"TOJI_gun_feint.png")});
  // cancel the feint into a stance-switch during its recovery
  for(let i=0;i<40;i++){ if((await ts()).phase==="recovery")break; await wf(1); }
  const st=(await ts()).stance;
  await tapKey("p"); await wf(2);
  check("feint is CANCELABLE into a stance-switch", (await ts()).stance!==st, `${st}→${(await ts()).stance}`);
  await waitIdle(); while((await ts()).stance!=="gun"){ await tapKey("p"); await waitIdle(); }

  section("5C Tracer Round (I) — heavy projectile, hard knockback on hit");
  await placeMid(); hp=(await p2()).health; await waitIdle(); await tapKey("i"); await wf(1);
  pr=await proj(); const tr=pr.find(p=>p.name==="tracerRound");
  check("5C spawns a tracerRound projectile", !!tr, `projectiles=${JSON.stringify(pr.map(p=>p.name))}`);
  check("tracer aimed forward (vx>0)", !!tr && tr.vx>0, tr?`vx=${tr.vx.toFixed(1)}`:"");
  await page.screenshot({path:path.join(OUT,"TOJI_gun_tracer.png")});
  // Capture at the HIT frame — knockback is applied then, before physics decays it.
  let dmg5c=0, hit=null;
  for(let i=0;i<50;i++){ const pv=await p2(); if(pv.health<hp){ dmg5c=hp-pv.health; hit=pv; break; } await wf(1); }
  check("Tracer Round connects for BIGGER damage than the chip Snap Shot (both 0.6x-scaled)", dmg5c>dmg5a && dmg5c>=20, `−${dmg5c} vs snap −${dmg5a}`);
  check("Tracer applies a HARD knockback on hit (big vx or launched)", !!hit && (Math.abs(hit.vx||0)>=8 || hit.grounded===false || (hit.vy||0)<0), hit?`vx=${(hit.vx||0).toFixed(1)} vy=${(hit.vy||0).toFixed(1)} grounded=${hit.grounded}`:"no hit");

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"TOJI_gun_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
