// harness/clone_active_clips.mjs — STEP 4 evidence: real CLIPS of a clone ACTIVELY attacking, per char.
// Records a video + a dense filmstrip capturing the advance → lunge-STRIKE → retreat cycle, and confirms
// the clone deals damage AND the hit-registration fix still works (opponent can still destroy the clone).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const VID = path.join(ROOT, "harness", "clips"); fs.mkdirSync(VID, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required","--disable-background-timer-throttling"] });
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`); };

async function run(who) {
  const context = await browser.newContext({ viewport: { width: 900, height: 520 }, recordVideo: { dir: VID, size: { width: 900, height: 520 } } });
  const page = await context.newPage();
  const st=()=>page.evaluate(()=>window.__harness.state());
  const p2=()=>page.evaluate(()=>window.__harness.p2());
  async function wf(n){ const s=(await st()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:30000,polling:16}); }
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(()=>window.__harness&&window.__harness.state,null,{timeout:15000,polling:16});
  await page.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
  await page.waitForFunction(()=>{const s=window.__harness.state();return s.gameState==="battle"||s.countdown<=0;},null,{timeout:8000,polling:16}).catch(()=>{});
  await wf(20);
  await page.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();window.__harness.healP2?.();window.__harness.dispelP1Clones?.();window.__harness.setP2Invuln?.(0);});
  const a=await page.evaluate(()=>window.__harness.p1()); await page.evaluate(x=>window.__harness.setP2X(x),a.x+150); await wf(2);   // opponent close enough to be struck
  const hp0=(await p2()).health; const strike0=await page.evaluate(()=>window.__harness.cloneStrikeFxCount());
  await page.keyboard.press(",");
  await page.waitForFunction(()=>window.__harness.p1CloneCount()>=1,null,{timeout:5000,polling:16}).catch(()=>{});

  // dense filmstrip over ~2.2s to catch the advance→strike→retreat cycle (p2 has full HP → won't die from
  // the modest chip, so NO healing that would mask the damage).
  let fi=0; const atk=new Set(); let treeSeen=false;
  for (let i=0;i<9;i++){
    const cs=await page.evaluate(()=>window.__harness.p1CloneStates()[0]||{}); if(cs.atk) atk.add(cs.atk);
    if (await page.evaluate(()=>window.__harness.projectiles().some(p=>/hashiCloneTree/.test(p.name||"")))) treeSeen=true;   // Hashirama's clone attack = plant a tree
    await page.screenshot({ path: path.join(OUT, `_af_${who}_${fi++}.png`) });
    await wf(15);
  }
  const hp1=(await p2()).health; const strike1=await page.evaluate(()=>window.__harness.cloneStrikeFxCount());
  // Hashirama's wood clone ATTACKS by planting a Mokuton tree at its position (not a lunge-punch); every
  // other char's clone lunge-strikes. Either is a genuine active attack.
  const active = who==="hashirama" ? treeSeen : ((strike1-strike0)>=1 && (hp0-hp1)>0);
  check(`${who}: clone ACTIVELY attacks (${who==="hashirama"?"plants a Mokuton tree at its position":"lunge-strike lands damage"})`, active, who==="hashirama"?`treePlanted=${treeSeen}`:`strikes=${strike1-strike0} dmg=−${(hp0-hp1).toFixed(0)}`);
  check(`${who}: clone cycles the attack states (windup/strike/recover), not static idle`, atk.size>=2, `states=${JSON.stringify([...atk])}`);

  // hit-registration fix STILL works alongside the new behavior. Aggro off so a FRESH clone holds still,
  // then the audit-proven deterministic overlap (p2 on the clone) + real attack.
  await page.evaluate(()=>{window.__harness.setCloneAggro?.(false);window.__harness.dispelP1Clones?.();window.__harness.healP2?.();window.__harness.setP2Invuln?.(0);});
  await wf(4);
  await page.evaluate(()=>window.__harness.spawnP1Clones(1)); await wf(30);   // spawn-poof → idle, settle at hold dist
  const cx = (await page.evaluate(()=>window.__harness.p1CloneStates()[0]||null))?.x;
  if (cx!=null) { await page.evaluate(x=>window.__harness.setP2X(x), cx+40); await wf(2); }
  const before=await page.evaluate(()=>window.__harness.p1CloneCount());
  await page.evaluate(()=>window.__harness.p2Attack?.()); await wf(36);
  const after=await page.evaluate(()=>window.__harness.p1CloneCount());
  check(`${who}: hit-registration still works (opponent destroys the clone)`, before>=1 && after<before, `count ${before}→${after}`);
  await page.evaluate(()=>window.__harness.setCloneAggro?.(true));

  await context.close();
  const vpath = await page.video().path().catch(()=>null);
  if (vpath) { try { fs.renameSync(vpath, path.join(VID, `clone_active_${who}.webm`)); } catch(_){} }
  return fi;
}

for (const who of ["naruto","minato","hashirama","tobirama"]) {
  console.log(`\n═══ ${who.toUpperCase()} — active behavior clip ═══`);
  const n = await run(who);
  // stitch filmstrip via the shell python step after; just report count
  console.log(`  frames captured: ${n} → filmstrip harness/shots/clone_active_${who}_filmstrip.png · clip harness/clips/clone_active_${who}.webm`);
}
console.log(`\n${FAIL===0?"✅":"❌"} clone ACTIVE behavior + hit-reg intact: ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close();
process.exit(FAIL?1:0);
