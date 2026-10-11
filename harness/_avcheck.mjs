import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT="/Users/omololu/Desktop/project/multiverse-smash";
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".css":"text/css",".json":"application/json",".mp3":"audio/mpeg",".m4a":"audio/mp4"};
const server=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>console.log("PAGEERR",e.message));
const st=()=>page.evaluate(()=>window.__harness.state());
const n7=()=>page.evaluate(()=>window.__harness.narutoSeventh());
async function wf(n){const s=(await st()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.setN7Form("base");});await wf(3);
console.log("trigger",JSON.stringify(await page.evaluate(()=>window.__harness.triggerN7Avatar())));
for(let i=0;i<8;i++){ await wf(20); const s=await n7(); console.log("  +"+((i+1)*20)+"f avatar="+s.avatar+" timer="+s.avatarTimer+" dmgMul="+s.dmgMul); }
await page.evaluate(()=>window.__harness.setP2X(window.__harness.p1().x-80));  // put foe behind-ish... actually center
await page.screenshot({path:ROOT+"/harness/naruto_seventh_out/81_av.png"});
await browser.close(); server.close();
