// Naruto (Seventh Hokage) — PHASE 2 LIVE verification: Kurama-Bond meter + Red Chakra + Four-Tails Rampage.
// Drives the real app via Playwright with real key holds. Verifies the meter FILLS from landed hits,
// the Red-Chakra aura at Bond 1, the Strong-Down (Down+Heavy) command normal + its Bond-1 buff, and the
// Four-Tails Rampage (committed combo, self-HP cost, damage, returns to base) at Bond 2.
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
async function move(btn,{dir=null,warm=12}={}){ if(dir) await page.keyboard.down(dir); await page.keyboard.down(btn); await wf(3); await page.keyboard.up(btn); if(dir) await page.keyboard.up(dir); await wf(warm); }

await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a"; BACK=a0.facing>=0?"a":"d";
console.log("  booted",a0.key,"facing",a0.facing);
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=80){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}

// ── 1. BOND FILLS FROM LANDED HITS (legit — land a point-blank light combo) ──
await page.evaluate(()=>window.__harness.setN7Bond(0));
await prep(40);
let b0=(await n7()).bondPts, hp0=(await n7()).oppHealth;
for(let i=0;i<8;i++){ await move(K.light,{warm:7}); }
let bHits=await n7();
console.log(`  hits: oppHP ${hp0}->${bHits.oppHealth} (connected=${bHits.oppHealth<hp0})  combo ${bHits.combo}  bondPts ${b0}->${bHits.bondPts} (bond ${bHits.bond})`);
log.push(["bond-fills-from-hits", bHits.bondPts>b0]);

// ── 2. BOND 1 RED CHAKRA — aura + buffed Strong Up (up-attack) damage multiplier ──
await page.evaluate(()=>window.__harness.setN7Bond(30));  // Bond 1
await prep(120); await wf(4);
const b1=await n7(); console.log("  Bond1 state:",JSON.stringify(b1));
log.push(["bond1-reached", b1.bond===1]);
await shot("20_bond1_red_aura.png");
// RED-CHAKRA buff proof — Strong Down damage at Bond 0 vs Bond 1 (expect ~+25%). Reliable: command normal.
async function strongDownDamage(bondPts){
  await settle(); await wf(20);                      // fully clear any prior move / cooldown
  await page.evaluate(p=>window.__harness.setN7Bond(p),bondPts);
  const a=await page.evaluate(()=>window.__harness.p1());
  await page.evaluate(x=>window.__harness.setP2X(x), a.x+(a.facing>=0?52:-52));
  await wf(2); await page.evaluate(()=>window.__harness.healP2());
  const hpA=(await n7()).oppHealth; const fired=await n7();
  await page.keyboard.down(DOWN); await page.keyboard.down(K.heavy); await wf(3); await page.keyboard.up(K.heavy); await page.keyboard.up(DOWN);
  await wf(34);
  const dealt=hpA-(await n7()).oppHealth;
  return dealt;
}
const dmg0=await strongDownDamage(0), dmg1=await strongDownDamage(30);
console.log(`  Strong Down dmg: Bond0=${dmg0}  Bond1=${dmg1}  (ratio ${(dmg1/Math.max(1,dmg0)).toFixed(2)})`);
log.push(["strong-down-fires-and-connects", dmg0>0]);          // Bond-0 Strong Down landed 43 → it fires
log.push(["bond1-redchakra-dmg-buff", dmg1>dmg0+3]);

// ── 3. STRONG DOWN command normal (Down+Heavy) — screenshot a fresh fire ──
await settle(); await wf(18); await page.evaluate(()=>window.__harness.setN7Bond(30)); await prep(60);
await page.keyboard.down(DOWN); await page.keyboard.down(K.heavy); await wf(6);
const bSD=await n7(); await shot("21_strong_down.png");
await page.keyboard.up(K.heavy); await page.keyboard.up(DOWN);
console.log("  Strong Down fresh fire move/cast:",bSD.move,bSD.cast); await wf(24);

// ── 4. FOUR-TAILS at Bond 1 should be LOCKED (needs Bond 2) ──
await page.evaluate(()=>window.__harness.setN7Bond(30));  // Bond 1
await prep(120);
const hpA=(await n7()).health;
await move(K.special,{dir:UP,warm:10});
const lockedState=await n7();
console.log("  Four-Tails @Bond1 (should NOT fire): cast",lockedState.cast,"hpΔ",hpA-lockedState.health);
log.push(["fourtails-locked-at-bond1", lockedState.cast!=="n7FourTails"]);

// ── 5. FOUR-TAILS at Bond 2 — fires, self-HP cost, committed, returns to base ──
await page.evaluate(()=>window.__harness.setN7Bond(60));  // Bond 2
await prep(110);
const before=await n7();
await page.evaluate(()=>window.__harness.healP2());
await page.keyboard.down(UP); await page.keyboard.down(K.special); await wf(3); await page.keyboard.up(K.special); await page.keyboard.up(UP);
await wf(6);
const casting=await n7();
console.log("  Four-Tails cast:",casting.cast,"invuln",casting.invuln,"selfHPΔ",before.health-casting.health);
log.push(["fourtails-fires-bond2", casting.cast==="n7FourTails"]);
log.push(["fourtails-self-hp-cost", (before.health-casting.health)>50]);
const oppBefore=casting.oppHealth;
await wf(24); await shot("22_fourtails_mid.png");
await wf(80);
const midDmg=oppBefore-(await n7()).oppHealth;
console.log("  Four-Tails opponent damage:",midDmg);
log.push(["fourtails-damages-opponent", midDmg>80]);
await wf(40);  // let it fully finish → returns to base, invuln clears
const after=await n7();
console.log("  Four-Tails done: cast",after.cast,"invuln",after.invuln);
log.push(["fourtails-ends-base", after.invuln===0]);
await shot("23_fourtails_end_base.png");

// ── 6. ENERGY LABEL shows Bond ──
await page.evaluate(()=>window.__harness.setN7Bond(60)); await prep(150); await wf(3); await shot("24_label_bond2.png");

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
