import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}});
pg.on("pageerror",e=>{if(!/drawSasukeAdultStance|drawMadara|gogeta|goku_rose/.test(e.message))console.log("PAGEERR:",e.message);});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_puppeteer&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.setP2X?.(1560);});
await wf(8);
// SUSANOO STANCE (S+L)
const h0=await pg.evaluate(()=>Math.round(window.__harness.p2().health));
await pg.keyboard.down("s"); await wf(1); await pg.keyboard.down("l"); await wf(3); await pg.keyboard.up("l"); await wf(6);
await pg.screenshot({path:path.join(ROOT,"shisui_work","pu_stance.png")});
// SWORD cancel (D+L during stance)
await pg.keyboard.down("d"); await wf(1); await pg.keyboard.down("l"); await wf(3); await pg.keyboard.up("l"); await pg.keyboard.up("d");
await wf(10); await pg.screenshot({path:path.join(ROOT,"shisui_work","pu_sword.png")});
await pg.keyboard.up("s"); await wf(20);
const h1=await pg.evaluate(()=>Math.round(window.__harness.p2().health));
console.log(`Stance→Sword: foe HP ${h0}→${h1} (dmg=${h0-h1})`);
// NEEDLE VOLLEY: re-stance then neutral L
await pg.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP2X?.(1560);}); await wf(3);
await pg.keyboard.down("s"); await wf(1); await pg.keyboard.down("l"); await wf(3); await pg.keyboard.up("l"); await pg.keyboard.up("s"); await wf(3);
const h2=await pg.evaluate(()=>Math.round(window.__harness.p2().health));
await pg.keyboard.down("l"); await wf(3); await pg.keyboard.up("l"); await wf(4);
await pg.screenshot({path:path.join(ROOT,"shisui_work","pu_needle.png")});
await wf(14); const h3=await pg.evaluate(()=>Math.round(window.__harness.p2().health));
console.log(`Needle Volley: foe HP ${h2}→${h3} (dmg=${h2-h3})`);
await br.close(); server.close();
