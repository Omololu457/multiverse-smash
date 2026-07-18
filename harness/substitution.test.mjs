// harness/substitution.test.mjs
// Sasuke SUBSTITUTION JUTSU (Kawarimi) — mirrors Naruto's Kawarimi:
//   Block(hold Down) + Special DURING an incoming attack → the swing whiffs, Sasuke poofs and
//   re-appears BEHIND the opponent (his dash-behind math), with real startup + recovery.
// Confirms: triggers on the block+special/incoming input; whiffs the hit (no damage); repositions
// behind; NOT instant (deferred reposition) / NOT spammable (real cooldown); normal blocking is
// unaffected for Sasuke and for another character; no-incoming falls through to normal specials.
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
const p1s=()=>page.evaluate(()=>window.__harness.p1Snap());
const p2s=()=>page.evaluate(()=>window.__harness.p2State());
const projNames=()=>page.evaluate(()=>window.__harness.projectiles().map(p=>p.name));
const shot=n=>page.screenshot({path:path.join(OUT,n)});
async function grounded(){await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&Math.abs(p.vy)<0.5;},null,{timeout:6000}).catch(()=>{});}
async function bootAs(p1k,p2k="sasuke"){
  await page.goto(`${baseURL}/index.html?harness=1&p1=${p1k}&p2=${p2k}`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await wf(6);
}

try {
  await bootAs("sasuke");

  // ── 1) TRIGGERS on block+special during an incoming attack; whiffs; reposition BEHIND ──
  section("SUBSTITUTION triggers on Block+Special during an incoming attack");
  await grounded();
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+64); window.__harness.fillEnergy(); window.__harness.healP2?.(); });
  await wf(2);
  {
    const before=await p1s();
    await page.keyboard.down("s"); await wf(2);        // Sasuke blocks (hold Down)
    await page.evaluate(()=>window.__harness.p2Attack());   // opponent swings (incoming window opens)
    await wf(2);
    const p2before=await p2s();
    await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l");   // Special → Substitution
    const justAfter=await p1s();
    const p2after=await p2s();
    check("Substitution spawns the substitution-log FX (sasuke_substitusion_justu.png)", (await projNames()).includes("substitutionLog"), `proj=${JSON.stringify(await projNames())}`);
    check("costs the 25 meter (same as Naruto's Kawarimi)", Math.round(before.energy - justAfter.energy) === 25, `energy ${before.energy}→${justAfter.energy}`);
    check("consumes the incoming swing (opponent attack marked hasHit → whiffs)", p2after.hasHit && !p2before.hasHit, `hasHit ${p2before.hasHit}→${p2after.hasHit}`);
    check("grants brief i-frames", justAfter.invulnTimer > 0, `invuln=${justAfter.invulnTimer}`);
    check("Sasuke takes NO damage from the whiffed swing", justAfter.health >= before.health, `hp ${before.health}→${justAfter.health}`);
    await shot("SUB_poof.png");
    // real startup: the reposition is DEFERRED — right after cast Sasuke is still at (near) origin
    check("reposition is NOT instant (deferred by real startup)", Math.abs(justAfter.x - before.x) < 30, `Δx@cast=${(justAfter.x-before.x).toFixed(0)}`);
    // after startup → re-appears adjacent to the opponent (dash-behind reposition)
    await wf(8);
    const settled=await p1s(); const p2end=await p2s();
    check("Sasuke re-appears repositioned next to the opponent (behind-teleport math)", Math.abs(settled.x - p2end.x) < (settled.w + 40), `sasuke.x=${settled.x.toFixed(0)} opp.x=${p2end.x.toFixed(0)} Δ=${Math.abs(settled.x-p2end.x).toFixed(0)}`);
    check("real recovery tail (attackCooldown set — not a free instant button)", settled.attackCooldown > 0 || justAfter.attackCooldown > 0, `cd@cast=${justAfter.attackCooldown} cd@settle=${settled.attackCooldown}`);
    await shot("SUB_behind.png");
    await page.keyboard.up("s");
  }
  await wf(30); await grounded();

  // ── 2) NOT spammable — a second attempt during recovery does nothing ──
  section("SUBSTITUTION is NOT spammable (real recovery blocks an instant re-use)");
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+64); window.__harness.fillEnergy(); window.__harness.healP2?.(); });
  await wf(2);
  {
    // fire one substitution, then IMMEDIATELY try again while still in recovery
    await page.keyboard.down("s"); await wf(2);
    await page.evaluate(()=>window.__harness.p2Attack()); await wf(2);
    await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l");
    const afterFirst=await p1s();
    // 2nd attempt right away (still in attackCooldown) — should be rejected
    await page.evaluate(()=>window.__harness.p2Attack()); await wf(1);
    const e1=(await p1s()).energy;
    await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l");
    const e2=(await p1s()).energy;
    check("second Substitution during recovery is rejected (no extra 25 spent)", Math.abs(e2-e1) < 1, `energy ${e1}→${e2} (cd=${afterFirst.attackCooldown})`);
    await page.keyboard.up("s");
  }
  await wf(30); await grounded();

  // ── 3) NO incoming attack → block+special falls through to a NORMAL special (no substitute) ──
  section("Block+Special with NO incoming attack → normal special, NOT a substitution");
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+64); window.__harness.fillEnergy(); window.__harness.healP2?.(); });
  await wf(2);
  {
    // opponent is NOT attacking; hold Down + Special → should be Shuriken (down+special), not Substitution
    await page.keyboard.down("s"); await wf(2);
    await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l");
    await wf(2);
    check("no substitution-log FX (window was closed)", !(await projNames()).includes("substitutionLog"), `proj=${JSON.stringify(await projNames())}`);
    await page.keyboard.up("s");
  }
  await wf(20); await grounded();

  // ── 4) NORMAL BLOCK still works for Sasuke (hold Down, no special) ──
  section("Normal blocking still works for Sasuke (unaffected)");
  {
    await page.keyboard.down("s"); await wf(3);
    const b=await p1s();
    check("holding Down = normal block (isBlocking), no substitution", b.blocking && !(await projNames()).includes("substitutionLog"), `blocking=${b.blocking}`);
    await page.keyboard.up("s"); await wf(2);
    check("releasing Down stops blocking", !(await p1s()).blocking, `blocking=${(await p1s()).blocking}`);
  }

  // ── 5) Another character's blocking is untouched (Gojo) ──
  section("Another character (Gojo) — normal block unaffected, no substitution behavior");
  await bootAs("gojo");
  await grounded();
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+64); window.__harness.fillEnergy(); window.__harness.healP2?.(); });
  await wf(2);
  {
    await page.keyboard.down("s"); await wf(3);
    const gb=await p1s();
    check("Gojo holding Down = normal block", gb.blocking, `blocking=${gb.blocking}`);
    // even with an incoming attack + special, Gojo must NOT do Sasuke's substitution
    await page.evaluate(()=>window.__harness.p2Attack()); await wf(2);
    await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l"); await wf(2);
    check("Gojo Block+Special during incoming does NOT spawn a substitution-log", !(await projNames()).includes("substitutionLog"), `proj=${JSON.stringify(await projNames())}`);
    await page.keyboard.up("s");
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; try{await shot("SUB_ERROR.png");}catch{} }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
