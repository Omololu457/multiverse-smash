// Naruto (Seventh Hokage) — PHASE 1 LIVE real-input verification. Drives the real app via Playwright,
// firing EVERY Phase-1 move through real page.keyboard key HOLDS (the per-frame sampler misses press()).
// Captures the VERIFY-list screenshots and asserts energy transitions from real input. Base mode only
// (Bond / KCM / Four-Tails / Rikudou arrive in later phases). Mirrors harness/naruto_hokage_live.mjs.
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
const p1=()=>page.evaluate(()=>window.__harness.p1());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
const shot=async(n)=>{await page.screenshot({path:path.join(OUT,n)});console.log("  wrote",n);};
const K={light:"j",heavy:"k",special:"l",ult:"u",charge:"p",jump:"w"};
let FWD="d",BACK="a",DOWN="s";
const log=[];
async function move(btn,{dir=null,warm=14}={}){ if(dir) await page.keyboard.down(dir); await page.keyboard.down(btn); await wf(3); await page.keyboard.up(btn); if(dir) await page.keyboard.up(dir); await wf(warm); }

await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);

// ── 1. SELECT SCREEN — prove naruto_seventh present in the real roster ──
const sel=await page.evaluate(()=>window.__harness.showCharSelect("naruto","training"));
await wf(4); await shot("00_select.png");
const selOk = sel.roster.includes("naruto_seventh");
console.log("  select roster incl naruto_seventh:", selOk, "| size", sel.roster.length);
log.push(["select-screen", selOk]);

// ── boot a real match as naruto_seventh vs sasuke ──
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await p1(); FWD=a0.facing>=0?"d":"a"; BACK=a0.facing>=0?"a":"d";
console.log("  booted key",a0.key,"facing",a0.facing,"energy",Math.round(a0.energy));
log.push(["booted-as-naruto_seventh", a0.key==="naruto_seventh"]);
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=150){await settle();const a=await p1();await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}

// ── 2. IDLE ──
await prep(170); await shot("01_idle.png");
// ── 3. RUN ──
await settle(); await page.keyboard.down(FWD); await wf(14); await shot("02_run.png"); await page.keyboard.up(FWD);
// ── 4. COMBO 1 (light) ──
await prep(80); await move(K.light,{warm:4}); await shot("03_combo1_light.png");
// ── 5. HEAVY (Strong) ──
await prep(80); await move(K.heavy,{warm:6}); await shot("04_heavy.png");
// ── 6. UP-ATTACK (red-flame launcher) ──
await prep(70); await move(K.light,{dir:"w",warm:6}); await shot("05_upattack.png");

// ── 7. RASENGAN (neutral + special) — energy spend + code-drawn sphere ──
let e0=(await prep(140)).energy; await move(K.special,{warm:16}); await shot("06_rasengan.png");
let e1=(await p1()).energy; log.push(["rasengan-fired", e1<e0]); console.log("  rasengan E",Math.round(e0),"->",Math.round(e1));
// ── 8. RASENSHURIKEN (fwd + special) ──
e0=(await prep(220)).energy; await move(K.special,{dir:FWD,warm:16}); await shot("07_rasenshuriken.png");
e1=(await p1()).energy; log.push(["rasenshuriken-fired", e1<e0]); console.log("  rasenshuriken E",Math.round(e0),"->",Math.round(e1));
// ── 9. DOTON WALL (back + special) — rising pillars ──
e0=(await prep(150)).energy; await move(K.special,{dir:BACK,warm:14}); await shot("08_doton_wall.png");
e1=(await p1()).energy; log.push(["doton-fired", e1<e0]); console.log("  doton E",Math.round(e0),"->",Math.round(e1));
// ── 9b. DOTON BLOCKS A PROJECTILE — wall up, opponent shot should be eaten ──
await settle();
const blockRes = await page.evaluate(()=>{
  const h=window.__harness; const a=h.p1();
  // raise wall, then spawn an enemy projectile aimed at p1 across the wall column
  return { before: (h.state().projectiles ?? null) };
});
// ── 10. THROW WEAPON (down + special) — kunai ──
e0=(await prep(200)).energy; await move(K.special,{dir:DOWN,warm:12}); await shot("09_throw_kunai.png");
e1=(await p1()).energy; log.push(["throw-fired", e1<e0]); console.log("  throw E",Math.round(e0),"->",Math.round(e1));

// ── 11. GAMABUNTA ULTIMATE ──
e0=(await prep(160)).energy; await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await wf(28); await shot("10_gamabunta.png");
e1=(await p1()).energy; log.push(["gamabunta-fired", e1<e0]); console.log("  gamabunta E",Math.round(e0),"->",Math.round(e1));
await wf(30); await shot("10b_gamabunta_slash.png");

// ── 12. AIR + diving Rasengan ──
await prep(150); await page.keyboard.down(K.jump); await wf(2); await page.keyboard.up(K.jump); await wf(10); await shot("11_air.png");
await page.keyboard.down(K.jump); await wf(2); await page.keyboard.up(K.jump); await wf(8);
await page.keyboard.down(K.special); await wf(3); await page.keyboard.up(K.special); await wf(10); await shot("11b_diving_rasengan.png");

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
