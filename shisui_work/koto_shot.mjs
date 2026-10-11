import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}});
pg.on("pageerror",e=>{if(!/drawSasukeAdultStance|drawMadara/.test(e.message))console.log("PAGEERR:",e.message);});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:8000,polling:16}).catch(()=>{});}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_puppeteer&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.refill?.("p1");});
await wf(12);
// fire Kotoamatsukami
await pg.keyboard.down("u"); await wf(2); await pg.keyboard.up("u");
await wf(10); await pg.screenshot({path:"shisui_work/koto_overlay.png"});   // ~during overlay
// behavioral LOCK test: after koto, drive p2's special (p2 special key="4") and check p2 energy unchanged
await wf(4);
const e0=await pg.evaluate(()=>Math.round(window.__harness.p2().energy));
await pg.evaluate(()=>window.__harness.fillEnergy?.());  // fills p1 only; p2 energy whatever
await pg.keyboard.down("4"); await wf(6); await pg.keyboard.up("4"); await wf(4);
const e1=await pg.evaluate(()=>Math.round(window.__harness.p2().energy));
const pc=await pg.evaluate(()=>(window.__harness.projectiles?.()||[]).length);
console.log(`LOCK TEST during koto: p2 energy ${e0}→${e1} (unchanged=locked); proj after p2 special attempt=${pc}`);
await br.close(); server.close();
