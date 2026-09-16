import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${srv.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const p=await b.newPage({viewport:{width:1280,height:720}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for (const key of ["miles","kurapika"]) {
  await p.goto(`${base}/index.html?harness=1&p1=${key}&p2=jason`,{waitUntil:"load"});
  await p.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await p.mouse.click(640,360);
  await p.evaluate(()=>{window.__harness.start();window.__harness.skipToBattle();});
  await p.waitForFunction(()=>window.__harness.state&&window.__harness.state().frame>10,null,{timeout:15000,polling:16});
  const sr=await p.evaluate(()=>window.__harness.spriteReady?window.__harness.spriteReady(1):null);
  await sleep(300);
  await p.screenshot({path:path.join(OUT,`${key}_verify.png`)});
  console.log(key,"spriteReady:",JSON.stringify(sr));
}
await b.close();srv.close();
console.log("done");
