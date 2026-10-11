import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const OUT=path.join(ROOT,"shisui_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
async function seq(label,keys,p1x,p2x){
  const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",()=>{});
  const st=()=>pg.evaluate(()=>window.__harness.state());
  async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
  await pg.goto(`${base}/index.html?harness=1&p1=shisui_blade&p2=naruto`,{waitUntil:"load"});
  await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
  await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
  await wf(8);
  await pg.evaluate(([a,b])=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(a);window.__harness.setP2X?.(b);},[p1x,p2x]);
  await wf(3);
  for(const k of keys) await pg.keyboard.down(k);
  await wf(2); for(const k of keys) await pg.keyboard.up(k);
  const rects=[];
  for(const fr of [3,6,9,13,18]){ await wf(3);
    const r=await pg.evaluate(()=>{const rr=window.__harness.screenRect("p1");const cv=document.querySelector("canvas");
      return {L:Math.round(rr.x),R:Math.round(rr.x+rr.w),T:Math.round(rr.y),B:Math.round(rr.y+rr.h),off:(rr.x<-20||rr.x+rr.w>cv.width+20||rr.y<-20||rr.y+rr.h>cv.height+20)};});
    rects.push(`${fr}:[L${r.L} R${r.R} T${r.T} B${r.B}${r.off?" OFF!":""}]`);
  }
  console.log(`${label} (p1=${p1x} p2=${p2x}): ${rects.join(" ")}`);
  await pg.close();
}
// Kunai Barrage (neutral). Then Backstab/Feint from various relative positions incl walking-into-wall scenarios
await seq("KunaiBarrage N mid",["l"],1400,1650);
await seq("Backstab F p1-left-of-foe",["d","l"],1400,1700);   // facing right, foe right -> backstab to foe's right
await seq("Backstab F foe-at-left",["a","l"],1700,1000);       // facing left, foe far left
await seq("Feint B mid",["a","l"],1400,1650);
await seq("Backstab walking-in",["d","l"],2000,2290);          // advancing toward foe near right band edge
await br.close(); server.close();
