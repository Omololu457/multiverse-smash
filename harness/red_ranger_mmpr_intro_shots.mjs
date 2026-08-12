// Evidence shots: capture each Red Ranger MMPR intro MID-PLAY (unmorphed step + the morph flash)
// and the standalone morphed intro, plus movement, into harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await b.newPage({viewport:{width:1280,height:720}});
const state=()=>pg.evaluate(()=>window.__harness.state());
async function waitFrames(n){const s=(await state()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16})}
const NAMES=["runin","teleport","morpher","knuckles","morphed"];
for (let i=0;i<5;i++){
  await pg.goto(`${base}/index.html?harness=1&p1=red_ranger_mmpr`,{waitUntil:"load"});
  await pg.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await pg.mouse.click(640,360);
  await pg.evaluate((idx)=>{const v=(idx+0.5)/5;Math.random=()=>v;window.__harness.start()},i);
  await waitFrames(8);  // mid unmorphed step (or mid morphed for i=4)
  await pg.screenshot({path:path.join(OUT,`rr_intro_${i}_${NAMES[i]}_step1.png`)});
  if (i<4){ await waitFrames(22); await pg.screenshot({path:path.join(OUT,`rr_intro_${i}_${NAMES[i]}_flash.png`)}); }
}
// movement montage
await pg.goto(`${base}/index.html?harness=1&p1=red_ranger_mmpr`,{waitUntil:"load"});
await pg.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await pg.mouse.click(640,360);
await pg.evaluate(()=>window.__harness.start()); await pg.evaluate(()=>window.__harness.skipToBattle()); await waitFrames(6);
await pg.keyboard.down("d"); await waitFrames(12); await pg.screenshot({path:path.join(OUT,"rr_move_run.png")}); await pg.keyboard.up("d");
console.log("shots written to harness/shots/");
await b.close();server.close();process.exit(0);
