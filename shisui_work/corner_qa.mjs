import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
async function run(key,moves){
  const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",()=>{});
  const st=()=>pg.evaluate(()=>window.__harness.state());
  async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
  const look=()=>pg.evaluate(()=>{const p1=window.__harness.p1();const r=window.__harness.screenRect("p1");const cv=document.querySelector("canvas");
    return {x:Math.round(p1.x),scrL:Math.round(r.x),scrR:Math.round(r.x+r.w),off:(r.x<-30||r.x+r.w>cv.width+30),cw:cv.width};});
  await pg.goto(`${base}/index.html?harness=1&p1=${key}&p2=naruto`,{waitUntil:"load"});
  await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
  await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
  await wf(6);
  for(const corner of ["RIGHT","LEFT"]){
    for(const [label,keys] of moves){
      // push foe to a wall, put shisui just inside it
      await pg.evaluate((cn)=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();
        if(cn==="RIGHT"){window.__harness.setP1X?.(2250);window.__harness.setP2X?.(2290);}else{window.__harness.setP1X?.(950);window.__harness.setP2X?.(910);}},corner);
      await wf(3);
      for(const k of keys) await pg.keyboard.down(k);
      await wf(3); for(const k of keys) await pg.keyboard.up(k);
      let off=false,worst=null;
      for(let i=0;i<8;i++){ await wf(3); const l=await look(); if(l.off) off=true; if(!worst||l.off) worst=l; }
      console.log(`${key} [${corner}] ${label}: scrL=${worst.scrL} scrR=${worst.scrR} OFF=${off} (cw=${worst.cw})`);
    }
  }
  await pg.close();
}
await run("shisui_trinity",[["Backstab F",["d","l"]],["Flurry U",["w","l"]],["Fireball N",["l"]],["KunaiRain D",["s","l"]],["Ult",["u"]]]);
await run("shisui_blade",[["Backstab F",["d","l"]],["Feint B",["a","l"]],["KunaiBarrage N",["l"]]]);
await run("shisui_puppeteer",[["Flurry U",["w","l"]],["Gokakyu N",["l"]],["SusanooSword",["u"]]]);
await br.close(); server.close();
