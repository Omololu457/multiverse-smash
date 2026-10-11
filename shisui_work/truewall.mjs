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
const ww=await pg.evaluate(()=>window.__harness.state().worldWidth||3200);
console.log("worldWidth-ish:",ww);
async function test(name, p1x, p2x, keys){
  await pg.evaluate(([a,b])=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(a);window.__harness.setP2X?.(b);},[p1x,p2x]);
  await wf(5);
  const pre=await pg.evaluate(()=>{const c=window.__harness.camera();const p1=window.__harness.p1(),p2=window.__harness.p2();return {camx:Math.round(c.x),zoom:+(c.zoom||1).toFixed(2),p1x:Math.round(p1.x),p2x:Math.round(p2.x)};});
  for(const k of keys) await pg.keyboard.down(k);
  await wf(2); for(const k of keys) await pg.keyboard.up(k);
  let worst=null;
  for(let i=0;i<6;i++){ await wf(2);
    const r=await pg.evaluate(()=>{const rr=window.__harness.screenRect("p1");const cv=document.querySelector("canvas");const p1=window.__harness.p1();
      return {x:Math.round(p1.x),L:Math.round(rr.x),R:Math.round(rr.x+rr.w),off:(rr.x<-15||rr.x+rr.w>cv.width+15),cw:cv.width,cast:p1._spriteCastMove||null};});
    if(!worst||r.off||r.R>worst.R) worst=r;
  }
  console.log(`${name}: pre[cam${pre.camx} z${pre.zoom} p1@${pre.p1x} p2@${pre.p2x}] -> p1x=${worst.x} scr[L${worst.L} R${worst.R}]/cw${worst.cw} cast=${worst.cast} ${worst.off?"*** OFF-SCREEN ***":"on-screen"}`);
  await pg.screenshot({path:path.join(OUT,`truewall_${name}.png`)});
}
// foe cornered at RIGHT wall, shisui just left of it, advancing (forward+special => Backstab across to wall side)
await test("rightwall_fwd", 3050, 3150, ["d","l"]);
await test("rightwall_neutral", 3050, 3150, ["l"]);
// foe cornered at LEFT wall, shisui just right, advancing left
await test("leftwall_fwd", 150, 50, ["a","l"]);
await test("leftwall_neutral", 150, 50, ["l"]);
await br.close(); server.close();
