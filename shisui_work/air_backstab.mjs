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
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(1400);window.__harness.setP2X?.(1650);});
await wf(3);
// make the foe jump
await pg.evaluate(()=>window.__harness.jumpP2?.());
await wf(10);  // let foe rise
const foe=await pg.evaluate(()=>{const p2=window.__harness.p2();return {y:Math.round(p2.y),grounded:p2.grounded};});
console.log("foe airborne y=",foe.y,"grounded=",foe.grounded);
// Backstab
await pg.keyboard.down("d"); await pg.keyboard.down("l"); await wf(2); await pg.keyboard.up("l"); await pg.keyboard.up("d");
await wf(2);
const g=await pg.evaluate(()=>{const p1=window.__harness.p1();const r=window.__harness.screenRect("p1");const cv=document.querySelector("canvas");
  return {y:Math.round(p1.y),feet:Math.round(p1.y+p1.h),grounded:p1.grounded,scrY:Math.round(r.y),scrBot:Math.round(r.y+r.h),offTop:r.y<-30,offBot:r.y+r.h>cv.height+30,ch:cv.height};});
console.log("AFTER BACKSTAB vs airborne foe:",JSON.stringify(g));
await pg.screenshot({path:path.join(OUT,"blade_air_backstab.png")});
await br.close(); server.close();
