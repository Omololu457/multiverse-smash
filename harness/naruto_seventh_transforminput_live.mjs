// Naruto (Seventh) — NEW TRANSFORM INPUT: hold Charge (P) + TAP Ultimate steps UP the nine-tails ladder
// toward the Nine-Tails Chakra Cloak (KCM). Releasing Charge no longer transforms; Ultimate when NOT
// charging fires the (auto-hit) Bijuudama. Verifies each step + that plain-U is the ultimate.
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
const K={ult:"u",charge:"p"};
let FWD="d";
const log=[];
await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a";
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function tapU(){await page.keyboard.down(K.ult);await wf(2);await page.keyboard.up(K.ult);await wf(14);}

// ── 1. HOLD P (build Bond) + TAP U three times → base → red → fourtails → kcm (chakra cloak) ──
await settle();
await page.evaluate(()=>window.__harness.setN7Bond(100));            // give full Bond so each step is unlocked
await page.keyboard.down(K.charge); await wf(20);                    // start holding Charge
const f0=(await n7()).n7form;
await tapU(); const f1=(await n7()).n7form;
await tapU(); const f2=(await n7()).n7form;
await tapU(); const f3=(await n7()).n7form;
await page.keyboard.up(K.charge); await wf(4);
console.log("  hold-P + tap-U ladder:",f0,"→",f1,"→",f2,"→",f3);
log.push(["step1-leaves-base", f0==="base" && f1!=="base"]);
log.push(["ladder-reaches-cloak", f3==="kcm"]);

// ── 2. RELEASE P, press U (not charging) → fires the ultimate (Bijuudama), does NOT transform ──
await settle();
await page.evaluate(()=>window.__harness.setN7Bond(100));
const e0=(await n7()).energy, fb=(await n7()).n7form;
await page.keyboard.down(K.ult); await wf(3); await page.keyboard.up(K.ult); await wf(10);
const u=await n7();
console.log("  plain U (not charging): cast",u.cast,"form",u.n7form,"E",e0,"->",u.energy);
log.push(["plain-U-fires-ult", u.cast==="n7Bijuudama" && u.energy<e0]);
log.push(["plain-U-no-transform", u.n7form===fb]);

// ── 3. TAP P (not hold) in a form still exits to base ──
await settle();
await page.evaluate(()=>window.__harness.setN7Form("kcm"));
await page.keyboard.down(K.charge); await wf(3); await page.keyboard.up(K.charge); await wf(10);   // quick tap
log.push(["tap-P-exits-form", (await n7()).n7form==="base"]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
