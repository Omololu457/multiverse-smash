import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const OUT=path.join(ROOT,"shisui_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",e=>console.log("PAGEERR",e.message));
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_trinity&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
await wf(8);
const key=()=>pg.evaluate(()=>{const p1=window.__harness.p1();return {key:p1.key||p1.rosterKey,x:Math.round(p1.x)};});
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(1400);window.__harness.setP2X?.(1650);});
await wf(3);
console.log("start:",JSON.stringify(await key()));
// Variant Swap = Grab (o)
await pg.keyboard.down("o"); await wf(2); await pg.keyboard.up("o"); await wf(8);
console.log("after swap:",JSON.stringify(await key()));
// now neutral Special a few times, watching x
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);});
for(let rep=0;rep<3;rep++){
  const before=(await key()).x;
  await pg.keyboard.down("l"); await wf(2); await pg.keyboard.up("l");
  let maxOff=false,xs=[];
  for(let i=0;i<6;i++){ await wf(2); const r=await pg.evaluate(()=>{const rr=window.__harness.screenRect("p1");const cv=document.querySelector("canvas");const p1=window.__harness.p1();return {x:Math.round(p1.x),off:(rr.x<-10||rr.x+rr.w>cv.width+10),cast:p1._spriteCastMove||null};}); xs.push(r.x); if(r.off)maxOff=true; }
  await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);});
  console.log(`neutral Special #${rep+1}: x ${before} -> [${xs.join(",")}] off=${maxOff}`);
}
await br.close(); server.close();
