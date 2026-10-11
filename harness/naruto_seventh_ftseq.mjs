// Fine capture of the 4-Tails combo: track the fighter and crop tightly each sample to see the FULL sequence.
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
const p1=()=>page.evaluate(()=>window.__harness.p1());
const cam=()=>page.evaluate(()=>({z: (window.__harness.state().zoom)||1 }));
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
const K={special:"l",charge:"p"}; let UP="w";
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.setN7Form("base");window.__harness.fillEnergy();window.__harness.setN7Bond(60);});await wf(3);
const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?100:-100)); await wf(2);
// fire the 4-Tails combo
await page.keyboard.down(UP); await page.keyboard.down(K.special); await wf(3); await page.keyboard.up(K.special); await page.keyboard.up(UP);
// sample every 4 frames, 28 samples (~112 frames = the full 114f combo), full-frame screenshots
const shots=[];
for(let i=0;i<28;i++){ await wf(4); const p=path.join(OUT,`seq_ft_${String(i).padStart(2,"0")}.png`); await page.screenshot({path:p}); shots.push(p); }
console.log("  captured", shots.length, "samples");
await browser.close(); server.close();
