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
// settle ~120 frames
const f0=(await page.evaluate(()=>window.__harness.state().frame));
await page.waitForFunction(a=>window.__harness.state().frame>=a+120,f0,{timeout:8000,polling:16}).catch(()=>{});
// list harness methods that mention camera/zoom/pose
const methods=await page.evaluate(()=>Object.keys(window.__harness).filter(k=>/cam|zoom|pose|render|spr|center|frame/i.test(k)));
console.log("harness cam/pose methods:",JSON.stringify(methods));
await page.screenshot({path:"shisui_work/diag_settled.png"});
// pixel probe: count non-sky, non-green pixels in lower-center band (where fighters would be)
const probe=await page.evaluate(()=>{
  const cv=document.querySelector("canvas"); if(!cv) return "no canvas";
  const ctx=cv.getContext("2d"); const W=cv.width,H=cv.height;
  const img=ctx.getImageData(Math.floor(W*0.3),Math.floor(H*0.45),Math.floor(W*0.4),Math.floor(H*0.45)).data;
  let dark=0,skin=0,tot=0;
  for(let i=0;i<img.length;i+=4){const r=img[i],g=img[i+1],b=img[i+2];tot++;
    if(r<70&&g<70&&b<90&&(r+g+b)>20)dark++;            // navy/black clothing
    if(r>180&&g>140&&b>110&&r>g&&g>b)skin++;            // skin tone
  }
  return {canvas:`${W}x${H}`,darkClothPx:dark,skinPx:skin,sampled:tot};
});
console.log("pixel probe (lower-center):",JSON.stringify(probe));
await browser.close();server.close();
