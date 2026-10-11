import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
async function probe(key){
  const pg=await br.newPage({viewport:{width:1280,height:720}});
  pg.on("pageerror",e=>{});
  const st=()=>pg.evaluate(()=>window.__harness.state());
  async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
  await pg.goto(`${base}/index.html?harness=1&p1=${key}&p2=naruto`,{waitUntil:"load"});
  await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
  await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
  await wf(8);
  const d=await pg.evaluate(()=>{
    const f=window.__harness.p1(); const r=window.__harness.screenRect("p1");
    // compute where the HITBOX feet (world f.y+f.h) land on screen using the same formula screenRect uses
    const cam=window.__harness.camera(); const cv=document.querySelector("canvas");
    const z=cam.zoom, cw=cv.width, ch=cv.height;
    const feetWorldY=f.y+(f.h||100);
    const feetScreenY=(feetWorldY-cam.y)*z + ch/2;
    return { sprBottom:Math.round(r.y+r.h), hitboxFeetScreenY:Math.round(feetScreenY), gap:Math.round((r.y+r.h)-feetScreenY), sprH:Math.round(r.h) };
  });
  await pg.close();
  return d;
}
for(const k of ["shisui_blade","shisui_trinity","shisui_puppeteer","naruto","sasuke"]){
  const d=await probe(k);
  console.log(`${k.padEnd(18)} sprBottom=${d.sprBottom} floorScreenY=${d.hitboxFeetScreenY} GAP=${d.gap>0?'+':''}${d.gap}px (${d.gap>8?'SINKS below floor':d.gap<-8?'FLOATS above floor':'ok'}) sprH=${d.sprH}`);
}
await br.close(); server.close();
