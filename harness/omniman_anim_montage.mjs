// harness/omniman_anim_montage.mjs — ANIMATION-UTILIZATION EVIDENCE.
// Triggers a range of Omni-Man actions and reports the distinct sprite sheet each resolves to,
// demonstrating that far more than "2-3" of his animations are actually in use.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT,"harness","shots"); fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const p1=()=>page.evaluate(()=>window.__harness.p1());
async function wf(n){const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
async function grounded(){await page.waitForFunction(()=>window.__harness.p1().grounded,null,{timeout:8000,polling:16}).catch(()=>{});}
async function reset(){await page.evaluate(()=>window.__harness.boot());await wf(4);await grounded();await wf(50);} // +stale window
const seen=new Map();
async function cap(label){const a=await p1();const sheet=(a.spriteSheet||"").split("/").pop();seen.set(label,{action:a.action,sheet});await page.screenshot({path:path.join(OUT,`omniman_anim_${label}.png`)});}
await page.goto(`${base}/index.html?harness=1&p1=omniman&p2=omniman`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot()); await wf(4); await grounded();

await reset(); await cap("idle");
await reset(); await page.keyboard.down("d"); await wf(10); await cap("groundmove"); await page.keyboard.up("d");
await reset(); await page.keyboard.down("j"); await wf(3); await cap("light"); await page.keyboard.up("j");
await reset(); await page.keyboard.down("k"); await wf(4); await cap("heavy"); await page.keyboard.up("k");
await reset(); await page.keyboard.down("i"); await wf(4); await cap("up_launcher"); await page.keyboard.up("i");
await reset(); await page.keyboard.down("w"); await wf(6); await page.keyboard.down("j"); await wf(3); await cap("air"); await page.keyboard.up("j"); await page.keyboard.up("w");
await reset(); await page.keyboard.down("l"); await wf(4); await cap("special_smash"); await page.keyboard.up("l");
await reset(); await page.keyboard.down("d"); await wf(4); await page.keyboard.down("l"); await wf(3); await cap("special_skewer"); await page.keyboard.up("l"); await page.keyboard.up("d");
await reset(); await page.keyboard.down("s"); await wf(2); await page.keyboard.down("l"); await wf(3); await cap("special_meteor"); await page.keyboard.up("l"); await page.keyboard.up("s");
// flight
await reset(); await page.keyboard.down("p"); await wf(2); await page.keyboard.up("p"); await wf(4); await cap("flight_hover");
await page.keyboard.down("d"); await wf(6); await cap("flight_move"); await page.keyboard.up("d");
// ultimate
await reset(); await page.evaluate(()=>window.__harness.setP1Energy(200)); await page.keyboard.down("d"); await wf(10); await page.keyboard.up("d"); await wf(20); await page.keyboard.down("u"); await wf(4); await cap("ultimate"); await page.keyboard.up("u");
// hurt_air (airborne hit)
await reset(); await page.keyboard.down("w"); await wf(8); await page.keyboard.up("w"); await page.evaluate(()=>window.__harness.hurtP1&&window.__harness.hurtP1(20)); await wf(2); await cap("hurt_air");
// intros
for(const v of ["intro","intro2","introCrash"]){ await page.evaluate(()=>window.__harness.boot()); await wf(3); await page.evaluate(vv=>window.__harness.forceIntro(vv),v); await wf(3); await cap(v); }

console.log("\n=== ANIMATION UTILIZATION (distinct sheets actually rendered) ===");
const sheets=new Set();
for(const [label,{action,sheet}] of seen){ sheets.add(sheet); console.log(`  ${label.padEnd(16)} action=${(action||"").padEnd(14)} sheet=${sheet}`); }
console.log(`\n  DISTINCT SHEETS RENDERED: ${sheets.size}`);
await browser.close(); server.close();
