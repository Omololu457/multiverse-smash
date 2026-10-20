import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "vilgax_work", "kit_shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".txt":"text/plain"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:960,height:540}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
let PASS=0,FAIL=0; const ck=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?` — ${d}`:""}`);};
const state=()=>page.evaluate(()=>window.__harness.state());
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16});}
const p1=()=>page.evaluate(()=>window.__harness.p1());
const reset=async()=>{await page.evaluate(()=>{window.__harness.healP1();window.__harness.healP2();window.__harness.fillEnergy?.();window.__harness.resetFighterInput?.("p1");});
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&(p.grounded||p.onGround);},null,{timeout:6000,polling:16}).catch(()=>{});await wf(2);};

await page.goto(`${base}/index.html?harness=1&p1=vilgax&p2=gojo`,{waitUntil:"load"});
await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
await page.mouse.click(480,270);
await page.evaluate(()=>window.__harness.boot());
await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.spriteReady;},null,{timeout:15000,polling:32}).catch(()=>{});
await reset();

// GROUNDED directional specials via the real Down/Up/Fwd+Special path (deterministic, no input-timing flake)
async function groundSpec(dir,label,expectCast,file){
  await reset();
  const e0=(await p1()).energy;
  const r=await page.evaluate(d=>window.__harness.p1SpecialDir(d), dir);
  await wf(4);
  const e1=(await p1()).energy;
  ck(`${label}: casts ${expectCast}`, r&&r.cast===expectCast && e1<e0, `cast=${r&&r.cast} Δe=${(e0-e1).toFixed(0)}`);
  await page.screenshot({path:path.join(OUT,file)});
  await wf(18);
}
await groundSpec(null,"Ruby Crescents (N)","vilgaxBlastCast","01_crescents.png");
await groundSpec("F","Dagon's Wrath (F)","vilgaxBlastXCast","02_dagon.png");
await groundSpec("U","Cyclone Breath (U)","vilgaxUltAction","03_cyclone.png");
await groundSpec("D","Seismic Slam (D)","heavy","04_seismic.png");

// air = Meteor Dive: jump, then special in the air
await reset();
const em0=(await p1()).energy;
await page.keyboard.down("w"); await wf(3); await page.keyboard.up("w"); await wf(6);
const r=await page.evaluate(()=>window.__harness.p1SpecialDir(null));
await wf(4);
const em1=(await p1()).energy;
ck("Meteor Dive (air): casts vilgaxTumble", r&&r.cast==="vilgaxTumble" && em1<em0, `cast=${r&&r.cast} Δe=${(em0-em1).toFixed(0)}`);
await page.screenshot({path:path.join(OUT,"05_meteor.png")});
await wf(16);

// ultimate
await reset();
const eu0=(await p1()).energy;
await page.evaluate(()=>window.__harness.p1Ultimate?.() ?? (window.__harness.p1SpecialDir&&null));
await wf(6);
const pu=await p1();
ck("Chimerian Onslaught (ult) casts", pu.energy<eu0 || pu._spriteCastMove==="vilgaxUltAction", `Δe=${(eu0-pu.energy).toFixed(0)}`);
await page.screenshot({path:path.join(OUT,"06_ultimate.png")});
await wf(24);

ck("no JS page errors", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
console.log(`\n${FAIL===0?"✅":"❌"} VILGAX KIT CHECK: ${PASS} passed, ${FAIL} failed`);
await browser.close(); server.close(); process.exit(FAIL===0?0:1);
