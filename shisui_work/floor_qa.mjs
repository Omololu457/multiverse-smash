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
const info=()=>pg.evaluate(()=>{const f=window.__harness.p1();const r=(()=>{try{return window.__harness.screenRect("p1")}catch(e){return null}})();const s=window.__harness.state();
  return {y:Math.round(f.y),h:Math.round(f.h||100),feetWorld:Math.round(f.y+(f.h||100)),groundY:Math.round(s.groundY??-1),scrBottom:r?Math.round(r.y+r.h):null,scrY:r?Math.round(r.y):null};});
await pg.goto(`${base}/index.html?harness=1&p1=shisui_blade&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
await wf(6);
console.log("IDLE:  ",JSON.stringify(await info())); await pg.screenshot({path:path.join(OUT,"floor_idle.png")});
await pg.keyboard.down("p"); await wf(14);
console.log("CHARGE:",JSON.stringify(await info())); await pg.screenshot({path:path.join(OUT,"floor_charge.png")});
await pg.keyboard.up("p"); await wf(8);
// also check light + a special for feet
await pg.keyboard.down("j"); await wf(4); console.log("LIGHT: ",JSON.stringify(await info())); await pg.screenshot({path:path.join(OUT,"floor_light.png")}); await pg.keyboard.up("j"); await wf(16);
await br.close(); server.close();
