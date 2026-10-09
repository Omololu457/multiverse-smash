// Naruto (Seventh) — PHASE 4 REWORK verification: Gamabunta→Down+Special, Throw→air, ultimate=Bijuudama
// (KCM-only), Rikudou (KCM Down+Ult, Bond 4, once/round, ends-base+resets-bond), Oiroke opt-in distraction.
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
let FWD="d",BACK="a",DOWN="s",UP="w";
const log=[];
async function move(btn,{dir=null,warm=14}={}){ if(dir) await page.keyboard.down(dir); await page.keyboard.down(btn); await wf(3); await page.keyboard.up(btn); if(dir) await page.keyboard.up(dir); await wf(warm); }

await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a"; BACK=a0.facing>=0?"a":"d";
console.log("  booted",a0.key);
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=120){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}
async function enterKCM(gap=120){
  await page.evaluate(()=>window.__harness.setN7Oiroke(false)); await prep(gap);
  await page.evaluate(()=>window.__harness.setN7Form("kcm")); await wf(8);   // force KCM (ladder-agnostic)
}

// ── 1. GAMABUNTA is now a Down+Special (ground) — fires + damages ──
await prep(150); await page.evaluate(()=>window.__harness.healP2());
let e0=(await n7()).energy, oh0=(await n7()).oppHealth;
await page.keyboard.down(DOWN); await page.keyboard.down(K.special); await wf(6); const gCast=await n7(); await page.keyboard.up(K.special); await page.keyboard.up(DOWN);
await shot("40_gamabunta_special.png"); await wf(56);
let g=await n7();
console.log("  Gamabunta(Down+Sp ground): cast",gCast.cast,"E",e0,"->",g.energy,"oppDmg",oh0-g.oppHealth);
log.push(["gamabunta-is-down-special", gCast.cast==="n7Kuchiyose" && g.energy<e0]);
log.push(["gamabunta-damages", (oh0-g.oppHealth)>80]);

// ── 2. BASE ultimate now FIRES the Bijuudama (no longer KCM-gated) ──
await page.evaluate(()=>window.__harness.setN7Form("base")); await prep(150); e0=(await n7()).energy;
await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await wf(10);
let u=await n7();
console.log("  base ultimate: cast",u.cast,"E",e0,"->",u.energy,"(fires Bijuudama from base now)");
log.push(["base-ult-fires-bijuudama", u.cast==="n7Bijuudama" && u.energy<e0]);

// ── 3. KCM ultimate = BIGGER Bijuudama ──
await enterKCM(220); await page.evaluate(()=>window.__harness.healP2());
const bd0=await n7();
await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await wf(16);
let bd=await n7();
console.log("  KCM ultimate: cast",bd.cast);
log.push(["kcm-ult-is-bijuudama", bd.cast==="n7Bijuudama"]);
await wf(70); const bdDmg=bd0.oppHealth-(await n7()).oppHealth;
console.log("  Bijuudama dmg",bdDmg); log.push(["bijuudama-damages", bdDmg>100]);
await shot("41_bijuudama_ult.png");

// ── 4. RIKUDOU (KCM + Bond 4 + Fwd+Ult, once/round, ends base + resets bond) ──
await enterKCM(150); await page.evaluate(()=>{window.__harness.setN7Bond(100);window.__harness.setN7RikudouUsed(false);window.__harness.healP2();});
const rk0=await n7();
await page.keyboard.down(FWD); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(FWD); await wf(14);
let rk=await n7();
console.log("  Rikudou: cast",rk.cast,"bond",rk0.bond,"->",rk.bond,"invuln",rk.invuln);
log.push(["rikudou-fires-bond4", rk.cast==="n7Rikudou"]);
await shot("42_rikudou.png");
await wf(90); const rkDmg=rk0.oppHealth-(await n7()).oppHealth;
const rkEnd=await n7();
console.log("  Rikudou done: dmg",rkDmg,"kcm",rkEnd.kcm,"skin",rkEnd.skin,"bond",rkEnd.bond);
log.push(["rikudou-damages", rkDmg>100]);
log.push(["rikudou-ends-base", rkEnd.kcm===false && rkEnd.skin==="base"]);
log.push(["rikudou-resets-bond", rkEnd.bond===0]);
// once per round: re-enter KCM + Bond4 but _n7RikudouUsed stays true → should NOT fire
await enterKCM(150); await page.evaluate(()=>window.__harness.setN7Bond(100));   // note: setN7RikudouUsed NOT reset → still used
await page.keyboard.down(FWD); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(FWD); await wf(10);
let rk2=await n7();
console.log("  Rikudou 2nd attempt (same round): cast",rk2.cast,"(should NOT be n7Rikudou)");
log.push(["rikudou-once-per-round", rk2.cast!=="n7Rikudou"]);

// ── 5. OIROKE opt-in: default OFF → tap does nothing; ON → distracts ──
await page.evaluate(()=>window.__harness.setN7Oiroke(false)); await prep(120);
await page.keyboard.down(K.charge); await wf(4); await page.keyboard.up(K.charge); await wf(8);
let offstate=await n7();
log.push(["oiroke-off-by-default", offstate.cast!=="n7Oiroke"]);
await page.evaluate(()=>window.__harness.setN7Oiroke(true)); await prep(120);
const oppCd0=await page.evaluate(()=>window.__harness.narutoSeventh("p2")?.move);   // just to touch p2
await page.keyboard.down(K.charge); await wf(4); await page.keyboard.up(K.charge); await wf(16);
let oi=await n7();
console.log("  Oiroke(enabled, charge-tap): cast",oi.cast);
log.push(["oiroke-fires-when-on", oi.cast==="n7Oiroke"]);
await shot("43_oiroke.png");

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
