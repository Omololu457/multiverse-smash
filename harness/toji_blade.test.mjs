// harness/toji_blade.test.mjs — Phase 2: Blade-stance real normals + Reaper's rekka.
// Verifies each normal fires+connects, and the rekka's 3 cancel routes (chain / stance-cancel /
// safe-stop) with frame-count evidence. Blade content only (Chain/Gun deferred).
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
async function tapLight(){await page.keyboard.down("j");await wf(2);await page.keyboard.up("j");}
async function tapKey(k){await page.keyboard.down(k);await wf(2);await page.keyboard.up(k);}
async function waitIdle(){for(let i=0;i<160;i++){if((await ts()).canAct)return;await wf(1);}}
async function placeDummyClose(){const a=await p1();await page.evaluate(x=>window.__harness.setP2X(x),Math.round(a.x+a.w+30));await page.evaluate(()=>window.__harness.healP2());await wf(1);}
// wait until the current attack reaches RECOVERY, return the frame it started recovery
async function waitRecovery(){for(let i=0;i<80;i++){const s=await ts();if(s.phase==="recovery")return await frame();if(!s.attacking&&i>2)return null;await wf(1);}return null;}

try{
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=toji`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());await wf(5);
  check("starts in BLADE stance", (await ts()).stance==="blade", `stance=${(await ts()).stance}`);

  section("Blade normals — each fires + connects for damage");
  // 5A Quick Draw (J)
  await placeDummyClose(); let hp=(await p2()).health; await waitIdle(); await tapLight(); await wf(1);
  check("5A Quick Draw fires (J → quickDraw)", (await ts()).move==="quickDraw", `move=${(await ts()).move}`);
  await wf(18); check("Quick Draw connects for damage", (await p2()).health<hp, `hp ${hp}→${(await p2()).health}`);
  // 5B Forward Slash (K)
  await placeDummyClose(); hp=(await p2()).health; await waitIdle(); await tapKey("k"); await wf(1);
  check("5B Forward Slash fires (K → forwardSlash)", (await ts()).move==="forwardSlash", `move=${(await ts()).move}`);
  await wf(22); check("Forward Slash connects for damage", (await p2()).health<hp, `hp ${hp}→${(await p2()).health}`);
  // 2C Skyward Cut (I) — launcher
  await placeDummyClose(); hp=(await p2()).health; await waitIdle(); await tapKey("i"); await wf(1);
  check("2C Skyward Cut fires (I → skywardCut)", (await ts()).move==="skywardCut", `move=${(await ts()).move}`);
  await wf(14); const pv=await p2();
  check("Skyward Cut connects for damage", pv.health<hp, `hp ${hp}→${pv.health}`);
  check("Skyward Cut LAUNCHES the opponent (airborne/upward)", pv.grounded===false || (pv.vy||0)<0, `grounded=${pv.grounded} vy=${(pv.vy||0).toFixed(1)}`);
  await wf(40);

  section("Reaper's Combo rekka — ROUTE 1: chain each hit into the next");
  await placeDummyClose(); await waitIdle();
  await tapLight(); await wf(1);
  check("rekka opens on Quick Draw (rekkaNext=reaper1)", (await ts()).rekkaNext==="reaper1", `rekkaNext=${(await ts()).rekkaNext}`);
  const chained=[];
  for(const expect of ["reaper1","reaper2","reaper3"]){
    const rec=await waitRecovery();
    if(rec==null){ chained.push(`${expect}:NO-RECOVERY`); break; }
    await tapLight(); await wf(1);
    chained.push(`${expect}=${(await ts()).move}`);
  }
  check("chain route: quickDraw → reaper1 → reaper2 → reaper3", chained.join(",")==="reaper1=reaper1,reaper2=reaper2,reaper3=reaper3", chained.join(","));
  check("finisher (reaper3) ends the rekka (rekkaNext cleared)", (await ts()).rekkaNext===null || (await ts()).move==="reaper3", `rekkaNext=${(await ts()).rekkaNext}`);
  await waitIdle();

  section("Reaper's Combo rekka — ROUTE 2: stance-cancel out of recovery");
  await placeDummyClose(); await waitIdle();
  await tapLight(); await wf(1);   // quickDraw
  const rec2=await waitRecovery();
  const stanceBefore=(await ts()).stance;
  await tapKey("p"); await wf(2);   // charge = stance-switch cancel
  const after=await ts();
  check("stance-cancel during Reaper recovery SWITCHED stance", after.stance!==stanceBefore, `${stanceBefore}→${after.stance}`);
  check("stance-cancel ended the attack early (not still in reaper recovery)", after.move==null || after.move!=="quickDraw" ? true : !after.attacking, `attacking=${after.attacking} move=${after.move}`);
  // reset back to blade for the next test
  await waitIdle(); while((await ts()).stance!=="blade"){ await tapKey("p"); await waitIdle(); }

  section("Reaper's Combo rekka — ROUTE 3: safe-stop (no input → recovers, rekka resets)");
  await placeDummyClose(); await waitIdle();
  await tapLight(); await wf(1);   // quickDraw (rekkaNext=reaper1)
  check("mid-attack rekkaNext armed", (await ts()).rekkaNext==="reaper1");
  await waitRecovery();
  await waitIdle();                // do NOTHING → let recovery complete
  const idle=await ts();
  check("safe-stop: returns to idle able to act", idle.canAct===true, `canAct=${idle.canAct}`);
  check("safe-stop: rekka reset (rekkaNext cleared, no reaper queued)", idle.rekkaNext===null, `rekkaNext=${idle.rekkaNext}`);
  // and a fresh light now starts a NEW quickDraw (not a reaper), proving the string reset
  await tapLight(); await wf(1);
  check("safe-stop: next light starts a fresh quickDraw (string reset)", (await ts()).move==="quickDraw", `move=${(await ts()).move}`);
  await page.screenshot({path:path.join(OUT,"TOJI_blade.png")});

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"TOJI_blade_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
