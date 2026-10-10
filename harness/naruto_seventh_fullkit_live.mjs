// Naruto (Seventh) — FULL-KIT real-input sweep. Drives every move with REAL keyboard inputs (not forced state)
// and verifies each fires. Bond is pre-set (so no grind) but every MOVE uses its real input path.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".m4a":"audio/mp4",".css":"text/css",".json":"application/json" };
const server=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});
await new Promise(r=>server.listen(0,"127.0.0.1",r)); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>console.log("  PAGEERR",e.message));
const state=()=>page.evaluate(()=>window.__harness.state());
const n7=()=>page.evaluate(()=>window.__harness.narutoSeventh());
const projs=()=>page.evaluate(()=>window.__harness.projectiles().map(p=>p.name));
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
const K={light:"j",heavy:"k",special:"l",ult:"u",charge:"p"}; let FWD="d",BACK="a",DOWN="s",UP="w";
const log=[];
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a"; BACK=a0.facing>=0?"a":"d";
async function reset(bond=0, form="base", gap=90){
  await wf(18);   // let any prior attack finish (resetFighterInput does not clear fighter.attacking)
  await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});
  await page.evaluate(f=>window.__harness.setN7Form(f),form);
  await page.evaluate(b=>window.__harness.setN7Bond(b),bond);
  await page.evaluate(()=>{window.__harness.setN7RikudouUsed(false);window.__harness.fillEnergy();});
  const a=await page.evaluate(()=>window.__harness.p1()); await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap)); await wf(3);
}
async function pollProj(name,n=30){for(let i=0;i<n;i++){await wf(1);if((await projs()).includes(name))return true;}return false;}
async function tap(btn,dir){ if(dir)await page.keyboard.down(dir); await page.keyboard.down(btn); await wf(3); await page.keyboard.up(btn); if(dir)await page.keyboard.up(dir); await wf(16); }
async function check(name, fn){ try{ log.push([name, await fn()]); }catch(e){ console.log("  ERR",name,e.message); log.push([name,false]); } }

// BASE normals + specials
await reset(0,"base",70); await check("light",      async()=>{const o=(await n7()).oppHealth; await tap(K.light); return (await n7()).oppHealth<o;});
await reset(0,"base",70); await check("heavy",      async()=>{const o=(await n7()).oppHealth; await tap(K.heavy); return (await n7()).oppHealth<o;});
await reset(0,"base",120);await check("rasengan",   async()=>{await page.keyboard.down(K.special);await wf(2);await page.keyboard.up(K.special);for(let i=0;i<10;i++){await wf(1);const c=(await n7()).cast;if(c==="n7Rasengan"||(await projs()).includes("n7Rasengan"))return true;}return false;});
await reset(0,"base",160);await check("rasenshuriken",async()=>{await page.keyboard.down(FWD);await page.keyboard.down(K.special);await wf(2);await page.keyboard.up(K.special);await page.keyboard.up(FWD);for(let i=0;i<10;i++){await wf(1);const c=(await n7()).cast;if(c==="n7Rsk"||(await projs()).includes("n7Rasenshuriken"))return true;}return false;});
await reset(0,"base",90); await check("dotonWall",  async()=>{await tap(K.special,BACK); return (await projs()).includes("n7DotonWall")||(await n7()).cast==="n7Doton";});
await reset(0,"base",120);await check("gamabunta",  async()=>{await tap(K.special,DOWN); await wf(30); return (await projs()).includes("n7Gamabunta")||(await n7()).cast==="n7Kuchiyose";});
await reset(60,"base",80); await check("fourTailsCombo",async()=>{await page.keyboard.down(UP);await page.keyboard.down(K.special);await wf(3);await page.keyboard.up(K.special);await page.keyboard.up(UP);let ok=false;for(let i=0;i<10;i++){await wf(1);if((await n7()).cast==="n7FourTails"){ok=true;break;}}return ok;});
// TRANSFORM via REAL hold-P + tap-U
await reset(85,"base",120); await check("transform-realinput",async()=>{await page.keyboard.down(K.charge);await wf(14);await page.keyboard.down(K.ult);await wf(2);await page.keyboard.up(K.ult);await wf(10);await page.keyboard.up(K.charge);await wf(4); return (await n7()).n7form==="kcm";});
// CLOAK specials
await reset(85,"kcm",90); await check("rasenkyugan", async()=>{await tap(K.special); return (await n7()).cast==="n7Rasenkyugan";});
await reset(85,"kcm",160);await check("wakusei",     async()=>{await tap(K.special,FWD); return (await n7()).cast==="n7Wakusei";});
await reset(85,"kcm",120);await check("avatarRush",  async()=>{await tap(K.special,DOWN); for(let i=0;i<16;i++){await wf(1);if((await projs()).includes("n7AvatarRush"))return true;} return false;});
// ULTIMATES (real input)
await reset(100,"base",700);await check("bijuudama-autohit",async()=>{const o=(await n7()).oppHealth;await tap(K.ult);await wf(70);return (await n7()).oppHealth<o-150;});
await reset(100,"base",700);await check("foxSummon",  async()=>{await tap(K.ult,DOWN); for(let i=0;i<20;i++){await wf(1);if((await projs()).includes("n7KuramaGiant"))return true;}return false;});
await reset(100,"base",120);await check("rikudou",    async()=>{await tap(K.ult,FWD); return (await n7()).cast==="n7Rikudou";});
await reset(100,"base",120);await check("avatarSummon",async()=>{await page.keyboard.down(UP);await page.keyboard.down(K.ult);await wf(3);await page.keyboard.up(K.ult);await page.keyboard.up(UP);await wf(10);return (await n7()).avatar===true;});
// exit cloak (tap P)
await reset(85,"kcm",120); await check("tap-exit",   async()=>{await page.keyboard.down(K.charge);await page.keyboard.up(K.charge);for(let i=0;i<20;i++){await wf(1);if((await n7()).n7form==="base")return true;}return false;});

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
