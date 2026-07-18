// harness/ffa_ai.test.mjs — AI-FILL for local 3-4 player FFA / Team modes.
// Proves a session can run with fewer humans than slots: CPU-assigned slots each get their OWN
// controller, pick a target among MULTIPLE opponents every frame, fight autonomously, respect
// team friendly-fire (never target/hit a teammate), and re-target cleanly when a target is KO'd.
// Also confirms the single-p2AI 1v1 path is untouched.
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
const info=()=>page.evaluate(()=>window.__harness.ffaInfo());
const frame=()=>page.evaluate(()=>window.__harness.state().frame);
async function wf(n){const s=await frame();try{await page.waitForFunction(([a,x])=>window.__harness.state().frame>=a+x,[s,n],{timeout:12000,polling:8});}catch{}}
const H=(fi,i)=>fi.fighters[i].health;
async function start(count,keys,teams,ai){ await page.evaluate(([c,k,t,a])=>window.__harness.ffaStart(c,k,t,a),[count,keys,teams,ai]); await wf(2); }
async function healAll(){ const fi=await info(); for(let i=0;i<fi.fighters.length;i++) await page.evaluate(i=>window.__harness.ffaDamage(i,-99999),i); await wf(1); }
async function place(xs){ for(let i=0;i<xs.length;i++) await page.evaluate(([i,x])=>window.__harness.ffaSetX(i,x),[i,xs[i]]); await wf(1); }
async function elim(i){ await page.evaluate(i=>window.__harness.ffaDamage(i,99999),i); await wf(4); }

try{
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.waitForTimeout(120);

  // ── 1 HUMAN + 3 AI — pure FFA ──────────────────────────────────────────────
  section("1 HUMAN + 3 AI (FFA) — assignment + autonomous fighting");
  await start(4,["gojo","sukuna","naruto","toji"],[],[null,"impossible","impossible","impossible"]);
  let fi=await info();
  check("slot0 is HUMAN, slots1-3 are AI", fi.fighters[0].isAI===false && fi.fighters.slice(1).every(f=>f.isAI===true),
        `isAI=${fi.fighters.map(f=>f.isAI)}`);
  check("each AI slot carries its own difficulty", fi.fighters.slice(1).every(f=>f.aiDifficulty==="impossible"),
        `diffs=${fi.fighters.map(f=>f.aiDifficulty)}`);

  section("AI picks a valid target among MULTIPLE opponents (not self, not eliminated)");
  await wf(30); fi=await info();
  const targetsValid = fi.fighters.slice(1).every(f=>{
    const t=f.aiTarget; return t!=null && t!==f.slot && fi.fighters[t] && !fi.fighters[t].eliminated;
  });
  check("all 3 AI have a live, non-self target", targetsValid, `targets=${fi.fighters.map(f=>f.aiTarget)}`);

  section("AI fights AUTONOMOUSLY — deals damage with no human input");
  await healAll(); await place([2000,2180,2360,2540]);
  const before=await info();
  await wf(420);   // let the CPUs approach + brawl
  const after=await info();
  const dmg=after.fighters.map((f,i)=>Math.round(H(before,i)-H(after,i)));
  const totalDmg=dmg.reduce((a,x)=>a+Math.max(0,x),0);
  const hurtCount=dmg.filter(x=>x>1).length;
  check("AI dealt real damage on its own", totalDmg>0, `perFighterΔ=${JSON.stringify(dmg)}`);
  check("multiple fighters took damage (they fight each other + the human)", hurtCount>=2, `hurt=${hurtCount}`);
  await page.screenshot({path:path.join(OUT,"FFA_AI_brawl.png")});

  section("AI RE-TARGETS when its target is eliminated (no stuck dead target)");
  await healAll(); await wf(6); fi=await info();
  // Find an AI whose current target is another AI we can KO, then eliminate that target.
  const shooter=fi.fighters.slice(1).find(f=>f.aiTarget!=null);
  const oldTarget=shooter.aiTarget;
  await elim(oldTarget);
  await wf(20);   // give the AI a few decision cycles to re-pick
  fi=await info();
  const s2=fi.fighters[shooter.slot];
  check("KO'd target is eliminated", fi.fighters[oldTarget].eliminated===true);
  check("AI dropped the dead target and picked a LIVE one",
        s2.aiTarget!==oldTarget && s2.aiTarget!=null && !fi.fighters[s2.aiTarget].eliminated,
        `old=${oldTarget} new=${s2.aiTarget}`);

  section("FFA with AI resolves to a single winner");
  const liveNow=fi.fighters.filter(f=>!f.eliminated).map(f=>f.slot);
  for(const s of liveNow.slice(1)){ await elim(s); }   // force down to one survivor
  fi=await info();
  check("someone wins (last one standing)", fi.over===true && fi.alive===1, `over=${fi.over} alive=${fi.alive}`);

  // ── TEAM MODE with an AI teammate ──────────────────────────────────────────
  section("TEAM MODE — human + AI teammate vs human + AI (2v2)");
  // slot0 human A, slot1 AI A, slot2 human B, slot3 AI B.
  await start(4,["gojo","sukuna","naruto","toji"],["A","A","B","B"],[null,"impossible",null,"impossible"]);
  fi=await info();
  check("team mode on; AI teammate on A, AI on B",
        fi.teamMode===true && fi.fighters[1].isAI && fi.fighters[1].team==="A" && fi.fighters[3].isAI && fi.fighters[3].team==="B",
        `teams=${fi.fighters.map(f=>f.team)} ai=${fi.fighters.map(f=>f.isAI)}`);

  section("AI teammate NEVER targets its ally — only the opposing team");
  let badTargetA=false, badTargetB=false;
  for(let s=0;s<12;s++){
    await wf(18); const g=await info();
    const tA=g.fighters[1].aiTarget, tB=g.fighters[3].aiTarget;   // A-team AI must aim at B (2/3); B-team AI at A (0/1)
    if(tA!=null && !(tA===2||tA===3)) badTargetA=true;
    if(tB!=null && !(tB===0||tB===1)) badTargetB=true;
  }
  check("Team-A AI only ever targeted Team B (never its ally slot0)", badTargetA===false);
  check("Team-B AI only ever targeted Team A (never its ally slot2)", badTargetB===false);

  section("FRIENDLY FIRE — AI teammate hits the ENEMY, never its human partner");
  // Fresh match; KO the far enemy (slot3) so the ONLY attacker is AI slot1 — isolates the test
  // from a wandering enemy so any ally damage could only be friendly fire.
  await start(4,["gojo","sukuna","naruto","toji"],["A","A","B","B"],[null,"impossible",null,"impossible"]);
  await elim(3);
  await healAll();
  // enemy B (slot2) just left of AI slot1; ally A (slot0) just right — AI targets slot2 and swings.
  await place([2100, 2000, 1900, 3000]);
  const tb=await info();
  for(let t=0;t<10;t++){ await wf(12); }
  const ta=await info();
  const allyDelta=Math.round(H(tb,0)-H(ta,0));    // slot0 = AI's HUMAN teammate
  const enemyDelta=Math.round(H(tb,2)-H(ta,2));   // slot2 = the Team-B enemy it targets
  check("AI teammate did NOT damage its human partner (friendly fire off)", allyDelta===0, `allyΔ=${allyDelta}`);
  check("AI teammate DID damage the opposing-team enemy", enemyDelta>0, `enemyΔ=${enemyDelta}`);
  await page.screenshot({path:path.join(OUT,"FFA_AI_team.png")});

  section("Team-mode re-target stays on the OPPOSING team after a KO");
  // Fresh 2v2; KO one Team-B member → the A-team AI must retarget the OTHER B member (slot3), never an ally.
  await start(4,["gojo","sukuna","naruto","toji"],["A","A","B","B"],[null,"impossible",null,"impossible"]);
  await wf(6);
  await elim(2);
  await wf(24); const rt=await info();
  check("A-team AI retargets remaining enemy (slot3), never a teammate",
        rt.fighters[1].aiTarget===3, `target=${rt.fighters[1].aiTarget}`);

  // ── 1v1 REGRESSION — single p2AI path untouched ────────────────────────────
  section("1v1 REGRESSION — vs-CPU still runs on the single p2AI (FFA path inactive)");
  await page.evaluate(()=>window.__harness.bootVs());
  await wf(4);
  const st=await page.evaluate(()=>window.__harness.state());
  const ff=await info();
  check("vs match is BATTLE, FFA state inactive", st.gameState==="battle" && ff.active===false, `gs=${st.gameState} ffaActive=${ff.active}`);
  const p2a=await page.evaluate(()=>window.__harness.p2());
  await page.evaluate(()=>window.__harness.damageP2(300));   // provoke the CPU
  await wf(180);
  const p2b=await page.evaluate(()=>window.__harness.p2());
  check("p2 CPU is alive and driven (moved or acted)",
        Math.abs(p2b.x-p2a.x)>2 || p2b.attacking || (p2b.currentMove!=null), `Δx=${(p2b.x-p2a.x).toFixed(1)} atk=${p2b.attacking}`);

  // ── SLOT-ASSIGNMENT UI ─────────────────────────────────────────────────────
  section("SLOT-ASSIGNMENT UI — renders, defaults, and Human↔CPU cycling");
  await page.evaluate(()=>window.__harness.ffaSlotSelectPreview(4,["gojo","sukuna","megumi","toji"]));
  await wf(2);
  let si=await page.evaluate(()=>window.__harness.ffaSlotInfo());
  // Headless: 0 pads → device count 2 → slots 0/1 default HUMAN, slots 2/3 default CPU(easy).
  check("slot-select screen is showing", si.gameState==="ffaSlotSelect");
  check("slots without a device default to CPU, device slots default to Human",
        si.aiSlots[0]===null && si.aiSlots[1]===null && si.aiSlots[2]==="easy" && si.aiSlots[3]==="easy",
        `aiSlots=${JSON.stringify(si.aiSlots)} devices=${si.deviceCount}`);
  await page.screenshot({path:path.join(OUT,"FFA_AI_slotselect.png")});
  // Cycle a HUMAN device-slot: null → easy → adaptive → impossible → back to Human.
  const seq=[];
  for(let i=0;i<4;i++){ await page.evaluate(()=>window.__harness.ffaCycleSlot(0)); seq.push((await page.evaluate(()=>window.__harness.ffaSlotInfo())).aiSlots[0]); }
  check("device slot cycles Human→easy→adaptive→impossible→Human",
        JSON.stringify(seq)===JSON.stringify(["easy","adaptive","impossible",null]), `seq=${JSON.stringify(seq)}`);
  // A slot with NO device can never become Human — it wraps impossible→easy.
  const seq2=[];
  for(let i=0;i<3;i++){ await page.evaluate(()=>window.__harness.ffaCycleSlot(3)); seq2.push((await page.evaluate(()=>window.__harness.ffaSlotInfo())).aiSlots[3]); }
  check("device-less slot cycles CPU tiers only, never Human", seq2.every(v=>v!==null) && seq2[2]==="easy", `seq=${JSON.stringify(seq2)}`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"FFA_AI_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
