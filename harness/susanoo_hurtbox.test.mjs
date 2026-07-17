// harness/susanoo_hurtbox.test.mjs
// Susanoo giant-hurtbox fix: getHurtbox() must span the VISIBLE giant body (vertically
// centered on it), not sit at the tiny physics box near the feet — so upper-body hits
// connect. Normal (non-Susanoo) hurtboxes must be completely unaffected.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const OUT=path.join(ROOT,"harness","shots");fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".mp4":"video/mp4",".json":"application/json",".csv":"text/csv"};
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const server=await srv();const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true});const page=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[];page.on("pageerror",e=>jsErrors.push(String(e)));
const p1=()=>page.evaluate(()=>window.__harness.p1());
const hb=w=>page.evaluate(x=>window.__harness.hurtbox(x),w);
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
async function tapU(){await page.keyboard.down("u");await wf(3);await page.keyboard.up("u");await wf(2);}
try{
  await page.goto(`${base}/index.html?harness=1&p1=sasuke&p2=sasuke`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());await wf(6);

  console.log("\n── normal hurtbox (baseline — must be UNAFFECTED) ──");
  const nHb=await hb("p1"), nP1=await p1();
  check("normal hurtbox tracks the physics box (y within a few px of fighter.y)", Math.abs(nHb.y-(nP1.y+6))<2, `hb.y=${nHb.y?.toFixed(0)} fighter.y=${nP1.y?.toFixed(0)}`);
  check("normal hurtbox height ~ physics box height", Math.abs(nHb.h-(nP1.h-6))<2, `hb.h=${nHb.h?.toFixed(0)} fighter.h=${nP1.h}`);

  console.log("\n── enter Susanoo → giant hurtbox ──");
  await tapU(); await wf(20);
  const s=await p1();
  check("Susanoo active", s.susanooStage>=1, `stage=${s.susanooStage}`);
  const gHb=await hb("p1");
  const giantTop=gHb.drawTop, giantH=gHb.drawH;
  check("giant render box recorded (drawTop/drawH)", giantTop!=null&&giantH>0, `drawTop=${giantTop?.toFixed(0)} drawH=${giantH?.toFixed(0)}`);
  check("giant hurtbox is MUCH taller than the physics box", gHb.h > gHb.fh*3, `hb.h=${gHb.h?.toFixed(0)} vs physics h=${gHb.fh}`);
  check("giant hurtbox reaches UP into the upper body (top well above feet)", gHb.y < (gHb.fy - 100), `hb.top=${gHb.y?.toFixed(0)} feet≈${(gHb.fy+gHb.fh).toFixed(0)}`);
  // vertically CENTERED on the giant (not anchored to feet): hurtbox center ≈ giant render center
  const hbCenterY=gHb.y+gHb.h/2, giantCenterY=giantTop+giantH/2;
  check("giant hurtbox is vertically CENTERED on the visible giant (not the feet)", Math.abs(hbCenterY-giantCenterY)<giantH*0.1, `hbCenter=${hbCenterY.toFixed(0)} giantCenter=${giantCenterY.toFixed(0)}`);
  // an UPPER-BODY point (25% down from the giant's top) must lie INSIDE the hurtbox
  const upperY=giantTop+giantH*0.25, centerX=gHb.fx+gHb.fw/2;
  const inside = upperY>gHb.y && upperY<gHb.y+gHb.h && centerX>gHb.x && centerX<gHb.x+gHb.w;
  check("an attack at the giant's UPPER body now lands inside the hurtbox", inside, `upperPt=(${centerX.toFixed(0)},${upperY.toFixed(0)}) box=[${gHb.x.toFixed(0)},${gHb.y.toFixed(0)},${gHb.w.toFixed(0)},${gHb.h.toFixed(0)}]`);
  // the OLD tiny box was at the feet — confirm the fix moved the hittable region off the feet
  check("upper-body point was OUTSIDE the old tiny feet box (regression the fix addresses)", !(upperY>nP1.y && upperY<nP1.y+nP1.h), `upperY=${upperY.toFixed(0)} oldBox=[${nP1.y.toFixed(0)}..${(nP1.y+nP1.h).toFixed(0)}]`);
  await page.screenshot({path:path.join(OUT,"SUS_HURTBOX_giant.png")});

  console.log("\n── revert → hurtbox returns to normal ──");
  await page.evaluate(()=>window.__harness.expireSusanoo());await wf(4);
  const rHb=await hb("p1"), rP1=await p1();
  check("after revert, hurtbox is back to the normal physics box", rP1.susanooStage===0 && Math.abs(rHb.y-(rP1.y+6))<2 && rHb.h<rP1.h, `stage=${rP1.susanooStage} hb.y=${rHb.y?.toFixed(0)} hb.h=${rHb.h?.toFixed(0)}`);

  console.log("\n── errors ──");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
