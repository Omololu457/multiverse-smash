// Naruto (Seventh) — FULL-FRAMES visual proof: each transformation now plays its OWN locomotion/attack
// frames from the sheet (golden KCM run/dash/jump/chakra-arm; Four-Tails quadruped run/claw/chakra-arm slam).
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
const K={light:"j",heavy:"k",charge:"p"};
let FWD="d";
const log=[];
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a";
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
// sprite-frame probe: which sheet is the p1 body currently drawing?
const bodySheet=()=>page.evaluate(()=>{const f=window.__harness.p1(); return (f&&f._skinAnimName)||null;});

async function form(f){ await settle(); await page.evaluate(x=>window.__harness.setN7Form(x),f); await wf(6); }
async function walk(frames=24){ await page.keyboard.down(FWD); await wf(frames); await page.keyboard.up(FWD); }

// KCM golden locomotion
await form("kcm"); await walk(18); await shot("60_kcm_run.png");
log.push(["kcm-form", (await n7()).n7form==="kcm"]);
await page.keyboard.down(K.heavy); await wf(4); await shot("61_kcm_arm.png"); await page.keyboard.up(K.heavy); await wf(14);
log.push(["kcm-still-golden-after-heavy", (await n7()).skin==="golden"]);

// Four-Tails beast locomotion
await form("fourtails"); await walk(18); await shot("62_ft_run.png");
log.push(["ft-form", (await n7()).n7form==="fourtails"]);
await page.evaluate(()=>window.__harness.healP2());
await page.keyboard.down(K.light); await wf(4); await shot("63_ft_claw.png"); await page.keyboard.up(K.light); await wf(14);
await page.keyboard.down(K.heavy); await wf(4); await shot("64_ft_arm.png"); await page.keyboard.up(K.heavy); await wf(14);
log.push(["ft-still-beast-after-attacks", (await n7()).skin==="golden"]);  // skin="golden" sentinel = _skinAnim set

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
