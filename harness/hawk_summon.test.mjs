// harness/hawk_summon.test.mjs
// Sasuke HAWK SUMMON (B→F + Special) — a summoned hawk that flies across the screen as an
// independent traveling projectile and, on contact, LAUNCHES the opponent much higher than a
// normal up-normal launcher (a combo-starter into an air juggle, not a knockdown ender).
// Confirms: triggers on the B,F input + costs 30 energy; spawns a real "sasukeHawk" projectile
// that TRAVELS toward the opponent (own hitbox); on connect it deals damage AND pops the dummy
// well above the normal up-attack launcher (measured in-engine, side by side); and the new B,F
// branch does NOT shadow the existing D,F=lightning / neutral=dash motions (ADDITION-only).
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
const p1=()=>page.evaluate(()=>window.__harness.p1());
const p1s=()=>page.evaluate(()=>window.__harness.p1Snap());
const p2=()=>page.evaluate(()=>window.__harness.p2());
const projNames=()=>page.evaluate(()=>window.__harness.projectiles().map(p=>p.name));
const shot=n=>page.screenshot({path:path.join(OUT,n)});
async function grounded(){await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&Math.abs(p.vy)<0.5;},null,{timeout:6000}).catch(()=>{});}
async function p2Grounded(){await page.waitForFunction(()=>{const p=window.__harness.p2();return p.grounded&&Math.abs(p.vy)<0.5;},null,{timeout:6000}).catch(()=>{});}
async function actionable(){await page.waitForFunction(()=>{const p=window.__harness.p1Snap();return p.attackCooldown<=0&&p.hitstun<=0;},null,{timeout:6000}).catch(()=>{});}
async function reset(offset){await page.evaluate((o)=>{const a=window.__harness.p1Snap();window.__harness.setP2X(a.x+o);window.__harness.healP2?.();window.__harness.healP1?.();window.__harness.fillEnergy();},offset);await wf(2);}

// B→F + Special: tap Back, then hold Forward and press Special (P1 faces right → back=a, fwd=d, special=l).
async function bf(){
  await page.keyboard.down("a"); await wf(2); await page.keyboard.up("a");
  await page.keyboard.down("d"); await wf(2);
  await page.keyboard.down("l"); const castFrame=await page.evaluate(()=>window.__harness.state().frame); await wf(2);
  await page.keyboard.up("l"); await page.keyboard.up("d");
  return castFrame;
}

// Fire the move (already triggered), then pin the dummy's X at `offset` every frame and observe the
// launch: first frame it takes damage, its highest point (min y), and the most-negative vy reached.
// Pinning only X leaves Y free, so the vertical pop is measured honestly.
async function observeLaunch(offset, frames=80){
  const hp0=(await p2()).health;
  return page.evaluate(async ({offset,frames,hp0})=>{
    let dmgFrame=-1, minY=Infinity, mostNegVy=0, baselineY=null;
    for(let k=0;k<frames;k++){
      const a=window.__harness.p1Snap();
      window.__harness.setP2X(a.x+offset);
      const p=window.__harness.p2();
      if(dmgFrame<0){ baselineY=p.y; if(p.health<hp0) dmgFrame=k; }   // resting Y just before the hit
      if(dmgFrame>=0){ if(p.y<minY) minY=p.y; if(p.vy<mostNegVy) mostNegVy=p.vy; }
      await new Promise(r=>requestAnimationFrame(r));
    }
    const pf=window.__harness.p2();
    const rise = (baselineY!=null && minY!==Infinity) ? (baselineY - minY) : 0;
    return { dmgFrame, hp0, hp1: pf.health, minY, baselineY, rise, mostNegVy };
  }, {offset,frames,hp0});
}

try {
  await page.goto(`${baseURL}/index.html?harness=1&p1=sasuke&p2=sasuke`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await wf(6);

  // ── 1) TRIGGERS on B,F+Special, costs 30, spawns a real traveling hawk that flies across ──
  section("HAWK SUMMON — B→F+Special spawns a traveling hawk, costs 30, flies across");
  await grounded(); await actionable();
  await reset(560);   // dummy FAR so the hawk is caught mid-flight (won't connect during sampling)
  {
    const e0=(await p1s()).energy;
    await bf();
    await wf(4);
    const names=await projNames();
    check("B→F+Special spawns a 'sasukeHawk' projectile", names.includes("sasukeHawk"), `projectiles=[${names.join(",")}]`);
    const e1=(await p1s()).energy;
    check("costs 30 energy", Math.round(e0 - e1) === 30, `energy ${e0}→${e1}`);
    const hawk=await page.evaluate(()=>window.__harness.projectiles().find(p=>p.name==="sasukeHawk")||null);
    check("hawk uses the real sasuke_summon.png art", !!hawk && /sasuke_summon\.png$/.test(hawk.sheet||""), `sheet=${hawk?.sheet}`);
    check("hawk has forward velocity (travels toward the opponent)", !!hawk && hawk.vx>0, `vx=${hawk?.vx?.toFixed(2)}`);
    await shot("HAWK_inflight.png");
    // sample X again a few frames later → it advances across the screen (independent traveling hitbox)
    const x0=hawk?hawk.x:null;
    await wf(10);
    const h1=await page.evaluate(()=>{const h=window.__harness.projectiles().find(p=>p.name==="sasukeHawk");return h?{x:h.x}:null;});
    check("hawk's X advances toward the opponent over time", !!h1 && x0!=null && h1.x>x0+20, `x ${x0?.toFixed(0)}→${h1?.x?.toFixed(0)}`);
  }
  await wf(70); await grounded();

  // ── 3) On contact the hawk deals damage AND launches the dummy off the ground ──
  section("HAWK SUMMON — connects: damage + airborne launch");
  await actionable(); await p2Grounded(); await reset(220); await p2Grounded();
  let hawkRun;
  {
    await bf();
    // Fire from ~220px so the hawk travels a few frames — observeLaunch arms its baseline before
    // the hit lands (at point-blank the hawk connects during bf(), before tracking starts).
    hawkRun = await observeLaunch(220, 90);
    check("hawk deals damage on contact", hawkRun.hp1 < hawkRun.hp0, `hp ${hawkRun.hp0}→${hawkRun.hp1} (−${(hawkRun.hp0-hawkRun.hp1).toFixed(0)})`);
    check("hawk LAUNCHES the dummy airborne (rises off the ground)", hawkRun.rise > 120, `peak rise=${hawkRun.rise.toFixed(0)}px`);
    check("launch velocity is a big upward pop (well past the -17 normal-launcher clamp)", hawkRun.mostNegVy <= -24, `launch vy=${hawkRun.mostNegVy.toFixed(1)}`);
  }
  await wf(40); await grounded(); await p2Grounded();
  {
    // Visual evidence: fire once more and capture the dummy AT APEX (mid-air), not after it lands.
    await reset(220); await p2Grounded();
    await bf();
    await page.waitForFunction(()=>{const p=window.__harness.p2(); return !p.grounded && p.vy<0 && p.y<250;}, null, {timeout:4000}).catch(()=>{});
    await shot("HAWK_launch.png");
  }
  await wf(50); await grounded();

  // ── 4) The pop is MUCH higher than Sasuke's normal up-attack launcher (in-engine side-by-side) ──
  section("HAWK SUMMON — launches much higher than a normal up-normal launcher");
  await actionable(); await p2Grounded(); await reset(60); await p2Grounded();
  let upRun;
  {
    // Normal up-attack (i = upAttack) launcher, dummy pinned adjacent so it connects.
    await page.keyboard.down("i"); await wf(2); await page.keyboard.up("i");
    upRun = await observeLaunch(60);
    check("normal up-attack connects (baseline launcher)", upRun.hp1 < upRun.hp0, `hp ${upRun.hp0}→${upRun.hp1}`);
    check("normal up-attack launch pop is the smaller/clamped one (~-17)", upRun.mostNegVy > -22, `up-attack vy=${upRun.mostNegVy.toFixed(1)}`);
    check("HAWK peak height is noticeably higher than the up-attack (>1.3x)", hawkRun.rise > upRun.rise*1.3, `hawk ${hawkRun.rise.toFixed(0)}px vs up ${upRun.rise.toFixed(0)}px`);
    check("HAWK launch velocity is stronger than the up-attack's", hawkRun.mostNegVy < upRun.mostNegVy - 4, `hawk ${hawkRun.mostNegVy.toFixed(1)} vs up ${upRun.mostNegVy.toFixed(1)}`);
  }
  await wf(50); await grounded();

  // ── 5) ADDITION-only: the new B,F branch does NOT shadow the existing motions ──
  section("HAWK SUMMON — does not collide with existing Sasuke specials");
  await actionable(); await reset(120);
  {
    // D,F + Special must still be Two-Strike Lightning (not the hawk).
    await page.keyboard.down("s"); await wf(2); await page.keyboard.down("d"); await wf(2);
    await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l"); await page.keyboard.up("d"); await page.keyboard.up("s");
    await wf(3);
    const lp=(await p1()).lightningPhase;
    const namesDF=await projNames();
    check("D,F+Special still triggers Two-Strike Lightning (not the hawk)", !!lp && !namesDF.includes("sasukeHawk"), `lightningPhase=${lp} proj=[${namesDF.join(",")}]`);
  }
  await wf(90); await grounded();
  await actionable(); await reset(120);
  {
    // Neutral Special must still be Dash Strike (no hawk spawned).
    const e0=(await p1s()).energy;
    await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l");
    await wf(3);
    const namesN=await projNames();
    const e1=(await p1s()).energy;
    check("neutral Special still triggers Dash Strike (spends 18, no hawk)", Math.round(e0-e1)===18 && !namesN.includes("sasukeHawk"), `energy ${e0}→${e1} proj=[${namesN.join(",")}]`);
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; try{await shot("HAWK_ERROR.png");}catch{} }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
