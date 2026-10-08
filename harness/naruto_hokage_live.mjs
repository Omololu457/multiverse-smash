// Naruto (Hokage) — LIVE real-input verification. Drives the real app via Playwright,
// firing EVERY move through real page.keyboard key HOLDS (the per-frame input sampler misses
// zero-duration press()). Harness is used ONLY for boot/heal/position (project convention).
// Captures the VERIFY-list screenshots and asserts form/energy transitions from real input.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "naruto_hokage_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".m4a":"audio/mp4",".css":"text/css",".json":"application/json" };
const server = http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>console.log("  PAGEERR",e.message));
const state=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
const shot=async(n)=>{await page.screenshot({path:path.join(OUT,n)});console.log("  wrote",n);};
const K={light:"j",heavy:"k",special:"l",ult:"u",charge:"p"};
let FWD="d",BACK="a",DOWN="s";
const log=[];
// held button tap: down -> hold 3f (sampled) -> up -> warm frames, optional direction held throughout
async function move(btn,{dir=null,warm=12}={}){ if(dir) await page.keyboard.down(dir); await page.keyboard.down(btn); await wf(3); await page.keyboard.up(btn); if(dir) await page.keyboard.up(dir); await wf(warm); }

await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);

// ── 1. SELECT SCREEN (real roster render; prove naruto_hokage portrait present) ──
const sel=await page.evaluate(()=>window.__harness.showCharSelect("naruto","training"));
await wf(4); await shot("00_select.png");
const selOk = sel.roster.includes("naruto_hokage");
console.log("  select roster incl naruto_hokage:", selOk, "| size", sel.roster.length);
log.push(["select-screen", selOk]);

// ── boot a real match as naruto_hokage ──
await page.goto(`${base}/index.html?harness=1&p1=naruto_hokage&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_hokage",null,{timeout:15000,polling:32});
const a0=await p1(); FWD=a0.facing>=0?"d":"a"; BACK=a0.facing>=0?"a":"d";
console.log("  booted key",a0.key,"facing",a0.facing,"FWD",FWD,"energy",a0.energy);
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=150){await settle();const a=await p1();await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}

// ── 2. IDLE ──
await prep(170); await shot("01_idle.png");

// ── 3. RUN (hold forward) ──
await settle(); await page.keyboard.down(FWD); await wf(12); await shot("02_run.png"); await page.keyboard.up(FWD);

// ── 4. COMBO 1 (light string) ──
await prep(90); await move(K.light,{warm:6}); await move(K.light,{warm:5}); await shot("03_combo1.png");

// ── 5. RASENGAN (neutral + special) ──
let e0=(await prep(150)).energy; await move(K.special,{warm:12}); await shot("04_rasengan.png");
const eRas=(await p1()).energy; log.push(["rasengan-fired", eRas<e0]); console.log("  rasengan energy",Math.round(e0),"->",Math.round(eRas));

// ── 6. DOTON WALL (back + special) ──
e0=(await prep(150)).energy; await move(K.special,{dir:BACK,warm:12}); await shot("05_doton.png");
log.push(["doton-fired",(await p1()).energy<e0]);

// ── 7. RASENSHURIKEN (fwd + special) — bonus ──
e0=(await prep(160)).energy; await move(K.special,{dir:FWD,warm:16}); await shot("05b_rasenshuriken.png");
log.push(["rasenshuriken-fired",(await p1()).energy<e0]);

// ── 8. GAMABUNTA ULTIMATE (base, neutral + ultimate) ──
e0=(await prep(150)).energy; await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await wf(44); await shot("11_gamabunta.png");
log.push(["gamabunta-fired",(await p1()).energy<e0]); console.log("  base form pre-KCM:",(await p1()).currentForm);

// ── 9. CHAKRA CHARGE → KCM (hold charge; cinematic resolves ~45f after release) ──
await settle();
await page.keyboard.down(K.charge); await wf(30); await shot("06a_charge_pose.png"); await wf(20); await page.keyboard.up(K.charge);
await wf(22); await shot("06_kcm_cine.png");
// wait for cinematic resolve -> currentForm flips
await page.waitForFunction(()=>window.__harness.p1()?.currentForm==="naruto_hokage_kcm",null,{timeout:8000,polling:32}).catch(()=>{});
const kcm=await p1(); const inKCM=kcm.currentForm==="naruto_hokage_kcm";
console.log("  KCM entered:",inKCM,"currentForm",kcm.currentForm,"dmgMult",kcm.damageMult);
log.push(["kcm-entered",inKCM]);

async function kcmPrep(gap=150){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.fillEnergy();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");});const a=await p1();await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}

if(inKCM){
  // ── 10. KCM COMBO (light) ──
  await kcmPrep(90); await move(K.light,{warm:6}); await move(K.light,{warm:5}); await shot("07_kcm_combo.png");
  // ── 11. BIJUUDAMA (KCM neutral ult) ──
  e0=(await kcmPrep(230)).energy; await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await wf(36); await shot("08_bijuudama.png");
  log.push(["bijuudama-fired",(await p1()).energy<e0,"stillKCM",(await p1()).currentForm==="naruto_hokage_kcm"]);
  // ── 12. FOUR-TAILS RAGE (KCM fwd + ult) ──
  const a=await kcmPrep(150); const f=a.facing>=0?"d":"a";
  await page.keyboard.down(f); await wf(2); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(f); await wf(22); await shot("09_fourtails.png");
  // ── 13. RIKUDOU (KCM down + ult) ──
  await kcmPrep(150);
  await page.keyboard.down(DOWN); await wf(2); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(DOWN); await wf(28); await shot("10_rikudou.png");
  console.log("  after bursts currentForm:",(await p1()).currentForm);
}
console.log("RESULT",JSON.stringify(Object.fromEntries(log.map(l=>[l[0],l.slice(1)]))));
await browser.close(); server.close();
console.log("DONE ->",OUT);
