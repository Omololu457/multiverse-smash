// harness/clone_assist_verify.mjs — LIVE real-keyboard verification of the clone-assist redesign.
// Char via argv[2] (default naruto). Real keys only: "," spawns, movement drives direction, "h" = assist.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT,"harness","shots","assist_verify"); fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
let PASS=0,FAIL=0; const chk=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`);};
const CHAR=process.argv[2]||"naruto";
const p=await b.newPage({viewport:{width:1280,height:720}});
const errs=[]; p.on("pageerror",e=>errs.push(String(e.message)));
const st=()=>p.evaluate(()=>window.__harness.state());
const wf=async n=>{const s=(await st()).frame;await p.waitForFunction(([a,x])=>window.__harness.state().frame>=a+x,[s,n],{timeout:20000,polling:16});};
const cc=()=>p.evaluate(()=>window.__harness.p1CloneCount());
const cd=()=>p.evaluate(()=>window.__harness.cloneAssistCd());
const rush=()=>p.evaluate(()=>window.__harness.cloneRusherCount());
const pos=()=>p.evaluate(()=>window.__harness.p1Pos());
const cloneXs=()=>p.evaluate(()=>window.__harness.p1CloneStates().map(s=>s.x));
const p2hp=()=>p.evaluate(()=>window.__harness.p2().health);
await p.goto(`${base}/index.html?harness=1&p1=${CHAR}&p2=sasuke`,{waitUntil:"load"});
await p.waitForFunction(()=>window.__harness&&window.__harness.state,null,{timeout:15000,polling:16});
await p.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
await p.waitForFunction(()=>{const s=window.__harness.state();return s.gameState==="battle"||s.countdown<=0;},null,{timeout:8000,polling:16}).catch(()=>{});
await wf(30);
await p.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();window.__harness.healP2?.();window.__harness.dispelP1Clones?.();});
await wf(6);

console.log(`\n════════ ${CHAR.toUpperCase()} — clone-assist redesign (real keyboard) ════════`);

// 1. STAND-STILL: spawn 2 clones, move the player, confirm clones DON'T follow.
await p.keyboard.press(","); await wf(6); await p.keyboard.press(","); await wf(40);
const clonesA=await cloneXs(); const ownerA=(await pos()).x;
await p.keyboard.down("d"); await wf(40); await p.keyboard.up("d");   // walk the player right
const clonesB=await cloneXs(); const ownerB=(await pos()).x;
await p.screenshot({path:path.join(OUT,`${CHAR}_standstill.png`)});
const ownerMoved = ownerB > ownerA + 20;
const clonesHeld = clonesA.length>0 && clonesB.length===clonesA.length && clonesA.every((x,i)=>Math.abs(x-clonesB[i])<=3);
chk("player moved but clones STOOD STILL (no mirror-follow)", ownerMoved && clonesHeld, `owner ${ownerA}→${ownerB}; clones ${JSON.stringify(clonesA)}→${JSON.stringify(clonesB)}`);

// 2. SUMMON strike (h alone): consumes a clone, spawns a rusher, freezes player briefly, deals damage.
await p.evaluate(()=>window.__harness.setP2X?.((window.__harness.p1().x)+160));
const cBefore=await cc(); const hp0=await p2hp();
await p.keyboard.press("h"); await wf(4);
const cdAfter=await cd(); const rushAfter=await rush(); const frozen=(await pos()).hitstop;
await wf(30); const hp1=await p2hp(); const cAfterSummon=await cc();
await p.screenshot({path:path.join(OUT,`${CHAR}_summon.png`)});
chk("SUMMON (h): consumed a clone", cAfterSummon < cBefore, `clones ${cBefore}→${cAfterSummon}`);
chk("SUMMON (h): spawned a rusher + set its cooldown", rushAfter>=1 && cdAfter.summon>0, `rushers=${rushAfter} cd.summon=${cdAfter.summon}`);
chk("SUMMON (h): player briefly froze (hitstop)", frozen>0, `hitstop=${frozen}`);
chk("SUMMON (h): dealt damage to opponent", (hp0-hp1)>0, `−${(hp0-hp1).toFixed(0)}`);

// 3. cooldown gate: immediate 2nd summon should NOT fire (still on cd) — spawn a fresh clone first.
await p.keyboard.press(","); await wf(40);
const cPre=await cc(); await p.keyboard.press("h"); await wf(4); const cPost=await cc();
chk("SUMMON cooldown blocks an immediate repeat", cPost===cPre, `clones ${cPre}→${cPost} (cd.summon=${(await cd()).summon})`);

// 4. AMBUSH (forward+h): hold 'd', press h → rusher, no player freeze.
await p.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.dispelP1Clones?.();window.__harness.healP2?.();});
await wf(6); await p.keyboard.press(","); await wf(40);
const rBeforeAmb=await rush(); const cBeforeAmb=await cc();
await p.keyboard.down("d"); await wf(3); await p.keyboard.press("h"); await wf(4); const frozenAmb=(await pos()).hitstop; await p.keyboard.up("d");
await wf(20); const rAfterAmb=await rush(); const cAfterAmb=await cc();
await p.screenshot({path:path.join(OUT,`${CHAR}_ambush.png`)});
chk("AMBUSH (fwd+h): consumed a clone + spawned a rusher", cAfterAmb<cBeforeAmb && rAfterAmb>rBeforeAmb, `clones ${cBeforeAmb}→${cAfterAmb} rushers ${rBeforeAmb}→${rAfterAmb}`);
chk("AMBUSH (fwd+h): player NOT frozen (usable mid-combo)", frozenAmb===0, `hitstop=${frozenAmb}`);

// 5. SWAP (back+h): hold 'a', press h → player trades places with a clone.
await p.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.dispelP1Clones?.();});
await wf(6); await p.keyboard.press(","); await wf(6); await p.keyboard.press(","); await wf(50);
const ownerPre=(await pos()).x; const clonesPre=await cloneXs(); const cdPre=(await cd()).swap;
const cCntPre=await cc(); const projPre=await p.evaluate(()=>window.__harness.projectiles().length);
await p.keyboard.down("a"); await wf(3); await p.keyboard.down("h"); await wf(2); await p.keyboard.up("h"); await p.keyboard.up("a");
const ownerPost=(await pos()).x; const cdPost=(await cd()).swap;   // measured right after the press (minimal walk confound)
const cCntPost=await cc(); const projPost=await p.evaluate(()=>window.__harness.projectiles().length);
const armored=await p.evaluate(()=>window.__harness.p1CloneArmored());
await p.screenshot({path:path.join(OUT,`${CHAR}_back.png`)});
// back+h ARMED its cooldown AND did SOMETHING: relocated onto a former clone mark (swap/FTG) OR consumed a
// clone (FTG/cast) OR spawned a projectile (Tobirama wall) OR fortified a clone (Hashirama wall). Mode-agnostic.
const relocated = clonesPre.some(x=>Math.abs(x-ownerPost)<70) && Math.abs(ownerPost-ownerPre)>12;
const consumed  = cCntPost < cCntPre;
const cast      = projPost > projPre;
chk("BACK (back+h): fired an action (swap / FTG warp / mastery cast / wood wall)", cdPost>cdPre && (relocated||consumed||cast||armored),
    `owner ${ownerPre}→${ownerPost}; clones ${cCntPre}→${cCntPost}; proj ${projPre}→${projPost}; armored=${armored}; cd.swap ${cdPre}→${cdPost}`);

// ITACHI-specific: dispersing a Crow Clone must BLIND the opponent (obscured debuff).
if (CHAR==="itachi") {
  await p.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.dispelP1Clones?.();window.__harness.healP2?.();});
  await p.waitForFunction(()=>!window.__harness.p2Obscured().obscured,null,{timeout:5000,polling:16}).catch(()=>{});   // let any prior crow-blind expire first
  await wf(6); await p.keyboard.press(","); await wf(40);
  const obsPre=await p.evaluate(()=>window.__harness.p2Obscured());
  await p.keyboard.press("h"); await wf(6);   // SUMMON consumes a crow clone → it disperses → blind
  const obsPost=await p.evaluate(()=>window.__harness.p2Obscured());
  chk("CROW: dispersing a crow clone BLINDED the opponent (obscured debuff)", !obsPre.obscured && obsPost.obscured, `obscured ${obsPre.obscured}→${obsPost.obscured} (timer=${obsPost.timer})`);
}

// HASHIRAMA-specific: the fortified wood clone must TANK a hit and STAY UP (canon — doesn't dispel on damage).
if (CHAR==="hashirama") {
  const csPre=await p.evaluate(()=>window.__harness.p1CloneStates().map(s=>s.x));
  const target=csPre[0];
  if (target!=null){ await p.evaluate(x=>window.__harness.setP2X(x+30), target); await wf(2); }
  const nPre=await cc();
  await p.evaluate(()=>window.__harness.p2Attack?.()); await wf(30);
  const nPost=await cc();
  chk("WALL: fortified wood clone TANKED the hit and stayed up (didn't poof)", nPost>=nPre && nPre>0, `clones ${nPre}→${nPost}`);
}

chk("no JS page errors", errs.length===0, errs.join(" | "));
console.log(`\n${FAIL===0?"✅":"❌"} ${CHAR} clone-assist: ${PASS} passed, ${FAIL} failed`);
await p.close();await b.close();server.close();
process.exit(FAIL?1:0);
