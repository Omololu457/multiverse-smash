// harness/combat_fx_stage1.mjs — COMBAT HIT FX Stage 1 (real multi-particle bursts), LIVE proof.
// Drives REAL light + heavy hits connecting on a training dummy and proves the new spark render is a genuine
// per-particle burst (individual velocity + gravity + independent fade), NOT the old static radiating lines:
//   • each hit seeds MULTIPLE particles (heavy seeds more than light — count scales with weight),
//   • the debris MOVES and FALLS frame-to-frame (avg particle Y increases under gravity; particles have speed),
//   • no combat-logic change (damage still lands; this reads the same spark data).
// Captures a light-hit and heavy-hit frame a few ticks after impact so the scatter/fall is visible.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "combat_fx_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => { const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"}  ${n}${d?`  — ${d}`:""}`); };
const sparks = () => page.evaluate(() => window.__harness.sparks());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{}); }
const firstBurst = (arr) => arr.find(s => !s.blocked && s.nParticles > 0);

// Drive a real attack key, wait for its seeded burst, then sample avg-Y over several frames to prove FALL.
async function hit(key, label, shotName) {
  // re-park + swing, retrying if the jab whiffs (headless spacing/timing jitter) — the connect itself
  // isn't what's under test; the burst shape is.
  let burst = null;
  for (let attempt = 0; attempt < 4 && !burst; attempt++) {
    await page.evaluate(() => { const h=window.__harness; h.healP2?.(); });
    const arena = await page.evaluate(() => window.__harness.arena());
    await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width*0.45));
    const a = await page.evaluate(() => window.__harness.p1());
    await page.evaluate(x => window.__harness.setP2X(x), a.x + 46);
    await waitFrames(2);
    await page.keyboard.down(key);
    for (let i=0;i<24 && !burst;i++){ burst = firstBurst(await sparks()); if(!burst) await waitFrames(1); }
    await page.keyboard.up(key);
    if (!burst) await waitFrames(12);
  }
  if (!burst) return { ok:false, n:0 };

  const n0 = burst.nParticles, y0 = burst.avgY, spd0 = burst.avgSpd;
  // Sample the fall from the moment of detection (light debris is short-lived — don't burn its lifetime
  // before sampling). Gravity is the ONLY source of downward velocity (the isotropic burst starts with a
  // slight UP pop, avg vy < 0), so the burst reaching a clearly-positive peak avg vy proves it falls.
  // Screenshot mid-loop (frame ~5), when the debris has scattered but is still bright.
  const clip = await page.evaluate(() => { const b = window.__harness.screenRect("p2"); if (!b) return null; const cx=b.x+b.w/2, cy=b.y+b.h*0.4, s=300; return { x: Math.max(0,cx-s/2), y: Math.max(0,cy-s/2), width:s, height:s }; });
  let vyMax = burst.avgVy ?? -99, yLater = y0;
  for (let i=0;i<12;i++){
    if (i === 5) await page.screenshot({ path: path.join(OUT, shotName), ...(clip ? { clip } : {}) });
    const b = firstBurst(await sparks());
    if (b && b.avgVy != null) { if (b.avgVy > vyMax) vyMax = b.avgVy; yLater = b.avgY; }
    await waitFrames(1);
  }

  check(`${label}: seeded a MULTI-particle burst (not static lines)`, n0 >= 6, `nParticles=${n0}`);
  check(`${label}: debris is in MOTION (particles carry speed)`, spd0 > 0.4, `avgSpd=${spd0?spd0.toFixed(2):"n/a"}`);
  check(`${label}: debris FALLS under gravity (reaches a clear downward velocity)`, vyMax > 0.3, `peak avgVy=${vyMax.toFixed(2)} · y ${y0?.toFixed(0)}→${yLater?.toFixed(0)}`);
  const dmgOk = (await p2()).health < (await p2()).maxHealth;
  check(`${label}: the hit still CONNECTED (combat logic untouched)`, dmgOk, `p2 hp<max=${dmgOk}`);
  return { ok:true, n:n0 };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=naruto`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n─── light hit ───");
  const L = await hit("j", "light", "FX_light.png");
  await waitFrames(20);
  console.log("\n─── heavy hit ───");
  const H = await hit("k", "heavy", "FX_heavy.png");

  console.log("\n─── scaling ───");
  check("heavy seeds MORE particles than light (count scales with weight)", H.ok && L.ok && H.n > L.n, `light=${L.n} heavy=${H.n}`);
  check("no JS page errors", errs.length === 0, errs.slice(0,2).join(" | "));
  console.log(`\n  shots → ${OUT}`);
} catch (e) { console.error("COMBAT FX STAGE1 ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); }

console.log(`\n════════════════════════════════════════`);
console.log(`  COMBAT FX STAGE 1 (particle bursts): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
