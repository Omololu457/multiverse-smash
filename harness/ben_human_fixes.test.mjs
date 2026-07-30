// harness/ben_human_fixes.test.mjs
// Ben Tennyson (HUMAN) re-audit fixes (2026-07-28). Covers what the re-audit TOUCHED:
//   (1) rebalanced HUMAN_FORM normals — light/heavy now deal viable damage (above the old below-floor
//       values), verified in-engine.
//   (2) the newly-wired taunt action renders in-form (previously-unused ben10_taunt.png).
//   (3) taunt-heal end-to-end: hold Down ~10s un-hit → heal ~50% (enrolls Ben in the universal system).
//   node harness/ben_human_fixes.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
let pass=0,fail=0;
const check=(n,c,e="")=>{console.log(`${c?"✓":"✗"} ${n}${e?"  — "+e:""}`);c?pass++:fail++;};
const browser=await chromium.launch({args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const jsErrors=[];page.on("pageerror",e=>jsErrors.push(String(e)));
const st=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1());const p2=()=>page.evaluate(()=>window.__harness.p2());
async function wf(n){const s=(await st()).frame;await page.waitForFunction(([a,c])=>window.__harness.state().frame>=a+c,[s,n],{timeout:20000,polling:16});}
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();});await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&!p.attacking&&(p.attackCooldown||0)<=0;},null,{timeout:8000,polling:16}).catch(()=>{});await wf(2);}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.spriteReady;},null,{timeout:15000,polling:32}).catch(()=>{});
  await page.evaluate(()=>window.__harness.benForm("human"));

  // (1) rebalanced damage
  console.log("\n── Rebalanced HUMAN_FORM normals ──");
  for (const [name,key,min] of [["light","j",20],["heavy","k",40]]) {
    await settle(); const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),a.x+52); await wf(2);
    const h=(await p2()).health; await page.keyboard.down(key); await wf(2); await page.keyboard.up(key); await wf(22);
    const dmg=h-(await p2()).health;
    check(`${name} deals viable damage (>${min} EFF, above old below-floor)`, dmg>min, `EFF=${dmg}`);
  }

  // (2) taunt renders in-form
  console.log("\n── Taunt action (previously-unused art) ──");
  await page.evaluate(()=>window.__harness.benForm("human"));
  await page.evaluate(a=>window.__harness.benPose(a,"p1"),"taunt"); await page.waitForTimeout(200);
  const ts=await page.evaluate(()=>{const c=window.__harness.spriteCrop("p1");const i=window.__harness.renderInfo("p1");return{w:c?.contentW||0,h:c?.contentH||0,action:i?.action};});
  await page.evaluate(()=>window.__harness.benPose(null,"p1"));
  check("taunt resolves to a real in-form sprite (not box)", ts.w>0&&ts.h>0&&!(ts.w>=120&&ts.h>=120)&&ts.action==="taunt", `body=${ts.w}x${ts.h} action=${ts.action}`);

  // (3) taunt-heal end-to-end (hold Down ~10s un-hit → heal ~50%)
  console.log("\n── Taunt-heal (universal system enrollment) ──");
  await settle();
  // chip p1 down first so a heal is observable (heal = 50% of CURRENT hp, capped at max)
  { const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),a.x+50); await wf(2);
    await page.evaluate(()=>window.__harness.p2Attack()); await wf(20);
    await page.evaluate(x=>window.__harness.setP2X(x),(await (async()=>(await p1()).x)())+600); }
  await page.evaluate(()=>window.__harness.setP2X(2600));
  const hpChip=(await p1()).health;
  // hold Down uninterrupted through the 600f charge + the taunt flourish
  await page.keyboard.down("s");
  await wf(640);   // charge (600) crosses the threshold → committed taunt begins
  await wf(90);    // let the flourish resolve → heal applies
  await page.keyboard.up("s");
  const hpAfter=(await p1()).health;
  check("taunt-heal fires (health increased after ~10s Down-hold)", hpAfter>hpChip, `hp ${hpChip}→${hpAfter}`);

  console.log("\n── sweep ──");
  check("no JS errors", jsErrors.length===0, jsErrors[0]||"");
} catch(e){ console.log("FATAL",e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BEN-HUMAN FIXES: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail?1:0);
}
