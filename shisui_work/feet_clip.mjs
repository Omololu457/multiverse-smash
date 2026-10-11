import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const OUT=path.join(ROOT,"shisui_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",()=>{});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
// Blade reached via 1 Variant Swap; but boot directly as shisui_blade
await pg.goto(`${base}/index.html?harness=1&p1=shisui_blade&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
await wf(8);
const geom=async()=>pg.evaluate(()=>{const p1=window.__harness.p1(),p2=window.__harness.p2();
  return {p1y:Math.round(p1.y),p1h:Math.round(p1.h),p1feet:Math.round(p1.y+p1.h),p1grounded:p1.grounded,
          p2y:Math.round(p2.y),p2h:Math.round(p2.h),p2feet:Math.round(p2.y+p2.h)};});
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(1400);window.__harness.setP2X?.(1650);});
await wf(4);
console.log("BEFORE:",JSON.stringify(await geom()));
// Backstab = Fwd(d)+Special(l)
await pg.keyboard.down("d"); await pg.keyboard.down("l"); await wf(2); await pg.keyboard.up("l"); await pg.keyboard.up("d");
await wf(3);
const g=await geom();
console.log("AFTER BACKSTAB:",JSON.stringify(g));
console.log(`>> Shisui feet=${g.p1feet}, foe feet(floor)=${g.p2feet}, SHISUI THROUGH FLOOR BY: ${g.p1feet-g.p2feet}px, grounded=${g.p1grounded}`);
await pg.screenshot({path:path.join(OUT,"blade_backstab_feet.png")});
await br.close(); server.close();
