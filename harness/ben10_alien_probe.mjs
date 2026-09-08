// harness/ben10_alien_probe.mjs — force Ben 10 through an alien form, report each action's
// resolved sheet + rendered height (fallback-box check) + a screenshot. Read-only diagnostic.
//   node harness/ben10_alien_probe.mjs --alien=heatblast --actions=idle,walk,light,heavy,hbFire
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT=path.join(REPO,"harness","shots");
const arg=k=>(process.argv.find(a=>a.startsWith(`--${k}=`))||"").split("=")[1]||"";
const alien=arg("alien")||"heatblast"; const actions=(arg("actions")||"idle").split(",");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(REPO,u==="/"?"/index.html":u);if(!f.startsWith(REPO)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:640,height:360}});
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(20,20); await page.evaluate(()=>window.__harness.bootVs());
const info=await page.evaluate((al)=>window.__harness.benForm(al,"p1"),alien);
console.log(`benForm ${alien}:`, JSON.stringify(info));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let allReal=true;
for (const act of actions){
  const sh=await page.evaluate(({al,a})=>{ window.__harness.benForm(al,"p1"); window.__harness.benPose(a,"p1"); return window.__harness.oroSkinSheet?.(a,"p1"); },{al:alien,a:act});
  await sleep(70); const ri=await page.evaluate(()=>window.__harness.renderInfo("p1"));
  const real = !!sh && sh.includes(alien.replace("fourarms","fourarms"));
  if (!sh) allReal=false;
  console.log(`  ${act.padEnd(9)} sheet=${sh||"(BASE/none)"} dstH=${Math.round(ri?.dstH||0)}`);
}
await page.evaluate((al)=>{ window.__harness.benForm(al,"p1"); window.__harness.benForm(al,"p2"); window.__harness.benPose("idle","p1"); window.__harness.benPose(window.__harness.p1()?null:null,"p2"); },alien);
await sleep(120); await page.screenshot({path:path.join(OUT,`s3_${alien}_live.png`)});
console.log("js errors:", errs.length?errs:"none");
await browser.close(); server.close();
