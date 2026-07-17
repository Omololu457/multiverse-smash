// harness/toji_command.test.mjs — Phase 5: Blade-stance COMMAND MOVES.
// Dash Strike (down+heavy): forward-committing 2-sheet dash-in stab — confirms real forward
// travel + hit + the _1→_2 sprite chain. Rising Spiral (air light): air normal / juggle ender
// off Skyward Cut — confirms it fires airborne, connects, has genuinely punishable (long)
// recovery, AND that the launcher→Rising-Spiral juggle actually chains (two distinct damage
// drops, frame-level). Blade content only (Chain/Gun/specials/knockdown all deferred).
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
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:8});}
async function tapKey(k,h=2){await page.keyboard.down(k);await wf(h);await page.keyboard.up(k);}
async function tapLight(){await tapKey("j");}
async function waitIdle(){for(let i=0;i<200;i++){if((await ts()).canAct)return;await wf(1);}}
async function placeDummyClose(gap=30){const a=await p1();await page.evaluate(x=>window.__harness.setP2X(x),Math.round(a.x+a.w+gap));await page.evaluate(()=>window.__harness.healP2());await wf(1);}

try{
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=toji`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());await wf(5);
  check("starts in BLADE stance",(await ts()).stance==="blade",`stance=${(await ts()).stance}`);

  // ── DASH STRIKE ───────────────────────────────────────────────────────────
  section("DASH STRIKE (down+heavy) — forward dash + hit + _1→_2 sprite chain");
  await placeDummyClose(80); await waitIdle();
  let hp=(await p2()).health; const x0=(await p1()).x;
  // down+heavy: hold S then K together for a few frames so both poll on the same frame.
  await page.keyboard.down("s"); await page.keyboard.down("k"); await wf(3);
  await page.keyboard.up("k"); await page.keyboard.up("s");
  await wf(1);
  const m1=(await ts()).move; const sheet1=(await p1()).spriteSheet;
  check("Dash Strike fires (down+heavy → dashStrike1)", m1==="dashStrike1", `move=${m1}`);
  check("opens on the _1 crouch/wind-up sheet", /Dash_attack_1\.png$/.test(sheet1||""), `sheet=${sheet1}`);
  // let the move progress: capture forward travel + the sprite swap to _2
  let swapped=false, maxX=x0;
  for(let i=0;i<30;i++){ const a=await p1(); if((a.spriteSheet||"").match(/Dash_attack_2\.png$/)) swapped=true; maxX=Math.max(maxX,a.x); await wf(1); }
  const travel=Math.round(maxX-x0);
  check("Dash Strike DASHES forward (real committed travel)", travel>25, `travelled ${travel}px`);
  check("sprite CHAINS _1→_2 (dashStrike2 sheet shown mid-move)", swapped, swapped?"saw Dash_attack_2":"never swapped");
  check("Dash Strike connects for damage", (await p2()).health<hp, `hp ${hp}→${(await p2()).health} (Δ${hp-(await p2()).health})`);
  await waitIdle();

  // ── RISING SPIRAL as an AIR normal (isolated) + punishable recovery ─────────
  section("RISING SPIRAL (air light) — fires airborne + LONG punishable recovery");
  await placeDummyClose(40);
  await page.evaluate(()=>window.__harness.liftP1(70));   // put P1 airborne (no opponent above → whiff)
  await wf(1);
  const air0=(await p1());
  await tapLight(); await wf(1);
  const rs=(await ts());
  check("Rising Spiral fires from the air (light while airborne → risingSpiral)", rs.move==="risingSpiral", `move=${rs.move} grounded=${air0.grounded}`);
  check("uses the dash_attack_4 spin sheet", /Dash_attack_4\.png$/.test((await p1()).spriteSheet||""), `sheet=${(await p1()).spriteSheet}`);
  // measure recovery: frames from fire until able to act again (whiffed, so full recovery)
  const fStart=await frame(); await waitIdle(); const dur=(await frame())-fStart;
  check("Rising Spiral has LONG, punishable recovery (whiff lockout ≥ 30f)", dur>=30, `whiff→act lockout = ${dur} frames`);

  // ── THE JUGGLE: Skyward Cut launcher → Rising Spiral (real combo evidence) ──
  section("JUGGLE CHAIN — Skyward Cut launches → Rising Spiral juggles (2 distinct hits)");
  await placeDummyClose(24); await waitIdle();
  const hpStart=(await p2()).health;
  // 1) Skyward Cut (I) — the launcher
  await tapKey("i"); await wf(1);
  check("launcher fires (I → skywardCut)", (await ts()).move==="skywardCut", `move=${(await ts()).move}`);
  // wait for it to connect: poll until P2 takes damage (the launch hit)
  let hpAfterLaunch=hpStart, launched=false;
  for(let i=0;i<24;i++){ const d=await p2(); if(d.health<hpStart){hpAfterLaunch=d.health;} if(d.grounded===false||(d.vy||0)<0) launched=true; if(hpAfterLaunch<hpStart&&launched) break; await wf(1); }
  check("Skyward Cut connects + LAUNCHES P2 (airborne)", hpAfterLaunch<hpStart && launched, `hp ${hpStart}→${hpAfterLaunch} launched=${launched}`);
  // 2) P1 is lifted with the launch — tap light in the air to juggle with Rising Spiral
  const p1air=(await p1());
  await tapLight(); await wf(1);
  const juggleMove=(await ts()).move;
  check("air follow-up is Rising Spiral (P1 airborne when it fires)", juggleMove==="risingSpiral" && p1air.grounded===false, `move=${juggleMove} p1grounded=${p1air.grounded}`);
  // wait for the juggle hit to land: P2 should take a SECOND, distinct damage drop
  let hpAfterJuggle=hpAfterLaunch;
  for(let i=0;i<28;i++){ const d=await p2(); if(d.health<hpAfterLaunch){hpAfterJuggle=d.health;break;} await wf(1); }
  check("Rising Spiral JUGGLES the launched P2 (2nd distinct damage drop)", hpAfterJuggle<hpAfterLaunch, `launch→${hpAfterLaunch}, juggle→${hpAfterJuggle} (Δ${hpAfterLaunch-hpAfterJuggle})`);
  check("full combo did more than either hit alone (launcher+ender)", (hpStart-hpAfterJuggle)>(hpStart-hpAfterLaunch), `combo total = ${hpStart-hpAfterJuggle} dmg`);
  await page.screenshot({path:path.join(OUT,"TOJI_command_juggle.png")});

  section("errors");
  check("no uncaught JS exceptions",jsErrors.length===0,jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"TOJI_command_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
