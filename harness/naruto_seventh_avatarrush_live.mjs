// Naruto (Seventh) — KURAMA AVATAR RUSH (Chakra Cloak + Down+Special): the animated gold avatar surges forward
// as a sweeping multi-hit attack. Verifies it fires in the cloak, spawns the 13-frame avatar, and damages.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "naruto_seventh_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".m4a":"audio/mp4",".css":"text/css",".json":"application/json" };
const server=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>console.log("  PAGEERR",e.message));
const state=()=>page.evaluate(()=>window.__harness.state());
const n7=()=>page.evaluate(()=>window.__harness.narutoSeventh());
const projs=()=>page.evaluate(()=>window.__harness.projectiles());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
const K={special:"l"}; let DOWN="s";
const log=[];
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1());
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.setN7Form("base");window.__harness.fillEnergy();});await wf(3);}
await settle(); await page.evaluate(()=>window.__harness.setN7Form("kcm")); await wf(4);
const a=await page.evaluate(()=>window.__harness.p1()); await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?150:-150)); await wf(2);
await page.evaluate(()=>window.__harness.healP2());
const oh0=(await n7()).oppHealth;
await page.keyboard.down(DOWN); await page.keyboard.down(K.special); await wf(4); await page.keyboard.up(K.special); await page.keyboard.up(DOWN);
let rush=null; for(let i=0;i<20;i++){ await wf(1); rush=(await projs()).find(p=>p.name==="n7AvatarRush"); if(rush){await page.screenshot({path:path.join(OUT,"84_avatar_rush.png")}); break;} }
console.log("  avatar rush proj:",rush?`frames=${rush.spriteFrames} scale=${rush.spriteScale?.toFixed?.(2)}`:"MISSING");
log.push(["rush-spawns-avatar", !!rush && rush.spriteFrames===13]);
await wf(50);
const dmg=oh0-(await n7()).oppHealth;
console.log("  avatar rush dmg:",dmg);
log.push(["rush-damages", dmg>80]);
const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
