// harness/bracket.test.mjs — STAGE 24B local tournament bracket, end-to-end with a mid-run reload.
// Drives a 4-fighter single-elim bracket: the human (Gojo) plays their path, the other match auto-
// resolves, and a page RELOAD mid-tournament resumes the exact bracket from the Stage-17 save.
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
const H=(fn,...a)=>page.evaluate(([f,args])=>window.__harness[f](...args),[fn,a]);

async function playAndWin(){   // play the pending human match to a win
  await H("bracketPlay"); await wf(3);
  for(let i=0;i<120;i++){
    const g=await gs();
    if(g==="victory") return true;
    if(g==="intro"){ await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}}); await wf(2); continue; }
    if(g==="battle"){ await page.evaluate(()=>window.__harness.forceP1Win()); await wf(6); continue; }
    await wf(4);
  }
  return (await gs())==="victory";
}

try {
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(120);
  await page.evaluate(()=>window.__harness.saveLoad.ensureAccount("Bracketeer"));

  // ══ Start a 4-fighter bracket as Gojo ══
  section("4-fighter bracket — setup + seeding");
  let inf = await H("bracketStart", 4, "gojo"); await wf(2);
  check("bracket active, size 4, 1 round built so far", inf.active && inf.size===4 && inf.totalRounds===1, `size=${inf.size} rounds=${inf.totalRounds}`);
  check("Gojo is entrant 0 and human (ai=false)", inf.entrants[0].key==="gojo" && inf.entrants[0].ai===false && inf.entrants.length===4);
  check("3 CPU entrants fill the rest", inf.entrants.slice(1).every(e=>e.ai===true));
  check("opens on the bracket view, human's first match pending", (await gs())==="bracketView" && inf.current && (inf.current.a==="gojo"||inf.current.b==="gojo") && (inf.current.aAI===false||inf.current.bAI===false), `state=${await gs()} cur=${JSON.stringify(inf.current)}`);

  // ══ Win round 1 → the other (CPU) match auto-resolves → final is built ══
  section("Round 1 — win your match; the CPU match auto-resolves; final is seeded");
  check("your round-1 match plays to a win", await playAndWin(), `state=${await gs()}`);
  inf = await H("bracketAdvance"); await wf(2);   // victory → advance the bracket
  check("round 1 fully decided (both matches have winners)", inf.rounds[0].every(m=>!!m.winner), JSON.stringify(inf.rounds[0]));
  check("Gojo won round 1", inf.rounds[0].some(m=>m.winner==="gojo"));
  check("a FINAL round was built (now round index 1)", inf.totalRounds===2 && inf.round===1, `rounds=${inf.totalRounds} round=${inf.round}`);
  check("the final pairs Gojo vs the CPU-match winner", inf.current && (inf.current.a==="gojo"||inf.current.b==="gojo"), JSON.stringify(inf.current));
  check("back on the bracket view for the final", (await gs())==="bracketView", `state=${await gs()}`);

  // ══ PERSISTENCE — reload mid-tournament, bracket resumes from the save ══
  section("Mid-tournament reload — the bracket survives (Stage 17 save)");
  const beforeRounds = JSON.stringify(inf.rounds);
  await page.reload({waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(150);
  check("after reload, boot AUTO-resumed onto the bracket view", (await gs())==="bracketView", `state=${await gs()}`);
  const resumed = await H("bracketInfo");
  check("resumed bracket is active with BOTH rounds intact", resumed.active && resumed.totalRounds===2 && resumed.round===1, `rounds=${resumed.totalRounds} round=${resumed.round}`);
  check("resumed bracket preserved round-1 results exactly", JSON.stringify(resumed.rounds)===beforeRounds, `now=${JSON.stringify(resumed.rounds)}`);
  check("the final is still Gojo vs the CPU winner", resumed.current && (resumed.current.a==="gojo"||resumed.current.b==="gojo"));

  // ══ Win the final → champion, tournament complete ══
  section("The final — win it → champion crowned, run completes");
  check("the FINAL plays to a win", await playAndWin(), `state=${await gs()}`);
  inf = await H("bracketAdvance"); await wf(2);
  check("Gojo is the tournament CHAMPION", inf.champion==="gojo", `champion=${inf.champion}`);
  check("champion view is shown", (await gs())==="bracketView");

  // ══ Change-Character rematch (Stage 24C) ══
  section("Change Character — victory-screen button returns to select, keeping the mode");
  const hit = await page.evaluate(()=>window.__harness.replay.victoryChangeCharHitTest());
  check("victory CHANGE CHARACTER button is wired (returns 'changeChar')", hit === "changeChar", `got=${hit}`);
  // Real flow: win a plain vs match, then click the change-character button.
  await page.evaluate(()=>window.__harness.bootVs()); await wf(3);
  for(let i=0;i<80;i++){ const g=await gs(); if(g==="victory")break; if(g==="intro"){await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}});await wf(2);continue;} if(g==="battle"){await page.evaluate(()=>window.__harness.forceP1Win());await wf(6);continue;} await wf(4); }
  await wf(24);   // let the victory screen fade in (handleVictoryClick ignores clicks while fadeAlpha < 0.5)
  await page.mouse.click(640 + 110, 720*0.82 + 66 + 20);   // change-char button (right slot)
  await wf(4);
  check("clicking CHANGE CHARACTER returns to fighter select", ["selectUniverse","selectCharacter"].includes(await gs()), `state=${await gs()}`);

  check("no uncaught JS exceptions across the whole run", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
