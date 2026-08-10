// harness/arcade.test.mjs — STAGE 19 arcade mode, end-to-end on the REAL state machine.
// Force-wins a full 7-fight run and asserts: the scripted RIVAL appears at fight 5 (with its
// pre-fight intro), the BOSS at fight 7, the per-character ENDING plays on clear, and the
// arcadeCleared flag PERSISTS across a page reload. Also spot-checks the loss→CONTINUE path.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);

const server=await srv(); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true, args:["--autoplay-policy=no-user-gesture-required"]});
const ctx=await browser.newContext({viewport:{width:1280,height:720}});
const page=await ctx.newPage();
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const wf=(n=1)=>page.waitForTimeout(n*16);
const gs=()=>page.evaluate(()=>window.__harness.state().gameState);
const info=()=>page.evaluate(()=>window.__harness.arcadeInfo());
const H=(fn,...a)=>page.evaluate(([f,args])=>window.__harness[f](...args),[fn,a]);
const SL=(fn,...a)=>page.evaluate(([f,args])=>window.__harness.saveLoad[f](...args),[fn,a]);

// Win the CURRENT fight — handles the match intro AND the rival-intro interstitial.
async function playFight(){
  for(let i=0;i<120;i++){
    const g=await gs();
    if(g==="victory") return true;
    if(g==="arcadeRivalIntro"){ await H("arcadeAdvance"); await wf(2); continue; }
    if(g==="intro"){ await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}}); await wf(2); continue; }
    if(g==="battle"){ await page.evaluate(()=>window.__harness.forceP1Win()); await wf(6); continue; }
    await wf(4);
  }
  return (await gs())==="victory";
}
async function loseFight(){
  for(let i=0;i<120;i++){
    const g=await gs();
    if(g==="victory") return true;
    if(g==="arcadeRivalIntro"){ await H("arcadeAdvance"); await wf(2); continue; }
    if(g==="intro"){ await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}}); await wf(2); continue; }
    if(g==="battle"){ await page.evaluate(()=>window.__harness.forceP1Lose()); await wf(6); continue; }
    await wf(4);
  }
  return (await gs())==="victory";
}

try {
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(120);
  await SL("ensureAccount","ArcadeRunner");   // real account → arcadeCleared can persist

  // ══ Full clear run as Naruto (rival=Sasuke via characters.js override, boss=Obito) ══
  section("Naruto arcade run — rival at fight 5, boss at fight 7, ending on clear");
  await H("arcadeStart","naruto","adaptive"); await wf(3);
  let inf=await info();
  check("arcade active, mode=arcade, fight 1/7", inf.active && inf.mode==="arcade" && inf.fightNum===1 && inf.totalFights===7, `f=${inf.fightNum} mode=${inf.mode}`);
  check("player locked to naruto", inf.p1==="naruto", `p1=${inf.p1}`);

  const rolesSeen=[]; const rivalOppSeen=[]; const bossOppSeen=[];
  for(let n=1;n<=7;n++){
    // Entering fight 5 must route through the rival-intro screen first.
    if(n===5) check("fight 5 opens the RIVAL INTRO screen", (await gs())==="arcadeRivalIntro", `state=${await gs()}`);
    const won=await playFight();
    check(`won fight ${n}`, won, `state=${await gs()}`);
    inf=await info();
    rolesSeen.push([inf.fightNum, inf.role, inf.p2]);
    if(inf.fightNum===5){ check("fight 5 is the RIVAL and opponent is Sasuke (naruto's arcadeRival)", inf.role==="rival" && inf.p2==="sasuke", `role=${inf.role} p2=${inf.p2}`); rivalOppSeen.push(inf.p2); }
    if(inf.fightNum===7){ check("fight 7 is the BOSS and opponent is Obito (arcade boss)", inf.role==="boss" && inf.p2==="obito", `role=${inf.role} p2=${inf.p2}`); bossOppSeen.push(inf.p2); }
    await H("arcadeContinue"); await wf(3);
  }
  console.log("     roles:", JSON.stringify(rolesSeen));

  // After the boss win + continue, the ENDING should be playing.
  check("boss clear → ENDING screen is showing", (await gs())==="arcadeEnding", `state=${await gs()}`);
  inf=await info();
  check("ending has slides (naruto has a hand-written ending)", inf.endingSlides>=3, `slides=${inf.endingSlides}`);
  check("run marked cleared, no continues used", inf.cleared===true && inf.continuesUsed===0, `cleared=${inf.cleared} cont=${inf.continuesUsed}`);

  // Advance through every ending slide → back to the title.
  let guard=0, adv;
  do { adv=await H("arcadeAdvance"); await wf(2); } while(adv!=="done" && ++guard<10);
  check("ending advances through all slides then finishes", adv==="done", `adv=${adv}`);
  check("returns to a menu state after the ending", ["start","mainMenu"].includes(await gs()), `state=${await gs()}`);

  // arcadeCleared recorded for naruto.
  let cl=await H("arcadeCleared");
  check("arcadeCleared[naruto] = true after the clear", cl.map.naruto===true, `map=${JSON.stringify(cl.map)}`);

  // ══ PERSISTENCE — the clear survives a reload (no re-run) ══
  section("Persistence — arcadeCleared survives a page reload");
  await page.reload({waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(120);
  cl=await H("arcadeCleared");
  check("after reload, arcadeCleared[naruto] STILL true (persisted via account save)", cl.map.naruto===true, `map=${JSON.stringify(cl.map)}`);

  // ══ Boss self-mirror avoidance — Obito's boss is the alt (Gojo), not himself ══
  section("Boss designation — the boss char doesn't fight a mirror of itself");
  await H("arcadeStart","obito","easy"); await wf(3);
  // Jump straight to the boss fight by continuing 6 times (win each).
  for(let n=1;n<=6;n++){ await playFight(); await H("arcadeContinue"); await wf(3); }
  inf=await info();
  check("Obito's boss fight opponent is the ALT boss (gojo), not obito", inf.role==="boss" && inf.p2==="gojo", `role=${inf.role} p2=${inf.p2}`);

  // ══ Loss → CONTINUE keeps you on the SAME fight and counts the continue ══
  section("Continue — losing offers a continue that refights the same fight");
  await H("arcadeStart","gojo","easy"); await wf(3);
  await playFight(); await H("arcadeContinue"); await wf(3);   // now on fight 2
  let before=await info();
  check("on fight 2 before the loss", before.fightNum===2, `f=${before.fightNum}`);
  await loseFight();
  before=await info();
  check("victory screen shows after a loss (continue offered)", (await gs())==="victory" && before.lastWon===false, `state=${await gs()} lastWon=${before.lastWon}`);
  await H("arcadeContinue"); await wf(3);   // spend a continue
  const after=await info();
  check("continue refights the SAME fight number (2)", after.fightNum===2, `f=${after.fightNum}`);
  check("continuesUsed incremented to 1", after.continuesUsed===1, `cont=${after.continuesUsed}`);

  check("no uncaught JS exceptions across the whole run", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
