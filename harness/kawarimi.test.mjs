// harness/kawarimi.test.mjs
// Naruto KAWARIMI (Substitution) — his own Block+Special defensive teleport, the same family as
// Sasuke's Substitution (see substitution.test.mjs). Added 2026-07-20 to resolve a vague secondhand
// playtester report ("either over-nerfed, OR a defensive move isn't working"). This locks the
// REAL-INPUT behaviour: Kawarimi triggers on Block(hold Down)+Special DURING an incoming attack,
// whiffs the swing (no damage), costs 25 meter, grants i-frames, defers the reposition, and teleports
// Naruto behind the opponent — and that with NO incoming attack the SAME input falls through to Dark
// Rasengan (Down+Special) instead. Investigation found nothing broken; this guards it going forward.
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
  await bootAs("naruto");
  await grounded();

  // ── 1) TRIGGERS on Block+Special during an incoming attack; whiffs; teleports behind ──
  section("KAWARIMI triggers on Block+Special during an incoming attack");
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+64); window.__harness.fillEnergy(); window.__harness.healP2(); });
  await wf(2);
  {
    const before=await p1s();
    await page.keyboard.down(";"); await wf(2);        // Naruto blocks (hold Down)
    check("holding Down = block active (isBlocking)", (await p1s()).blocking === true);
    await page.evaluate(()=>window.__harness.p2Attack());   // opponent swings — window opens
    await wf(2);
    const p2before=await p2s();
    await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l");   // Special → Kawarimi
    const justAfter=await p1s();
    const p2after=await p2s();
    check("costs 25 meter (Kawarimi, not the 45 Dark Rasengan)", Math.round(before.energy - justAfter.energy) === 25, `energy ${before.energy.toFixed(1)}→${justAfter.energy.toFixed(1)}`);
    check("consumes the incoming swing (opponent attack → hasHit → whiffs)", p2after.hasHit && !p2before.hasHit, `hasHit ${p2before.hasHit}→${p2after.hasHit}`);
    check("grants brief i-frames", justAfter.invulnTimer > 0, `invuln=${justAfter.invulnTimer}`);
    check("smoke-poof flash fires", justAfter.teleportFlash > 0, `teleFlash=${justAfter.teleportFlash}`);
    check("Naruto takes NO damage from the whiffed swing", justAfter.health >= before.health, `hp ${before.health}→${justAfter.health}`);
    check("reposition is NOT instant (deferred by real startup)", Math.abs(justAfter.x - before.x) < 30, `Δx@cast=${(justAfter.x-before.x).toFixed(0)}`);
    await shot("KAWARIMI_poof.png");
    await wf(8);
    const settled=await p1s(); const p2end=await p2s();
    check("re-appears adjacent to the opponent (behind-teleport math)", Math.abs(settled.x - p2end.x) < (settled.w + 40), `naruto.x=${settled.x.toFixed(0)} opp.x=${p2end.x.toFixed(0)} Δ=${Math.abs(settled.x-p2end.x).toFixed(0)}`);
    check("real recovery tail (attackCooldown set — committed, not a free panic button)", settled.attackCooldown > 0 || justAfter.attackCooldown > 0, `cd@cast=${justAfter.attackCooldown} cd@settle=${settled.attackCooldown}`);
    await shot("KAWARIMI_behind.png");
    await page.keyboard.up(";");
  }
  await wf(30); await grounded();

  // ── 2) NO incoming attack → Block+Special falls through to Dark Rasengan (Down+Special), NOT Kawarimi ──
  section("Block+Special with NO incoming attack → Dark Rasengan (45), NOT Kawarimi (25)");
  await page.evaluate(()=>{ window.__harness.fillEnergy(); });
  await wf(2);
  {
    const e0=(await p1s()).energy;
    await page.keyboard.down("s"); await wf(2);
    await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l"); await wf(2);
    const e1=(await p1s()).energy;
    check("no-incoming input spends the 45 Dark Rasengan cost (fell through, not a 25 Kawarimi)", Math.round(e0 - e1) === 45, `energy ${e0.toFixed(1)}→${e1.toFixed(1)} (Δ${(e0-e1).toFixed(0)})`);
    await page.keyboard.up("s");
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; try{await shot("KAWARIMI_ERROR.png");}catch{} }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
