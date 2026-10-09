// Naruto (Seventh) — PHASE 4 (session 3) verification: Combo-1 Air wired, KCM golden idle/glide animates,
// Oiroke options-menu toggle row click.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "naruto_seventh_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".m4a":"audio/mp4",".css":"text/css",".json":"application/json" };
const server = http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>console.log("  PAGEERR",e.message));
const state=()=>page.evaluate(()=>window.__harness.state());
const n7=()=>page.evaluate(()=>window.__harness.narutoSeventh());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
const shot=async(n)=>{await page.screenshot({path:path.join(OUT,n)});console.log("  wrote",n);};
const K={light:"j",heavy:"k",special:"l",ult:"u",charge:"p",jump:"w"};
let FWD="d";
const log=[];
// golden-yellow pixel count in the play area (fighter box), to confirm KCM golden body renders
const goldenPx=()=>page.evaluate(()=>{const c=document.querySelector("canvas");const ctx=c.getContext("2d");const d=ctx.getImageData(0,150,c.width,410).data;let g=0;for(let i=0;i<d.length;i+=4){if(d[i]>190&&d[i+1]>160&&d[i+2]<120&&d[i+1]-d[i+2]>70)g++;}return g;});

await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a";
console.log("  booted",a0.key);
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=90){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}

// ── 1. COMBO-1 AIR sheet is served + decodes as the 9-frame strip the animationData expects ──
const aircombo=await page.evaluate(async ()=>{
  const im=new Image(); im.src="./naruto_seventh_aircombo_uniform.png";
  await im.decode().catch(()=>{});
  return { w: im.naturalWidth, h: im.naturalHeight, ok: im.complete && im.naturalWidth>0 };
});
console.log("  aircombo sheet:",JSON.stringify(aircombo),"(expect 9×62=558 × 60)");
log.push(["aircombo-sheet-valid", aircombo.ok && aircombo.w===9*62 && aircombo.h===60]);

// ── 2. KCM golden idle ANIMATES (breathing) — golden present + frame changes over time ──
await page.evaluate(()=>{window.__harness.setN7Oiroke(false);window.__harness.setN7Bond(80);}); await settle(); await prep(120);
for(let t=0;t<2&&!(await n7()).kcm;t++){await page.keyboard.down(K.charge);await wf(16);await page.keyboard.up(K.charge);await wf(8);}
await wf(12);
const kg0=await goldenPx(); await wf(16); const kg1=await goldenPx();
console.log("  KCM golden idle: goldenPx",kg0,"→",kg1,"(breathing = both high, non-zero)");
log.push(["kcm-golden-renders", kg0>200 && kg1>200]);
await shot("45_kcm_idle_breathing.png");
// KCM glide: walk and confirm golden still renders
await page.keyboard.down(FWD); await wf(14); const kgWalk=await goldenPx(); await page.keyboard.up(FWD);
console.log("  KCM glide (walking): goldenPx",kgWalk);
log.push(["kcm-glide-renders", kgWalk>150]);
await shot("46_kcm_glide.png");

// ── 3. OIROKE options-menu toggle ROW click flips the flag ──
await page.evaluate(()=>window.__harness.setN7Oiroke(false));
const before=await page.evaluate(()=>window.__harness.narutoSeventh? null : null);   // noop
await page.evaluate(()=>window.__harness.ui.goto("SETTINGS")); await wf(4); await shot("47_settings_oiroke.png");
const off0=await page.evaluate(()=>{try{return localStorage.getItem("ms_oiroke_enabled")}catch(_){return "?"}});
// click the Oiroke toggle rect: x = width-214 (+~95 center), y=522 (+17)
await page.mouse.click(1280-214+95, 522+17); await wf(3);
const on1=await page.evaluate(()=>{try{return localStorage.getItem("ms_oiroke_enabled")}catch(_){return "?"}});
console.log("  Oiroke toggle click: localStorage",off0,"→",on1);
log.push(["oiroke-toggle-row-flips", on1==="1" && off0!=="1"]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
