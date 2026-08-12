import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "rr_skins"); fs.mkdirSync(OUT, { recursive: true });
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
let pass=0,fail=0; const check=(n,c,e="")=>{console.log(`${c?"✓":"✗"} ${n}${e?"  — "+e:""}`);c?pass++:fail++;};
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; pg.on("pageerror",e=>jsErrors.push(String(e)));
const st=()=>pg.evaluate(()=>window.__harness.state());
async function waitFrames(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16})}
const SKINS=[["default","Default"],["rr_twilight","Twilight Fade"],["rr_racer","Circuit Racer"],["rr_magma","Magma Marble"],["rr_harlequin","Harlequin"]];
try{
  for (const [id,name] of SKINS){
    await pg.goto(`${base}/index.html?harness=1&p1=red_ranger_mmpr`,{waitUntil:"load"});
    await pg.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await pg.mouse.click(640,360);
    await pg.evaluate((sk)=>{window.__harness.start({p1Skin:sk}); window.__harness.skipToBattle();}, id);
    await waitFrames(24);   // let the skin sheets decode
    const p1=await pg.evaluate(()=>window.__harness.p1());
    const expectSheet = id==="default" ? "red_ranger_mmpr_idle_uniform.png" : `__${id}.png`;
    check(`${id.padEnd(13)} idle sheet = ${expectSheet}`, (p1.spriteSheet||"").includes(expectSheet), `sheet=${p1.spriteSheet} skinId=${p1.skinId}`);
    await pg.screenshot({ path: path.join(OUT, `${id}_full.png`) });
  }
  check("no JS page errors", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
  console.log(`\n${fail===0?"✅":"❌"} RR skins: ${pass} passed, ${fail} failed`);
}catch(e){console.error("ERR",e);fail++;}
finally{await b.close();server.close();process.exit(fail===0?0:1);}
