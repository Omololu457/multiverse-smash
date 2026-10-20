// Isolated, tight filmstrip of Gon's animations (Goku pushed far away) to judge motion honestly.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "gon_work");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json",".jpg":"image/jpeg" };
const server = await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const wf=async n=>{const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16})};
await page.goto(`${base}/index.html?harness=1&p1=gon&p2=goku`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,{timeout:15000});
await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot()); await wf(6);
await page.evaluate(()=>{window.__harness.skipToBattle?.();window.__harness.fillEnergy?.();});
await wf(6);
// push goku far right so Gon is alone on the left; lock Gon near left-center
await page.evaluate(()=>{const p=window.__harness.p1(); window.__harness.setP2X(p.x+700);});
await wf(4);

// crop a FIXED window centered on Gon's resting x (the engine keeps camera ~ centered between fighters;
// with goku far right the camera shifts, so grab Gon's on-screen box from a reference full shot).
async function capSeq(name, trigger, n, step){
  await page.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();});
  await wf(4);
  await trigger();
  const bufs=[];
  for(let i=0;i<n;i++){ bufs.push(await page.screenshot()); await wf(step); }
  for(let i=0;i<bufs.length;i++) fs.writeFileSync(path.join(OUT,`_iso_${name}_${String(i).padStart(2,"0")}.png`), bufs[i]);
  console.log(name,"captured",n);
}
await capSeq("idle", async()=>{}, 8, 6);
await capSeq("walk", async()=>{await page.keyboard.down("d");}, 8, 4); await page.keyboard.up("d");
await capSeq("light", async()=>{await page.keyboard.down("j");await wf(1);await page.keyboard.up("j");}, 8, 2);
await browser.close(); server.close(); console.log("done");
