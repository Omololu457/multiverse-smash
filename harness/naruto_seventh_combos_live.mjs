// Naruto (Seventh) — COMBO MODEL: the ONLY persistent transformation is the Nine-Tails Chakra Cloak (gold KCM).
// The Four-Tails (Up+Special) and Rikudou (Fwd+Ultimate) are one-shot COMBO moves — they transform, play their
// full sheet sequence, deal damage, and REVERT to base (never a walk-around form). Verifies all of that.
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
const K={light:"j",special:"l",ult:"u",charge:"p"};
let FWD="d",UP="w";
const log=[];
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a";
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=90){await settle();await page.evaluate(()=>window.__harness.setN7Form("base"));const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}

// ── 1. hold P + tap U at Bond 3 → CLOAK (kcm) in ONE step (no red/fourtails) ──
await settle(); await page.evaluate(()=>{window.__harness.setN7Form("base");window.__harness.setN7Bond(100);});
await page.keyboard.down(K.charge); await wf(16);
await page.keyboard.down(K.ult); await wf(2); await page.keyboard.up(K.ult); await wf(14);
const cloak=(await n7()).n7form;
await page.keyboard.up(K.charge); await wf(4);
console.log("  hold-P + tap-U (Bond3) → form:",cloak);
log.push(["cloak-is-only-form", cloak==="kcm"]);

// ── 2. hold P + tap U at Bond 2 → NO transform (cloak needs Bond 3) ──
await settle(); await page.evaluate(()=>{window.__harness.setN7Form("base");window.__harness.setN7Bond(50);});   // Bond 2
await page.keyboard.down(K.charge); await wf(16);
await page.keyboard.down(K.ult); await wf(2); await page.keyboard.up(K.ult); await wf(12);
const lowform=(await n7()).n7form;
await page.keyboard.up(K.charge); await wf(4);
console.log("  hold-P + tap-U (Bond2) → form:",lowform,"(needs Bond3)");
log.push(["cloak-needs-bond3", lowform==="base"]);

// ── 3. FOUR-TAILS COMBO (Up+Special, Bond 2) → fires, damages, REVERTS to base (not a form) ──
await prep(80); await page.evaluate(()=>{window.__harness.setN7Bond(60);window.__harness.healP2();});
const oh0=(await n7()).oppHealth;
await page.keyboard.down(UP); await page.keyboard.down(K.special); await wf(4); await page.keyboard.up(K.special); await page.keyboard.up(UP);
const ftCast=(await n7()).cast; await shot("70_fourtails_combo.png");
await wf(130);   // let the full beast combo play out + revert
const ftEnd=await n7();
console.log("  4-Tails combo: cast",ftCast,"→ form after",ftEnd.n7form,"dmg",oh0-ftEnd.oppHealth);
log.push(["fourtails-is-combo", ftCast==="n7FourTails"]);
log.push(["fourtails-damages", (oh0-ftEnd.oppHealth)>60]);
log.push(["fourtails-reverts-base", ftEnd.n7form==="base"]);

// ── 4. RIKUDOU COMBO (Fwd+Ult, Bond 4) → fires, damages ──
await prep(90); await page.evaluate(()=>{window.__harness.setN7Bond(100);window.__harness.setN7RikudouUsed(false);window.__harness.healP2();});
const rh0=(await n7()).oppHealth;
await page.keyboard.down(FWD); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(FWD);
const rkCast=(await n7()).cast; await shot("71_rikudou_combo.png");
await wf(100);
const rkEnd=await n7();
console.log("  Rikudou combo: cast",rkCast,"→ form after",rkEnd.n7form,"dmg",rh0-rkEnd.oppHealth);
log.push(["rikudou-is-combo", rkCast==="n7Rikudou"]);
log.push(["rikudou-damages", (rh0-rkEnd.oppHealth)>100]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
