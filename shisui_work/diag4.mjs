import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf"};
const server=await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>{if(!/drawSasukeAdultStance/.test(e.message))console.log("PAGEERROR:",e.message);});
await page.goto(`${base}/index.html?harness=1&p1=shisui_trinity&p2=naruto`,{waitUntil:"load"});
await page.waitForFunction(()=>window.__harness&&window.__harness.state);
await page.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
const f0=await page.evaluate(()=>window.__harness.state().frame);
await page.waitForFunction(a=>window.__harness.state().frame>=a+60,f0,{timeout:8000,polling:16}).catch(()=>{});
const info=await page.evaluate(()=>{
  const out={};
  for(const m of ["sprDraws","measureSprite","spriteCrop","frameGeom","renderInfo"]){
    try{out[m]=window.__harness[m]?.("p1")??window.__harness[m]?.();}catch(e){out[m]=String(e);}
  }
  return out;
});
console.log(JSON.stringify(info,null,1).slice(0,1500));
await browser.close();server.close();
