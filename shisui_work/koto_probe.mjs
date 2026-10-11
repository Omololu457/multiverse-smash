import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",()=>{});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_puppeteer&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
await wf(8);
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(1400);window.__harness.setP2X?.(1650);});
await wf(3);
const e0=await pg.evaluate(()=>window.__harness.p1().energy);
await pg.keyboard.down("u"); await wf(3); await pg.keyboard.up("u");
let peak=0; const hp0=await pg.evaluate(()=>window.__harness.p2().health);
for(let i=0;i<20;i++){ await wf(2); const k=await pg.evaluate(()=>window.__harness.p2()._kotoMirror||0); if(k>peak)peak=k; }
const e1=await pg.evaluate(()=>window.__harness.p1().energy);
const hpN=await pg.evaluate(()=>window.__harness.p2().health); console.log(`neutral ult: energy ${e0}->${e1} (spent ${(e0-e1).toFixed(1)}) | foe hp ${hp0}->${hpN} chip=${hp0-hpN} | peak _kotoMirror(snapshot)=${peak}`);
await br.close(); server.close();
