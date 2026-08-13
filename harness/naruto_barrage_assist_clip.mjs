// STAGE 1 evidence: clone-assisted Uzumaki Barrage — a clone JOINS (consumed), the clone-row Rasengan pose
// plays, and the barrage CONNECTS. Records a clip + filmstrip.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); const VID = path.join(ROOT, "harness", "clips");
fs.mkdirSync(OUT,{recursive:true}); fs.mkdirSync(VID,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const context=await browser.newContext({viewport:{width:900,height:520},recordVideo:{dir:VID,size:{width:900,height:520}}});
const page=await context.newPage();
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`);};
const st=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1());
const p2=()=>page.evaluate(()=>window.__harness.p2());
async function wf(n){const s=(await st()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:30000,polling:16});}
async function tap(k,h=2){await page.keyboard.down(k);await wf(h);await page.keyboard.up(k);}
async function motion(seq){const d=seq.slice(0,-1),l=seq[seq.length-1];for(const k of d) await page.keyboard.press(k); await tap(l);}
await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`,{waitUntil:"load"});
await page.waitForFunction(()=>window.__harness&&window.__harness.state,null,{timeout:15000,polling:16});
await page.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
await page.waitForFunction(()=>{const s=window.__harness.state();return s.gameState==="battle"||s.countdown<=0;},null,{timeout:8000,polling:16}).catch(()=>{});
await wf(20);
await page.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();window.__harness.healP2?.();window.__harness.setP2Invuln?.(0);window.__harness.setCloneAggro?.(false);window.__harness.dispelP1Clones?.();});
const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),a.x+70); await wf(2);
// spawn a clone, let it settle
await page.evaluate(()=>window.__harness.spawnP1Clones(1)); await wf(20);
const cloneBefore=await page.evaluate(()=>window.__harness.p1CloneCount());
const hp0=(await p2()).health;
// fire the barrage
let fi=0; let castSeen=null;
await motion(["s","d","s","d","l"]);
for(let i=0;i<9;i++){ const g=await p1(); const act=String(g.action||g.castMove||"").toLowerCase(); if(/komarasengan/.test(act)) castSeen="komaRasengan"; await page.screenshot({path:path.join(OUT,`_bf_${fi++}.png`)}); await wf(5); }
const cloneAfter=await page.evaluate(()=>window.__harness.p1CloneCount());
const hp1=(await p2()).health;
check("a shadow clone JOINED the barrage (consumed)", cloneBefore>=1 && cloneAfter<cloneBefore, `clone ${cloneBefore}→${cloneAfter}`);
check("clone-assisted Barrage CONNECTS (real damage)", (hp0-hp1)>0, `−${(hp0-hp1).toFixed(0)}`);
check("clone-row Rasengan pose (komaRasengan) played during the assist", castSeen==="komaRasengan", `cast=${castSeen}`);
await context.close();
const vp=await page.video().path().catch(()=>null); if(vp){try{fs.renameSync(vp,path.join(VID,"naruto_barrage_clone_assist.webm"));}catch(_){}}
console.log(`\n${FAIL===0?"✅":"❌"} STAGE 1 barrage clone-assist: ${PASS} passed, ${FAIL} failed`);
await browser.close();server.close(); process.exit(FAIL?1:0);
