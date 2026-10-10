// Naruto (Seventh) — DBZ-style transform LADDER (hold Charge steps up base→Red→Four-Tails→KCM; holding
// charges the Bond) + the ultimates now fire WITHOUT needing KCM (fox summon works from base).
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
const projs=()=>page.evaluate(()=>window.__harness.projectiles());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
const shot=async(n)=>{await page.screenshot({path:path.join(OUT,n)});console.log("  wrote",n);};
const K={ult:"u",charge:"p"}; let DOWN="s";
const log=[];

await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=120){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}
async function holdCharge(frames=16){await page.keyboard.down(K.charge);await wf(frames);await page.keyboard.up(K.charge);await wf(8);}

// ── 1. CHARGE-UP fills the Bond meter (hold P; <25 pts so no transform fires) ──
await page.evaluate(()=>{window.__harness.setN7Oiroke(false);window.__harness.setN7Bond(0);}); await prep(120);
const b0=(await n7()).bondPts;
await page.keyboard.down(K.charge); await wf(30); await page.keyboard.up(K.charge); await wf(3);
const b1=(await n7()).bondPts;
console.log("  charge-up: bondPts",b0,"->",b1,"form",(await n7()).n7form);
log.push(["charge-fills-bond", b1>b0+15]);

// ── 2. STEP-UP LADDER (NEW INPUT): Bond 3, HOLD Charge (P) + TAP Ultimate 3× → Red → Four-Tails → KCM ──
await page.evaluate(()=>window.__harness.setN7Bond(85)); await prep(120);
await page.evaluate(()=>window.__harness.fillEnergy());
async function tapU(){await page.keyboard.down(K.ult);await wf(2);await page.keyboard.up(K.ult);await wf(14);}
await page.keyboard.down(K.charge); await wf(16);                    // start HOLDING Charge
await tapU(); const f1=(await n7()).n7form;
await page.evaluate(()=>window.__harness.fillEnergy()); await tapU(); const f2=(await n7()).n7form;
await page.evaluate(()=>window.__harness.fillEnergy()); await tapU(); const f3=(await n7()).n7form;
await page.keyboard.up(K.charge); await wf(4);
console.log("  ladder steps (hold P + tap U):",f1,"→",f2,"→",f3);
log.push(["step-up-red",       f1==="red"]);
log.push(["step-up-fourtails", f2==="fourtails"]);
log.push(["step-up-kcm",       f3==="kcm"]);
await shot("54_ladder_kcm.png");
// tap exits from top
await page.keyboard.down(K.charge); await wf(3); await page.keyboard.up(K.charge); await wf(8);
log.push(["ladder-tap-exits", (await n7()).n7form==="base"]);

// ── 3. FOX SUMMON (Down+Ult) now works from BASE (no KCM needed) — far foe so the TBB persists ──
await page.evaluate(()=>{window.__harness.setN7Bond(10);window.__harness.fillEnergy();}); await prep(900);
const fb=await n7(); console.log("  firing fox summon from form:",fb.n7form,"(base, not KCM)");
await page.keyboard.down(DOWN); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(DOWN); await wf(16);
let fox=null; for(let i=0;i<30;i++){ await wf(1); fox=(await projs()).find(p=>p.name==="n7KuramaGiant"); if(fox)break; }
console.log("  fox summon fired from base:",fox?`fox scale=${fox.spriteScale}`:"MISSING");
log.push(["fox-summon-works-in-base", !!fox]);
await shot("55_fox_summon_base.png");
let tbb=0; for(let i=0;i<70;i++){ await wf(1); const p=(await projs()).find(p=>p.name==="n7Bijuudama"); if(p){tbb=Math.round((p.spriteScale||1)*174); break;} }
console.log("  fox TBB on-screen:",tbb,"px");
log.push(["fox-summon-tbb", tbb>600]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
