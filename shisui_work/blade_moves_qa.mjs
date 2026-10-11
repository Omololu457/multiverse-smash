import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const OUT=path.join(ROOT,"shisui_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}});
pg.on("pageerror",e=>{if(!/drawSasukeAdultStance|drawMadara|gogeta|goku_rose/.test(e.message))console.log("PAGEERR:",e.message);});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
async function heal(){await pg.evaluate(()=>{window.__harness.refill?.("p1");window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();});await wf(2);}
async function crop(name){ // crop p1 via screenRect
  const r=await pg.evaluate(()=>{try{return window.__harness.screenRect("p1")}catch(e){return null}});
  const buf=await pg.screenshot();
  fs.writeFileSync(path.join(OUT,`bq_${name}.png`),buf);
  return r;
}
await pg.goto(`${base}/index.html?harness=1&p1=shisui_blade&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state);
await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();window.__harness.setInputType?.(2,"keyboard");window.__harness.setP2X?.(1680);});
await wf(6);
const shots=[];
async function cap(name,keys,at=4,hold=10){
  await heal();
  for(const k of keys)await pg.keyboard.down(k);
  await wf(at); const r=await crop(name); shots.push([name,r]);
  await wf(hold); for(const k of keys)await pg.keyboard.up(k); await wf(16);
}
await cap("idle",[],2,2);
await cap("charge",["p"],8,4);
await cap("light",["j"],3);
await cap("heavy",["k"],6);
await cap("up",["i"],5);
await cap("kunai_N",["l"],4);
await cap("iaido_D",["s","l"],5);
await cap("rising_U",["w","l"],5);
await cap("ult",["u"],20,10);
for(const [n,r] of shots) console.log(n, r?`screenX=${Math.round(r.x)} w=${Math.round(r.w)} h=${Math.round(r.h)}`:"(no rect)");
await br.close(); server.close();
