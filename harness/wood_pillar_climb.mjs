// harness/wood_pillar_climb.mjs — WOOD RELEASE climbing pillars, LIVE proof (Stage 2, Playwright).
// Hashirama's Down+Special, cast in the air / from atop a pillar, raises a REAL climbable wood pillar via the
// platforms.js primitive. Proves the chain-climb: each cast from a higher perch grows a TALLER pillar
// (an ascending staircase) that lets him reach an elevated/airborne opponent — with real energy cost, a
// concurrent cap, and the GROUND Down+Special (offensive Tree Summon) preserved.
// Traversal between pillars (the player's jump) is scripted via standP1OnPlatform; the mechanic under test
// is the ability + the chain-height logic + the platform physics.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "wood_platform_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => { const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1920, height:1080 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));

let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"}  ${n}${d?`  — ${d}`:""}`); };
const p1 = () => page.evaluate(() => window.__harness.p1());
const plats = () => page.evaluate(() => window.__harness.platforms());
const floor = () => page.evaluate(() => window.__harness.fighterFloor("p1"));
const projs = () => page.evaluate(() => window.__harness.projectiles());
const specialDir = (d) => page.evaluate(dd => window.__harness.p1SpecialDir(dd), d);
const liftP1 = (dy) => page.evaluate(v => window.__harness.liftP1(v), dy);
const standOn = (id) => page.evaluate(i => window.__harness.standP1OnPlatform(i), id);
const clearP = () => page.evaluate(() => window.__harness.clearPlatforms());
const setP1X = (x) => page.evaluate(v => window.__harness.setP1X(v), x);
const setP2X = (x) => page.evaluate(v => window.__harness.setP2X(v), x);
const liftP2 = (dy) => page.evaluate(v => window.__harness.liftP2(v), dy);
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}); }
const newest = (ps) => ps.length ? ps[ps.length-1] : null;

try {
  await page.goto(`${base}/index.html?harness=1&p1=hashirama&p2=hashirama`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(960, 540);
  await page.evaluate(() => window.__harness.boot());          // training, energy filled (220)
  await waitFrames(6);
  await clearP();
  const arena = await page.evaluate(() => window.__harness.arena());
  await setP1X(Math.round(arena.left + arena.width * 0.30));
  await waitFrames(2);

  const GY = (await floor()).feet;
  const en0 = (await p1()).energy;
  const STEP = 150;
  check("boot: Hashirama grounded with chakra", (await p1()).key === "hashirama" && en0 >= 200, `en=${en0}`);

  // ── Chain three pillars, each cast from the previous pillar's top ──
  console.log("\n─── chain-climb: cast → stand → cast (taller) → stand → cast (taller still) ───");
  const pillars = [];
  for (let step = 1; step <= 3; step++) {
    const before = (await plats()).length;
    let feetAtCast, res;
    if (step === 1) {
      // First cast must be AIRBORNE — do lift + read-feet + cast in ONE evaluate so no game frames pass
      // (a small lift would re-land during the intervening awaits → route to the grounded tree instead).
      const r = await page.evaluate(() => { const h = window.__harness; h.liftP1(80); const f = h.fighterFloor("p1"); const c = h.p1SpecialDir("D"); return { feet: f.feet, cast: c }; });
      feetAtCast = r.feet; res = r.cast;
    } else {
      // Steps 2–3 cast from a pillar top — P1 is resting there (stable), so plain awaits don't race.
      feetAtCast = (await floor()).feet;
      res = await specialDir("D");
    }
    await waitFrames(1);
    let ps = await plats();
    let pil = newest(ps);
    const spawned = ps.length === before + 1 && pil;
    check(`step ${step}: Down+Special (${step===1?"airborne":"on pillar"}) raised a climbable pillar`, spawned, `platforms ${before}→${ps.length} cast=${res?.cast}`);
    // wait for the pillar to finish GROWING before standing on it (its top is still rising during grow).
    await page.waitForFunction(id => { const p = window.__harness.platforms().find(z=>z.id===id); return p && p.phase !== "grow"; }, pil.id, { timeout: 5000, polling: 16 }).catch(()=>{});
    pil = (await plats()).find(z => z.id === pil.id) || pil;
    const fullTopY = pil.groundY - pil.maxHeight;   // full standable height (chain-height math is on the FULL pillar)
    check(`step ${step}: pillar uses the tree art + tops ~${STEP}px above the caster's feet (chain height)`,
          !!pil && pil.hasSprite && Math.abs((feetAtCast - fullTopY) - STEP) < 26,
          pil ? `sprite=${pil.hasSprite} fullTopY=${fullTopY.toFixed(0)} feetAtCast=${feetAtCast.toFixed(0)} Δ=${(feetAtCast-fullTopY).toFixed(0)}` : "no pillar");
    // player jumps up onto it (scripted traversal)
    await standOn(pil.id);
    await waitFrames(2);
    const onIt = await floor();
    check(`step ${step}: Hashirama now stands ON the pillar (feet == its top)`, onIt.floorPlatformId === pil.id && Math.abs(onIt.feet - fullTopY) < 4, `feet=${onIt.feet.toFixed(0)} top=${fullTopY.toFixed(0)} floor=${onIt.floorPlatformId}`);
    pillars.push({ ...pil, topY: fullTopY, standFeet: onIt.feet });
    if (step === 2) await page.screenshot({ path: path.join(OUT, "PILLAR_climb_mid.png") });
  }

  // ── Staircase shape: each pillar is TALLER than the last and stepped FORWARD toward the foe ──
  console.log("\n─── staircase shape + reach ───");
  const heights = pillars.map(p => p.maxHeight);
  const tops = pillars.map(p => p.topY);
  const xs = pillars.map(p => p.x);
  check("each pillar is TALLER than the previous (ascending staircase)", heights[0] < heights[1] && heights[1] < heights[2], `maxH=${heights.map(h=>h.toFixed(0)).join(" < ")}`);
  check("each pillar TOP is higher than the previous (feet climb upward)", tops[0] > tops[1] && tops[1] > tops[2], `topY=${tops.map(t=>t.toFixed(0)).join(" > ")}`);
  check("each pillar steps FORWARD toward the opponent", xs[0] < xs[1] && xs[1] < xs[2], `x=${xs.map(x=>x.toFixed(0)).join(" < ")}`);
  const climbGain = GY - pillars[2].standFeet;
  check("Hashirama climbed a real height off the ground (≈2 pillars up)", climbGain > 250, `climbed ${climbGain.toFixed(0)}px above ground`);

  // reach an elevated opponent: park P2 up at the top pillar's height, in front — Hashirama is now at its level.
  await setP2X(pillars[2].x + 150);
  await liftP2(Math.round(GY - pillars[2].standFeet - 20));
  await waitFrames(1);
  const me = await floor(); const foe = await page.evaluate(() => window.__harness.p2());
  const foeFeet = foe.y + (foe.h || 100);
  check("Hashirama reached the elevated opponent's height (within a strike band)", Math.abs(me.feet - foeFeet) < 140, `myFeet=${me.feet.toFixed(0)} foeFeet=${foeFeet.toFixed(0)}`);
  await page.screenshot({ path: path.join(OUT, "PILLAR_climb_reach.png") });

  // ── Balance gates: energy cost + concurrent cap ──
  console.log("\n─── balance: cost + concurrent cap ───");
  const enNow = (await p1()).energy;
  const spent = en0 - enNow;   // net = 3×18 cost MINUS passive chakra regen accrued across the climb frames
  check("each pillar spent real chakra (≈3 × 18, minus passive regen → not free)", spent >= 40 && spent <= 54, `net spent ${spent.toFixed(0)} (18/cast − regen)`);
  const oldestId = pillars[0].id;
  await specialDir("D");                                        // 4th cast → oldest must retire (cap 3)
  await waitFrames(2);
  const after = await plats();
  const oldest = after.find(p => p.id === oldestId);
  const standing = after.filter(p => p.phase !== "recede").length;
  check("concurrent cap: a 4th cast retires the OLDEST pillar (no permanent forest)", (!oldest || oldest.phase === "recede") && standing <= 3, `oldest=${oldest?oldest.phase:"gone"} standing=${standing}`);

  // ── Regression: GROUNDED Down+Special is still the offensive Tree Summon (no climbable pillar) ──
  console.log("\n─── grounded Down+Special still = offensive Tree Summon ───");
  await clearP();
  await setP1X(Math.round(arena.left + arena.width * 0.30));
  // P1 may still be airborne up on a (now-cleared) pillar → wait until it has fallen back to the real ground.
  await page.waitForFunction(() => { const f = window.__harness.fighterFloor("p1"); return f.onGround && f.floorPlatformId === null; }, null, { timeout: 6000, polling: 16 }).catch(()=>{});
  const grounded = await floor();
  const beforeG = (await plats()).length;
  await specialDir("D");
  await waitFrames(16);   // the offensive tree erupts on a scheduled delay (~10f)
  const platsAfterGround = (await plats()).length;
  const treeProj = (await projs()).some(pr => (pr.sheet || "").includes("tree") || (pr.name || "").toLowerCase().includes("tree"));
  check("grounded cast raised NO climbable pillar (offense path intact)", grounded.floorPlatformId === null && platsAfterGround === beforeG, `grounded floor=${grounded.floorPlatformId} platforms=${platsAfterGround}`);
  check("grounded cast summoned an offensive TREE projectile instead", treeProj, `trees=${(await projs()).map(p=>p.name).join(",")}`);

  check("no JS page errors", errs.length === 0, errs.slice(0,2).join(" | "));
  console.log(`\n  shots → ${OUT}`);
} catch (e) { console.error("WOOD PILLAR CLIMB ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); }

console.log(`\n════════════════════════════════════════`);
console.log(`  WOOD PILLAR CLIMB (Stage 2 wiring): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
