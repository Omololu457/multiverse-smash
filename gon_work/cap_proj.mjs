import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const OUT=path.join(ROOT,"gon_work");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json",".jpg":"image/jpeg"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>console.log("PE:",e.message));
const wf=async n=>{const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16})};
await page.goto(`${base}/index.html?harness=1&p1=gon&p2=goku`,{waitUntil:"load"});await page.waitForFunction(()=>!!window.__harness,{timeout:15000});
await page.mouse.click(640,360);await page.evaluate(()=>window.__harness.boot());await wf(6);
await page.evaluate(()=>{window.__harness.skipToBattle?.();window.__harness.fillEnergy?.();});await wf(6);
await page.evaluate(()=>{const p=window.__harness.p1();window.__harness.setP2X(p.x+480);window.__harness.setP2Invuln?.(600);});await wf(4);
// PAPER chant neutral
await page.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();window.__harness.clearProjectiles?.();});await wf(3);
await page.keyboard.down("l");await wf(8);await page.keyboard.up("l");await wf(16);
await page.screenshot({path:path.join(OUT,"proj_paper.png")});console.log("paper projs:",await page.evaluate(()=>window.__harness.projectiles().length));
// FULL-CHANT neutral ult
await page.evaluate(()=>{window.__harness.clearProjectiles?.();window.__harness.gonUlt(null);});await wf(40);
await page.screenshot({path:path.join(OUT,"proj_fullchant.png")});console.log("fullchant projs:",await page.evaluate(()=>window.__harness.projectiles().length));
await browser.close();server.close();
