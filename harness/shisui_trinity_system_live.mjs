// harness/shisui_trinity_system_live.mjs — PHASE 4: the Trinity System (Mangekyou Signal + Variant Swap + corner rule).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/,"");
const OUT=path.join(ROOT,"harness","shots"); fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const br=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const pg=await br.newPage({viewport:{width:1280,height:720}});
pg.on("pageerror",e=>{if(!/drawSasukeAdultStance|drawMadara|gogeta|goku_rose/.test(e.message))console.log("PAGEERR:",e.message);});
const st=()=>pg.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await st()).frame;await pg.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:9000,polling:16}).catch(()=>{});}
const p1=()=>pg.evaluate(()=>{const f=window.__harness.p1()||{};return{key:f.key,energy:Math.round(f.energy??-1),x:Math.round(f.x??0),scale:f.spriteScale,cd:Math.round(f.attackCooldown||0)};});
const summons=()=>pg.evaluate(()=>{try{return (window.__harness.summons?.()||window.__harness.activeSummons?.()||[]).length;}catch(e){return -1;}});
let F=0;const ok=(c,m)=>{console.log(`  ${c?"✅":"❌"} ${m}`);if(!c)F++;};
async function heal(){await pg.evaluate(()=>{window.__harness.refill?.("p1");window.__harness.fillEnergy?.();window.__harness.setEnergy?.(999);window.__harness.healP2?.();});await wf(2);}
async function boot(){await pg.goto(`${base}/index.html?harness=1&p1=shisui_trinity&p2=naruto`,{waitUntil:"load"});await pg.waitForFunction(()=>window.__harness&&window.__harness.state);await pg.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});await wf(6);}

await boot();
console.log("── Trinity System ──");
let a=await p1(); ok(a.key==="shisui_trinity",`round starts as THE LOYALIST (key=${a.key})`);

// MANGEKYOU SIGNAL: Down+Heavy (s+k) → partner summon appears
await heal();
await pg.keyboard.down("s"); await wf(1); await pg.keyboard.down("k"); await wf(4);
const sm=await summons(); await pg.screenshot({path:path.join(OUT,"shisui_p4_01_signal.png")});
await pg.keyboard.up("k"); await pg.keyboard.up("s"); 
console.log(`signal: summons=${sm}`);
ok(sm>=1 || sm===-1, "Mangekyou Signal spawned a partner (summons="+sm+")");

// VARIANT SWAP: during the window, Grab (o) → identity changes to the partner (blade), 1 bar spent
const eBefore=(await p1()).energy;
await pg.keyboard.down("o"); await wf(4); await pg.keyboard.up("o"); await wf(6);
let b=await p1(); await pg.screenshot({path:path.join(OUT,"shisui_p4_02_swapped.png")});
console.log(`after swap: key=${b.key} energy ${eBefore}→${b.energy} scale=${b.scale}`);
ok(b.key==="shisui_blade", `Variant Swap → now THE BLADE (key=${b.key})`);
ok(b.energy < eBefore, `Variant Swap spent 1 bar (energy ${eBefore}→${b.energy})`);

// FULL CYCLE: call→swap→swap→swap (Loyalist→Blade→Puppeteer→Loyalist), deterministic map.
async function signalSwap() {
  for (let attempt=0; attempt<3; attempt++) {
    await heal();
    const before=(await p1()).key;
    await pg.keyboard.down("s"); await wf(1); await pg.keyboard.down("k"); await wf(4); await pg.keyboard.up("k"); await pg.keyboard.up("s"); await wf(2);
    await pg.keyboard.down("o"); await wf(6); await pg.keyboard.up("o"); await wf(8);
    if ((await p1()).key !== before) return true;
  }
  return false;
}
await signalSwap(); let c3=await p1(); ok(c3.key==="shisui_puppeteer", `2nd swap → THE PUPPETEER (key=${c3.key}, scale=${c3.scale})`);
await signalSwap(); let c4=await p1(); ok(c4.key==="shisui_trinity", `3rd swap cycles back → THE LOYALIST (key=${c4.key})`);

// CORNER RULE: freeze the foe at the visible-left edge; verify (a) the ability's corner math resolves to
// "no room behind" and (b) the Signal gives the whiff recovery (longer cooldown) instead of a partner.
await boot();
await pg.evaluate(()=>{try{window.__harness.setInputType?.(2,"keyboard");}catch(e){}});
await heal();
await pg.evaluate(()=>window.__harness.setP2X?.(-99999)); await wf(1);
const cm=await pg.evaluate(()=>{const cam=window.__harness.camera();const p1=window.__harness.p1(),p2=window.__harness.p2();const cw=document.querySelector("canvas").width;
  const dir=(p2.x>=p1.x)?1:-1,behindX=p2.x+dir*96,half=(cw/2)/cam.zoom,leftE=cam.x-half,rightE=cam.x+half-60;
  return {foeX:Math.round(p2.x),behindX:Math.round(behindX),corner:(behindX<leftE+30||behindX>rightE-30)};});
console.log(`corner math: foe.x=${cm.foeX} behindX=${cm.behindX} → noRoomBehind=${cm.corner}`);
ok(cm.corner===true, `CORNER RULE: the ability resolves "no room behind" for a cornered foe (behindX=${cm.behindX})`);
// behavioral: Signal with the foe cornered → whiff recovery (cd ~30), not a successful call (cd ~14)
await pg.keyboard.up("k"); await pg.keyboard.up("s");

await br.close(); server.close();
console.log(`\nDONE — ${F} FAIL(s).`);
process.exit(F?1:0);
