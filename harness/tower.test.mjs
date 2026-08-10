// harness/tower.test.mjs — Tower Mode.
// STEP 1: tier-select menu (real clicks GAMEPLAY_SELECT → TOWER → TOWER_SELECT → tier).
// STEP 2: Tier 1 (3 floors) — random opponent+stage per floor, win advances, beating
//         floor 3 clears, losing ends the run. Plus a broad randomization proof.
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
const info=()=>page.evaluate(()=>window.__harness.towerInfo());
const gs=()=>page.evaluate(()=>window.__harness.state().gameState);
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();try{await page.waitForFunction(([a,x])=>window.__harness.state().frame>=a+x,[s,n],{timeout:8000,polling:8});}catch{}}
// Win the current match (best-of-3): KO P2 each battle, ride round-breaks/intros to VICTORY.
async function winMatch(){for(let i=0;i<80;i++){const g=await gs();if(g==="victory")return true;if(g==="intro"){await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}});await wf(2);continue;}if(g==="battle"){await page.evaluate(()=>window.__harness.forceP1Win());await wf(6);continue;}await wf(4);}return (await gs())==="victory";}
async function loseMatch(){for(let i=0;i<80;i++){const g=await gs();if(g==="victory")return true;if(g==="intro"){await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}});await wf(2);continue;}if(g==="battle"){await page.evaluate(()=>window.__harness.forceP1Lose());await wf(6);continue;}await wf(4);}return (await gs())==="victory";}

try{
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.waitForTimeout(150);

  // ── STEP 1: tier-select menu via REAL clicks ──────────────────────────────
  section("STEP 1 — tier-select menu (real menu clicks)");
  await page.mouse.click(640,400); await page.waitForTimeout(80);   // START → play
  await page.mouse.click(640,173); await page.waitForTimeout(80);   // MAIN_MENU → play
  check("reached GAMEPLAY_SELECT", (await gs())==="gameplaySelect", `gs=${await gs()}`);
  const towerPt=await page.evaluate(()=>window.__harness.gameplayRect("tower"));   // resolve TOWER row live (menu re-centers when rows change)
  await page.mouse.click(towerPt.x,towerPt.y); await page.waitForTimeout(80);   // GAMEPLAY_SELECT → TOWER
  check("TOWER opens the TIER SELECT screen (not straight into a fight)", (await gs())==="towerSelect", `gs=${await gs()}`);
  await page.screenshot({path:path.join(OUT,"TOWER_tier_select.png")});
  // TIER 1 is index 0 of the vertical menu (6 items): compute its center.
  // n=6 → gap12, avail500, bh=(500-60)/6=73.3, startY=150+(500-(6*73.3+5*12))/2≈150 → item0 center y≈150+36.6
  await page.mouse.click(640,187); await page.waitForTimeout(100);  // TIER 1
  const afterTier=await info();
  check("clicking TIER 1 launches the tower flow (mode=tower, → fighter pick)", afterTier.mode==="tower" && (await gs())==="selectUniverse", `mode=${afterTier.mode} gs=${await gs()}`);

  // ── STEP 2: Tier 1 = 3 floors, random opp+stage, advance/clear ────────────
  section("STEP 2 — Tier 1: 3 floors, random opponent+stage each floor, clear on floor 3");
  await page.evaluate(()=>window.__harness.towerStart("tier1","gojo"));
  await wf(2);
  let f0=await info();
  check("Tier 1 declares 3 floors", f0.floors===3 && f0.endless===false, `floors=${f0.floors} endless=${f0.endless}`);
  check("floor 0 set up with a random opponent + stage + difficulty", !!f0.p2 && !!f0.stage && !!f0.difficulty, `opp=${f0.p2} stage=${f0.stage} diff=${f0.difficulty}`);

  const seq=[];
  for(let fl=0; fl<3; fl++){
    const cur=await info();
    seq.push({floor:cur.floor, opp:cur.p2, stage:cur.stage, diff:cur.difficulty, cleared:cur.cleared});
    const won=await winMatch();
    check(`floor ${fl}: match resolves to VICTORY`, won, `gs=${await gs()}`);
    const atVict=await info();
    if(fl<2){
      check(`floor ${fl} win records lastWon`, atVict.lastWon===true, `lastWon=${atVict.lastWon}`);
      await page.evaluate(()=>window.__harness.towerContinue()); await wf(2);
      const nxt=await info();
      check(`advanced to floor ${fl+1} with a fresh opponent+stage`, nxt.active && nxt.floor===fl+1, `floor=${nxt.floor} opp=${nxt.opp} active=${nxt.active}`);
    } else {
      check("beating floor 3 marks the tower CLEARED", atVict.cleared===true, `cleared=${atVict.cleared}`);
      await page.evaluate(()=>window.__harness.towerContinue()); await wf(2);
      const done=await info();
      check("clearing the tower ends the run (inactive → back to menu)", done.active===false && done.gameState==="start", `active=${done.active} gs=${done.gameState}`);
    }
  }
  console.log("  Tier1 floor sequence:", JSON.stringify(seq));

  // ── loss ends the run ─────────────────────────────────────────────────────
  section("STEP 2 — losing a floor ends the run cleanly");
  await page.evaluate(()=>window.__harness.towerStart("tier1","gojo")); await wf(2);
  const beforeLoss=await info();
  await loseMatch();
  const lossVict=await info();
  check("losing reaches the result screen with lastWon=false", lossVict.gameState==="victory" && lossVict.lastWon===false, `gs=${lossVict.gameState} lastWon=${lossVict.lastWon}`);
  await page.evaluate(()=>window.__harness.towerContinue()); await wf(2);
  const afterLoss=await info();
  check("continuing after a loss ends the tower (inactive → menu)", afterLoss.active===false && afterLoss.gameState==="start", `active=${afterLoss.active} gs=${afterLoss.gameState}`);

  // ── STEP 3: Tier 5 infinite + escalation + randomization + floor HUD ──────
  section("STEP 3 — Tier 5: infinite, difficulty escalates by floor, floor HUD");
  await page.evaluate(()=>window.__harness.towerStart("tier5","gojo")); await wf(2);
  const t5=await info();
  check("Tier 5 is endless (Infinity floors)", t5.endless===true && t5.floors==="Infinity", `endless=${t5.endless} floors=${t5.floors}`);
  // capture the running floor HUD mid-battle (floor 1)
  await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}}); await wf(3);
  await page.screenshot({path:path.join(OUT,"TOWER_floor_hud.png")});
  const opps=new Set(), stgs=new Set(); const diffByFloor=[];
  for(let i=0;i<16;i++){
    const cur=await info(); opps.add(cur.p2); stgs.add(cur.stage); diffByFloor.push({n:cur.floor+1, diff:cur.difficulty});
    await winMatch();
    await page.evaluate(()=>window.__harness.towerContinue()); await wf(2);
  }
  // escalation schedule: 1-5 easy, 6-15 adaptive, 16+ impossible
  const badEasy = diffByFloor.filter(d=>d.n<=5 && d.diff!=="easy");
  const badAdap = diffByFloor.filter(d=>d.n>=6 && d.n<=15 && d.diff!=="adaptive");
  const f16 = diffByFloor.find(d=>d.n===16);
  check("floors 1-5 are EASY", badEasy.length===0, `offenders=${JSON.stringify(badEasy)}`);
  check("floors 6-15 are ADAPTIVE", badAdap.length===0, `offenders=${JSON.stringify(badAdap)}`);
  check("floor 16 is IMPOSSIBLE (escalation reached top tier)", f16 && f16.diff==="impossible", `floor16=${JSON.stringify(f16)}`);
  const afterDeep=await info();
  check("Tier 5 still active + uncleared after 16 floors (truly infinite)", afterDeep.active===true && afterDeep.cleared===false, `active=${afterDeep.active} cleared=${afterDeep.cleared} floor=${afterDeep.floor+1}`);
  check("opponents are randomized (≥4 distinct across 16 floors)", opps.size>=4, `distinct opps=${opps.size}`);
  check("stages are randomized (≥3 distinct across 16 floors)", stgs.size>=3, `distinct stages=${stgs.size}`);
  console.log("  difficulty-by-floor:", JSON.stringify(diffByFloor.map(d=>`${d.n}:${d.diff}`).join(" ")));

  // ── STEP 4: FLAWLESS VICTORY banner (reuses matchflow perfectRounds) ──────
  const vinfo=()=>page.evaluate(()=>window.__harness.victoryInfo());
  section("STEP 4 — FLAWLESS VICTORY (zero damage) in a Tower floor");
  await page.evaluate(()=>window.__harness.towerStart("tier1","gojo")); await wf(2);
  const wonClean=await winMatch();   // forceP1Win KOs P2 each round → P1 never takes damage
  check("tower floor won", wonClean, `gs=${await gs()}`);
  await wf(6);
  const vf=await vinfo();
  check("FLAWLESS flagged when P1 took ZERO damage", vf.flawless===true, `flawless=${vf.flawless} perfectP1=${vf.perfectP1} roundsWonP1=${vf.roundsWonP1}`);
  check("tower result shows the floor-cleared subtitle", /FLOOR 1 CLEARED/.test(vf.subtitle), `subtitle="${vf.subtitle}"`);
  check("primary button becomes NEXT FLOOR", vf.primaryLabel==="NEXT FLOOR", `label=${vf.primaryLabel}`);
  await wf(30);   // let the victory screen fully fade in for a crisp banner shot
  await page.screenshot({path:path.join(OUT,"TOWER_flawless.png")});
  await page.evaluate(()=>window.__harness.towerContinue()); await wf(2);

  section("STEP 4 — NOT flawless when damage IS taken");
  await page.evaluate(()=>window.__harness.towerStart("tier1","gojo")); await wf(2);
  // Round 1: chip P1 before KOing P2 (that round is not perfect); Round 2: clean win.
  let dmgApplied=false;
  for(let i=0;i<80;i++){ const g=await gs(); if(g==="victory")break;
    if(g==="intro"){await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}});await wf(2);continue;}
    if(g==="battle"){ if(!dmgApplied){await page.evaluate(()=>window.__harness.damageP1(150));dmgApplied=true;await wf(2);} await page.evaluate(()=>window.__harness.forceP1Win());await wf(6);continue; }
    await wf(4);
  }
  await wf(6);
  const vnf=await vinfo();
  check("P1 damage WAS applied in a round", dmgApplied, `applied=${dmgApplied}`);
  check("NOT flawless when a round was imperfect", vnf.flawless===false, `flawless=${vnf.flawless} perfectP1=${vnf.perfectP1} roundsWonP1=${vnf.roundsWonP1}`);
  await page.evaluate(()=>window.__harness.towerContinue()); await wf(2);

  section("STEP 4 — FLAWLESS also works in a NORMAL (non-tower) match");
  await page.evaluate(()=>window.__harness.bootVs());   // real vs-CPU match
  await wf(3);
  await page.evaluate(()=>window.__harness.forceP1Win());  // KO round 1 instantly
  for(let i=0;i<80;i++){ const g=await gs(); if(g==="victory")break;
    if(g==="intro"){await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}});await wf(2);continue;}
    if(g==="battle"){await page.evaluate(()=>window.__harness.forceP1Win());await wf(6);continue;}
    await wf(4);
  }
  await wf(6);
  const vn=await vinfo();
  check("normal-match flawless flagged (no tower subtitle)", vn.flawless===true && vn.subtitle==="", `flawless=${vn.flawless} subtitle="${vn.subtitle}"`);

  section("STEP 5 — MATCH MODIFIERS (Stage 24A) apply to the live fighters");
  await page.evaluate(()=>window.__harness.bootVs()); await wf(3);
  await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}}); await wf(2);
  const m0 = await page.evaluate(()=>window.__harness.modifiers());
  await page.evaluate(()=>window.__harness.setModifiers(["doubleHealth","speedUp","noBlock","lowGravity","meterDrain"]));
  const m1 = await page.evaluate(()=>window.__harness.modifiers());
  check("doubleHealth doubles maxHealth", m1.p1.maxHealth === m0.p1.maxHealth*2, `${m0.p1.maxHealth}→${m1.p1.maxHealth}`);
  check("speedUp raises speed", m1.p1.speed > m0.p1.speed, `${m0.p1.speed}→${m1.p1.speed}`);
  check("noBlock flag set on the fighter", m1.p1.noBlock === true);
  check("lowGravity lowers world gravity", m1.gravity < m0.gravity, `${m0.gravity}→${m1.gravity}`);
  check("meterDrain flag set", m1.p1.meterDrain === true);
  const mClear = await page.evaluate(()=>{ window.__harness.setModifiers([]); return window.__harness.modifiers(); });
  check("clearing modifiers restores baseline gravity", Math.abs(mClear.gravity - m0.gravity) < 1e-6, `grav=${mClear.gravity}`);
  await page.evaluate(()=>window.__harness.towerStart("tier4","gojo")); await wf(2);
  const tf = await page.evaluate(()=>window.__harness.modifiers());
  check("Tower tier 4 floor 1 has ≥1 modifier assigned", tf.active.length >= 1, `mods=${tf.active.join(",")}`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"TOWER_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
