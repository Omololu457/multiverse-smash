// Naruto (Seventh) — PHASE 4 ITEM 1: BASE-only palette recolor skins. Verifies a recolor skin repaints the
// base body, KCM still overrides to GOLDEN (base-only recolor), and revert restores the recolor (not default).
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
const K={charge:"p"};
const log=[];
// count orange / green / golden px in the play-area band (fighter body)
const colors=()=>page.evaluate(()=>{const c=document.querySelector("canvas");const d=c.getContext("2d").getImageData(0,150,c.width,410).data;let o=0,g=0,au=0;for(let i=0;i<d.length;i+=4){const r=d[i],gr=d[i+1],b=d[i+2],a=d[i+3];if(a<30)continue;if(r>180&&gr>80&&gr<150&&b<70&&r-b>120)o++;else if(r<140&&gr>95&&b<100&&gr-r>20&&gr-b>20)g++;else if(r>190&&gr>160&&b<120&&gr-b>70)au++;}return{orange:o,green:g,golden:au};});

await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}

// ── 0. recolored sheet is served + decodes ──
const greenSheet=await page.evaluate(async ()=>{const im=new Image();im.src="./naruto_seventh_idle_uniform__green.png";await im.decode().catch(()=>{});return{w:im.naturalWidth,h:im.naturalHeight,ok:im.complete&&im.naturalWidth>0};});
console.log("  green idle sheet:",JSON.stringify(greenSheet));
log.push(["recolor-sheet-valid", greenSheet.ok && greenSheet.w===272 && greenSheet.h===62]);  // 8×34=272 × 62

// ── 1. DEFAULT body has the orange vest (fighter orange; stage grass isn't orange) ──
await page.evaluate(()=>window.__harness.setSkin("p1","default")); await settle(); await wf(4);
const cd=await colors(); console.log("  default colors:",JSON.stringify(cd));
log.push(["default-has-orange-vest", cd.orange>200]);

// ── 2. GREEN recolor skin → the orange vest is recolored AWAY (orange drops, green rises) ──
const applied=await page.evaluate(()=>window.__harness.setSkin("p1","n7Green"));
await settle(); await wf(4);
const cg=await colors(); console.log("  n7Green applied skinId:",applied,"colors:",JSON.stringify(cg));
await shot("48_skin_green.png");
log.push(["green-skin-applies", applied==="n7Green"]);
log.push(["green-recolors-vest", cg.orange < cd.orange*0.6 && cg.green > cd.green]);   // orange vest → green

// ── 3. KCM overrides to GOLDEN (base-only recolor — KCM not green) ──
await page.evaluate(()=>window.__harness.setN7Oiroke(false)); await settle();
await page.evaluate(()=>window.__harness.setN7Form("kcm")); await wf(8);   // force KCM (ladder-agnostic) — golden must override the green recolor
const ck=await colors(); console.log("  KCM(on green skin) colors:",JSON.stringify(ck),"kcm",(await n7()).kcm);
await shot("49_skin_green_kcm.png");
log.push(["kcm-overrides-to-golden", ck.golden>200 && (await n7()).kcm===true]);

// ── 4. REVERT KCM → restores the GREEN recolor (not default orange) ──
await page.keyboard.down(K.charge); await wf(3); await page.keyboard.up(K.charge); await wf(10);
const cr=await colors(); console.log("  after KCM revert colors:",JSON.stringify(cr),"kcm",(await n7()).kcm,"skin",(await n7()).skin);
log.push(["revert-restores-recolor", cr.green>cr.orange && (await n7()).kcm===false]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
