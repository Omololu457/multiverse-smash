import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_blade&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
await wf(6);
// make p1 face LEFT: move the foe to p1's LEFT
await pg.evaluate(()=>window.__harness.setP2X?.(300)); await wf(4);
// walk p1 a touch so facing updates + do a light attack facing left
await pg.keyboard.down("j"); await wf(4); const f=await pg.evaluate(()=>window.__harness.p1().facing); await pg.screenshot({path:path.join(ROOT,"shisui_work","faceleft.png")}); await pg.keyboard.up("j");
console.log("p1 facing:",f);
await br.close(); server.close();
