// Verify Maki's 3-intro random-cycle pool: each match start randomly picks intro1/intro2/intro3,
// each renders its own sheet (self-contained), and the selection actually cycles across starts.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`);};
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const state=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{polling:16,timeout:8000}).catch(()=>{});}
const SHEET={intro1:"maki_intro1_uniform",intro2:"maki_intro2_uniform",intro3:"maki_intro3_uniform"};
try{
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  const seen={}; const rendered={}; const seq=[];
  for(let i=0;i<24 && Object.keys(seen).length<3;i++){
    await page.evaluate(()=>window.__harness.start());   // re-runs the intro stage machine (random pick)
    await wf(10);
    const f=await p1(); const v=f.introVariant; seq.push(v);
    if(v){ seen[v]=(seen[v]||0)+1;
      // confirm the picked variant renders ITS OWN sheet (self-contained, no fallback box)
      if(SHEET[v] && (f.spriteSheet||"").includes(SHEET[v])){ rendered[v]=true;
        if(!fs.existsSync(path.join(SHOTS,`maki_intro_${v}.png`))) await page.screenshot({path:path.join(SHOTS,`maki_intro_${v}.png`)});
      }
    }
    await page.evaluate(()=>window.__harness.skipToBattle()); await wf(2);
  }
  console.log("  pick sequence:", seq.join(", "));
  console.log("  counts:", JSON.stringify(seen));
  for(const v of ["intro1","intro2","intro3"]){
    check(`${v} was picked (random-cycle)`, (seen[v]||0)>0, `count=${seen[v]||0}`);
    check(`${v} renders ${SHEET[v]} (self-contained, no fallback box)`, rendered[v]===true);
  }
  check("all 3 intros appeared across starts (cycle works)", Object.keys(seen).length===3, `distinct=${Object.keys(seen).length}`);
  check("no JS errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "));
}catch(e){console.error("HARNESS ERROR:",e);FAIL++;}
finally{ console.log(`\n${FAIL===0?"✅ ALL PASS":"❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`); await browser.close(); server.close(); process.exit(FAIL===0?0:1); }
