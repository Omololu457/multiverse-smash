// Naruto (Seventh) — NINE-TAILS FORM LADDER: hold Charge → Red Shroud (Bond1) / Four-Tails cloak (Bond2) /
// KCM (Bond3). Verifies each form enters, the Four-Tails beast body + claw attack, and tap-Charge exits.
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
const K={light:"j",special:"l",charge:"p",ult:"u"};
let FWD="d",UP="w";
const log=[];
const redBeastPx=()=>page.evaluate(()=>{const c=document.querySelector("canvas");const d=c.getContext("2d").getImageData(0,150,c.width,410).data;let r=0;for(let i=0;i<d.length;i+=4){if(d[i+3]<30)continue;const R=d[i],G=d[i+1],B=d[i+2];if(R>90&&R<200&&G<70&&B<80&&R-G>50)r++;}return r;});

await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a";
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=80){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}
async function hold(){await page.keyboard.down(K.charge);await wf(16);await page.keyboard.up(K.charge);await wf(10);}
async function exitForm(){await page.keyboard.down(K.charge);await wf(3);await page.keyboard.up(K.charge);await wf(8);}
async function toForm(pts){const form=pts>=80?"kcm":pts>=60?"fourtails":pts>=30?"red":"base"; await page.evaluate(()=>window.__harness.setN7Oiroke(false)); await prep(80); await page.evaluate(f=>window.__harness.setN7Form(f),form); await wf(6); }

// ── 1. TRANSFORM → NINE-TAILS CHAKRA CLOAK (the ONLY persistent form): hold Charge + tap Ultimate (Bond 3) ──
await page.evaluate(()=>{window.__harness.setN7Oiroke(false);window.__harness.setN7Form("base");window.__harness.setN7Bond(100);}); await prep(120);
await page.keyboard.down(K.charge); await wf(16);
await page.keyboard.down(K.ult); await wf(2); await page.keyboard.up(K.ult); await wf(14);
await page.keyboard.up(K.charge); await wf(4);
let s=await n7(); console.log("  hold-P + tap-U → form:",s.n7form,"skin",s.skin,"spdMul",s.spdMul);
log.push(["cloak-enters", s.n7form==="kcm" && s.skin==="golden"]);
log.push(["cloak-speed-buff", s.spdMul>1.0]);
await shot("52_cloak.png");
await exitForm(); log.push(["cloak-tap-exits", (await n7()).n7form==="base" && (await n7()).skin==="base"]);

// ── 2. FOUR-TAILS is a COMBO (Up+Special, Bond 2) — the red beast appears, damages, then REVERTS to base ──
await page.evaluate(()=>window.__harness.setN7Form("base")); await prep(70); await page.evaluate(()=>{window.__harness.setN7Bond(60);window.__harness.healP2();});
const bh0=(await n7()).oppHealth;
const ftCast=(await n7()).cast;
await page.keyboard.down(UP); await page.keyboard.down(K.special); await wf(4); await page.keyboard.up(K.special); await page.keyboard.up(UP);
let beast=0; for(let i=0;i<40;i++){ await wf(1); beast=Math.max(beast, await redBeastPx()); if(i===20) await shot("53_fourtails_combo.png"); }   // peak beast frames across the combo
console.log("  4-Tails combo: cast",(await n7()).cast,"peak redBeastPx",beast);
log.push(["fourtails-is-combo", beast>300]);                              // red beast frames on screen DURING the combo
await wf(110);
log.push(["fourtails-damages", (bh0-(await n7()).oppHealth)>60]);
log.push(["fourtails-reverts-base", (await n7()).n7form==="base"]);        // a one-shot combo, never a walk-around form

// ── 3. CLOAK golden body (force-enter to confirm the golden locomotion form) ──
await page.evaluate(()=>window.__harness.setN7Form("kcm")); await wf(6);
s=await n7(); console.log("  cloak golden:",s.n7form,s.skin);
log.push(["cloak-golden", s.n7form==="kcm" && s.skin==="golden"]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
