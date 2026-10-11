import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".css":"text/css",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:8000,polling:16}).catch(()=>{});}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_trinity&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
await wf(6);
const ctxWW=await pg.evaluate(()=>{try{return window.__harness.abilityContext?.()?.worldWidth ?? 'no-method';}catch(e){return String(e);}});
await pg.evaluate(()=>window.__harness.setP2X?.(3134));
const x0=await pg.evaluate(()=>Math.round(window.__harness.p2().x)); // immediate
await wf(1); const x1=await pg.evaluate(()=>Math.round(window.__harness.p2().x));
await wf(10); const x10=await pg.evaluate(()=>Math.round(window.__harness.p2().x));
console.log(`ctx.worldWidth=${ctxWW}; p2.x after setP2X(3134): immediate=${x0} +1f=${x1} +10f=${x10}`);
await br.close(); server.close();
