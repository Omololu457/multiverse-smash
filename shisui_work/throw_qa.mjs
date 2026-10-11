import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const OUT=path.join(ROOT,"shisui_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
async function run(key,moves){
  const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",()=>{});
  const st=()=>pg.evaluate(()=>window.__harness.state());
  async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
  const look=()=>pg.evaluate(()=>{const p1=window.__harness.p1();const r=window.__harness.screenRect("p1");const cv=document.querySelector("canvas");
    const projs=(window.__harness.projectiles?.()||[]).map(p=>Math.round(p.x));
    return {x:Math.round(p1.x),scrX:Math.round(r.x),offFrame:(r.x<-40||r.x>cv.width+40),projX:projs};});
  await pg.goto(`${base}/index.html?harness=1&p1=${key}&p2=naruto`,{waitUntil:"load"});
  await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
  await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
  await wf(6);
  for(const [label,keys] of moves){
    await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP2X?.(1700);}); await wf(3);
    for(const k of keys) await pg.keyboard.down(k);
    await wf(3); for(const k of keys) await pg.keyboard.up(k);
    let worst=null;
    for(let i=0;i<6;i++){ await wf(3); const l=await look(); if(!worst||l.offFrame||Math.abs(l.scrX-640)>Math.abs((worst.scrX||640)-640)) worst=l; }
    console.log(`${key} ${label}: p1.x=${worst.x} scrX=${worst.scrX} offFrame=${worst.offFrame} proj=${JSON.stringify(worst.projX)}`);
  }
  await pg.close();
}
await run("shisui_trinity",[["Fireball N",["l"]],["KunaiRain D",["s","l"]],["Backstab F",["d","l"]]]);
await run("shisui_blade",[["KunaiBarrage N",["l"]],["Backstab F",["d","l"]]]);
await run("shisui_puppeteer",[["Gokakyu N",["l"]],["Hosenka B",["a","l"]],["Shuriken P",["p","l"]]]);
await br.close(); server.close();
