// harness/goku_autododge_live.mjs — PHASE 4c: Ultra Instinct auto-dodge (projectile path).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
let pass=0,fail=0; const ck=(n,c,e="")=>{console.log(`${c?"✓":"✗"} ${n}${e?"  — "+e:""}`);c?pass++:fail++;};
const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1280,height:720}});
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
const stt=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1());
const setKi=v=>page.evaluate(x=>window.__harness.p1GokuSetEnergy(x),v);
const step=()=>page.evaluate(()=>window.__harness.p1GokuStepForm());
const revert=()=>page.evaluate(()=>window.__harness.p1GokuRevert());
const gform=()=>page.evaluate(()=>window.__harness.p1GokuForm());
const bolt=(o={})=>page.evaluate(x=>window.__harness.p2BoltAtP1(x),o);
async function wf(n){const s=(await stt()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
async function neutral(){ await page.waitForFunction(()=>{const p=window.__harness.p1(); return p && (p.hitstun||0)<=0 && (p.attackCooldown||0)<=0 && !p.attacking;},null,{timeout:6000,polling:16}).catch(()=>{}); }
async function toUI(){ await revert(); await neutral(); for(let i=0;i<6;i++){ await setKi(100); await step(); await wf(1);} await neutral(); }
async function hitByBolt(ult=false){ await neutral(); await page.evaluate(()=>window.__harness.healP1?.()); const hp0=(await p1()).health, ki0=(await p1()).energy; await bolt({ult}); await wf(6); const p=await p1(); return { hpLost:hp0-p.health, kiSpent:ki0-p.energy, counter:p._gokuCounter||0 }; }
try{
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot());
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.hasSpriteHandler;},null,{timeout:10000,polling:16}).catch(()=>{});

  await revert(); await neutral(); await setKi(50); const b=await hitByBolt();
  ck(`BASE takes the bolt (dmg ${b.hpLost.toFixed(0)})`, b.hpLost>0);

  await toUI(); await setKi(50); const u=await hitByBolt(); const cdmg=(await gform()).dmg;
  ck(`UI auto-dodges the bolt (dmg ${u.hpLost.toFixed(0)})`, u.hpLost<=0);
  ck(`UI dodge spends ~8 Ki (${u.kiSpent.toFixed(0)})`, u.kiSpent>=6 && u.kiSpent<=16);
  ck(`UI dodge opens counter window (dmg mult ${cdmg.toFixed(2)} > 1.45)`, cdmg>1.45);

  await toUI(); await setKi(4); const nk=await hitByBolt();
  ck(`UI with <8 Ki takes the bolt (dmg ${nk.hpLost.toFixed(0)})`, nk.hpLost>0);

  await toUI(); await setKi(50); const ul=await hitByBolt(true);
  ck(`UI does NOT dodge an ULTIMATE bolt (dmg ${ul.hpLost.toFixed(0)})`, ul.hpLost>0);

  ck("zero JS errors", errs.length===0, errs.slice(0,2).join(" | "));
}catch(e){ck("ran",false,String(e));}
console.log(`\n  GOKU UI AUTO-DODGE (4c): ${pass} passed, ${fail} failed`);
await browser.close(); server.close(); process.exit(fail?1:0);
