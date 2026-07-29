import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(R,"harness","ben10_stage4_out"); fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(R,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]}); const page=await b.newPage({viewport:{width:1280,height:720}});
const st=()=>page.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await page.waitForFunction(([a,x])=>window.__harness.state().frame>=a+x,[s,n],{timeout:15000,polling:16});}
await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot()); await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.spriteReady;},null,{polling:32});
await page.evaluate(()=>window.__harness.benForm("human"));
await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.fillEnergy?.();window.__harness.resetUlt?.();window.__harness.resetFighterInput?.("p1");}); await wf(3);
await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u");
// capture buildup, transform-flash, and shockwave
for (const [name,fr] of [["live_omnitrix_buildup.png",30],["live_omnitrix_flash.png",68],["live_omnitrix_burst.png",100]]){
  await page.waitForFunction(f=>window.__harness.ben10UltCine().frame>=f || !window.__harness.ben10UltCine().active,fr,{timeout:8000,polling:8}).catch(()=>{});
  await page.screenshot({path:path.join(OUT,name)}); console.log("wrote",name);
}
await b.close(); server.close();
