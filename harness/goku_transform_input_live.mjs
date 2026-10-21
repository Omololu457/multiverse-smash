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
const fwdKey=async()=>{const p=await page.evaluate(()=>window.__harness.p1()); return (p.facing||1)>=0?"d":"a";};
const backKey=async()=>{const p=await page.evaluate(()=>window.__harness.p1()); return (p.facing||1)>=0?"a":"d";};
async function wf(n){const s=(await stt()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
async function setKi(v){await page.evaluate(x=>window.__harness.p1GokuSetEnergy(x),v);}
await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.hasSpriteHandler;},null,{timeout:10000,polling:16}).catch(()=>{});
await setKi(100);
const F=await fwdKey(), B=await backKey();
// Charge+Forward → climb to SSJ
await page.keyboard.down("p"); await wf(14); await page.keyboard.down(F); await wf(6); await page.keyboard.up("p"); await wf(3); await page.keyboard.up(F); await wf(4);
const f1=await form(); ck(`Charge+Fwd climbs to SSJ (idx ${f1.idx})`, f1.idx===1, `form=${f1.form}`);
// Charge+Forward again → SSJ2
await setKi(100); await page.keyboard.down("p"); await wf(14); await page.keyboard.down(F); await wf(6); await page.keyboard.up("p"); await wf(3); await page.keyboard.up(F); await wf(4);
const f2=await form(); ck(`Charge+Fwd climbs to SSJ2 (idx ${f2.idx})`, f2.idx===2);
// Charge+Down → Kaioken? (only Base/Blue) — at SSJ2 it should NOT toggle. Skip to powerdown:
// Charge+Back → power down to base
await page.keyboard.down("p"); await wf(14); await page.keyboard.down(B); await wf(6); await page.keyboard.up("p"); await wf(3); await page.keyboard.up(B); await wf(4);
const f3=await form(); ck(`Charge+Back powers down to base (idx ${f3.idx})`, f3.idx===0);
// Charge+Down at base → Kaioken ON
await setKi(60); await page.keyboard.down("p"); await wf(14); await page.keyboard.down("s"); await wf(6); await page.keyboard.up("p"); await wf(3); await page.keyboard.up("s"); await wf(4);
const f4=await form(); ck(`Charge+Down toggles Kaioken (${f4.kaioken})`, f4.kaioken===1);
ck("zero JS errors", errs.length===0, errs.slice(0,2).join(" | "));
console.log(`\n  GOKU TRANSFORM INPUT: ${pass} passed, ${fail} failed`);
await browser.close(); server.close(); process.exit(fail?1:0);
