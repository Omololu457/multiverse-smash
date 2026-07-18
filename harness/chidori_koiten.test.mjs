// harness/chidori_koiten.test.mjs
// Sasuke CHIDORI KOITEN (qcb + Special) — stationary AOE lightning discharge with a real windup.
// Confirms: triggers on the qcb input + costs 35 energy; REAL startup (no damage at cast, only after
// the windup when the active burst lands) & not spammable (recovery blocks a re-use); the caster-
// centred AOE only connects if the opponent is IN RANGE when the active window hits (far = whiff).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function startServer(){const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const fp=path.join(ROOT,u==="/"?"/index.html":u);if(!fp.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"});res.end(d);});});return new Promise(r=>s.listen(0,"127.0.0.1",()=>r(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const server=await startServer(); const baseURL=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows","--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const wf=async n=>{const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});};
const p1=()=>page.evaluate(()=>window.__harness.p1Snap());
const p2=()=>page.evaluate(()=>window.__harness.p2State());
const projNames=()=>page.evaluate(()=>window.__harness.projectiles().map(p=>p.name));
const shot=n=>page.screenshot({path:path.join(OUT,n)});
async function grounded(){await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&Math.abs(p.vy)<0.5;},null,{timeout:6000}).catch(()=>{});}
async function actionable(){await page.waitForFunction(()=>{const p=window.__harness.p1Snap();return p.attackCooldown<=0&&p.hitstun<=0;},null,{timeout:6000}).catch(()=>{});}
async function qcb(){ await page.keyboard.down("s"); await wf(2); await page.keyboard.down("a"); await wf(2); await page.keyboard.up("a"); await page.keyboard.down("l"); const castFrame=await page.evaluate(()=>window.__harness.state().frame); await wf(2); await page.keyboard.up("l"); await page.keyboard.up("s"); return castFrame; }
// Pin the opponent at a fixed offset from Sasuke EVERY frame (removes dummy-drift / qcb-movement
// nondeterminism), and report the first frame the opponent takes damage (-1 = never) — so we can
// assert BOTH "in range → hit" and "hit lands deep in the windup (real startup), not at frame 0".
async function pinAndWatch(offset, frames=44){
  const hp0=(await p2()).health;
  return page.evaluate(async ({offset,frames,hp0})=>{
    let dmgFrame=-1;
    for(let k=0;k<frames;k++){
      window.__harness.setP2X(window.__harness.p1Snap().x + offset);
      if(dmgFrame<0 && window.__harness.p2State().health < hp0) dmgFrame=window.__harness.state().frame;   // absolute game frame
      await new Promise(r=>requestAnimationFrame(r));
    }
    return { dmgFrame, hp0, hp1: window.__harness.p2State().health };
  }, {offset,frames,hp0});
}

try {
  await page.goto(`${baseURL}/index.html?harness=1&p1=sasuke&p2=sasuke`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await wf(6);

  // ── 1) TRIGGERS on qcb+Special, costs 35, real WINDUP (no instant damage), then AOE burst hits ──
  section("CHIDORI KOITEN — qcb+Special: real windup, then the AOE burst connects in-range");
  await grounded(); await actionable();
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+100); window.__harness.healP2?.(); window.__harness.fillEnergy(); });
  await wf(2);
  {
    const e0=(await p1()).energy;
    const castFrame=await qcb();
    await wf(4);   // a few frames into the windup (startup is 16f) — a draw has updated the pose
    const cast=await p1();
    check("qcb+Special starts Chidori Koiten (windup pose)", cast.action==="chidoriKoiten", `action=${cast.action}`);
    check("costs 35 energy", Math.round(e0 - cast.energy) === 35, `energy ${e0}→${cast.energy}`);
    await shot("KOITEN_windup.png");
    // pin the opponent IN range and watch — the burst lands only after the ~16f windup, not at cast
    const r = await pinAndWatch(75);
    const startupFrames = r.dmgFrame - castFrame;
    check("AOE burst deals damage to an opponent IN range", r.hp1 < r.hp0, `hp ${r.hp0}→${r.hp1} (−${(r.hp0-r.hp1).toFixed(0)})`);
    check("real startup — hit lands ~16f after cast (a genuine windup, NOT instant)", startupFrames >= 12 && startupFrames <= 24, `cast→hit=${startupFrames}f`);
    await shot("KOITEN_burst.png");
  }
  await wf(30); await grounded();

  // ── 2) The lightning FX appears around the discharge ──
  section("CHIDORI KOITEN — lightning discharge FX");
  await actionable();
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+100); window.__harness.healP2?.(); window.__harness.fillEnergy(); });
  await wf(2);
  {
    await qcb();
    const sawFx = await page.waitForFunction(()=>window.__harness.projectiles().some(p=>p.name==="chidoriKoitenFx"), null, { timeout: 2000, polling: 8 }).then(()=>true).catch(()=>false);
    check("chidoriKoitenFx (visualOnly discharge) spawns during the move", sawFx, `proj seen`);
    if (sawFx) await shot("KOITEN_discharge.png");   // evidence: lightning on screen
    const fx = await page.evaluate(()=>window.__harness.projectiles().find(p=>p.name==="chidoriKoitenFx")||null);
    check("discharge FX is visualOnly (does not double-hit)", !fx || fx.visualOnly, fx?`visualOnly=${fx.visualOnly}`:"(despawned)");
  }
  await wf(30); await grounded();

  // ── 3) NOT spammable — a second cast during recovery is rejected ──
  section("CHIDORI KOITEN — real recovery (not spammable)");
  await actionable();
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+100); window.__harness.healP2?.(); window.__harness.fillEnergy(); });
  await wf(2);
  {
    await qcb();
    const afterFirst=await p1();
    check("recovery cooldown is set after the cast", afterFirst.attackCooldown > 0, `cd=${afterFirst.attackCooldown}`);
    // immediate second attempt while still attacking/in recovery → rejected (no extra 35)
    const e1=(await p1()).energy;
    await qcb();
    const e2=(await p1()).energy;
    check("second cast during recovery is rejected (no extra energy spent)", Math.abs(e2-e1) < 1, `energy ${e1}→${e2}`);
  }
  await wf(40); await grounded();

  // ── 4) AOE only connects IN RANGE — a far opponent takes NO damage ──
  section("CHIDORI KOITEN — proximity-gated: far opponent is NOT hit");
  await actionable();
  await page.evaluate(()=>{ window.__harness.healP2?.(); window.__harness.fillEnergy(); });
  await wf(2);
  {
    await qcb();
    // pin the opponent FAR (400px, outside the ±120 AOE) every frame through the whole move
    const r = await pinAndWatch(400);
    check("far opponent (outside the AOE) takes NO damage across the whole active window", r.dmgFrame === -1 && r.hp1 === r.hp0, `firstDamageFrame=${r.dmgFrame} hp ${r.hp0}→${r.hp1}`);
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; try{await shot("KOITEN_ERROR.png");}catch{} }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
