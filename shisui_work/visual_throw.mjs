import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const OUT=path.join(ROOT,"shisui_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
async function cap(key,label,keys,p1x,p2x,frames){
  const pg=await br.newPage({viewport:{width:1280,height:720}}); pg.on("pageerror",()=>{});
  const st=()=>pg.evaluate(()=>window.__harness.state());
  async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
  await pg.goto(`${base}/index.html?harness=1&p1=${key}&p2=naruto`,{waitUntil:"load"});
  await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
  await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");});
  await wf(8);
  await pg.evaluate(([a,b])=>{window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();window.__harness.setP1X?.(a);window.__harness.setP2X?.(b);},[p1x,p2x]);
  await wf(4);
  for(const k of keys) await pg.keyboard.down(k);
  await wf(2); for(const k of keys) await pg.keyboard.up(k);
  const shots=[];
  for(let i=0;i<frames.length;i++){
    const target=frames[i]-(i>0?frames[i-1]:0);
    await wf(target);
    const p=path.join(OUT,`vt_${key}_${label}_${String(frames[i]).padStart(2,"0")}.png`);
    await pg.screenshot({path:p}); shots.push(p);
  }
  await pg.close(); return shots;
}
// capture at corner (right wall) where clip is most likely, and mid-stage
const jobs=[
  ["shisui_trinity","fireball_corner",["l"],2250,2290,[6,12,20,30]],
  ["shisui_trinity","kunairain_corner",["s","l"],2250,2290,[8,14,20,28]],
  ["shisui_puppeteer","gokakyu_corner",["l"],2250,2290,[6,12,20,30]],
  ["shisui_puppeteer","shuriken_corner",["p","l"],2250,2290,[6,12,18,26]],
];
for(const j of jobs){ const s=await cap(...j); console.log(j[0],j[1],"->",s.map(p=>path.basename(p)).join(" ")); }
await br.close(); server.close();
