// harness/ffa_controller.test.mjs — REAL P3/P4 CONTROLLER input for local 4-player FFA.
//
// VERIFICATION APPROACH (a): we simulate the actual Gamepad API. Playwright has no native
// gamepad support, but the game reads controllers ONLY through navigator.getGamepads()
// (pollGamepad / resolvePadIndex / getConnectedPadCount all call it). So an addInitScript
// stub that returns synthetic Gamepad objects with controllable button/axis state drives the
// REAL controller code path end-to-end — pollGamepad → mapInputToVirtualKeys → moveFighter /
// buildNormalControlState. This is deliberately NOT the ffaMove/ffaAttack force-hooks (those
// bypass fighter.controls entirely, which is exactly why the empty-"" P3/P4 map bug slipped
// through the original FFA suite). This test would FAIL on the old empty-string controls,
// where every action collapsed onto keys[""] (right == light == jump == grab).
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

// PS5_MAP button indices (mirror input.js).
const BTN={X:0,SQUARE:2,TRIANGLE:3,L1:4,R1:5,L2:6,R2:7,UP:12,DOWN:13,LEFT:14,RIGHT:15};

// ── Fake Gamepad API — installed BEFORE any page script runs ─────────────────
await page.addInitScript(()=>{
  const mk=(index)=>({index,id:"fakepad",connected:true,mapping:"standard",timestamp:0,
    axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))});
  window.__pads=[];
  window.__padInit=(n)=>{ window.__pads=Array.from({length:n},(_,i)=>mk(i)); };
  window.__padSet=(p,btn,on)=>{ const b=window.__pads[p].buttons[btn]; b.pressed=!!on; b.value=on?1:0; };
  window.__padClear=(p)=>{ window.__pads[p].buttons.forEach(b=>{b.pressed=false;b.value=0;}); window.__pads[p].axes=[0,0,0,0]; };
  const orig=navigator.getGamepads?navigator.getGamepads.bind(navigator):()=>[];
  navigator.getGamepads=()=> (window.__pads&&window.__pads.length? window.__pads.slice() : orig());
});

const info=()=>page.evaluate(()=>window.__harness.ffaInfo());
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();try{await page.waitForFunction(([a,x])=>window.__harness.state().frame>=a+x,[s,n],{timeout:10000,polling:8});}catch{}}
const F=(fi,i)=>fi.fighters[i];
async function ffa(keys,ai){ await page.evaluate(([k,a])=>window.__harness.ffaStart(4,k,[],a),[keys,ai]); await wf(2); }
async function healAll(){ const fi=await info(); for(let i=0;i<fi.fighters.length;i++) await page.evaluate(i=>window.__harness.ffaDamage(i,-99999),i); await wf(1); }
async function place(xs){ for(let i=0;i<xs.length;i++) await page.evaluate(([i,x])=>window.__harness.ffaSetX(i,x),[i,xs[i]]); await wf(1); }
const padInit=n=>page.evaluate(n=>window.__padInit(n),n);
const padSet=(p,btn,on)=>page.evaluate(([p,b,o])=>window.__padSet(p,b,o),[p,btn,on]);
const padClear=p=>page.evaluate(p=>window.__padClear(p),p);

try{
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.waitForTimeout(120);

  // ── FAKE PADS detected as devices ──────────────────────────────────────────
  section("Gamepad API stub — 2 pads seen as connected devices");
  await padInit(2);
  const it=await page.evaluate(()=>window.__harness.inputTypes());
  check("engine sees 2 connected pads", it.pads===2, `pads=${it.pads}`);
  const maxP=await page.evaluate(()=>window.__harness.ffaMaxPlayers());
  check("player count opens to 4 (2 keyboard + 2 pads)", maxP===4, `max=${maxP}`);

  // 4 human players; slots 2 & 3 are the controller-only P3/P4.
  await ffa(["gojo","sukuna","naruto","toji"],[null,null,null,null]);

  // ── P3 MOVEMENT is distinct from every other action ────────────────────────
  section("P3 pad — holding RIGHT moves right ONLY (no collapse into attack/jump)");
  await healAll();
  await place([1000, 1300, 2600, 4200]);   // slot2 (P3) isolated in the middle
  await padClear(0);
  let s2=(await info()).fighters[2];
  const y0=s2.y, x0=s2.x;
  await padSet(0,BTN.RIGHT,true);
  let attackedWhileMoving=false, leftGround=false;
  for(let k=0;k<5;k++){ await wf(6); const s=(await info()).fighters[2]; if(s.attacking) attackedWhileMoving=true; if(Math.abs(s.y-y0)>40) leftGround=true; }
  await padSet(0,BTN.RIGHT,false); await wf(2);
  s2=(await info()).fighters[2];
  check("P3 moved RIGHT via real pad d-pad", s2.x>x0+20, `Δx=${Math.round(s2.x-x0)}`);
  check("RIGHT did NOT also trigger an attack (no keys[''] collapse)", attackedWhileMoving===false);
  check("RIGHT did NOT also trigger a jump", leftGround===false, `Δy=${Math.round(s2.y-y0)}`);

  // ── P3 ATTACK is distinct from movement ────────────────────────────────────
  section("P3 pad — pressing LIGHT (Square) attacks ONLY (no drift/jump)");
  await healAll();
  await place([4200, 1360, 1300, 4000]);   // slot1 target just right of slot2(P3)
  await padClear(0);
  let before=await info();
  const ax0=F(before,2).x, ay0=F(before,2).y;
  for(let t=0;t<3;t++){ await padSet(0,BTN.SQUARE,true); await wf(4); await padSet(0,BTN.SQUARE,false); await wf(8); }
  let after=await info();
  check("P3 LIGHT connected — target took damage", F(after,1).health < F(before,1).health-1,
        `targetΔ=${Math.round(F(before,1).health-F(after,1).health)}`);
  check("LIGHT did NOT also fling P3 into a jump", Math.abs(F(after,2).y-ay0)<40, `Δy=${Math.round(F(after,2).y-ay0)}`);
  check("LIGHT did NOT also drive a large stride", Math.abs(F(after,2).x-ax0)<90, `Δx=${Math.round(F(after,2).x-ax0)}`);
  await page.screenshot({path:path.join(OUT,"FFA_CTRL_p3.png")});

  // ── DISTINCT PADS — P4 is its own pad, no cross-talk with P3 ────────────────
  section("Distinct pad binding — P4's pad drives slot3 ONLY (no P3 cross-talk)");
  // Threshold to distinguish "cross-talk" (a directed ~200+px move — see the buggy run's -140)
  // from harmless post-move deceleration residue (a handful of px as velocity bleeds off).
  const NO_XTALK=30;
  await healAll();
  await place([1000, 1300, 2600, 3600]);   // slot2(P3) & slot3(P4) both isolated
  await padClear(0); await padClear(1); await wf(10);   // settle any residual velocity first
  before=await info();
  await padSet(1,BTN.RIGHT,true); await wf(24); await padSet(1,BTN.RIGHT,false); await wf(2);
  after=await info();
  check("P4 pad moved slot3 right", F(after,3).x>F(before,3).x+20, `Δx3=${Math.round(F(after,3).x-F(before,3).x)}`);
  check("P3 (slot2) did NOT move from P4's pad", Math.abs(F(after,2).x-F(before,2).x)<NO_XTALK, `Δx2=${Math.round(F(after,2).x-F(before,2).x)}`);
  // reverse: P3 pad LEFT moves slot2 only
  await padClear(0); await padClear(1); await wf(10);   // settle slot3's residual glide before measuring
  before=await info();
  await padSet(0,BTN.LEFT,true); await wf(24); await padSet(0,BTN.LEFT,false); await wf(2);
  after=await info();
  check("P3 pad moved slot2 left", F(after,2).x<F(before,2).x-20, `Δx2=${Math.round(F(after,2).x-F(before,2).x)}`);
  check("P4 (slot3) did NOT move from P3's pad", Math.abs(F(after,3).x-F(before,3).x)<NO_XTALK, `Δx3=${Math.round(F(after,3).x-F(before,3).x)}`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"FFA_CTRL_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
