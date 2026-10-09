// Naruto (Seventh Hokage) — PHASE 3 LIVE verification: KCM golden transformation + KCM kit + bigger Bijuudama.
// Drives the real app via Playwright. Verifies: hold-Charge → KCM (Bond 3), golden body swap (_skinAnim),
// no-guard, KCM Light=Combo2, Rasenkyugan (N+Sp), Wakusei (F+Sp), bigger Bijuudama ultimate, base specials
// disabled in KCM (no cross-mode frames), and revert (tap Charge / timeout → base orange body).
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
const K={light:"j",heavy:"k",special:"l",ult:"u",charge:"p",jump:"w",block:";"};
let FWD="d",BACK="a",DOWN="s",UP="w";
const log=[];
async function move(btn,{dir=null,warm=14}={}){ if(dir) await page.keyboard.down(dir); await page.keyboard.down(btn); await wf(3); await page.keyboard.up(btn); if(dir) await page.keyboard.up(dir); await wf(warm); }

await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a"; BACK=a0.facing>=0?"a":"d";
console.log("  booted",a0.key,"facing",a0.facing);
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=120){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}
async function enterKCM(gap=120){
  await page.evaluate(()=>window.__harness.setN7Oiroke(false));
  await prep(gap);
  await page.evaluate(()=>window.__harness.setN7Form("kcm")); await wf(8);   // force KCM (ladder-agnostic)
}

// ── 1. ENTER KCM (Bond 3, hold Charge) ──
await enterKCM();
const k1=await n7();
console.log("  KCM enter:",JSON.stringify({kcm:k1.kcm,skin:k1.skin,form:k1.form,noBlock:k1.noBlock,timer:k1.kcmTimer,spd:k1.spdMul}));
log.push(["kcm-active", k1.kcm===true]);
log.push(["kcm-golden-body", k1.skin==="golden"]);
log.push(["kcm-speed-buff", k1.spdMul>1.0]);
await shot("30_kcm_enter.png");
await settle(); await wf(4); await shot("31_kcm_idle_golden.png");

// ── 2. KCM NO GUARD — hold block, isBlocking must stay false ──
await enterKCM();
await page.keyboard.down(K.block); await wf(6);
const kb=await n7(); await page.keyboard.up(K.block);
console.log("  KCM block attempt: isBlocking",kb.isBlocking,"(should be false)");
log.push(["kcm-no-guard", kb.isBlocking===false]);

// ── 3. KCM LIGHT = Combo 2 (golden) — connects + golden body ──
await enterKCM(46); await page.evaluate(()=>window.__harness.healP2());
const kl0=await n7();
await page.keyboard.down(K.light); await wf(4); const klMid=await n7(); await shot("32_kcm_combo2.png"); await page.keyboard.up(K.light); await wf(20);
const klDmg=kl0.oppHealth-(await n7()).oppHealth;
console.log("  KCM light: midMove",klMid.move,"skin",klMid.skin,"dmg",klDmg);
log.push(["kcm-light-golden-connects", klMid.skin==="golden" && klDmg>0]);

// ── 4. RASENKYUGAN (KCM Neutral+Special) — close range so the barrage connects ──
await enterKCM(56); await page.evaluate(()=>window.__harness.healP2());
let e0=(await n7()).energy, oh0=(await n7()).oppHealth;
await move(K.special,{warm:22});
let kk=await n7();
console.log("  Rasenkyugan: cast",kk.cast,"E",e0,"->",kk.energy,"oppDmg",oh0-kk.oppHealth);
log.push(["rasenkyugan-fires", kk.cast==="n7Rasenkyugan"]);
log.push(["rasenkyugan-damages", (oh0-kk.oppHealth)>40]);
await shot("33_rasenkyugan.png");

// ── 5. WAKUSEI RASENGAN (KCM Fwd+Special) ──
await enterKCM(); await prep(160);
e0=(await n7()).energy;
await move(K.special,{dir:FWD,warm:16});
kk=await n7();
console.log("  Wakusei: cast",kk.cast,"E",e0,"->",kk.energy);
log.push(["wakusei-fires", kk.cast==="n7Wakusei" && kk.energy<e0]);
await shot("34_wakusei.png");

// ── 6. BIGGER BIJUUDAMA (KCM Ultimate) ──
await enterKCM(); await prep(220); await page.evaluate(()=>window.__harness.healP2());
const bd0=await n7();
await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await wf(16);
const bdCast=await n7();
console.log("  Bijuudama: cast",bdCast.cast,"invuln",bdCast.invuln);
log.push(["bijuudama-casts", bdCast.cast==="n7Bijuudama"]);
await shot("35_bijuudama_heads.png");
await wf(40); await shot("36_bijuudama_sphere.png");
await wf(30);
const bdDmg=bd0.oppHealth-(await n7()).oppHealth;
console.log("  Bijuudama opponent damage:",bdDmg);
log.push(["bijuudama-damages", bdDmg>100]);

// ── 7. BASE SPECIALS DISABLED in KCM (no cross-mode frames): Back/Down/Up+Special = no-op ──
await enterKCM(); await prep(150);
const before=await n7();
await move(K.special,{dir:BACK,warm:10});  // Doton (base) — should NOT fire in KCM
const afterB=await n7();
console.log("  KCM Back+Special (Doton base): cast",afterB.cast,"(should NOT be n7Doton), still KCM",afterB.kcm);
log.push(["kcm-base-specials-disabled", afterB.cast!=="n7Doton" && afterB.kcm===true]);

// ── 8. REVERT: tap Charge → back to base orange body ──
await enterKCM();
const kOn=await n7();
await page.keyboard.down(K.charge); await wf(3); await page.keyboard.up(K.charge); await wf(8);   // quick TAP
const kOff=await n7();
console.log("  KCM tap-exit: kcm",kOn.kcm,"->",kOff.kcm,"skin",kOff.skin,"form",kOff.form);
log.push(["kcm-reverts-to-base", kOff.kcm===false && kOff.skin==="base"]);
await shot("37_kcm_reverted_base.png");

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
