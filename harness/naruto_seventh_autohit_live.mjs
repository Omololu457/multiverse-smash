// Naruto (Seventh) — Bijuudama ULTIMATE is now an AUTO-HIT (guaranteed, range-independent, like Obito/Minato).
// Proves: foe placed FAR away still takes the full blast; a held block chips it to ~half.
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
const K={ult:"u",block:";"};
let FWD="d";
const log=[];
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a";
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
// place foe FAR (near the opposite edge) so a travelling projectile could NOT connect
async function farFoe(){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?900:-900));await wf(2);}

// 1. NEUTRAL ult vs FAR foe → auto-hit lands full damage
await farFoe(); const oh0=(await n7()).oppHealth;
await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult);
await wf(90);
const dmgFar=oh0-(await n7()).oppHealth;
console.log("  neutral ult vs FAR foe: dmg",dmgFar,"(auto-hit should land ~full even at range)");
log.push(["autohit-lands-at-range", dmgFar>180]);   // full scaled auto-hit (~204) lands even at 900px — a projectile couldn't reach

// 2. vs BLOCKING foe → chipped to ~half (still lands, unavoidable)
await farFoe(); await page.evaluate(()=>window.__harness.setP2ForceBlock?.(true));
const bh0=(await n7()).oppHealth;
await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await wf(90);
const dmgBlk=bh0-(await n7()).oppHealth;
console.log("  neutral ult vs BLOCKING foe: dmg",dmgBlk,"(should be ~half, >0)");
log.push(["autohit-chips-block", dmgBlk>80 && dmgBlk<dmgFar]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
