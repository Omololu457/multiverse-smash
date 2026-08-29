// harness/clone_functionality_audit.mjs — DEFINITIVE live diagnostic: are clones REAL hittable entities?
// For each clone char: (1) spawn, (2) does it MOVE independently, (3) IN-RANGE opponent attack → poof?,
// (4) OUT-OF-RANGE opponent attack → NO poof? (proves the poof is GEOMETRIC collision, not a blanket
// "any attack clears clones" shortcut). Reports the TRUE state per character. Screenshots the in-range hit.
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
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cc = () => page.evaluate(() => window.__harness.p1CloneCount());
const cloneXs = () => page.evaluate(() => window.__harness.summons().filter(s=>s.id==="shadowClone").map(s=>Math.round(s.x)));
async function wf(n){ const s=(await st()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16}); }

async function boot(who){
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await page.waitForFunction(() => { const s=window.__harness.state(); return s.gameState==="battle"||s.countdown<=0; }, null, {timeout:8000,polling:16}).catch(()=>{});
  await wf(30);
}
async function prep(gap){
  await page.waitForFunction(() => { const p=window.__harness.p1(); return p.grounded && !p.attacking; }, null, {timeout:6000,polling:16}).catch(()=>{});
  // aggro OFF: this audit verifies the clone is a real HITTABLE entity (spawn/move/hit-reveal) with the
  // clone holding still for deterministic overlap. Its ACTIVE lunge-strike behavior is tested by clone_active_clips.
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); window.__harness.setCloneAggro?.(false); });
  const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x), a.x+gap); await wf(2);
}

const results = {};
for (const who of ["naruto","minato","hashirama","tobirama"]) {
  console.log(`\n═══════════ ${who.toUpperCase()} ═══════════`);
  await boot(who);
  const R = results[who] = { spawns:false, static:false, inRangePoof:false, outRangePoof:null, note:"" };

  // (1) SPAWN
  await prep(360);
  const spawned = await page.evaluate(() => window.__harness.spawnP1Clones(1));
  R.spawns = spawned >= 1;
  console.log(`  1) spawn clone → count = ${await cc()}  ${R.spawns?"[SPAWNS]":"[NO CLONE MECHANIC]"}`);
  if (!R.spawns) { R.note = "no clone entity (spawnP1Clones returned 0)"; continue; }

  // (2) STATIC DECOY (default): a clone must HOLD its position — it must NOT advance or attack on its own
  //     (identity concealment; autonomous "active decoy" is the opt-in setCloneAggro mode, tested elsewhere).
  const x0 = (await cloneXs())[0];
  await wf(70);
  const x1 = (await cloneXs())[0];
  R.static = (x0!=null && x1!=null && Math.abs(x1-x0) <= 4);   // held its spawn position (no autonomous drift)
  console.log(`  2) static decoy (no autonomous movement): x ${x0} → ${x1}  (${Math.abs((x1??0)-(x0??0))}px)  ${R.static?"[STATIC ✓]":"[MOVED — should be static!]"}`);

  // (3) IN-RANGE HIT: DETERMINISTICALLY place p2 so its real attack hitbox overlaps the STATIC clone's hurtbox,
  //     then fire p2's REAL "light" move (rangeX 120). Clone must be past its spawn-poof (idle) first.
  await wf(30);   // clone finishes its spawn-poof → idle (hittable) state
  const cX = (await cloneXs())[0];
  // Static clones hold their spawn spot (behind p1). Move p1 to the FAR side of the clone so p2 — which faces
  // its opponent (p1) — faces THROUGH the clone; its attack then overlaps the clone. Fully deterministic.
  await page.evaluate(x => window.__harness.setP1X(x), cX - 160); await wf(2);
  await page.evaluate(x => window.__harness.setP2X(x), cX + 40);   // p2 just right of the clone, facing p1 (left) → hitbox overlaps the clone
  await wf(2);
  const before = await cc();
  const gap = Math.abs(cX - (await p2()).x);
  await page.screenshot({ path: path.join(OUT, `clone_audit_${who}_1_before.png`) });   // clone standing, opponent adjacent
  await page.evaluate(() => window.__harness.p2Attack?.());   // real "light" move (rangeX 120) on p2
  await wf(8);
  await page.screenshot({ path: path.join(OUT, `clone_audit_${who}_2_poof.png`) });      // the hit + poof smoke
  await wf(28);
  const after = await cc();
  await page.screenshot({ path: path.join(OUT, `clone_audit_${who}_3_after.png`) });     // clone gone
  R.inRangePoof = after < before;
  console.log(`  3) IN-RANGE opponent attack (clone↔p2 gap≈${gap}px, atk range 120): count ${before}→${after}  ${R.inRangePoof?"[POOFED = REAL HIT]":"[PASSED THROUGH = no interaction]"}`);

  // (4) OUT-OF-RANGE HIT: fresh clone, opponent FAR away, fire attack → expect NO poof (proves geometry)
  await prep(360);
  await page.evaluate(() => window.__harness.spawnP1Clones(1)); await wf(3);   // clone spawns near p1, p2 is 360px away
  await page.evaluate(x => window.__harness.setP2X(x), (await p1()).x + 700);  // shove p2 far so the clone is NOT in range
  await wf(2);
  const b2 = await cc();
  await page.evaluate(() => window.__harness.p2Attack?.());
  await wf(20);
  const a2 = await cc();
  R.outRangePoof = a2 < b2;
  console.log(`  4) OUT-OF-RANGE opponent attack: count ${b2}→${a2}  ${R.outRangePoof?"[POOFED ANYWAY = NOT geometric / shortcut!]":"[no poof = correct, hit is geometric]"}`);
}

console.log("\n\n════════════ SUMMARY (true state per character) ════════════");
for (const who of Object.keys(results)) {
  const R = results[who];
  const verdict = !R.spawns ? "NO CLONE MECHANIC" :
    (R.inRangePoof && R.outRangePoof === false && R.static) ? "FULLY FUNCTIONAL (static decoy + real geometric hit-reveal)" :
    (R.inRangePoof) ? "hittable but check static/geometry" : "NON-FUNCTIONAL (no hit interaction)";
  console.log(`  ${who.padEnd(10)} spawns=${R.spawns} static=${R.static} inRangePoof=${R.inRangePoof} outRangePoof=${R.outRangePoof}  → ${verdict}${R.note?" ("+R.note+")":""}`);
}
console.log("\npage errors:", errs.length ? errs.join(" | ") : "none");
await browser.close(); server.close();
