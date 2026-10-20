// gon_work/anim_review.mjs — capture Gon's ACTUAL in-game animations frame-by-frame so I can see the jank.
// For each action, trigger it then grab the rendered sprite cell every frame via renderInfo, assembling a
// per-action filmstrip crop of the gon body region. Outputs gon_work/anim_<action>.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "gon_work");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json",".jpg":"image/jpeg" };
const server = await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>console.log("PAGEERROR:",e.message));
const wf=async n=>{const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16})};
const ri=()=>page.evaluate(()=>window.__harness.renderInfo("p1"));
await page.goto(`${base}/index.html?harness=1&p1=gon&p2=goku`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,{timeout:15000});
await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot()); await wf(6);
await page.evaluate(()=>{window.__harness.skipToBattle?.();window.__harness.fillEnergy?.();});
await wf(10);

// grab a crop around Gon's body each frame → build a horizontal filmstrip
async function strip(name, trigger, nFrames, step=2){
  await page.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();});
  await wf(4);
  await trigger();
  const shots=[];
  for(let i=0;i<nFrames;i++){
    const fiInfo=await ri();
    const buf=await page.screenshot();
    shots.push({buf, fi: fiInfo?.frameIndex, action: fiInfo?.action});
    await wf(step);
  }
  fs.writeFileSync(path.join(OUT,`_frames_${name}.json`), JSON.stringify(shots.map((s,i)=>({i,fi:s.fi,action:s.action}))));
  // save individual crops; assemble later in python
  for(let i=0;i<shots.length;i++) fs.writeFileSync(path.join(OUT,`_sh_${name}_${String(i).padStart(2,"0")}.png`), shots[i].buf);
  console.log(name, "frames:", shots.map(s=>s.fi).join(","), "actions:", [...new Set(shots.map(s=>s.action))].join("/"));
}

async function tapHold(key,hold){await page.keyboard.down(key);await wf(hold);await page.keyboard.up(key);}

// WALK
await strip("walk", async()=>{await page.keyboard.down("d");}, 10, 3); await page.keyboard.up("d");
// LIGHT
await strip("light", async()=>{await tapHold("j",1);}, 8, 1);
// HEAVY
await strip("heavy", async()=>{await tapHold("k",1);}, 10, 1);
// UP attack
await strip("up", async()=>{await page.keyboard.down("w");await wf(1);await page.keyboard.down("j");await wf(1);await page.keyboard.up("j");await page.keyboard.up("w");}, 10, 1);
// ROCK (chant fwd)
await strip("rock", async()=>{await page.keyboard.down("l");await wf(1);await page.keyboard.down("d");await wf(8);await page.keyboard.up("l");await page.keyboard.up("d");}, 12, 2);

await browser.close(); server.close();
console.log("done");
