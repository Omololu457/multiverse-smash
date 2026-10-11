import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".css":"text/css",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>{if(!/drawSasukeAdultStance/.test(e.message))console.log("PAGEERROR:",e.message);});
async function cropPose(action){
  await page.evaluate(a=>{try{window.__harness.spriteAction?.("p1",a)||window.__harness.forceAction?.(a,"p1");}catch(e){}},action);
  const f0=await page.evaluate(()=>window.__harness.state().frame);
  await page.waitForFunction(a=>window.__harness.state().frame>=a+6,f0,{timeout:5000,polling:16}).catch(()=>{});
  const u=await page.evaluate(()=>{try{return window.__harness.spriteCrop?.("p1")?.dataURL||null;}catch(e){return null;}});
  if(u){const b=Buffer.from(u.split(",")[1],"base64");fs.writeFileSync(`shisui_work/pose_${action}.png`,b);return b.length;}
  return 0;
}
await page.goto(`${base}/index.html?harness=1&p1=shisui_trinity&p2=naruto`,{waitUntil:"load"});
await page.waitForFunction(()=>window.__harness&&window.__harness.state);
await page.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
const f0=await page.evaluate(()=>window.__harness.state().frame);
await page.waitForFunction(a=>window.__harness.state().frame>=a+30,f0,{timeout:8000,polling:16}).catch(()=>{});
for(const a of ["idle","light","heavy","shiFireball","shiGenjutsu","shiSusanoo","win"]) console.log(a,await cropPose(a),"bytes");
await browser.close();server.close();
