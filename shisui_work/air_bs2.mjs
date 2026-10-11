import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const OUT=path.join(ROOT,"shisui_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",()=>{});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_blade&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
await wf(8);
async function trial(name, liftDy){
  await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(1400);window.__harness.setP2X?.(1650);});
  await wf(3);
  if(liftDy) await pg.evaluate((d)=>window.__harness.liftP2?.(d),liftDy);
  await wf(1);
  const foe=await pg.evaluate(()=>{const p2=window.__harness.p2();return {y:Math.round(p2.y),feet:Math.round(p2.y+p2.h),grounded:p2.grounded};});
  await pg.keyboard.down("d"); await pg.keyboard.down("l"); await wf(2); await pg.keyboard.up("l"); await pg.keyboard.up("d");
  await wf(1);
  const g=await pg.evaluate(()=>{const p1=window.__harness.p1();const r=window.__harness.screenRect("p1");const cv=document.querySelector("canvas");
    return {y:Math.round(p1.y),feet:Math.round(p1.y+p1.h),grounded:!!p1.grounded,scrT:Math.round(r.y),scrB:Math.round(r.y+r.h),ch:cv.height};});
  console.log(`${name}: foe[y${foe.y} feet${foe.feet} gnd${foe.grounded}] -> shisui[y${g.y} feet${g.feet} gnd${g.grounded} scrT${g.scrT} scrB${g.scrB}] floorClip=${g.feet-500} offTop=${g.scrT<0}`);
  await pg.screenshot({path:path.join(OUT,`air_bs_${name}.png`)});
}
await trial("grounded",0);
await trial("foe_up_120",120);
await trial("foe_up_220",220);
await br.close(); server.close();
