import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "rr_void"); fs.mkdirSync(OUT, { recursive: true });
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; pg.on("pageerror",e=>jsErrors.push(String(e)));
const st=()=>pg.evaluate(()=>window.__harness.state());
const p1=()=>pg.evaluate(()=>window.__harness.p1());
async function waitFrames(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16})}
async function pushP2(){ const a=await p1(); await pg.evaluate(x=>window.__harness.setP2X(x), a.x+760); }
async function cropShot(tag){
  const r=await pg.evaluate(()=>window.__harness.screenRect("p1"));
  const cx=r.x+r.w/2, cy=r.y+r.h/2, cw=Math.min(560,r.w*3.0), chh=Math.min(440,r.h*2.0);
  const clip={x:Math.max(0,Math.min(1280-cw,cx-cw/2)), y:Math.max(0,Math.min(720-chh,cy-chh/2)), width:cw, height:chh};
  await pg.screenshot({path:path.join(OUT,`${tag}.png`), clip});
}
await pg.goto(`${base}/index.html?harness=1&p1=red_ranger_mmpr`,{waitUntil:"load"});
await pg.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await pg.mouse.click(640,360);
await pg.evaluate(()=>{window.__harness.start({mode:"vs",difficulty:"easy",p1Skin:"rr_void"}); window.__harness.skipToBattle();});
await waitFrames(6); await pushP2();
await pg.evaluate(()=>window.__harness.fillEnergy&&window.__harness.fillEnergy());
// IDLE — push p2 away each time; capture 6 frames spaced to catch a morph-flash pulse-ring
for (let i=0;i<6;i++){ await pushP2(); await waitFrames(9); await cropShot(`idle_${i}`); }
// ATTACK — forceAction heavy (p1 stays put), overlay tracks
await pushP2(); await pg.evaluate(()=>window.__harness.forceAction("heavy","p1")); await waitFrames(4); await cropShot("attack");
await pg.evaluate(()=>window.__harness.forceAction(null,"p1")); await waitFrames(2);
// ULTIMATE — push p2 far, trigger Power Sword, capture at the STRIKE beat (combat frozen; overlay tracks the ult sprite)
await pushP2(); await pg.evaluate(()=>window.__harness.fillEnergy&&window.__harness.fillEnergy());
await pg.keyboard.down("u"); await waitFrames(2); await pg.keyboard.up("u");
await pg.waitForFunction(()=>{const c=window.__harness.powerSwordCine&&window.__harness.powerSwordCine(); return c&&c.phase==="strike";},null,{timeout:6000,polling:16}).catch(()=>{});
await waitFrames(2); await cropShot("ultimate");
console.log("skinId:", (await p1()).skinId, "jsErrors:", jsErrors.length);
await b.close(); server.close(); process.exit(0);
