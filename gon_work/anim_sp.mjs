import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const OUT=path.join(ROOT,"gon_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json",".jpg":"image/jpeg"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const wf=async n=>{const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16})};
await page.goto(`${base}/index.html?harness=1&p1=gon&p2=goku`,{waitUntil:"load"});await page.waitForFunction(()=>!!window.__harness,{timeout:15000});
await page.mouse.click(640,360);await page.evaluate(()=>window.__harness.boot());await wf(6);
await page.evaluate(()=>{window.__harness.skipToBattle?.();window.__harness.fillEnergy?.();});await wf(6);
await page.evaluate(()=>{const p=window.__harness.p1();window.__harness.setP2X(p.x+500);});await wf(4);
async function cap(name,trig,n,step){await page.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();});await wf(4);await trig();const b=[];for(let i=0;i<n;i++){b.push(await page.screenshot());await wf(step);}for(let i=0;i<b.length;i++)fs.writeFileSync(path.join(OUT,`_sp_${name}_${String(i).padStart(2,"0")}.png`),b[i]);console.log(name,n);}
// ROCK: chant hold fwd then release
await cap("rock",async()=>{await page.keyboard.down("l");await wf(1);await page.keyboard.down("d");await wf(10);await page.keyboard.up("l");await page.keyboard.up("d");},10,3);
// SCISSORS: chant up release
await cap("scissors",async()=>{await page.keyboard.down("l");await wf(1);await page.keyboard.down("w");await wf(8);await page.keyboard.up("l");await page.keyboard.up("w");},10,3);
// PAPER: chant neutral
await cap("paper",async()=>{await page.keyboard.down("l");await wf(8);await page.keyboard.up("l");},10,3);
await browser.close();server.close();console.log("done");
