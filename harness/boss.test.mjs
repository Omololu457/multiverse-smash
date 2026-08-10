// harness/boss.test.mjs — STAGE 20 boss fights.
// Reaches the arcade final-boss fight and asserts the data-driven bossProfile is live: ~2× health,
// visibly larger, meter-free, and a super-armor threshold (light hits don't stagger/interrupt the
// boss — driven through the REAL combat.js resolveAttackHit — while heavy hits do). Also confirms
// the profile is STRIPPED in normal play and the boss chars are playable (post-clear unlock is
// trivially satisfied — Obito/Gojo are regular roster characters).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);

const server=await srv(); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true, args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const wf=(n=1)=>page.waitForTimeout(n*16);
const gs=()=>page.evaluate(()=>window.__harness.state().gameState);
const H=(fn,...a)=>page.evaluate(([f,args])=>window.__harness[f](...args),[fn,a]);

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
async function reachBattle(){
  for(let i=0;i<60;i++){
    const g=await gs();
    if(g==="battle") return true;
    if(g==="arcadeRivalIntro"){ await H("arcadeAdvance"); await wf(2); continue; }
    if(g==="intro"){ await page.evaluate(()=>{try{window.__harness.skipToBattle();}catch(e){}}); await wf(2); continue; }
    await wf(3);
  }
  return (await gs())==="battle";
}

try {
  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(120);
  await page.evaluate(()=>window.__harness.saveLoad.ensureAccount("BossTester"));

  // ══ Reach the boss fight (play Naruto → boss is Obito) ══
  section("Reach the arcade boss fight (Naruto's boss = Obito)");
  await H("arcadeStart","naruto","easy"); await wf(3);
  for(let n=1;n<=6;n++){ const w=await playFight(); if(!w){ check(`won setup fight ${n}`, false); } await H("arcadeContinue"); await wf(3); }
  const inBattle=await reachBattle();
  const inf=await H("arcadeInfo");
  check("fight 7 is the boss fight, in battle", inBattle && inf.fightNum===7 && inf.role==="boss" && inf.p2==="obito", `state=${await gs()} f=${inf.fightNum} p2=${inf.p2}`);

  // ══ bossProfile is live ══
  section("bossProfile — 2× health, visibly larger, meter-free, super-armor flagged");
  const bs=await H("bossState");
  check("a boss is present and is Obito", bs.present===true && bs.rosterKey==="obito", `bs=${JSON.stringify(bs).slice(0,90)}`);
  check("boss health is ~2× the normal max (healthMult 2.0)", bs.maxHealth===bs.normalMaxHealth*2, `boss=${bs.maxHealth} normal=${bs.normalMaxHealth}`);
  check("boss is visibly larger (spriteScale = normal × 1.4)", Math.abs(bs.spriteScale-(bs.normalScale*1.4))<1e-6, `scale=${bs.spriteScale} normal=${bs.normalScale}`);
  check("boss has meter-free specials (infiniteEnergy)", bs.infiniteEnergy===true);
  check("boss carries the super-armor flag + threshold", bs.bossArmor===true && bs.bossArmorThreshold===55, `armor=${bs.bossArmor} thr=${bs.bossArmorThreshold}`);

  await page.screenshot({ path: path.join(OUT, "boss_hud.png") });   // wide boss health bar

  // ══ Super-armor — real hits through resolveAttackHit ══
  section("Super-armor — light hits shrug off, heavy hits stagger (real combat path)");
  const light=await H("probeBossHit",20,"light");
  check("LIGHT hit does NOT stagger the boss (hitstun 0, still attacking)", light.armored===true && light.hitstun===0 && light.attacking===true, JSON.stringify(light));
  check("…but the boss STILL takes the light hit's damage", light.tookDamage===true && light.hpLost>0, `hpLost=${light.hpLost}`);
  const heavy=await H("probeBossHit",90,"heavy");
  check("HEAVY hit (≥ threshold) DOES stagger the boss (hitstun>0, interrupted)", heavy.armored===false && heavy.hitstun>0 && heavy.attacking===false, JSON.stringify(heavy));
  const justBelow=await H("probeBossHit",54,"light");
  const justAbove=await H("probeBossHit",56,"light");
  check("threshold boundary: 54<55 shrugged, 56≥55 staggers", justBelow.armored===true && justAbove.armored===false, `below=${justBelow.armored} above=${justAbove.armored}`);
  const special=await H("probeBossHit",30,"special");
  check("a SPECIAL always pierces armor even if low-damage", special.armored===false, JSON.stringify(special));

  // ══ Profile is STRIPPED in normal play ══
  section("Normal play — the boss profile is NOT applied outside the arcade boss fight");
  await H("bootVs"); await wf(4);
  const normal=await H("bossState");
  check("a plain vs match has NO boss (profile is context-gated)", normal.present===false, JSON.stringify(normal));

  // ══ Post-clear unlock — boss chars are playable ══
  section("Unlock — the boss characters are selectable in normal play");
  const sets=await page.evaluate(()=>window.__harness.rosterSets());
  check("Obito and Gojo are in the playable roster (boss is playable, profile stripped)", sets.playable.includes("obito") && sets.playable.includes("gojo"));

  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
