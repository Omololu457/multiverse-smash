import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "toji_frames"); fs.mkdirSync(OUT, { recursive: true });
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; pg.on("pageerror",e=>jsErrors.push(String(e)));
const st=()=>pg.evaluate(()=>window.__harness.state());
async function waitFrames(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16})}
function saveDataURL(u,file){fs.writeFileSync(file,Buffer.from(u.split(",")[1],"base64"))}
const SKINS=["tojiStripeMercenary","tojiShatteredBlade","tojiScaleMail","tojiMarbledVeteran"];
const POSES=[["idle",4],["walk",6],["walk",5],["run",6],["light",4],["up",5]];
let ch=0;
for (const id of SKINS){
  await pg.goto(`${base}/index.html?harness=1&p1=toji`,{waitUntil:"load"});
  await pg.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await pg.mouse.click(640,360);
  await pg.evaluate((sk)=>{window.__harness.start({p1Skin:sk}); window.__harness.skipToBattle();}, id);
  await waitFrames(10);
  let n=0;
  for (const [action,adv] of POSES){
    await pg.evaluate(a=>window.__harness.forceAction(a,"p1"), action); await waitFrames(adv);
    const c=await pg.evaluate(()=>window.__harness.spriteCrop("p1"));
    if(c){saveDataURL(c.dataURL, path.join(OUT,`${id}_${n}_${action}.png`)); ch=c.contentH;}
    n++;
  }
  await pg.evaluate(()=>window.__harness.forceAction(null,"p1"));
  const sk=await pg.evaluate(()=>window.__harness.p1().skinId);
  console.log(`${id}: ${n} frames, skinId=${sk}, contentH≈${ch}px`);
}
console.log("jsErrors:", jsErrors.length);
await b.close(); server.close(); process.exit(0);
