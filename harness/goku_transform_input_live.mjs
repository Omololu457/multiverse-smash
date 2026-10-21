// harness/goku_transform_input_live.mjs — REAL-keyboard transform input (hold-charge→release = climb).
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
const form=()=>page.evaluate(()=>window.__harness.p1GokuForm());
async function wf(n){const s=(await stt()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
async function setKi(v){await page.evaluate(x=>window.__harness.p1GokuSetEnergy(x),v);}
async function holdRelease(){ await page.keyboard.down("p"); await wf(16); await page.keyboard.up("p"); await wf(4); }  // hold-charge → release = climb
async function chargeBack(){ const pp=await page.evaluate(()=>window.__harness.p1()); const B=(pp.facing||1)>=0?"a":"d"; await page.keyboard.down("p"); await wf(12); await page.keyboard.down(B); await wf(6); await page.keyboard.up("p"); await wf(3); await page.keyboard.up(B); await wf(4); }
async function chargeDown(){ await page.keyboard.down("p"); await wf(12); await page.keyboard.down("s"); await wf(6); await page.keyboard.up("p"); await wf(3); await page.keyboard.up("s"); await wf(4); }
try{
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot());
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.hasSpriteHandler;},null,{timeout:10000,polling:16}).catch(()=>{});
  await setKi(100);
  await holdRelease(); const f1=await form(); ck(`hold-release climbs to SSJ (idx ${f1.idx})`, f1.idx===1, `form=${f1.form}`);
  await setKi(100); await holdRelease(); const f2=await form(); ck(`hold-release climbs to SSJ2 (idx ${f2.idx})`, f2.idx===2);
  await setKi(100); await holdRelease(); const f3=await form(); ck(`hold-release climbs to SSJ3 (idx ${f3.idx})`, f3.idx===3);
  await chargeBack(); const f4=await form(); ck(`Charge+Back powers down to base (idx ${f4.idx})`, f4.idx===0);
  await setKi(60); await chargeDown(); const f5=await form(); ck(`Charge+Down toggles Kaioken (${f5.kaioken})`, f5.kaioken===1);
  // low Ki: hold-release should NOT climb (below SSJ threshold 25)
  await page.evaluate(()=>window.__harness.p1GokuKaioken()); await setKi(10); await holdRelease(); const f6=await form();
  ck(`hold-release with <25 Ki does not climb (idx ${f6.idx})`, f6.idx===0);
  ck("zero JS errors", errs.length===0, errs.slice(0,2).join(" | "));
}catch(e){ck("ran",false,String(e));}
console.log(`\n  GOKU TRANSFORM INPUT: ${pass} passed, ${fail} failed`);
await browser.close(); server.close(); process.exit(fail?1:0);
