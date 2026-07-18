// harness/absolute_defense.test.mjs
// Sasuke ABSOLUTE DEFENSE — mirrors Gojo's Infinity architecture:
//   Charge-button TAP (P) toggles a full-negate barrier ON/OFF. While ON and energy covers the
//   per-block cost, EVERY incoming hit is nullified outright (stronger than Infinity's per-dodge
//   roll). COST is per-block (deducted only on an actual negate), priced ABOVE Gojo's per-dodge
//   autoDodgeKiCost (5): Absolute Defense = 12/block. ADDITIVE to Sasuke's normal Down/S block.
// Also confirms the repurposed sasuke_susanoo_intro.png now manifests the barrier FX, and that
// Susanoo's activation still looks intentional (spriteless camera-punch, no dedicated intro sheet).
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
const projs=()=>page.evaluate(()=>window.__harness.projectiles());
const hasIntroSheet=async()=>(await projs()).some(p=>String(p.sheet||"").includes("susanoo_intro"));
const shot=n=>page.screenshot({path:path.join(OUT,n)});
async function grounded(){await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&Math.abs(p.vy)<0.5;},null,{timeout:6000}).catch(()=>{});}
// Charge-button TAP (down<200ms) → per-character toggle.
async function chargeTap(){await page.keyboard.down("p"); await wf(2); await page.keyboard.up("p"); await wf(2);}
async function bootAs(p1k,p2k="sasuke"){
  await page.goto(`${baseURL}/index.html?harness=1&p1=${p1k}&p2=${p2k}`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await wf(6);
}

try {
  await bootAs("sasuke");
  await grounded();

  // ── 1) TOGGLE on/off via the charge button (mirrors Gojo Infinity) ──
  section("Absolute Defense TOGGLES on the charge button (tap P)");
  {
    check("starts OFF", (await p1s()).absoluteDefense === false, `ad=${(await p1s()).absoluteDefense}`);
    await chargeTap();
    check("tap P → toggles ON", (await p1s()).absoluteDefense === true);
    check("toggling ON manifests the repurposed sasuke_susanoo_intro.png barrier FX", await hasIntroSheet(), `proj=${JSON.stringify(await projs())}`);
    await shot("AD_barrier_on.png");
    await chargeTap();
    check("tap P again → toggles OFF", (await p1s()).absoluteDefense === false);
  }

  // ── 2) FULL negate + PER-BLOCK cost (NOT while blocking) ──
  section("While ON, an incoming hit is fully negated for a per-block energy cost (12)");
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+64); window.__harness.healP2(); });
  await wf(2);
  {
    await chargeTap();                                  // Absolute Defense ON (NOT holding block)
    await page.evaluate(()=>window.__harness.setEnergy(150));   // known energy baseline
    await wf(1);
    const before=await p1s();
    await page.evaluate(()=>window.__harness.p2Attack());       // real incoming swing
    await wf(16);                                       // let startup+active resolve against Sasuke
    const after=await p1s();
    const eDrop=before.energy-after.energy;
    check("Sasuke takes NO damage from the incoming hit (full negate)", after.health >= before.health, `hp ${before.health}→${after.health}`);
    check("energy IS deducted on the negated hit (per-block, ~12 minus regen)", eDrop >= 9 && eDrop <= 13, `Δenergy=${eDrop.toFixed(2)}`);
    check("was NOT holding normal block during the negate", before.blocking === false, `blocking=${before.blocking}`);
    await shot("AD_negate.png");
  }

  // ── 3) Cost is PER-BLOCK, not a continuous per-frame drain ──
  section("Cost is per-block only — NO continuous drain while idle-active");
  await page.evaluate(()=>window.__harness.healP2());
  {
    await page.evaluate(()=>window.__harness.setEnergy(100));
    await wf(1);
    const e0=(await p1s()).energy;
    await wf(40);                                       // 40 frames ON, NO incoming attack
    const e1=(await p1s()).energy;
    check("energy does NOT bleed while active with no incoming hit (per-block, not per-frame)", e1 >= e0 - 1, `energy ${e0.toFixed(1)}→${e1.toFixed(1)} over 40f`);
  }

  // ── 4) ADDITIVE to normal block — both coexist and work simultaneously ──
  section("Normal Down/S block still works INDEPENDENTLY and SIMULTANEOUSLY");
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+64); window.__harness.healP2(); window.__harness.setEnergy(150); });
  await wf(2);
  {
    // Absolute Defense is ON (from prior sections). Now ALSO hold Down to normal-block.
    check("Absolute Defense still ON going in", (await p1s()).absoluteDefense === true);
    await page.keyboard.down("s"); await wf(3);
    const b=await p1s();
    check("holding Down = normal block active AT THE SAME TIME as Absolute Defense", b.blocking && b.absoluteDefense, `blocking=${b.blocking} ad=${b.absoluteDefense}`);
    const before=await p1s();
    await page.evaluate(()=>window.__harness.p2Attack()); await wf(16);
    const after=await p1s();
    check("incoming hit still fully negated (no chip) with both defenses up", after.health >= before.health, `hp ${before.health}→${after.health}`);
    await page.keyboard.up("s"); await wf(2);
    check("releasing Down stops normal block; Absolute Defense stays ON (independent)", !(await p1s()).blocking && (await p1s()).absoluteDefense, `blocking=${(await p1s()).blocking} ad=${(await p1s()).absoluteDefense}`);
  }

  // ── 5) ENERGY GATE — below the per-block cost, the hit LANDS ──
  section("Below the per-block cost, the negate fails and the hit connects");
  await page.evaluate(()=>{ const a=window.__harness.p1Snap(); window.__harness.setP2X(a.x+64); window.__harness.healP2(); });
  await wf(2);
  {
    check("Absolute Defense ON", (await p1s()).absoluteDefense === true);
    await page.evaluate(()=>window.__harness.setEnergy(5));     // < 12 → cannot pay the block
    await wf(1);
    const before=await p1s();
    await page.evaluate(()=>window.__harness.p2Attack()); await wf(16);
    const after=await p1s();
    check("with energy under 12 the incoming hit CONNECTS (takes damage)", after.health < before.health, `hp ${before.health}→${after.health} (energy=${before.energy.toFixed(0)})`);
    // reset for later sections
    await chargeTap();                                  // toggle OFF
    check("toggled OFF for cleanup", (await p1s()).absoluteDefense === false);
  }
  await wf(20); await grounded();

  // ── 6) SUSANOO activation still looks intentional (asset repurpose handled) ──
  // REAL screenshot evidence: capture the Lv1 giant at full render scale under the new spriteless
  // entry (screen-flash + camera-punch, NO dedicated intro sprite) — same standard as the earlier
  // Susanoo scale/hurtbox shots. Committed to harness/shots/ (see git add -f in the build).
  section("Susanoo activation still intentional WITHOUT the intro sprite (option b: camera-punch)");
  await page.evaluate(()=>{ window.__harness.fillEnergy(); window.__harness.healP2(); });
  await wf(2);
  {
    const p1full=()=>page.evaluate(()=>window.__harness.p1());
    const hb=()=>page.evaluate(()=>window.__harness.hurtbox("p1"));
    check("no Susanoo giant yet", (await p1s()).susanooStage === 0, `stage=${(await p1s()).susanooStage}`);
    const baseH=(await hb()).drawH;
    await page.keyboard.down("u"); await wf(3); await page.keyboard.up("u"); await wf(3);
    const after=await p1s();
    check("ultimate enters Susanoo Stage 1 (giant appears instantly)", after.susanooStage === 1, `stage=${after.susanooStage}`);
    check("activation flashes (teleportFlash pop) so it never reads blank", after.teleportFlash > 0, `flash=${after.teleportFlash}`);
    check("activation does NOT spawn the (repurposed) susanoo_intro sheet anymore", !(await hasIntroSheet()), `proj=${JSON.stringify(await projs())}`);
    const s1=await p1full();
    check("Stage 1 attaches the giant _skinAnim body-swap", s1.hasSkinAnim === true, `hasSkinAnim=${s1.hasSkinAnim}`);
    check("Stage 1 canvas-relative giant sizing = 0.95 (full giant scale)", s1.canvasHeightFrac === 0.95, `frac=${s1.canvasHeightFrac}`);
    // let the giant fully materialize + the camera-punch settle before the evidence shot
    await wf(24);
    const drawH=(await hb()).drawH;
    check("giant renders at FULL scale (drawH ≫ base Sasuke sprite height)", drawH > 300 && drawH > baseH * 3, `giant drawH=${drawH?.toFixed?.(0)} base=${baseH?.toFixed?.(0)}`);
    await shot("SUSANOO_spriteless_activation.png");
    console.log(`  → evidence screenshot: harness/shots/SUSANOO_spriteless_activation.png (giant drawH=${drawH?.toFixed?.(0)}px, frac=${s1.canvasHeightFrac}, teleportFlash=${after.teleportFlash}, intro-sprite=none)`);
  }

  // ── 7) Another character's charge-tap does NOT grant Absolute Defense ──
  section("Charge-tap on a non-Sasuke (Gojo) does NOT grant Absolute Defense");
  await bootAs("gojo"); await grounded();
  {
    await chargeTap();
    const g=await p1s();
    check("Gojo charge-tap leaves absoluteDefense false (his toggle is Infinity)", g.absoluteDefense === false, `ad=${g.absoluteDefense}`);
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; try{await shot("AD_ERROR.png");}catch{} }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
