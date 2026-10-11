import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const OUT=path.join(ROOT,"shisui_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}});
pg.on("pageerror",e=>{if(!/drawSasukeAdultStance|drawMadara|gogeta|goku_rose/.test(e.message))console.log("PAGEERR:",e.message);});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
const pos=()=>pg.evaluate(()=>{const p1=window.__harness.p1(),p2=window.__harness.p2();const r=(()=>{try{return window.__harness.screenRect?.("p1")}catch(e){return null}})();
  return {p1x:Math.round(p1.x),p2x:Math.round(p2.x),p1cd:Math.round(p1.attackCooldown||0),scrX:r?Math.round(r.x):null,offFrame:r?(r.x<-50||r.x>1330):null};});
async function heal(){await pg.evaluate(()=>{window.__harness.refill?.("p1");window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();});await wf(2);}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_blade&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
await wf(6);
// test teleport moves at NORMAL + EDGE foe positions; log if p1 ends off-screen
for (const [label,foe] of [["foe-center",1700],["foe-right-edge",99999],["foe-left-edge",-99999]]) {
  await heal(); await pg.evaluate(fx=>window.__harness.setP2X?.(fx),foe); await wf(2);
  const b=await pos();
  // Backstab D+L
  await pg.keyboard.down("d"); await wf(1); await pg.keyboard.down("l"); await wf(3); await pg.keyboard.up("l"); await wf(8); await pg.keyboard.up("d");
  const aB=await pos();
  console.log(`${label} BACKSTAB: p1 ${b.p1x}→${aB.p1x} (foe ${aB.p2x}) screenX=${aB.scrX} offFrame=${aB.offFrame}`);
  await pg.screenshot({path:path.join(OUT,`blade_qa_backstab_${label}.png`)});
  // Feint A+L
  await heal(); await pg.evaluate(fx=>window.__harness.setP2X?.(fx),foe); await wf(2);
  await pg.keyboard.down("a"); await wf(1); await pg.keyboard.down("l"); await wf(3); await pg.keyboard.up("l"); await wf(8); await pg.keyboard.up("a");
  const aF=await pos();
  console.log(`${label} FEINT:    p1 →${aF.p1x} (foe ${aF.p2x}) screenX=${aF.scrX} offFrame=${aF.offFrame}`);
}
await br.close(); server.close();
