// harness/combat_fx_stage2.mjs — COMBAT HIT FX Stage 2 (category-specific SHAPES), LIVE proof.
// Proves each hit category reads as a DISTINCT effect shape, not just a bigger/smaller version of one:
//   • launcher (up-attack) → UPWARD debris cone (particles move UP: avg vy < 0),
//   • spike (down-air)     → DOWNWARD ground puff of tan DUST (avg vy > 0, dust color),
//   • block                → small tight deflection burst (blocked flag, few particles),
//   • heavy                → a brief CAMERA-SHAKE tie-in fires on the landed hit.
// Captures a launcher / spike / block frame so the three read visibly different.
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
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{}); }
async function recenter(gap){ const arena=await page.evaluate(()=>window.__harness.arena()); await page.evaluate(x=>window.__harness.setP1X(x),Math.round(arena.left+arena.width*0.45)); const a=await page.evaluate(()=>window.__harness.p1()); await page.evaluate(x=>window.__harness.setP2X(x),a.x+gap); await waitFrames(2); }
async function shot(name){ const clip=await page.evaluate(()=>{const b=window.__harness.screenRect("p2");if(!b)return null;const cx=b.x+b.w/2,cy=b.y+b.h*0.4,s=320;return{x:Math.max(0,cx-s/2),y:Math.max(0,cy-s/2),width:s,height:s};}); await page.screenshot({ path: path.join(OUT, name), ...(clip?{clip}:{}) }); }
// press keys, poll for a spark of the expected shape, return its first live-particle reading
async function awaitSpark(pred, timeoutFrames=44){ for(let i=0;i<timeoutFrames;i++){ const s=(await sparks()).find(pred); if(s&&s.nParticles>0) return s; await waitFrames(1); } return null; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=naruto`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── LAUNCHER (up-attack) → upward cone ──
  console.log("\n─── launcher (up-attack) ───");
  await page.evaluate(()=>window.__harness.healP2?.()); await recenter(44);
  await page.keyboard.down("i");
  const lch = await awaitSpark(s => s.category === "launcher");
  await page.keyboard.up("i");
  check("launcher: produces a 'launcher' spark", !!lch, lch?`cat=${lch.category} n=${lch.nParticles}`:"none");
  check("launcher: debris is biased UPWARD (avg particle vy < 0 — 'sent flying')", !!lch && lch.avgVy < -0.3, `avgVy=${lch?.avgVy?.toFixed(2)}`);
  await waitFrames(4); await shot("FX_launcher.png");
  await waitFrames(24);

  // ── SPIKE (down-air) → downward dust puff ──
  console.log("\n─── spike (down-air) ───");
  let spk = null;
  for (let attempt = 0; attempt < 4 && !spk; attempt++) {   // down-air timing is playwright-jittery → retry
    await page.evaluate(()=>window.__harness.healP2?.());
    await recenter(36);                                     // p2 a short reach in FRONT (mirrors the working down-air pattern)
    await page.evaluate(()=>window.__harness.liftP1(58)); await waitFrames(1);
    await page.keyboard.down("s"); await page.keyboard.down("j");
    spk = await awaitSpark(s => s.category === "spike", 20);
    await page.keyboard.up("j"); await page.keyboard.up("s");
    if (!spk) await waitFrames(16);
  }
  check("spike: produces a 'spike' spark", !!spk, spk?`cat=${spk.category} n=${spk.nParticles}`:"none");
  check("spike: debris is biased DOWNWARD (avg particle vy > 0 — ground impact)", !!spk && spk.avgVy > 0.3, `avgVy=${spk?.avgVy?.toFixed(2)}`);
  check("spike: debris is tan DUST (distinct from energy sparks)", !!spk && spk.pColor === "#c9b48f", `pColor=${spk?.pColor}`);
  await waitFrames(3); await shot("FX_spike.png");
  await waitFrames(24);

  // ── BLOCK → small deflection (reads 'stopped') ──
  console.log("\n─── block ───");
  await page.evaluate(() => window.__harness.setDummyBehavior("block"));
  await page.evaluate(()=>window.__harness.healP2?.()); await recenter(40);
  await waitFrames(4);   // let the dummy raise guard
  await page.keyboard.down("k");
  const blk = await awaitSpark(s => s.blocked === true);
  await page.keyboard.up("k");
  check("block: produces a BLOCKED spark (distinct from a landed hit)", !!blk, blk?`blocked=${blk.blocked} n=${blk.nParticles}`:"none");
  check("block: a small, tight deflection burst (fewer particles than a landed heavy's 14)", !!blk && blk.nParticles > 0 && blk.nParticles <= 9, `n=${blk?.nParticles}`);
  await waitFrames(3); await shot("FX_block.png");
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"));
  await waitFrames(20);

  // ── HEAVY → camera-shake tie-in ──
  console.log("\n─── heavy camera-shake tie-in ───");
  await page.evaluate(()=>window.__harness.healP2?.()); await recenter(44);
  await waitFrames(30);   // let any residual shake settle
  const shBefore = await page.evaluate(()=>window.__harness.cameraShake());
  await page.keyboard.down("k");
  const hv = await awaitSpark(s => s.category === "heavy");
  let shPeak = 0; for (let i=0;i<4;i++){ const s=await page.evaluate(()=>window.__harness.cameraShake()); shPeak=Math.max(shPeak,s.strength); await waitFrames(1); }
  await page.keyboard.up("k");
  check("heavy: a landed heavy fires a brief camera shake", !!hv && shPeak > shBefore.strength && shPeak > 0, `shake ${shBefore.strength}→${shPeak}`);

  // ── DISTINCTNESS ──
  console.log("\n─── distinctness ───");
  check("launcher (up) and spike (down) have OPPOSITE vertical bias → genuinely different shapes",
        !!lch && !!spk && lch.avgVy < 0 && spk.avgVy > 0, `launcherVy=${lch?.avgVy?.toFixed(2)} spikeVy=${spk?.avgVy?.toFixed(2)}`);
  check("no JS page errors", errs.length === 0, errs.slice(0,2).join(" | "));
  console.log(`\n  shots → ${OUT}`);
} catch (e) { console.error("COMBAT FX STAGE2 ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); }

console.log(`\n════════════════════════════════════════`);
console.log(`  COMBAT FX STAGE 2 (category shapes): ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
