import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "goku_rose_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".m4a":"audio/mp4",".css":"text/css",".json":"application/json"};
const server=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>console.log("  PAGEERR",e.message));
const state=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1());
const projs=()=>page.evaluate(()=>window.__harness.projectiles().map(p=>p.name));
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
const shot=async(n)=>{await page.screenshot({path:path.join(OUT,n)});console.log("  wrote",n);};
const K={light:"j",heavy:"k",special:"l",ult:"u"}; let FWD="d",DOWN="s",UP="w",BACK="a";
const log=[];
await page.goto(`${base}/index.html?harness=1&p1=goku_rose&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="goku_rose",null,{timeout:15000,polling:32});
const a0=await p1(); FWD=a0.facing>=0?"d":"a"; BACK=a0.facing>=0?"a":"d";
console.log("  booted",a0.key);
log.push(["boots-as-goku_rose", a0.key==="goku_rose"]);
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(16);}
async function pollProj(n,fr=30){for(let i=0;i<fr;i++){await wf(1);if((await projs()).includes(n))return true;}return false;}
async function foe(g=110){await settle();const a=await p1();await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?g:-g));await wf(2);}
async function tap(btn,dir){if(dir)await page.keyboard.down(dir);await page.keyboard.down(btn);await wf(3);await page.keyboard.up(btn);if(dir)await page.keyboard.up(dir);await wf(16);}
// render check
await settle(); await shot("00_idle.png");
await foe(70); await check_dmg("light", async()=>{await tap(K.light);});
await foe(110);await check_dmg("heavy", async()=>{await tap(K.heavy);});
await foe(140);log.push(["kiBlast", (await (async()=>{await page.keyboard.down(K.special);await wf(2);await page.keyboard.up(K.special);return await pollProj("roseKi");})())]);
await foe(200);log.push(["blackKamehameha",(await (async()=>{await page.keyboard.down(DOWN);await page.keyboard.down(K.special);await wf(2);await page.keyboard.up(K.special);await page.keyboard.up(DOWN);return await pollProj("roseKameha");})())]);
await foe(90); await check_dmg("swordOfLight", async()=>{await tap(K.special,FWD);});
await foe(110);await check_dmg("scythe", async()=>{await tap(K.special,BACK);});
await foe(90); await check_dmg("roseAura", async()=>{await tap(K.special,UP);});
await foe(300);await check_dmg("ultimate", async()=>{await page.evaluate(()=>{window.__harness.p1().energy=200;window.__harness.p1().ultimateCooldown=0;});await tap(K.ult);await wf(60);},150);
await shot("01_action.png");
async function check_dmg(name, fn, thr=10){ await page.evaluate(()=>window.__harness.healP2()); const o=(await (async()=>{const s=await page.evaluate(()=>window.__harness.p2());return s?.health??1000;})()); await fn(); await wf(10); const n=(await page.evaluate(()=>window.__harness.p2()))?.health??1000; log.push([name, (o-n)>thr]); }
const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
