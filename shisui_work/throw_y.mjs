import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const OUT=path.join(ROOT,"shisui_work");
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
const cam=await pg.evaluate(()=>{const c=window.__harness.camera();const cv=document.querySelector("canvas");
  // compute visible world-Y top/bottom
  const half=(cv.height/2)/(c.zoom||1); return {zoom:c.zoom,camY:c.y,visTop:c.y-half,visBot:c.y+half,canvasH:cv.height};});
console.log("camera:",JSON.stringify(cam));
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.setP2X?.(1700);});
await wf(3);
// Kunai Rain = Down+Special
await pg.keyboard.down("s"); await pg.keyboard.down("l"); await wf(3); await pg.keyboard.up("l"); await pg.keyboard.up("s");
for(let i=0;i<8;i++){ await wf(2);
  const d=await pg.evaluate(()=>{const ps=(window.__harness.projectiles?.()||[]).map(p=>({x:Math.round(p.x),y:Math.round(p.y)}));
    const c=window.__harness.camera();const cv=document.querySelector("canvas");const half=(cv.height/2)/(c.zoom||1);
    // screen-y of each proj
    return ps.map(p=>({x:p.x,y:p.y,scrY:Math.round((p.y-(c.y-half))*(c.zoom||1))}));});
  if(d.length) console.log(`f+${i*2}:`,JSON.stringify(d));
}
await pg.screenshot({path:path.join(OUT,"throw_kunairain.png")});
await br.close(); server.close();
