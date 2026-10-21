// harness/goku_ultimates_live.mjs — PHASE 4c: the 7 per-form ultimates fire + connect.
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
const setKi=v=>page.evaluate(x=>window.__harness.p1GokuSetEnergy(x),v);
const step=()=>page.evaluate(()=>window.__harness.p1GokuStepForm());
const revert=()=>page.evaluate(()=>window.__harness.p1GokuRevert());
const form=()=>page.evaluate(()=>window.__harness.p1GokuForm());
const ult=()=>page.evaluate(()=>window.__harness.p1Ultimate());
async function wf(n){const s=(await st()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
async function toForm(n){ await revert(); for(let i=0;i<n;i++){ await setKi(100); await step(); await wf(1);} await setKi(100); await wf(1); }
async function pos(gap){ await page.evaluate(()=>{window.__harness.resetFighterInput("p1"); window.__harness.healP2();}); const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),a.x+gap*(a.facing||1)); await wf(2); }
const NAMES=["Spirit Bomb","Super Kamehameha","Meteor Smash","Dragon Fist","God Kamehameha","Kaioken×10 Kamehameha","Autonomous Assault"];
try{
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot());
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.hasSpriteHandler;},null,{timeout:10000,polling:16}).catch(()=>{});
  for(let f=0; f<=6; f++){
    await toForm(f); const fm=await form();
    await pos(70); const h0=(await p2()).health;
    const r=await ult(); await wf(82);
    const dmg=h0-(await p2()).health;
    ck(`${NAMES[f]} (form ${fm.form}) casts`, !!r.cast, `cast=${r.cast} castMove=${r.castMove}`);
    ck(`  ${NAMES[f]} connects (dmg ${dmg.toFixed(0)})`, dmg>0, "");
  }
  ck("zero JS errors", errs.length===0, errs.slice(0,2).join(" | "));
}catch(e){ck("ran",false,String(e));}
console.log(`\n  GOKU ULTIMATES (4c): ${pass} passed, ${fail} failed`);
await browser.close(); server.close(); process.exit(fail?1:0);
