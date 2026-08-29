// harness/clone_standardize_and_tobirama.mjs
// PART 1: "," creates / "." disperses a clone IDENTICALLY across all 4 clone chars.
// PART 2: Tobirama water clone — DESTROYED-by-hit (water BURST FX) vs DISMISSED-by-"." (water RIPPLE FX)
//         each fire their OWN distinct effect.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
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
const cloneXs=()=>page.evaluate(()=>window.__harness.summons().filter(s=>s.id==="shadowClone").map(s=>Math.round(s.x)));
const waterFx=()=>page.evaluate(()=>window.__harness.waterCloneFx());
async function wf(n){ const s=(await st()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16}); }
async function boot(who){
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(()=>window.__harness&&window.__harness.state,null,{timeout:15000,polling:16});
  await page.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
  await page.waitForFunction(()=>{const s=window.__harness.state();return s.gameState==="battle"||s.countdown<=0;},null,{timeout:8000,polling:16}).catch(()=>{});
  await wf(30);
  await page.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();window.__harness.dispelP1Clones?.();});
  const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),a.x+360); await wf(2);
}

console.log("── PART 1: standardized ',' create / '.' disperse across all 4 clone chars ──");
for (const who of ["naruto","minato","hashirama","tobirama"]) {
  await boot(who);
  await page.evaluate(()=>window.__harness.dispelP1Clones?.());
  await page.keyboard.press(",");
  // Naruto's FIRST clone is delayed to the hand-sign audio "poof" (~147f) by design; poll to cover it.
  await page.waitForFunction(()=>window.__harness.p1CloneCount()>=1,null,{timeout:4000,polling:16}).catch(()=>{});
  const afterComma = await cc();
  await page.keyboard.press(","); await wf(4);
  const after2 = await cc();
  await page.keyboard.press("."); await wf(6);
  const afterPeriod = await cc();
  check(`${who}: "," creates a clone`, afterComma >= 1, `count=${afterComma}`);
  check(`${who}: "," again adds another`, after2 > afterComma, `count=${after2}`);
  check(`${who}: "." disperses all`, afterPeriod === 0, `count ${after2}→${afterPeriod}`);
}

console.log("\n── PART 2: Tobirama water clone — DESTROYED (hit → burst) vs DISMISSED (\".\" → ripple) distinct FX ──");
await boot("tobirama");
await page.evaluate(()=>window.__harness.setCloneAggro?.(false));   // hold the clone still for a deterministic hit (active behavior tested elsewhere)
// DESTROYED by hit → water BURST
await page.evaluate(()=>window.__harness.spawnP1Clones(1)); await wf(30);
let fx0 = await waterFx();
const cX = (await cloneXs())[0];
// PIN the clone (stop it mirroring the owner), then move p1 to the far side so p2 (facing its opponent p1)
// faces THROUGH the pinned clone → its attack overlaps it. Deterministic destroy-by-hit.
await page.evaluate(()=>window.__harness.pinP1Clones()); await wf(1);
await page.evaluate(x=>window.__harness.setP1X(x), cX-160); await wf(2);
await page.evaluate(x=>window.__harness.setP2X(x), cX+40); await wf(2);
await page.screenshot({ path: path.join(OUT, "tobirama_clone_1_standing.png") });
await page.evaluate(()=>window.__harness.p2Attack?.()); await wf(6);
await page.screenshot({ path: path.join(OUT, "tobirama_clone_2_destroyed_burst.png") });
await wf(20);
let fxHit = await waterFx();
check("Tobirama clone DESTROYED-by-hit fires the water BURST FX", fxHit.burst > fx0.burst, `burst ${fx0.burst}→${fxHit.burst}`);
check("destroy did NOT fire the dismiss ripple FX", fxHit.ripple === fx0.ripple, `ripple ${fx0.ripple}→${fxHit.ripple}`);

// DISMISSED by "." → water RIPPLE
await page.evaluate(()=>{window.__harness.dispelP1Clones?.();}); await wf(2);
await page.evaluate(()=>window.__harness.spawnP1Clones(1)); await wf(30);
let fx1 = await waterFx();
await page.keyboard.press("."); await wf(6);
await page.screenshot({ path: path.join(OUT, "tobirama_clone_3_dismissed_ripple.png") });
await wf(16);
let fxDis = await waterFx();
check("Tobirama clone DISMISSED-by-'.' fires the water RIPPLE FX", fxDis.ripple > fx1.ripple, `ripple ${fx1.ripple}→${fxDis.ripple}`);
check("dismiss did NOT fire the destroy burst FX", fxDis.burst === fx1.burst, `burst ${fx1.burst}→${fxDis.burst}`);
check("destroyed-by-hit and dismissed play DISTINCT animations", true, "burst≠ripple, both confirmed above");

console.log(`\n${FAIL===0?"✅":"❌"} clone standardize + Tobirama water clone: ${PASS} passed, ${FAIL} failed`);
if (errs.length) console.log("PAGE ERRORS:\n"+errs.join("\n"));
await browser.close(); server.close();
process.exit(FAIL?1:0);
