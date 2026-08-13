// harness/wood_platform_live.mjs — WOOD RELEASE climbable terrain, LIVE end-to-end proof (Playwright).
// Stage 1: the platform PRIMITIVE in isolation (NOT wired to Hashirama). Boots a real training match,
// drives the real game loop, and proves the four things the design must establish before any character
// consumes it:
//   1. STANDABLE SURFACE — a fighter JUMPS onto a platform and rests at platform height, NOT the ground
//      (and passes UP through it from below → one-way).
//   2. FULL-LIFECYCLE SYNC — while a fighter is on the platform its feet track the standable top-Y EXACTLY
//      through grow→hold→recede (no premature-solid float, no hollow clip): max |feet − topY| stays within
//      tolerance, and the fighter visibly RIDES the growth up and the recede down.
//   3. NO GHOST — once the platform despawns the fighter is on the GROUND, and a fresh drop through the old
//      footprint falls clean to the floor (no invisible-but-solid ghost / visible-but-hollow phantom).
//   4. WALK-OFF + DEFAULT-SAFE — stepping off the edge FALLS (doesn't teleport to ground); with no
//      platforms, ground physics is byte-for-byte normal.
// Captures grow / stand-at-full / recede screenshots as the visual clip.
//
// NOTE ON TIMING: headless drives the real rAF loop at ~28fps and the roster's jumps are large, so this
// uses STATE POLLING (waitFor) with generous timeouts + end-state assertions rather than fixed sleeps.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e,d) => { if (e){res.writeHead(404).end();return;} res.writeHead(200,{ "content-type":MIME[path.extname(f)]||"application/octet-stream" }); res.end(d); });
}); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1920, height:1080 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
const shotDir = path.join(HERE, "wood_platform_out"); fs.mkdirSync(shotDir, { recursive:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"}  ${n}${d ? `  — ${d}` : ""}`); };

// One combined world snapshot (P1 grounding + the single test platform), read each poll tick.
const snap = () => page.evaluate(() => ({ f: window.__harness.fighterFloor("p1"), ps: window.__harness.platforms() }));
const clearP = () => page.evaluate(() => window.__harness.clearPlatforms());
const spawnP = (opts) => page.evaluate(o => window.__harness.spawnPlatform(o), opts);
const setP1X = (x) => page.evaluate(v => window.__harness.setP1X(v), x);
const jumpP1 = (vx=0) => page.evaluate(v => window.__harness.jumpP1(v), vx);
const liftP1 = (dy) => page.evaluate(v => window.__harness.liftP1(v), dy);
const shot = (name) => page.screenshot({ path: path.join(shotDir, name) });

// Poll `snap()` up to timeout; call onTick(state) each tick; resolve the first state where cond(state) is
// true (or the last state at timeout, with .timedout=true).
async function waitFor(cond, timeout, onTick) {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < timeout) {
    last = await snap(); if (onTick) onTick(last);
    if (cond(last)) return last;
    await sleep(16);
  }
  return { ...last, timedout: true };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.evaluate(() => window.__harness.start());        // training vs a standing dummy → isolated
  await page.evaluate(() => window.__harness.skipToBattle());
  await sleep(400);
  await clearP();
  await setP1X(1400);
  await sleep(300);

  const g0 = await snap();
  const GY = g0.f.feet;                                       // P1's real standing feet-Y (its groundY)
  check("baseline: P1 rests on the ground", g0.f.onGround && g0.f.floorPlatformId === null, `feet=${GY.toFixed(0)}`);

  const px = 1400, pw = 170;

  // ── SCENARIO 1 — JUMP onto a platform → one-way pass-through → stand at full height ──
  console.log("\n─── Scenario 1: jump-onto + one-way + stand at full ───");
  const MAXH1 = 190;
  const topFull1 = GY - MAXH1;
  const id1 = await spawnP({ x: px - pw/2, w: pw, maxHeight: MAXH1, growDur: 22, holdDur: 900, recedeDur: 40 });
  let minFeet1 = Infinity;
  await jumpP1(0);                                            // real upward jump from the footprint
  const rest1 = await waitFor(s => s.f.floorPlatformId === id1 && s.f.onGround, 8000,
                              s => { minFeet1 = Math.min(minFeet1, s.f.feet); });
  const p1p = rest1.ps.find(z => z.id === id1);
  check("S1: P1 rose UP through the platform from below then landed on top (one-way)", minFeet1 < topFull1 - 20, `apexFeet=${isFinite(minFeet1)?minFeet1.toFixed(0):"n/a"} < top ${topFull1.toFixed(0)}`);
  check("S1: P1 ended STANDING on the platform (not the ground)", rest1.f.floorPlatformId === id1 && rest1.f.onGround && rest1.f.feet < GY - 100, `feet=${rest1.f.feet.toFixed(0)} floor=${rest1.f.floorPlatformId}`);
  check("S1: at rest P1 feet == platform top (full height)", p1p && Math.abs(rest1.f.feet - p1p.topY) < 4 && Math.abs(p1p.topY - topFull1) < 2, p1p ? `feet=${rest1.f.feet.toFixed(0)} topY=${p1p.topY.toFixed(0)} full=${topFull1.toFixed(0)}` : "no platform");
  await shot("WOOD_stand_full.png");

  // ── SCENARIO 2 — full-lifecycle sync (RIDE grow up → hold → recede down) + no-ghost ──
  console.log("\n─── Scenario 2: grow→hold→recede sync (ride up & down) + no-ghost ───");
  await clearP();
  const MAXH2 = 150, topFull2 = GY - MAXH2;
  const id2 = await spawnP({ x: px - pw/2, w: pw, maxHeight: MAXH2, growDur: 100, holdDur: 120, recedeDur: 70 });
  await liftP1(40);                                           // hover just above the footprint → drops on EARLY in grow, then rides up
  const onEarly = await waitFor(s => s.f.floorPlatformId === id2 && s.f.onGround, 5000);
  const earlyP = onEarly.ps.find(z => z.id === id2);
  check("S2: P1 caught the platform EARLY in its growth (rode up from low)", earlyP && earlyP.growthP < 0.75 && onEarly.f.feet > topFull2 + 30, earlyP ? `growthP=${earlyP.growthP.toFixed(2)} feet=${onEarly.f.feet.toFixed(0)}` : "not caught");

  // Sample feet-vs-topY across the WHOLE remaining lifecycle (grow→hold→recede→despawn).
  let maxDiv = 0, minFeet = Infinity, maxFeet = -Infinity, sawGrow=false, sawHold=false, sawRecede=false;
  let shotGrow=false, shotRecede=false;
  const gone = await waitFor(s => s.ps.length === 0, 14000, s => {
    const p = s.ps.find(z => z.id === id2);
    if (!p) return;
    if (p.phase==="grow") sawGrow=true; if (p.phase==="hold") sawHold=true; if (p.phase==="recede") sawRecede=true;
    if (p.phase==="grow" && !shotGrow) { shotGrow=true; shot("WOOD_grow.png"); }
    if (p.phase==="recede" && !shotRecede) { shotRecede=true; shot("WOOD_recede.png"); }
    if (s.f.floorPlatformId === id2) {
      maxDiv = Math.max(maxDiv, Math.abs(s.f.feet - p.topY));
      minFeet = Math.min(minFeet, s.f.feet); maxFeet = Math.max(maxFeet, s.f.feet);
    }
  });
  check("S2: platform completed its lifecycle and despawned", gone.ps.length === 0 && !gone.timedout, `platforms=${gone.ps.length}`);
  check("S2: feet tracked top-Y within tolerance the ENTIRE lifecycle (no desync)", maxDiv <= 16, `maxDiv=${maxDiv.toFixed(1)}px`);
  check("S2: saw all three phases while riding (grow+hold+recede)", sawGrow && sawHold && sawRecede, `grow=${sawGrow} hold=${sawHold} recede=${sawRecede}`);
  check("S2: P1 visibly rode UP with growth then DOWN with recede", isFinite(minFeet) && (maxFeet - minFeet) > 70, `feet range ${isFinite(minFeet)?minFeet.toFixed(0):"n/a"}..${isFinite(maxFeet)?maxFeet.toFixed(0):"n/a"}`);
  const landed2 = await waitFor(s => s.f.onGround && Math.abs(s.f.feet - GY) < 3, 4000);
  check("S2: P1 ended on the GROUND after despawn (no float / no ghost solidity)", landed2.f.onGround && Math.abs(landed2.f.feet - GY) < 3 && landed2.f.floorPlatformId === null, `feet=${landed2.f.feet.toFixed(0)} vs ground ${GY.toFixed(0)}`);
  // extra no-ghost probe: drop from high over the OLD footprint → must fall clean to the ground.
  await liftP1(260);
  const ghost = await waitFor(s => s.f.onGround, 4000);
  check("S2: fresh drop through the old footprint falls straight to the ground (no ghost platform)", ghost.f.onGround && Math.abs(ghost.f.feet - GY) < 3, `feet=${ghost.f.feet.toFixed(0)}`);

  // ── SCENARIO 3 — walk off the edge → FALL (not teleport) ──
  console.log("\n─── Scenario 3: walk-off falls, not teleports ───");
  await clearP();
  const MAXH3 = 190;
  const id3 = await spawnP({ x: px - pw/2, w: pw, maxHeight: MAXH3, growDur: 8, holdDur: 900, recedeDur: 40 });
  await jumpP1(0);
  const onTop = await waitFor(s => s.f.floorPlatformId === id3 && s.f.onGround, 8000);
  check("S3: P1 standing on the platform before walk-off", onTop.f.floorPlatformId === id3 && Math.abs(onTop.f.feet - (GY - MAXH3)) < 4, `feet=${onTop.f.feet.toFixed(0)}`);
  await setP1X(px + 300);                                     // shove P1 well OFF the platform span
  const released = await waitFor(s => !s.f.onGround, 1500);   // must go airborne (released to a fall)
  check("S3: stepping off the edge RELEASED to a fall (airborne, not teleported to ground)", !released.f.onGround && released.f.feet < GY - 40, `airborne=${!released.f.onGround} feet=${released.f.feet.toFixed(0)}`);
  const landed3 = await waitFor(s => s.f.onGround && Math.abs(s.f.feet - GY) < 3, 4000);
  check("S3: P1 then landed on the ground", landed3.f.onGround && Math.abs(landed3.f.feet - GY) < 3, `feet=${landed3.f.feet.toFixed(0)}`);

  // ── SCENARIO 4 — DEFAULT-SAFE: no platforms → normal ground physics unchanged ──
  console.log("\n─── Scenario 4: default-safe (no platforms) ───");
  await clearP();
  await setP1X(1400);
  await waitFor(s => s.f.onGround && Math.abs(s.f.feet - GY) < 3, 3000);
  let apex = Infinity;
  await jumpP1(0);
  const back = await waitFor(s => false, 3500, s => { apex = Math.min(apex, s.f.feet); });   // sample the whole arc
  check("S4: with no platforms a normal jump leaves the ground", apex < GY - 100, `apex=${apex.toFixed(0)}`);
  const g1 = await waitFor(s => s.f.onGround && Math.abs(s.f.feet - GY) < 3, 4000);
  check("S4: and returns cleanly to the ground (unchanged floor)", g1.f.onGround && Math.abs(g1.f.feet - GY) < 3 && g1.f.floorPlatformId === null && g1.ps.length === 0, `feet=${g1.f.feet.toFixed(0)}`);

  check("no JS page errors across all scenarios", errs.length === 0, errs.slice(0,2).join(" | "));
  console.log(`\n  shots → ${shotDir}`);
} catch (e) { console.error("WOOD PLATFORM LIVE ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); }

console.log(`\n════════════════════════════════════════`);
console.log(`  WOOD PLATFORM LIVE (Stage 1 primitive): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
