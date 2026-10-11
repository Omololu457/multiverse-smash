import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
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
// Feint (Back+Special) at far range
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.setP1X?.(1000);window.__harness.setP2X?.(1950);}); await wf(5);
let x0=await pg.evaluate(()=>Math.round(window.__harness.p1().x));
await pg.evaluate(()=>window.__harness.p1SpecialDir?.("B"));
await wf(6);
let x1=await pg.evaluate(()=>Math.round(window.__harness.p1().x));
console.log(`Feint B (far): x ${x0}->${x1} moved ${Math.abs(x1-x0)}px ${Math.abs(x1-x0)>420?"*** WARP ***":"capped/ok (<=380)"}`);
// Close-range Backstab should still blink behind
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.setP1X?.(1400);window.__harness.setP2X?.(1500);}); await wf(5);
x0=await pg.evaluate(()=>Math.round(window.__harness.p1().x));
await pg.evaluate(()=>window.__harness.p1SpecialDir?.("F"));
await wf(6);
x1=await pg.evaluate(()=>Math.round(window.__harness.p1().x));
console.log(`Backstab F (close): x ${x0}->${x1} moved ${Math.abs(x1-x0)}px ${Math.abs(x1-x0)>60?"blinks behind (ok)":"did not move"}`);
await br.close(); server.close();
