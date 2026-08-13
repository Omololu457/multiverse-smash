// harness/clone_legacy_removed.mjs — proves the LEGACY per-character directional clone inputs no longer
// spawn/disperse a clone (Naruto/Minato D→F spawn & D→B dispel; Hashirama double-QCF spawn & double-QCB
// dispel), AND that the standardized "," create / "." disperse still work. Real live input, per character.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required","--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`); };
const st=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1());
const cc=()=>page.evaluate(()=>window.__harness.p1CloneCount());
async function wf(n){ const s=(await st()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16}); }
async function tap(key,h=2){ await page.keyboard.down(key); await wf(h); await page.keyboard.up(key); }
async function motion(seq){ const dirs=seq.slice(0,-1),last=seq[seq.length-1]; for(const k of dirs) await page.keyboard.press(k); await tap(last); }
async function commaSpawn(){ await page.keyboard.press(","); await page.waitForFunction(()=>window.__harness.p1CloneCount()>=1,null,{timeout:4000,polling:16}).catch(()=>{}); }
async function boot(who){
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(()=>window.__harness&&window.__harness.state,null,{timeout:15000,polling:16});
  await page.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
  await page.waitForFunction(()=>{const s=window.__harness.state();return s.gameState==="battle"||s.countdown<=0;},null,{timeout:8000,polling:16}).catch(()=>{});
  await wf(30);
}
async function prep(){
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&!p.attacking;},null,{timeout:6000,polling:16}).catch(()=>{});
  await page.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.clearProjectiles?.();window.__harness.fillEnergy?.();window.__harness.dispelP1Clones?.();});
  const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),a.x+340); await wf(2);
}

// legacy inputs per character: [spawnFn, dispelFn]
const LEGACY = {
  naruto:    { spawn: ()=>{ return (async()=>{ await tap("s",1); await tap("d",1); await tap("l"); })(); }, dispel: ()=>{ return (async()=>{ await tap("s",1); await tap("a",1); await tap("l"); })(); }, spawnDesc:"D→F+Special", dispelDesc:"D→B+Special" },
  minato:    { spawn: ()=>{ return (async()=>{ await tap("s",1); await tap("d",1); await tap("l"); })(); }, dispel: ()=>{ return (async()=>{ await tap("s",1); await tap("a",1); await tap("l"); })(); }, spawnDesc:"D→F+Special", dispelDesc:"D→B+Special" },
  hashirama: { spawn: ()=>motion(["s","d","s","d","l"]), dispel: ()=>motion(["s","a","s","a","l"]), spawnDesc:"double-QCF", dispelDesc:"double-QCB" },
};

for (const who of ["naruto","minato","hashirama"]) {
  console.log(`\n═══════════ ${who.toUpperCase()} ═══════════`);
  await boot(who);
  const L = LEGACY[who];

  // (A) LEGACY SPAWN INPUT no longer spawns a clone
  await prep();
  await L.spawn(); await wf(40);
  check(`${who}: legacy SPAWN input (${L.spawnDesc}) no longer creates a clone`, (await cc()) === 0, `count=${await cc()}`);

  // (B) LEGACY DISPEL INPUT no longer performs the safe-recall dispel. Use ONE clone: Naruto/Minato's
  // Rasengan Barrage (a KEPT combat move) only consumes clones at ≥2, so with 1 clone a special press
  // can't confound the result — if the old dispel were still wired, the lone clone would be recalled (→0).
  await prep();
  await page.evaluate(()=>window.__harness.spawnP1Clones(1)); await wf(6);
  const before = await cc();
  await L.dispel(); await wf(10);
  const after = await cc();
  check(`${who}: legacy DISPEL input (${L.dispelDesc}) no longer recalls the clone`, before === 1 && after === 1, `count ${before}→${after}`);
  // clean up with the STANDARD "."
  await page.keyboard.press("."); await wf(6);

  // (C) STANDARD "," still spawns, "." still disperses
  await prep();
  await commaSpawn();
  const commaCount = await cc();
  await page.keyboard.press("."); await wf(8);
  const periodCount = await cc();
  check(`${who}: "," still creates a clone`, commaCount >= 1, `count=${commaCount}`);
  check(`${who}: "." still disperses`, commaCount >= 1 && periodCount === 0, `count ${commaCount}→${periodCount}`);
}

check("no JS page errors", errs.length === 0, errs.slice(0,2).join(" | "));
console.log(`\n${FAIL===0?"✅":"❌"} legacy clone inputs removed + standard binding intact: ${PASS} passed, ${FAIL} failed`);
if (errs.length) console.log("PAGE ERRORS:\n"+errs.join("\n"));
await browser.close(); server.close();
process.exit(FAIL?1:0);
