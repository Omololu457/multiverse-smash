import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(R,u==="/"?"/index.html":u);if(!f.startsWith(R)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await b.newPage({viewport:{width:1280,height:720}});
const st=()=>page.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
await page.goto(`${base}/index.html?harness=1&p1=obito`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(640,360);
await page.evaluate(()=>{window.__harness.start();window.__harness.skipToBattle();});
await wf(20);
await page.evaluate(()=>{window.__harness.setSkin?.("p1","obitoVoid");window.__harness.setP2X?.(99999);});
await wf(70);   // let particles + a swirl pulse accumulate
const r=await page.evaluate(()=>window.__harness.obitoVoidFX().rect);
const cx=Math.round(r.x+r.w/2), cy=Math.round(r.y+r.h/2);
// crop a region around the character (world≈screen at zoom 1 in training); grab the left-third
await page.screenshot({path:path.join(R,"harness/shots/obito_void_full.png")});
console.log("captured void close-up at",cx,cy);
await b.close();server.close();
