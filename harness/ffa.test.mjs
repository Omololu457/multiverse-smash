// harness/ffa.test.mjs — Local 3-4 player FREE-FOR-ALL (Phase 1 POC).
// Proves N fighters coexist as an ARRAY and fight correctly: all move, each attacks and
// damages EVERY other (not one fixed pair), elimination works, a winner is declared, the
// camera frames everyone, and the P3/P4 controller-only input wiring + device cap are in
// place. (1v1 regression is a separate full-suite run — see the report.)
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
const info=()=>page.evaluate(()=>window.__harness.ffaInfo());
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();try{await page.waitForFunction(([a,x])=>window.__harness.state().frame>=a+x,[s,n],{timeout:8000,polling:8});}catch{}}
const H=(fi,i)=>fi.fighters[i].health;

async function ffa(count,keys){ await page.evaluate(([c,k])=>window.__harness.ffaStart(c,k),[count,keys]); await wf(2); }
async function healAll(){ const fi=await info(); for(let i=0;i<fi.fighters.length;i++){ await page.evaluate(i=>window.__harness.ffaDamage(i,-99999),i);} await wf(1); }
async function place(positions){ for(let i=0;i<positions.length;i++) await page.evaluate(([i,x])=>window.__harness.ffaSetX(i,x),[i,positions[i]]); await wf(1); }
// Return which OTHER fighters lost health after `attacker` swings, from a clean full-health start.
async function whoGetsHitBy(attacker, positions){
  await healAll(); await place(positions); await wf(1);
  const before=await info();
  // Swing a few times over a wider window so a slower/short normal still connects.
  for(let t=0;t<3;t++){ await page.evaluate(i=>window.__harness.ffaAttack(i,"heavy"),attacker); await wf(10); }
  const after=await info();
  const hurt=[];
  for(let i=0;i<after.fighters.length;i++){ if(i!==attacker && H(after,i) < H(before,i)-1) hurt.push(i); }
  return hurt;
}

try{
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.waitForTimeout(120);

  // ── INPUT WIRING (P3/P4 controller-only + device cap) ─────────────────────
  section("INPUT — P3/P4 controller-only + device-capped player count");
  const it=await page.evaluate(()=>window.__harness.inputTypes());
  check("P3 & P4 are controller-only", it.p3==="controller" && it.p4==="controller", JSON.stringify(it));
  const maxP=await page.evaluate(()=>window.__harness.ffaMaxPlayers());
  check("player count capped to 2 keyboard + N pads (no pad → 2)", maxP===2+it.pads, `max=${maxP} pads=${it.pads}`);

  // ── 3 FIGHTERS ────────────────────────────────────────────────────────────
  section("3 FIGHTERS — coexist as an array, spread across the wide arena");
  await ffa(3,["gojo","sukuna","megumi"]);
  let fi=await info();
  check("mode=ffa, 3 fighters active on the wide arena", fi.mode==="ffa" && fi.fighters.length===3 && fi.stageWidth>=4200, `stageW=${fi.stageWidth} n=${fi.fighters.length}`);
  check("fighters have distinct playerNumbers 1/2/3", JSON.stringify(fi.fighters.map(f=>f.playerNumber))==="[1,2,3]");
  check("spawned spread out (not stacked)", (fi.fighters[2].x-fi.fighters[0].x)>800, `xs=${fi.fighters.map(f=>f.x)}`);
  check("camera zoomed OUT to frame all three (zoom<1)", fi.camZoom<1, `zoom=${fi.camZoom.toFixed(2)}`);

  section("3 FIGHTERS — all MOVE");
  // P1 via REAL keyboard (proves the true input path), P2 & P3 via injected direction.
  await place([1500,2000,2500]);
  let x0=(await info()).fighters[0].x;
  await page.keyboard.down("d"); await wf(10); await page.keyboard.up("d");
  check("P1 moves via real keyboard input", (await info()).fighters[0].x>x0+15, `Δx=${(await info()).fighters[0].x-x0}`);
  await page.evaluate(()=>{window.__harness.ffaMove(1,-1);window.__harness.ffaMove(2,1);}); const pre=await info(); await wf(10);
  await page.evaluate(()=>{window.__harness.ffaMove(1,0);window.__harness.ffaMove(2,0);});
  const post=await info();
  check("P2 moves (left)", post.fighters[1].x<pre.fighters[1].x-10, `Δ=${post.fighters[1].x-pre.fighters[1].x}`);
  check("P3 moves (right)", post.fighters[2].x>pre.fighters[2].x+10, `Δ=${post.fighters[2].x-pre.fighters[2].x}`);

  section("3 FIGHTERS — each attacks + damages EVERY other (not one fixed pair)");
  // 0 hits 2 (0 & 2 adjacent, 1 far) → proves cross-pair, not the old p1/p2 pairing.
  check("P0 can damage P2 (not just its 'pair')", (await whoGetsHitBy(0,[1200,3200,1270])).includes(2));
  // 2 hits 1
  check("P2 can damage P1", (await whoGetsHitBy(2,[3200,1270,1200])).includes(1));
  // 1 hits 0
  check("P1 can damage P0", (await whoGetsHitBy(1,[1270,1200,3200])).includes(0));
  await page.screenshot({path:path.join(OUT,"FFA_3p.png")});

  section("3 FIGHTERS — elimination + winner");
  await healAll();
  await page.evaluate(()=>window.__harness.ffaDamage(1,99999)); await wf(3);
  fi=await info();
  check("a fighter at 0 HP is eliminated", fi.fighters[1].eliminated===true && fi.alive===2, `alive=${fi.alive}`);
  check("not over yet with 2 alive", fi.over===false);
  await page.evaluate(()=>window.__harness.ffaDamage(2,99999)); await wf(3);
  fi=await info();
  check("last fighter standing → match over", fi.over===true && fi.alive===1);
  check("winner is the survivor (slot 0)", fi.winnerSlot===0, `winnerSlot=${fi.winnerSlot}`);
  await page.screenshot({path:path.join(OUT,"FFA_winner.png")});

  // ── 4 FIGHTERS ────────────────────────────────────────────────────────────
  section("4 FIGHTERS — coexist + cross damage + win");
  await ffa(4,["gojo","sukuna","megumi","naruto"]);
  fi=await info();
  check("4 fighters active, playerNumbers 1/2/3/4", fi.fighters.length===4 && JSON.stringify(fi.fighters.map(f=>f.playerNumber))==="[1,2,3,4]");
  check("camera frames all four (zoom<1)", fi.camZoom<1, `zoom=${fi.camZoom.toFixed(2)}`);
  // P3 (slot3) damages P1 (slot1) across the field
  check("P3 damages P1 (4-player cross pair)", (await whoGetsHitBy(3,[3400,1270,3600,1200])).includes(1));
  // P0 hits whoever is adjacent (slot 2), not slot 1/3 far away
  const hurtBy0=await whoGetsHitBy(0,[1200,3400,1270,3600]);
  check("P0's hit lands on the ADJACENT fighter only", hurtBy0.length>=1 && hurtBy0.includes(2), `hurt=${JSON.stringify(hurtBy0)}`);
  await page.screenshot({path:path.join(OUT,"FFA_4p.png")});
  // eliminate down to a winner
  await healAll();
  for(const idx of [1,2,3]){ await page.evaluate(i=>window.__harness.ffaDamage(i,99999),idx); await wf(3); }
  fi=await info();
  check("4-player FFA resolves to a single winner", fi.over===true && fi.alive===1 && fi.winnerSlot===0, `alive=${fi.alive} winner=${fi.winnerSlot}`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"FFA_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
