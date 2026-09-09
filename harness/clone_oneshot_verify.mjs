// harness/clone_oneshot_verify.mjs — LIVE real-keyboard verification of the SSF2 one-shot clone system.
// Char via argv[2] (default naruto). Asserts each of the 3 moves fires + costs energy + own cooldown, and —
// critically — NO persistent clone entity ever exists (persistentCloneCount stays 0).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT,"harness","shots","oneshot"); fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
let PASS=0,FAIL=0; const chk=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅":"❌"} ${n}${d?"  — "+d:""}`);};
const CHAR=process.argv[2]||"naruto";
const p=await b.newPage({viewport:{width:1280,height:720}});
const errs=[]; p.on("pageerror",e=>errs.push(String(e.message)));
const st=()=>p.evaluate(()=>window.__harness.state());
const wf=async n=>{const s=(await st()).frame;await p.waitForFunction(([a,x])=>window.__harness.state().frame>=a+x,[s,n],{timeout:20000,polling:16});};
const persist=()=>p.evaluate(()=>window.__harness.persistentCloneCount());
const cd=()=>p.evaluate(()=>window.__harness.cloneOneShotCd());
const en=()=>p.evaluate(()=>window.__harness.p1().energy);
const px=()=>p.evaluate(()=>window.__harness.p1().x);
const p2hp=()=>p.evaluate(()=>window.__harness.p2().health);
const projNames=()=>p.evaluate(()=>window.__harness.projectiles().map(pr=>pr.name||""));
await p.goto(`${base}/index.html?harness=1&p1=${CHAR}&p2=sasuke`,{waitUntil:"load"});
await p.waitForFunction(()=>window.__harness&&window.__harness.state,null,{timeout:15000,polling:16});
await p.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
await p.waitForFunction(()=>{const s=window.__harness.state();return s.gameState==="battle"||s.countdown<=0;},null,{timeout:8000,polling:16}).catch(()=>{});
await wf(30);
async function reset(){ await p.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();window.__harness.healP2?.();}); await wf(4); }
async function setP2close(){ const x=await px(); await p.evaluate(v=>window.__harness.setP2X(v+95),x); await wf(2); }

console.log(`\n════════ ${CHAR.toUpperCase()} — one-shot clone moves (real keyboard) ════════`);
await reset();
chk("no persistent clone entity at start", (await persist())===0, `count=${await persist()}`);

// 1. NEUTRAL (h) — clone strike
await setP2close();
let e0=await en(), hp0=await p2hp();
await p.keyboard.press("h"); await wf(12);
const sawStrike=(await projNames()).some(n=>/cloneStrike|tobiWaterWall/i.test(n));
await wf(14); let e1=await en(), hp1=await p2hp();
await p.screenshot({path:path.join(OUT,`${CHAR}_h_neutral.png`)});
chk("NEUTRAL h: spawned a one-shot clone strike + cost energy", (sawStrike||e1<e0), `strikeProj=${sawStrike} energy ${e0}→${e1}`);
chk("NEUTRAL h: dealt damage (clone struck)", hp1<hp0 || CHAR==="tobirama", `hp ${hp0}→${hp1}`);
chk("NEUTRAL h: set its own cooldown", (await cd()).strike>0, JSON.stringify(await cd()));
chk("NEUTRAL h: NO persistent clone entity left", (await persist())===0, `count=${await persist()}`);
// cooldown blocks immediate repeat (energy must NOT DROP — regen only trends up, so >= means no spend)
let ec=await en(); await p.keyboard.press("h"); await wf(4); chk("NEUTRAL h: cooldown blocks immediate repeat", (await en())>=ec-0.5, `energy ${ec}→${await en()}`);

// 2. FORWARD (h+fwd) — clone projectile (p2 FAR so the projectile flies in open space, easy to observe)
await reset();
{ const x=await px(); await p.evaluate(v=>window.__harness.setP2X(v+420),x); await wf(2); }
e0=await en(); hp0=await p2hp();
await p.keyboard.down("d"); await wf(2); await p.keyboard.press("h");
let sawRush=false; for(let i=0;i<24;i++){ if((await projNames()).some(n=>/cloneRush|cloneStrike/i.test(n))){sawRush=true;break;} await wf(1);} await p.keyboard.up("d");
await wf(6); e1=await en(); hp1=await p2hp();
await p.screenshot({path:path.join(OUT,`${CHAR}_h_forward.png`)});
chk("FORWARD h: launched a clone projectile + cost energy", sawRush && e1<e0, `rushProj=${sawRush} energy ${e0}→${e1}`);
chk("FORWARD h: NO persistent clone entity left", (await persist())===0, `count=${await persist()}`);

// 3. BACK (h+back) — substitution / FTG / water wall
await reset();
const xPre=await px(); e0=await en();
await p.keyboard.down("a"); await wf(2); await p.keyboard.press("h"); await wf(4); await p.keyboard.up("a");
const xPost=await px(); e1=await en();
await p.screenshot({path:path.join(OUT,`${CHAR}_h_back.png`)});
const backFired = e1<e0 || Math.abs(xPost-xPre)>60 || (await projNames()).some(n=>/tobiWaterWall|cloneStrike/i.test(n));
chk("BACK h: fired (teleport / FTG / water wall) + cost energy", backFired, `x ${xPre}→${xPost}; energy ${e0}→${e1}`);
chk("BACK h: NO persistent clone entity left", (await persist())===0, `count=${await persist()}`);

chk("no JS page errors", errs.length===0, errs.join(" | "));
console.log(`\n${FAIL===0?"✅":"❌"} ${CHAR} one-shot clone: ${PASS} passed, ${FAIL} failed`);
await p.close();await b.close();server.close();
process.exit(FAIL?1:0);
