import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "ben10_stage3_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json" };
const server = http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const state=()=>page.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.spriteReady;},null,{timeout:15000,polling:32}).catch(()=>{});
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles?.();window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();});await wf(3);}
async function prep(g){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+g);await wf(2);}
async function shot(name,form,dir,warm){await page.evaluate(k=>window.__harness.benForm(k),form);await prep(160);
  if(dir){await page.keyboard.down(dir);await wf(1);} await page.keyboard.down("l");await wf(2);await page.keyboard.up("l");
  await wf(warm); await page.screenshot({path:path.join(OUT,name)}); if(dir)await page.keyboard.up(dir);
  console.log("  wrote",name);}
await shot("live_dh_shard.png","diamondhead",null,10);
await shot("live_dh_rising.png","diamondhead","s",12);
await shot("live_xlr8_dash.png","xlr8",null,5);
await browser.close(); server.close();
