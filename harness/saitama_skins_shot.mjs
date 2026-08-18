import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT="/Users/omololu/Desktop/project/multiverse-smash";
const OUT=path.join(ROOT,"harness","shots"); fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await b.newPage({viewport:{width:1280,height:720}});
const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
await pg.goto(`${base}/index.html?harness=1&p1=saitama`,{waitUntil:"load"});
await pg.waitForFunction(()=>!!window.__harness); await pg.mouse.click(640,360);
await pg.evaluate(()=>window.__harness.boot());
const wf=async n=>{const s=(await pg.evaluate(()=>window.__harness.state())).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{polling:16})};
await wf(6);
const IDS=["default","saitamaSaleDay","saitamaBloodSoaked","saitamaCrimsonFist","saitamaSteelHero","saitamaClassB","saitamaAmethyst","saitamaMidnight","saitamaGoldenSerious","saitamaFrostCape","saitamaToxicMeteor","saitamaRoseHero","saitamaMonochrome","saitamaVoidCaped"];
// every non-default recolor sheet must exist on disk (skin renders a BOX otherwise)
let missing=0;
const need=fs.readdirSync(ROOT).filter(f=>/^saitama_.*_uniform\.png$/.test(f)&&!f.includes("__"));
for(const tag of ["saleday","bloodsoaked","crimsonfist","steelhero","classb","amethyst","midnight","goldenserious","frostcape","toxicmeteor","rosehero","monochrome","void"]){
  if(!fs.existsSync(path.join(ROOT,`saitama_idle_uniform__${tag}.png`))){console.log("MISSING idle sheet for",tag);missing++}
  if(!fs.existsSync(path.join(ROOT,`saitama_portrait__${tag}.png`))){console.log("MISSING portrait for",tag);missing++}
}
let box=0, applied=[];
for(const id of IDS){
  const r=await pg.evaluate(sid=>window.__harness.setSkin("p1",sid),id);
  await wf(6);
  const p=await pg.evaluate(()=>window.__harness.p1());
  applied.push({id,got:r,sheet:(p.spriteSheet||"").split("/").pop(),box:!p.hasSpriteHandler});
  if(!p.hasSpriteHandler) box++;
  await pg.screenshot({path:path.join(OUT,`saitama_skin_${id}.png`),clip:{x:440,y:180,width:400,height:400}});
}
console.log(JSON.stringify(applied,null,1));
console.log("skins:",IDS.length,"boxes:",box,"missing-files:",missing,"errors:",errs.slice(0,3).join(" | ")||"none");
await b.close(); server.close();
process.exit(box||missing||errs.length?1:0);
