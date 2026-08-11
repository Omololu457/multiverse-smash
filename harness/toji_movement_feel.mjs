// harness/toji_movement_feel.mjs — DIAGNOSIS: measure Toji's actual walk velocity AND his walk-animation
// playback rate vs a roster-average-speed character (Gojo, speed 87). Confirms whether the speed STAT
// translates to faster movement (it should) and whether the leg-cycle animation KEEPS PACE with that speed
// (the reported "stat says fast but looks normal" mismatch). Prints a compact table. Usage:
//   node harness/toji_movement_feel.mjs            (measure)
import { chromium } from "playwright";
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });

async function measure(charKey) {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const P1 = () => page.evaluate(() => window.__harness.p1());
  const STATE = () => page.evaluate(() => window.__harness.state());
  const waitFrames = async n => { const s = (await STATE()).frame; await page.waitForFunction(([a,b]) => window.__harness.state().frame >= a+b, [s,n], { timeout: 15000, polling: 16 }); };
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await new Promise(r => setTimeout(r, 300));
  // keep the opponent pinned FAR to the right the whole time so its AI can never reach/interrupt Toji;
  // holding D then = uninterrupted FORWARD walk (facing +1).
  const shoveFar = () => page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 720); if (window.__harness.healP2) window.__harness.healP2(); });
  await shoveFar(); await waitFrames(3);
  await page.keyboard.down("d");
  await waitFrames(5);  // let velocity ramp to steady state
  let lastIdx = null, advances = 0, walkFrames = 0, vxsum = 0;
  for (let i = 0; i < 80; i++) {
    if (i % 6 === 0) await shoveFar();          // re-pin the opponent every few frames
    const p = await P1();
    const walking = (p.spriteAction === "walk" || p.spriteAction === "run");
    if (walking) {
      if (lastIdx != null && p.spriteFrameIndex !== lastIdx) advances++;
      walkFrames++; vxsum += Math.abs(p.vx || 0);
    }
    lastIdx = walking ? p.spriteFrameIndex : null;   // reset on non-walk so we don't count re-entry as an advance
    await waitFrames(1);
  }
  await page.keyboard.up("d");
  const p = await P1();
  await page.close();
  const avgVx = walkFrames ? vxsum / walkFrames : 0;
  const ticksPerWalkFrame = walkFrames ? advances / walkFrames : 0;
  return {
    char: charKey,
    speedStat: p.baseSpeed ?? p.speed,
    walkFrames,
    avgVx,                                             // px/frame the body actually translates while walking
    animTicksPerWalkFrame: ticksPerWalkFrame,          // leg-cycle frame advances per game-frame
    slidePerAnimFrame: ticksPerWalkFrame ? avgVx / ticksPerWalkFrame : 0,   // px body moves per single leg-frame = "foot slide"
  };
}

const toji = await measure("toji");
const avg  = await measure("gojo");   // speed 87 ≈ roster average
console.log("\n==================== MOVEMENT-FEEL DIAGNOSIS ====================");
for (const r of [toji, avg]) {
  console.log(`${r.char.padEnd(6)} speed=${String(r.speedStat).padEnd(3)} walkFrames=${String(r.walkFrames).padEnd(3)} ` +
    `vx=${r.avgVx.toFixed(2)}px/f  legTicks/frame=${r.animTicksPerWalkFrame.toFixed(3)}  slide/legFrame=${r.slidePerAnimFrame.toFixed(1)}px`);
}
const vRatio = avg.avgVx ? (toji.avgVx / avg.avgVx) : 0;
const aRatio = avg.animTicksPerWalkFrame ? (toji.animTicksPerWalkFrame / avg.animTicksPerWalkFrame) : 0;
console.log(`\nToji's body moves ${vRatio.toFixed(2)}× the velocity of avg, ` +
  `but his leg-cycle animation ticks ${aRatio.toFixed(2)}× as often.`);
console.log(aRatio < vRatio * 0.85
  ? `→ MISMATCH: animation does NOT keep pace with speed (foot-slide ${(toji.slidePerAnimFrame/avg.slidePerAnimFrame).toFixed(2)}× worse) — reads as floaty, not fast.`
  : `→ Animation scales with speed (feet keep pace).`);
console.log("================================================================\n");
await browser.close(); server.close();
