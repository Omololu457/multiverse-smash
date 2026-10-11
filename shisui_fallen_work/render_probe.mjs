import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT="/Users/omololu/Desktop/project/multiverse-smash";
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".mp3":"audio/mpeg",".m4a":"audio/mp4"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await b.newPage({viewport:{width:1280,height:720}});
let err=0;pg.on("pageerror",e=>{if(!/drawSasukeAdultStance/.test(e.message)){err++;console.log("ERR",e.message)}});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{polling:16,timeout:15000})}
const p1=()=>pg.evaluate(()=>window.__harness.p1());
await pg.goto(`${base}/index.html?harness=1&p1=shisui_fallen&p2=naruto`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__harness&&window.__harness.state,null,{timeout:15000});
await pg.evaluate(()=>window.__harness.start?.()); await pg.evaluate(()=>window.__harness.skipToBattle?.()); await wf(8);
await pg.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();window.__harness.healP1?.();window.__harness.healP2?.()});await wf(4);
const f=await p1();
console.log("p1 key:",f.key,"hp:",f.maxHealth,"spd:",f.speed??"n/a");
const ready=await pg.evaluate(()=>{try{return !!window.__harness.spritesReady?.()}catch(_){return null}});
await pg.screenshot({path:"shisui_fallen_work/_render_idle.png"});
// pixel check
const vivid=await pg.evaluate(()=>{const cv=document.querySelector("canvas");const cx=cv.getContext("2d");const d=cx.getImageData(0,0,cv.width,cv.height).data;let v=0;for(let i=0;i<d.length;i+=4){const mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]);if(mx-mn>70&&mx>90)v++}return v});
console.log("spritesReady:",ready,"vividPixels:",vivid,"pageerrors:",err);
// FLICKER: double-tap forward (d) to teleport → afterimage
const x0=(await p1()).x;
await pg.keyboard.press("d"); await wf(3); await pg.keyboard.down("d"); await wf(3);
const x1=(await p1()).x;
await pg.screenshot({path:"shisui_fallen_work/_flicker.png"}); await pg.keyboard.up("d");
console.log("flicker: x",Math.round(x0),"->",Math.round(x1),"(dash dx="+Math.round(x1-x0)+")");
await b.close();server.close();console.log("done");
