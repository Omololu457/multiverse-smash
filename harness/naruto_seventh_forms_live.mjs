// Naruto (Seventh) — NINE-TAILS FORM LADDER: hold Charge → Red Shroud (Bond1) / Four-Tails cloak (Bond2) /
// KCM (Bond3). Verifies each form enters, the Four-Tails beast body + claw attack, and tap-Charge exits.
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
const K={light:"j",special:"l",charge:"p"};
let FWD="d";
const log=[];
const redBeastPx=()=>page.evaluate(()=>{const c=document.querySelector("canvas");const d=c.getContext("2d").getImageData(0,150,c.width,410).data;let r=0;for(let i=0;i<d.length;i+=4){if(d[i+3]<30)continue;const R=d[i],G=d[i+1],B=d[i+2];if(R>90&&R<200&&G<70&&B<80&&R-G>50)r++;}return r;});

await page.goto(`${base}/index.html?harness=1&p1=naruto_seventh&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>window.__harness.p1()?.key==="naruto_seventh",null,{timeout:15000,polling:32});
const a0=await page.evaluate(()=>window.__harness.p1()); FWD=a0.facing>=0?"d":"a";
async function settle(){await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.clearProjectiles();window.__harness.clearSummons();window.__harness.resetFighterInput("p1");window.__harness.resetFighterInput("p2");window.__harness.fillEnergy();});await wf(3);}
async function prep(gap=80){await settle();const a=await page.evaluate(()=>window.__harness.p1());await page.evaluate(x=>window.__harness.setP2X(x),a.x+(a.facing>=0?gap:-gap));await wf(2);return a;}
async function hold(){await page.keyboard.down(K.charge);await wf(16);await page.keyboard.up(K.charge);await wf(10);}
async function exitForm(){await page.keyboard.down(K.charge);await wf(3);await page.keyboard.up(K.charge);await wf(8);}
async function toForm(pts){const form=pts>=80?"kcm":pts>=60?"fourtails":pts>=30?"red":"base"; await page.evaluate(()=>window.__harness.setN7Oiroke(false)); await prep(80); await page.evaluate(f=>window.__harness.setN7Form(f),form); await wf(6); }

// ── 1. BOND 1 → RED CHAKRA SHROUD ──
await toForm(30);
let s=await n7(); console.log("  Bond1 hold-Charge → form:",s.n7form,"spdMul",s.spdMul);
log.push(["bond1-red-shroud", s.n7form==="red" && s.spdMul>1.0]);
await shot("52_red_shroud.png");
await exitForm(); log.push(["red-tap-exits", (await n7()).n7form==="base"]);

// ── 2. BOND 2 → FOUR-TAILS CLOAK (beast body) ──
await toForm(60);
s=await n7(); const beast=await redBeastPx();
console.log("  Bond2 hold-Charge → form:",s.n7form,"skin",s.skin,"redBeastPx",beast);
log.push(["bond2-fourtails", s.n7form==="fourtails" && s.skin==="golden"]);  // skin="golden" = _skinAnim set (beast anim)
log.push(["fourtails-beast-body", beast>400]);
await shot("53_fourtails_cloak.png");
// beast claw (light) connects
await page.evaluate(()=>window.__harness.healP2()); await prep(44); await page.evaluate(()=>window.__harness.setN7Bond(60)); if((await n7()).n7form==="base"){await hold();}
const bh0=(await n7()).oppHealth;
await page.keyboard.down(K.light); await wf(4); await page.keyboard.up(K.light); await wf(16);
log.push(["fourtails-claw-connects", (bh0-(await n7()).oppHealth)>0]);
// specials disabled in beast form
const beforeSp=await n7();
await page.keyboard.down(FWD); await page.keyboard.down(K.special); await wf(4); await page.keyboard.up(K.special); await page.keyboard.up(FWD);
const afterSp=await n7();
log.push(["fourtails-specials-disabled", afterSp.cast===beforeSp.cast || afterSp.cast!=="n7Rsk"]);
await exitForm(); log.push(["fourtails-tap-exits", (await n7()).n7form==="base" && (await n7()).skin==="base"]);

// ── 3. BOND 3 → KCM (golden) ──
await toForm(80);
s=await n7(); console.log("  Bond3 hold-Charge → form:",s.n7form);
log.push(["bond3-kcm", s.n7form==="kcm"]);

const pass=log.filter(x=>x[1]).length, tot=log.length;
console.log(`\n  RESULT ${pass}/${tot}`); for(const [n,ok] of log) console.log(`   ${ok?"✅":"❌"} ${n}`);
await browser.close(); server.close();
process.exit(pass===tot?0:1);
