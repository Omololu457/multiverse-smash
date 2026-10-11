// Capture the 4-Tails combo + Rikudou combo + cloak-run as frame sequences to eyeball the animation.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "naruto_seventh_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".m4a":"audio/mp4",".css":"text/css",".json":"application/json" };
const server = http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>console.log("  PAGEERR",e.message));
const state=()=>page.evaluate(()=>window.__harness.state());
const n7=()=>page.evaluate(()=>window.__harness.narutoSeventh());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
const K={light:"j",heavy:"k",special:"l",ult:"u",charge:"p"};
let FWD="d",UP="w";
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a";
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.setN7Form("base");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=120){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}

// grab the p1 body crop each sample
async function cap(tag, nFrames, every, fireFn){
  await fireFn();
  const shots=[];
  for(let i=0;i<nFrames;i++){ await wf(every); const p=path.join(OUT,`cap_${tag}_${String(i).padStart(2,"0")}.png`); await page.screenshot({path:p}); shots.push(p); }
  return shots;
}

// 4-TAILS COMBO (Up+Special, Bond 2)
await prep(110); await page.evaluate(()=>{window.__harness.setN7Bond(60);window.__harness.healP2();});
await cap("ft", 10, 12, async()=>{ await page.keyboard.down(UP); await page.keyboard.down(K.special); await wf(3); await page.keyboard.up(K.special); await page.keyboard.up(UP); });
console.log("  captured 4-Tails combo");

// RIKUDOU COMBO (Fwd+Ult, Bond 4)
await prep(120); await page.evaluate(()=>{window.__harness.setN7Bond(100);window.__harness.setN7RikudouUsed(false);window.__harness.healP2();});
await cap("rk", 9, 10, async()=>{ await page.keyboard.down(FWD); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(FWD); });
console.log("  captured Rikudou combo");

// CLOAK run (hold forward in KCM)
await prep(300); await page.evaluate(()=>window.__harness.setN7Form("kcm")); await wf(6);
await page.keyboard.down(FWD);
await cap("cloak", 6, 6, async()=>{});
await page.keyboard.up(FWD);
console.log("  captured cloak run");

await browser.close(); server.close();
