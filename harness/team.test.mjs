// harness/team.test.mjs — TEAM MODE on the local FFA foundation.
// Proves: uneven teams (1v2, 2v2), FRIENDLY FIRE OFF (teammates take no damage, attacks
// still hit enemies), TEAM win condition (ends only when a whole team is wiped, not on the
// first KO), visual team data, AND that pure FFA (no teams) is unaffected.
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
async function wf(n){const s=await frame();try{await page.waitForFunction(([a,x])=>window.__harness.state().frame>=a+x,[s,n],{timeout:8000,polling:8});}catch{}}
const H=(fi,i)=>fi.fighters[i].health;
async function start(count,keys,teams){ await page.evaluate(([c,k,t])=>window.__harness.ffaStart(c,k,t),[count,keys,teams]); await wf(2); }
async function healAll(){ const fi=await info(); for(let i=0;i<fi.fighters.length;i++) await page.evaluate(i=>window.__harness.ffaDamage(i,-99999),i); await wf(1); }
async function place(xs){ for(let i=0;i<xs.length;i++) await page.evaluate(([i,x])=>window.__harness.ffaSetX(i,x),[i,xs[i]]); await wf(1); }
async function elim(i){ await page.evaluate(i=>window.__harness.ffaDamage(i,99999),i); await wf(3); }
// attacker swings a few times; return per-fighter health delta (before-after).
async function swing(attacker, xs){
  await healAll(); await place(xs); await wf(1);
  const before=await info();
  for(let t=0;t<3;t++){ await page.evaluate(i=>window.__harness.ffaAttack(i,"heavy"),attacker); await wf(10); }
  const after=await info();
  return after.fighters.map((f,i)=>Math.round(H(before,i)-H(after,i)));
}

try{
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness);await page.waitForTimeout(120);

  // ── 1v2 — uneven teams + friendly fire off ────────────────────────────────
  section("1v2 — uneven split (A={0} vs B={1,2})");
  await start(3,["gojo","sukuna","megumi"],["A","B","B"]);
  let fi=await info();
  check("team mode on, teams A/B assigned", fi.teamMode===true && fi.fighters.map(f=>f.team).join("")==="ABB", `teams=${fi.fighters.map(f=>f.team)}`);
  check("both teams have living members at start", JSON.stringify(fi.aliveTeams.sort())==='["A","B"]');

  section("1v2 — FRIENDLY FIRE OFF (B attacks with a B teammate adjacent)");
  // Attacker slot1(B) faces its far enemy (slot0 A on the right); teammate slot2(B) sits
  // right next to it on the swing side. Friendly fire off → teammate takes ZERO damage.
  let dmg=await swing(1,[3000, 1200, 1258]);   // xs by slot: enemy far right, attacker, teammate adjacent
  check("teammate (same team) takes NO damage from an ally's swing", dmg[2]===0, `teammate Δ=${dmg[2]}`);
  // And a B fighter CAN damage the A enemy (place them adjacent).
  dmg=await swing(1,[1262, 1200, 3000]);       // enemy slot0 adjacent to attacker slot1
  check("attack still damages an ENEMY (cross-team hit works)", dmg[0]>0, `enemy Δ=${dmg[0]}`);
  await page.screenshot({path:path.join(OUT,"TEAM_1v2.png")});

  section("1v2 — TEAM win condition (ends on team wipe, NOT first KO)");
  await healAll();
  await elim(2);   // KO one B member (slot2)
  fi=await info();
  check("first KO does NOT end the match (both teams still alive)", fi.over===false && JSON.stringify(fi.aliveTeams.sort())==='["A","B"]', `over=${fi.over} teams=${fi.aliveTeams}`);
  await elim(0);   // KO team A entirely (its only member)
  fi=await info();
  check("match ends when a whole team is eliminated", fi.over===true, `over=${fi.over}`);
  check("winner is Team B (still had a survivor)", fi.winnerTeam==="B" && fi.aliveTeams.join("")==="B", `winnerTeam=${fi.winnerTeam} alive=${fi.aliveTeams}`);
  await page.screenshot({path:path.join(OUT,"TEAM_winner.png")});

  // ── 2v2 — symmetric ───────────────────────────────────────────────────────
  section("2v2 — friendly fire off within a team + team win");
  await start(4,["gojo","sukuna","megumi","naruto"],["A","A","B","B"]);
  fi=await info();
  check("2v2 teams assigned (A={0,1} B={2,3})", fi.teamMode===true && fi.fighters.map(f=>f.team).join("")==="AABB");
  // slot0(A) attacks with teammate slot1(A) adjacent, enemies far.
  dmg=await swing(0,[1200, 1258, 3200, 3400]);
  check("2v2: A-teammate takes no friendly-fire damage", dmg[1]===0, `teammate Δ=${dmg[1]}`);
  // slot0(A) can hit an enemy (slot2 B) placed adjacent.
  dmg=await swing(0,[1200, 3400, 1262, 3600]);
  check("2v2: attack damages the opposing team", dmg[2]>0, `enemy Δ=${dmg[2]}`);
  await healAll();
  await elim(2);   // one B down
  fi=await info();
  check("2v2: one enemy KO ≠ win (team B still alive)", fi.over===false && fi.aliveTeams.includes("B"));
  await elim(3);   // whole B team down
  fi=await info();
  check("2v2: wiping the opposing team wins", fi.over===true && fi.winnerTeam==="A", `over=${fi.over} winner=${fi.winnerTeam}`);
  await page.screenshot({path:path.join(OUT,"TEAM_2v2.png")});

  // ── pure FFA unaffected ───────────────────────────────────────────────────
  section("PURE FFA (no teams) — unchanged last-standing behaviour");
  await start(3,["gojo","sukuna","megumi"],[]);   // empty teams → FFA
  fi=await info();
  check("no teams → teamMode off, fighters carry no team", fi.teamMode===false && fi.fighters.every(f=>f.team===null));
  // friendly fire N/A: everyone can damage everyone (proven in ffa.test); here confirm
  // last-INDIVIDUAL-standing win, not team win.
  await healAll(); await elim(1); fi=await info();
  check("FFA: a single KO leaves 2 alive, not over", fi.over===false && fi.alive===2);
  await elim(2); fi=await info();
  check("FFA: last individual standing wins (winnerTeam null)", fi.over===true && fi.alive===1 && fi.winnerTeam===null && fi.winnerSlot===0, `over=${fi.over} winnerSlot=${fi.winnerSlot} team=${fi.winnerTeam}`);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"TEAM_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
