import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/shisui_work$/,"");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf"};
const server=await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
async function run(key){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on("pageerror",e=>{if(!/drawSasukeAdultStance/.test(e.message))console.log(`[${key}] PAGEERROR:`,e.message);});
  await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=naruto`,{waitUntil:"load"});
  await page.waitForFunction(()=>window.__harness&&window.__harness.state);
  await page.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
  await new Promise(r=>setTimeout(r,700));
  const d=await page.evaluate(()=>{
    const p1=window.__harness.p1();
    const img=new Image(); // can't sync-load; instead check an on-page decoded sheet via a probe
    return {x:p1.x,y:p1.y,gs:window.__harness.state().gameState};
  });
  // probe idle sheet decode
  const dec=await page.evaluate(async(k)=>{const i=new Image();i.src=`./${k}_idle_uniform.png`;try{await i.decode();return {w:i.naturalWidth,h:i.naturalHeight};}catch(e){return {err:String(e)};}},key);
  await page.screenshot({path:`shisui_work/diag_${key}.png`});
  console.log(`[${key}] pos=${JSON.stringify(d)} idleDecode=${JSON.stringify(dec)}`);
  await page.close();
}
await run("shisui_trinity");
await run("naruto");
await browser.close();server.close();
