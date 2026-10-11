import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",()=>{});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_trinity&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
await wf(6);
const ground=await pg.evaluate(()=>{const p1=window.__harness.p1();return {fighterY:Math.round(p1.y),fighterFeet:Math.round(p1.y+(p1.h||100)),p2feet:(()=>{const p=window.__harness.p2();return Math.round(p.y+(p.h||100));})()};});
console.log("fighter top y:",ground.fighterY,"feet:",ground.fighterFeet,"p2 feet(floor~):",ground.p2feet);
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.setP2X?.(1700);});
await wf(3);
await pg.keyboard.down("s"); await pg.keyboard.down("l"); await wf(3); await pg.keyboard.up("l"); await pg.keyboard.up("s");
let maxY=0;
for(let i=0;i<30;i++){ await wf(2);
  const d=await pg.evaluate(()=>(window.__harness.projectiles?.()||[]).map(p=>Math.round(p.y)));
  if(d.length){const m=Math.max(...d); if(m>maxY)maxY=m;}
}
console.log("deepest kunai Y reached:",maxY,"(floor feet ~",ground.p2feet,") passes floor by:",maxY-ground.p2feet,"px");
await br.close(); server.close();
