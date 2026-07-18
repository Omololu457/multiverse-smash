// harness/toji_stance.test.mjs
// Toji 3-stance FOUNDATION: (a) stance state cycles on the charge tap, (b) the correct
// placeholder light fires per stance, (c) the CANCEL-ON-RECOVERY mechanic measurably
// shortens the recovery window — with real frame counts. Placeholder content only.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const OUT=path.join(ROOT,"harness","shots");fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".mp4":"video/mp4",".json":"application/json",".csv":"text/csv"};
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const server=await srv();const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true});const page=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[];page.on("pageerror",e=>jsErrors.push(String(e)));
const ts=()=>page.evaluate(()=>window.__harness.tojiState("p1"));
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:8});}
async function tapCharge(){await page.keyboard.down("p");await wf(2);await page.keyboard.up("p");await wf(2);}
async function tapLight(){await page.keyboard.down("j");await wf(2);await page.keyboard.up("j");}
async function waitIdle(){for(let i=0;i<120;i++){if((await ts()).canAct)return;await wf(1);}}

// Measure the RECOVERY WINDOW (frames spent in recovery phase) for one light, optionally
// canceling on the first recovery frame via a charge tap.
async function measureRecovery(doCancel){
  await waitIdle();
  await page.keyboard.down("j");await wf(2);await page.keyboard.up("j");   // fire
  let recStart=null, recEnd=null, held=false;
  for(let i=0;i<160;i++){
    const st=await ts(); const f=await frame();
    if(st.phase==="recovery" && recStart===null) recStart=f;
    // Cancel: HOLD charge from the first recovery frame (must stay down across ≥1 poll so
    // the game sees keys[charge] on an update — a press+release in one tick is missed).
    if(doCancel && recStart!==null && !held && st.phase==="recovery"){ await page.keyboard.down("p"); held=true; }
    if(recStart!==null && st.phase!=="recovery" && st.phase!=="active"){ recEnd=f; break; }
    await wf(1);
  }
  if(held) await page.keyboard.up("p");
  return { window: (recStart!=null&&recEnd!=null)?recEnd-recStart:null, recStart, recEnd };
}

try{
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=toji`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());await wf(5);
  await page.evaluate(()=>window.__harness.setP2X(2000));  // keep dummy clear

  section("(a) stance STATE cycles on the charge tap");
  check("default stance is BLADE", (await ts()).stance==="blade", `stance=${(await ts()).stance}`);
  await tapCharge(); check("tap → CHAIN", (await ts()).stance==="chain", `stance=${(await ts()).stance}`);
  await tapCharge(); check("tap → GUN",   (await ts()).stance==="gun",   `stance=${(await ts()).stance}`);
  await tapCharge(); check("tap → wraps back to BLADE", (await ts()).stance==="blade", `stance=${(await ts()).stance}`);
  await page.screenshot({path:path.join(OUT,"TOJI_stance_indicator.png")});

  section("(b) correct light fires PER stance (Blade=real quickDraw; Chain/Gun=placeholder)");
  await waitIdle(); await tapLight(); await wf(1);
  check("BLADE stance fires quickDraw (Phase-2 real normal)", (await ts()).move==="quickDraw", `move=${(await ts()).move}`);
  await waitIdle(); await tapCharge(); // → chain
  await waitIdle(); await tapLight(); await wf(1);
  check("CHAIN stance fires shortLash (Phase-3 real normal)", (await ts()).move==="shortLash", `move=${(await ts()).move}`);
  await waitIdle(); await tapCharge(); // → gun
  await waitIdle(); await tapLight(); await wf(1);
  const gproj=await page.evaluate(()=>window.__harness.projectiles());
  check("GUN stance fires a snapShot projectile (Phase-4 real ranged normal)", gproj.some(p=>p.name==="snapShot"), `projectiles=${JSON.stringify(gproj.map(p=>p.name))}`);

  section("(c) CANCEL-ON-RECOVERY shortens the recovery window (frame evidence)");
  // put stance on chain (long recovery) for a clear window; measure same move both ways.
  await waitIdle(); let cur=(await ts()).stance;
  while(cur!=="chain"){ await tapCharge(); await waitIdle(); cur=(await ts()).stance; }
  check("measuring on CHAIN stance (shortLash, recovery 11)", cur==="chain");
  const noCancel = await measureRecovery(false);
  // re-align to chain (no cancel didn't switch), then cancel run
  await waitIdle(); cur=(await ts()).stance;
  while(cur!=="chain"){ await tapCharge(); await waitIdle(); cur=(await ts()).stance; }
  const withCancel = await measureRecovery(true);
  console.log(`  → recovery window: NO-cancel=${noCancel.window} frames, WITH-cancel=${withCancel.window} frames`);
  check("no-cancel recovery window is a full multi-frame recovery", noCancel.window!=null && noCancel.window>=6, `window=${noCancel.window}`);
  check("cancel genuinely SHORTENS the recovery window", withCancel.window!=null && withCancel.window < noCancel.window, `${withCancel.window} < ${noCancel.window}`);
  check("cancel ended recovery near-instantly (≤3 frames)", withCancel.window!=null && withCancel.window<=3, `window=${withCancel.window}`);
  check("cancel also SWITCHED stance (chain→gun)", (await ts()).stance==="gun", `stance=${(await ts()).stance}`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"TOJI_stance_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
