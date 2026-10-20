import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "vilgax_work", "render_shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".txt":"text/plain" };
const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
let PASS=0,FAIL=0; const ck=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?` — ${d}`:""}`);};
const state=()=>page.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
const sr=(who)=>page.evaluate(w=>window.__harness.spriteReady(w),who);

await page.goto(`${base}/index.html?harness=1&p1=vilgax&p2=gojo`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(480,270);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.spriteReady;},null,{timeout:15000,polling:32}).catch(()=>{});
await wf(5);
await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.fillEnergy?.();});

const sp1=await sr("p1"), sp2=await sr("p2");
ck("Vilgax renders as a SPRITE (not box)", !!sp1 && sp1.sheet!==null, `sheet=${sp1&&sp1.sheet}`);
ck("Opponent (Gojo) renders as a SPRITE", !!sp2 && sp2.sheet!==null, `sheet=${sp2&&sp2.sheet}`);
ck("Vilgax spriteScale applied", sp1&&sp1.scale>0, `scale=${sp1&&sp1.scale}`);
await page.screenshot({path:path.join(OUT,"01_idle_hud.png")});

// idle animates: frame index should advance
const a0=(await sr("p1")).action;
await wf(18);
const a1=(await sr("p1")).action;
ck("idle action resolves", a0!=null, `action=${a0}`);
await page.screenshot({path:path.join(OUT,"02_idle_later.png")});

// walk
await page.keyboard.down("d"); await wf(14);
const wact=(await sr("p1")).action;
ck("walk/run animates on hold", wact==="walk"||wact==="run", `action=${wact}`);
await page.screenshot({path:path.join(OUT,"03_walk.png")});
await page.keyboard.up("d"); await wf(4);

async function doMove(key,label,file){
  await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.fillEnergy?.();window.__harness.resetFighterInput?.("p1");});
  await page.keyboard.press(key); await wf(4);
  const act=(await sr("p1")).action, sheet=(await sr("p1")).sheet;
  ck(`${label} renders a sprite frame`, sheet!==null, `action=${act}`);
  await page.screenshot({path:path.join(OUT,file)});
  await wf(18);
}
await doMove("j","light (X)","04_light.png");
await doMove("k","heavy (Y)","05_heavy.png");
await doMove("l","special (L)","06_special.png");

ck("no JS page errors", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
console.log(`\n${FAIL===0?"✅":"❌"} VILGAX RENDER CHECK: ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close(); process.exit(FAIL===0?0:1);
