import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
let pass=0,fail=0; const ck=(n,c,e="")=>{console.log(`${c?"✓":"✗"} ${n}${e?"  — "+e:""}`);c?pass++:fail++;};
const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}});
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
const st=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1()); const p2=()=>page.evaluate(()=>window.__harness.p2());
const projN=()=>page.evaluate(()=>(window.__harness.projectiles?.()||[]).length);
async function sawProj(){ try{ await page.waitForFunction(()=>(window.__harness.projectiles?.()||[]).length>0,null,{timeout:2000,polling:16}); return true;}catch(_){return false;} }
const setKi=v=>page.evaluate(x=>window.__harness.p1GokuSetEnergy(x),v);
const direct=d=>page.evaluate(x=>(window.__harness.cloneChoreo?window.__harness.cloneChoreo.direct(x,"p1"):null),d);
const stepForm=()=>page.evaluate(()=>window.__harness.p1GokuStepForm());
async function wf(n){const s=(await st()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
async function reset(gap){ await page.evaluate(()=>{window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.clearProjectiles?.();}); const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),a.x+gap*(a.facing||1)); await wf(2); }
try{
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot());
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.hasSpriteHandler;},null,{timeout:10000,polling:16}).catch(()=>{});

  // KAMEHAMEHA (neutral Special) → beam projectile
  await reset(150); await setKi(100); const ke0=(await p1()).energy; await direct("N"); const kbeam=await sawProj(); const ke1=(await p1()).energy;
  ck(`Kamehameha fires a beam (spent ${(ke0-ke1).toFixed(0)} Ki, beam=${kbeam})`, kbeam && ke0-ke1>0);

  // SSJ Kamehameha (form-coloured, still fires)
  await reset(150); await setKi(100); await stepForm(); await setKi(100); await page.evaluate(()=>window.__harness.clearProjectiles?.()); await direct("N"); const sbeam=await sawProj();
  ck(`SSJ Kamehameha fires (beam=${sbeam})`, sbeam);
  await page.evaluate(()=>window.__harness.p1GokuRevert());

  // RAPID FIST BARRAGE (Fwd+Special) → damages opponent
  await reset(40); await setKi(100); let h0=(await p2()).health; await direct("F"); await wf(34);
  ck(`Rapid Fist Barrage damages (dmg ${(h0-(await p2()).health).toFixed(0)})`, h0-(await p2()).health>0);

  // INSTANT TRANSMISSION (Up+Special) → teleports behind opponent
  await reset(220); await setKi(100); const before=(await p1()).x, ox=(await p2()).x; await direct("U"); await wf(4);
  const after=(await p1()).x;
  ck(`Instant Transmission teleports (Δx ${(after-before).toFixed(0)}, near opp)`, Math.abs(after-before)>60 && Math.abs(after-ox)<90, `after=${after.toFixed(0)} opp=${ox.toFixed(0)}`);

  // AFTERIMAGE (Back+Special) → grants i-frames
  await reset(80); await setKi(100); await direct("B"); await wf(1);
  ck(`Afterimage grants i-frames (invuln ${(await p1()).invulnTimer||0})`, ((await p1()).invulnTimer||0)>0);

  ck("zero JS errors", errs.length===0, errs.slice(0,2).join(" | "));
}catch(e){ck("ran",false,String(e));}
console.log(`\n  GOKU SPECIALS (4b): ${pass} passed, ${fail} failed`);
await browser.close(); server.close(); process.exit(fail?1:0);
