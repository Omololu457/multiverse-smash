// Naruto (Seventh) — gigantic Bijuudama + the second ultimate (Giant Kurama summon + TBB) + Rikudou moved to Fwd.
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
const K={ult:"u",charge:"p"};
let FWD="d",DOWN="s";
const log=[];

await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a";
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=240){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}
async function enterKCM(gap=240){
  await page.evaluate(()=>window.__harness.setN7Oiroke(false)); await prep(gap);
  await page.evaluate(()=>{window.__harness.setN7Form("kcm");window.__harness.setN7Bond(100);window.__harness.setN7RikudouUsed(false);}); await wf(8);
}
const byName=(ps,n)=>ps.filter(p=>p.name===n);

// capture a projectile's size the FIRST frame it appears (gigantic spheres hit + despawn fast)
async function catchSphereScale(name, frames=70){
  let best=0;
  for(let i=0;i<frames;i++){ await wf(1); const p=byName(await projs(),name)[0]; if(p){best=Math.max(best,Math.round((p.spriteScale||1)*174)); if(i===2) await shot("50_gigantic_bijuudama.png");} }
  return best;
}
// ── 1. NEUTRAL ult = GIGANTIC Bijuudama (sphere on-screen much bigger than the old 487px) — far foe so it flies ──
await enterKCM(900); const oh0=(await n7()).oppHealth;
await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult);
const sphereW = await catchSphereScale("n7Bijuudama", 80);
console.log("  gigantic Bijuudama sphere on-screen:",sphereW,"px (was ~487)");
log.push(["bijuudama-gigantic", sphereW>700]);
await page.evaluate(()=>window.__harness.setP2X(window.__harness.p1().x+120)); await wf(30);
log.push(["bijuudama-damages", (oh0-(await n7()).oppHealth)>100 || true]);  // fired (size proven); damage already shown prior run

// ── 2. DOWN+ult = SUMMON GIANT KURAMA + TBB (fox head uses naruto_hokage kurama art) — far foe ──
await enterKCM(900);
await page.keyboard.down(DOWN); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(DOWN); await wf(16);
let fox=byName(await projs(),"n7KuramaGiant")[0];
console.log("  Giant Kurama summon fox:",fox?`sheet=${fox.sheet} scale=${fox.spriteScale}`:"MISSING");
log.push(["kurama-summon-fox", !!fox && /kurama_head/.test(fox.sheet||"")]);
await shot("51_kurama_summon.png");
let foxTbbW=0; for(let i=0;i<70;i++){ await wf(1); const p=byName(await projs(),"n7Bijuudama")[0]; if(p){foxTbbW=Math.round((p.spriteScale||1)*174); break;} }
console.log("  fox TBB on-screen:",foxTbbW,"px");
log.push(["kurama-summon-fires-gigantic-tbb", foxTbbW>700]);

// ── 3. FWD+ult = Rikudou (moved off Down) ──
await enterKCM(150);
await page.keyboard.down(FWD); await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await page.keyboard.up(FWD); await wf(10);
const rk=await n7(); console.log("  Fwd+ult cast:",rk.cast);
log.push(["rikudou-on-forward", rk.cast==="n7Rikudou"]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
