import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
let errs=[]; page.on("pageerror",e=>errs.push(e.message));
const st=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>{const f=window.__harness.p1()||{};return{key:f.key,energy:Math.round(f.energy),hp:Math.round(f.health),form:f.currentForm,spriteReady:f.spriteReady,hasHandler:f.hasSpriteHandler,sheet:f.spriteSheet,x:Math.round(f.x)};});
async function wf(n){const s=(await st()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16}).catch(()=>{});}
await page.goto(`${base}/index.html?harness=1&p1=naruto_hokage&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>window.__harness&&window.__harness.state,null,{timeout:15000});
await page.evaluate(()=>window.__harness.start?.());
await page.evaluate(()=>window.__harness.skipToBattle?.());
await page.waitForFunction(()=>{const s=window.__harness.state();return s.countdown<=0;},null,{timeout:8000,polling:16}).catch(()=>{});
await page.evaluate(()=>window.__harness.fillEnergy?.()); await wf(4);
console.log("BOOT:",JSON.stringify(await p1()));
// climb tiers: hold charge 'p'
async function charge(){ await page.keyboard.down("p"); await wf(24); await page.keyboard.up("p"); await wf(50); }
await charge(); console.log("after charge1:",(await p1()).form);
await page.evaluate(()=>window.__harness.fillEnergy?.()); await wf(3);
await charge(); console.log("after charge2:",(await p1()).form);
// moves (hold-based)
async function sp(dir){ await page.evaluate(()=>window.__harness.fillEnergy?.()); await wf(3); const b=(await p1()).energy; if(dir)await page.keyboard.down(dir); await page.keyboard.down("l"); await wf(12); await page.keyboard.up("l"); if(dir)await page.keyboard.up(dir); await wf(30); return b-(await p1()).energy; }
console.log("Fwd+L DashBarrage dE:", await sp("d"));
console.log("Back+L FlipKick dE:", await sp("a"));
console.log("Neutral+L ChakraArm dE:", await sp(null));
console.log("Down+L Gamabunta dE:", await sp("s"));
await page.evaluate(()=>window.__harness.fillEnergy?.()); await wf(40);
const ub=(await p1()).energy; await page.keyboard.down("u"); await wf(14); await page.keyboard.up("u"); await wf(4);
console.log("Ult(TBB,tier3) dE:", ub-(await p1()).energy, "form:",(await p1()).form);
console.log("PAGEERRORS:", errs.slice(0,5));
await browser.close(); server.close();
