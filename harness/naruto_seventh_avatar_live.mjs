// Naruto (Seventh) — NINE-TAILS AVATAR summon (Up+Ultimate, needs MAX Bond 4). A temporary assist: the giant
// gold Kurama avatar looms behind Naruto ~6s, boosts his strikes (×dmg), then despawns. Verifies trigger,
// Bond-4 gate, damage boost, auto-despawn, and captures the looming avatar.
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
const K={light:"j",ult:"u"}; let UP="w";
const log=[];
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.setN7Form("base");window.__harness.fillEnergy();});await wf(3);}

// ── 1. Up+Ult at Bond < 4 → NO avatar (falls through to Bijuudama) ──
await settle(); await page.evaluate(()=>window.__harness.setN7Bond(50));   // Bond 2
await page.keyboard.down(UP); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(UP); await wf(8);
console.log("  Up+Ult @Bond2: avatar",(await n7()).avatar,"cast",(await n7()).cast);
log.push(["bond-gate", (await n7()).avatar===false]);

// ── 2. Up+Ult at Bond 4 → AVATAR summons ──
await settle(); await page.evaluate(()=>window.__harness.setN7Bond(100));   // Bond 4
await page.keyboard.down(UP); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(UP); await wf(12);
let a=await n7();
console.log("  Up+Ult @Bond4: avatar",a.avatar,"timer",a.avatarTimer);
log.push(["avatar-summons", a.avatar===true && a.avatarTimer>300]);
await shot("80_avatar_summon.png");

// ── 3. while active, his strikes are BOOSTED (damageMultiplier > 1) ──
log.push(["avatar-boosts-dmg", (await n7()).dmgMul>1.2]);

// ── 4. PERSISTS through its window (~6s), not a flash ──
await wf(180); let mid=await n7();
console.log("  mid-window (+180f): avatar",mid.avatar,"timer",mid.avatarTimer);
log.push(["avatar-persists", mid.avatar===true && mid.avatarTimer>120 && mid.avatarTimer<220]);

// ── 5. auto-despawns after its full window ──
await wf(210);
console.log("  after full window: avatar",(await n7()).avatar);
log.push(["avatar-despawns", (await n7()).avatar===false]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
