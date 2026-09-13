// Track C — live render-loop / high-refresh re-verification after the new FX systems.
// Boots a real match, generates a sustained combo (many damage numbers + hit sparks) AND a
// brutality (particle-heavy), then measures: (1) real per-frame intervals via rAF in-page to
// catch dropped-frame stutter, and (2) object-pool allocs vs reuses to confirm the hot FX paths
// aren't churning GC per frame.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d)})});s.listen(0,"127.0.0.1",()=>r(s))});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const H=fn=>page.evaluate(fn);
// Use a brutality-eligible P1 so brutality.trigger fires the real particle path.
await page.goto(`${base}/index.html?harness=1&debug=1&p1=jason&p2=maki`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness&&!!window.__harness.boot,null,{timeout:15000});
await H(()=>window.__harness.brutality.setBrutality(true));
await H(()=>window.__harness.boot());
await page.waitForTimeout(200);

// Install an in-page rAF interval sampler.
await H(()=>{ window.__t={last:null,gaps:[]}; const loop=(t)=>{ if(window.__t.last!=null) window.__t.gaps.push(t-window.__t.last); window.__t.last=t; window.__t._id=requestAnimationFrame(loop) }; window.__t._id=requestAnimationFrame(loop); });

// Reset pool counters, then drive a SUSTAINED real combo via the actual keyboard path: park P1 next
// to P2 (a passive CPU dummy) and mash Light/Heavy for ~2.5s → real hits → sparks + damage numbers.
await H(()=>window.__harness.poolResetStats());
await H(()=>{ const p1=window.__harness.p1(), p2=window.__harness.p2(); if(p1&&p2){ p1.x=p2.x-70; p1.facing=1; } });
let peakDmg=0, peakSparks=0, peakAllocs=0;
const t0=Date.now();
while(Date.now()-t0<2500){
  await page.keyboard.down("j"); await page.waitForTimeout(40); await page.keyboard.up("j");
  await page.keyboard.down("k"); await page.waitForTimeout(40); await page.keyboard.up("k");
  await H(()=>{ const p1=window.__harness.p1(), p2=window.__harness.p2(); if(p1&&p2){ if(Math.abs(p1.x-p2.x)>80) p1.x=p2.x-70; p2.health=Math.max(200,p2.health); } });
  const s=await H(()=>window.__harness.perf());
  peakDmg=Math.max(peakDmg,s.dmgNumbers); peakSparks=Math.max(peakSparks,s.fx); peakAllocs=Math.max(peakAllocs,s.pool._totals.allocs);
}
const midPerf = { dmgNumbers:peakDmg, fx:peakSparks, projectiles:0, pool:await H(()=>window.__harness.perf().pool) };
// Fire a brutality (particle-heavy finisher) and let it run.
await H(()=>window.__harness.brutality.setHp("p2",5));
const bt = await H(()=>window.__harness.brutality.trigger("p1",true,null));
await page.waitForTimeout(1200);
const brut = await H(()=>window.__harness.brutality.state());
const endPerf = await H(()=>window.__harness.perf());

// Stop the sampler and compute stats.
const gaps = await H(()=>{ cancelAnimationFrame(window.__t._id); return window.__t.gaps; });
await browser.close(); server.close();

const sorted=[...gaps].sort((a,b)=>a-b);
const p=(q)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(q*sorted.length))]:0;
const max=sorted.length?sorted[sorted.length-1]:0;
const avg=gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:0;
const dropped=gaps.filter(g=>g>33).length;   // >2× the 16.7ms budget = a dropped frame
console.log("── Track C: render-loop / FX perf under load ──");
console.log(`  frames sampled: ${gaps.length}`);
console.log(`  frame interval: avg ${avg.toFixed(2)}ms · p50 ${p(0.5).toFixed(2)}ms · p95 ${p(0.95).toFixed(2)}ms · max ${max.toFixed(2)}ms`);
console.log(`  dropped frames (>33ms): ${dropped}`);
console.log(`  brutality fired: ${bt} · state.active=${brut.active} captured=${brut.captured}`);
console.log(`  peak FX live — dmgNumbers ${midPerf.dmgNumbers}, sparks ${midPerf.fx}, projectiles ${midPerf.projectiles}`);
console.log(`  POOL after ~120 hits + brutality — reuses ${endPerf.pool._totals.reuses}, allocs ${endPerf.pool._totals.allocs}, free ${endPerf.pool._totals.free}`);
console.log(`  JS errors: ${jsErrors.length}${jsErrors.length?" — "+jsErrors.slice(0,2).join(" | "):""}`);
