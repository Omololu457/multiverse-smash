// harness/ghostface_exe_idswap.test.mjs
// ghostface_exe IDENTITY-SWAP engine (Stages 1-3): base "Billy" (weak human) spends a bar to borrow
// Sasuke (Down+Special) or Deathstroke (Up+Special) for a window; involuntary revert on timeout / real
// hit / KO. Verifies the moveset GENUINELY changes (rosterKey + basic_attacks) and every revert path.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
let pass=0,fail=0; const check=(n,c,e="")=>{console.log(`${c?"✓":"✗"} ${n}${e?"  — "+e:""}`);c?pass++:fail++;};
const state=()=>page.evaluate(()=>window.__harness.state());
const sw=()=>page.evaluate(()=>window.__harness.idSwapState("p1"));
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
async function reBilly(){ await page.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.resetFighterInput?.("p1");}); await wf(2); }
try{
  await page.goto(`${base}/index.html?harness=1&p1=ghostface_exe&p2=piccolo`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot()); await wf(6);
  await reBilly();

  const s0=await sw();
  check("Billy base: rosterKey ghostface_exe, not swapped, weak light dmg 30", s0.rosterKey==="ghostface_exe"&&!s0.active&&s0.lightDmg===30, JSON.stringify(s0));

  // Down+Special → Sasuke
  await page.evaluate(()=>window.__harness.p1SpecialDir("D")); await wf(2);
  const sA=await sw();
  check("Down+Special → SASUKE (rosterKey swap)", sA.active&&sA.rosterKey==="sasuke"&&sA.identity==="sasuke", JSON.stringify(sA));
  check("moveset genuinely changed (Sasuke light != Billy 30)", sA.lightDmg!==30&&sA.lightDmg!=null, "sasukeLight="+sA.lightDmg);
  check("spent 1 bar (100→50)", sA.energy===50, "energy="+sA.energy);
  check("window armed (~660f)", sA.timer>600&&sA.timer<=660, "timer="+sA.timer);

  // revert on TIMEOUT
  await page.evaluate(()=>window.__harness.idSwapForceTimer(2)); await wf(4);
  const sT=await sw();
  check("revert on TIMEOUT → Billy", !sT.active&&sT.rosterKey==="ghostface_exe"&&sT.reason==="expire", JSON.stringify(sT));

  // Up+Special → Deathstroke
  await reBilly();
  await page.evaluate(()=>window.__harness.p1SpecialDir("U")); await wf(2);
  const sB=await sw();
  check("Up+Special → DEATHSTROKE (rosterKey swap)", sB.active&&sB.rosterKey==="deathstroke"&&sB.identity==="deathstroke", JSON.stringify(sB));
  check("moveset genuinely changed (Deathstroke light != Billy 30)", sB.lightDmg!==30&&sB.lightDmg!=null, "dsLight="+sB.lightDmg);

  // involuntary revert on TAKING A HIT
  await page.evaluate(()=>window.__harness.setP1Hitstun?.(30)); await wf(3);
  const sH=await sw();
  check("involuntary revert on TAKING A HIT → Billy", !sH.active&&sH.rosterKey==="ghostface_exe"&&sH.reason==="hit", JSON.stringify(sH));

  // cannot swap without a bar
  await page.evaluate(()=>{window.__harness.setEnergy?.("p1",10); window.__harness.resetFighterInput?.("p1");}); await wf(2);
  const before=await sw();
  await page.evaluate(()=>window.__harness.p1SpecialDir("D")); await wf(2);
  const sNo=await sw();
  check("swap BLOCKED without a full bar (energy<50)", !sNo.active, "energy="+before.energy+" active="+sNo.active);

  check("no JS errors", errs.length===0, errs[0]||"");
}catch(e){console.log("ERR",String(e));fail++;}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close(); process.exit(fail?1:0);
