// harness/susanoo_stage2_fit.mjs — verify the Stage-2 Susanoo giant fits fully on-screen
// (head + horns visible, not clipped at the top) so it reads as ONE figure, not a headless
// translucent jumble. Reaches Susanoo Stage 2, screenshots, and measures the purple body's
// on-screen bounding box (top must clear the HUD band; bottom must be on/above the floor).
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>console.log("  PAGEERROR:",e.message));
let pass=0,fail=0; const check=(n,c,e="")=>{console.log(`  ${c?"✓":"✗"} ${n}${e?"  — "+e:""}`); c?pass++:fail++;};
const st=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1());
async function wf(n){const s=(await st()).frame; await page.waitForFunction(([a,c])=>window.__harness.state().frame>=a+c,[s,n],{timeout:20000,polling:16});}
const shot=(name)=>page.screenshot({path:path.join(OUT,name)}).then(()=>console.log("  📸",name));
// measure the purple (Susanoo) body's bbox by reading the live game canvas pixels in-browser
const purpleBBox=()=>page.evaluate(()=>{
  const cv=document.querySelector("canvas"); const W=cv.width,H=cv.height;
  const d=cv.getContext("2d").getImageData(0,0,W,H).data;
  let minx=W,maxx=0,miny=H,maxy=0,cnt=0;
  // Key on the SOLID Susanoo body, not its faint translucent aura. The aura, composited over the stage
  // backdrop, reads as a washed-out purple whose exact colour depends on the brightness BEHIND it — so a
  // weak green-dominance test (b>g+18) let a wide aura halo in and made the measured width depend on the
  // background (e.g. once the backdrop fills the whole view). Requiring strong purple saturation
  // (b>g+55 && r>g+18) isolates the deeply-coloured figure, which is what "single frame vs 4-copy atlas"
  // is actually about — 4 solid copies would still register as ~4× this width.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const i=(y*W+x)*4,r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
    if(a>200 && b>110 && r>70 && b>g+55 && r>g+18){ cnt++; if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y; } }
  return {minx,maxx,miny,maxy,cnt,W,H};
});

try{
  await page.goto(`${base}/index.html?harness=1&p1=sasuke`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot()); await wf(5);
  await page.evaluate(()=>window.__harness.fillEnergy?.());
  await page.keyboard.down("u"); await wf(4); await page.keyboard.up("u");
  await page.waitForFunction(()=>window.__harness.p1().susanooStage>=1,null,{timeout:12000,polling:16}).catch(()=>{});
  await wf(20);
  const bb1=await purpleBBox(); console.log("  STAGE-1 bbox",JSON.stringify(bb1),"visH="+(bb1.maxy-bb1.miny));
  await page.evaluate(()=>window.__harness.fillEnergy?.()); await wf(5);
  await page.keyboard.down("u"); await wf(4); await page.keyboard.up("u");
  await page.waitForFunction(()=>window.__harness.p1().susanooStage>=2,null,{timeout:12000,polling:16}).catch(()=>{});
  await wf(45);   // realistic just-after-transform window — the giant fast-zoom should already have it framed
  const s2=await p1(); check("reached Stage 2",(s2.susanooStage||0)>=2,`stage=${s2.susanooStage}`);
  const bb=await purpleBBox();
  await shot("susanoo_stage2_fit.png");
  console.log("  bbox",JSON.stringify(bb));
  // Head/horns must be fully on-screen (topmost purple pixel well clear of the canvas top edge —
  // pre-fix this was 0 = head clipped off the top), and the figure must still read as a giant.
  check("head/horns fully on-screen (not clipped at the top edge)", bb.miny>=16, `miny=${bb.miny}`);
  check("figure bottom is on-screen (not clipped past canvas bottom)", bb.maxy<=bb.H-2, `maxy=${bb.maxy}/${bb.H}`);
  check("figure has substantial height (reads as a giant)", (bb.maxy-bb.miny)>=380, `h=${bb.maxy-bb.miny}`);
  // Width sanity: a single correctly-sliced frame — NOT the whole atlas unsliced (which would be
  // ~4× wider). Confirms this is one figure, not "4 duplicate copies".
  check("body width is a single frame (not an unsliced 4-copy atlas)", (bb.maxx-bb.minx)<=760, `w=${bb.maxx-bb.minx}`);

  // ── also confirm BLOCK + ATTACK poses stay single-figure + framed (user asked idle/block/attack) ──
  await page.keyboard.down("s"); await wf(10); const gb=await purpleBBox(); await shot("susanoo_stage2_guard.png"); await page.keyboard.up("s"); await wf(8);
  check("Stage-2 GUARD: single frame, head on-screen", gb.miny>=16 && (gb.maxx-gb.minx)<=760, `miny=${gb.miny} w=${gb.maxx-gb.minx}`);
  await page.keyboard.down("j"); await wf(4); await page.keyboard.up("j"); await wf(6); const ab=await purpleBBox(); await shot("susanoo_stage2_attack.png");
  check("Stage-2 ATTACK: single frame, head on-screen", ab.miny>=16 && (ab.maxx-ab.minx)<=780, `miny=${ab.miny} w=${ab.maxx-ab.minx}`);
}catch(e){console.log("FATAL",e); fail++;}
finally{ await browser.close(); server.close(); console.log(`\n════════ SUSANOO STAGE-2 FIT: ${pass} passed, ${fail} failed ════════`); process.exit(fail?1:0); }
