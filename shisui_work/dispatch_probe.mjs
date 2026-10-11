import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
async function run(key){
  const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",()=>{});
  const st=()=>pg.evaluate(()=>window.__harness.state());
  async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
  await pg.goto(`${base}/index.html?harness=1&p1=${key}&p2=naruto`,{waitUntil:"load"});
  await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
  await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
  await wf(8);
  for(const [label,p1x,p2x] of [["CLOSE",1400,1500],["FAR",1100,1950]]){
    await pg.evaluate(([a,b])=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(a);window.__harness.setP2X?.(b);},[p1x,p2x]);
    await wf(5);
    const x0=await pg.evaluate(()=>Math.round(window.__harness.p1().x));
    const r=await pg.evaluate(()=>window.__harness.p1SpecialDir?.("F"));
    await wf(14);
    const after=await pg.evaluate(()=>({x:Math.round(window.__harness.p1().x),proj:(window.__harness.projectiles?.()||[]).length}));
    console.log(`${key} ${label}: dispatch=${JSON.stringify(r)} | x ${x0}->${after.x} (moved ${after.x-x0}) proj=${after.proj}`);
  }
  await pg.close();
}
await run("shisui_trinity"); await run("shisui_blade"); await run("shisui_puppeteer");
await br.close(); server.close();
