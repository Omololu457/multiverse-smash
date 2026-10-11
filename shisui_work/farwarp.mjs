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
async function test(name, p1x, p2x, keys){
  await pg.evaluate(([a,b])=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(a);window.__harness.setP2X?.(b);},[p1x,p2x]);
  await wf(6);
  const pre=await pg.evaluate(()=>{const p1=window.__harness.p1();const r=window.__harness.screenRect("p1");return {x:Math.round(p1.x),L:Math.round(r.x),R:Math.round(r.x+r.w)};});
  for(const k of keys) await pg.keyboard.down(k);
  // sample DURING the teleport (frame by frame) to catch an off-edge flash
  let flash=null;
  for(let i=0;i<8;i++){ await wf(1);
    const r=await pg.evaluate(()=>{const rr=window.__harness.screenRect("p1");const cv=document.querySelector("canvas");const p1=window.__harness.p1();
      return {x:Math.round(p1.x),L:Math.round(rr.x),R:Math.round(rr.x+rr.w),off:(rr.x<-10||rr.x+rr.w>cv.width+10),cw:cv.width};});
    if(r.off && !flash) flash=`f+${i} x=${r.x} scr[L${r.L} R${r.R}] OFF`;
  }
  for(const k of keys) await pg.keyboard.up(k);
  const post=await pg.evaluate(()=>{const p1=window.__harness.p1();const r=window.__harness.screenRect("p1");const cv=document.querySelector("canvas");return {x:Math.round(p1.x),L:Math.round(r.x),R:Math.round(r.x+r.w),off:(r.x<-10||r.x+r.w>cv.width+10)};});
  console.log(`${name}: pre x=${pre.x} scr[${pre.L},${pre.R}] -> post x=${post.x} scr[${post.L},${post.R}]${post.off?" OFF":""} | FLASH: ${flash||"none"}`);
}
await test("neutral_foe_far",    1200, 2300, ["l"]);        // neutral special, foe far -> should NOT move
await test("fwd_foe_far",        1200, 2300, ["d","l"]);    // forward+special, foe far -> Backstab across screen
await test("fwd_foe_behind_far", 2000, 900,  ["a","l"]);    // foe far to the left, hold toward it
await br.close(); server.close();
