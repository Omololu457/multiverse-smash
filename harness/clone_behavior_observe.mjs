// harness/clone_behavior_observe.mjs — STEP 1: observe a spawned clone for 10 REAL seconds per character.
// Records a VIDEO clip + a 6-frame filmstrip (t=0,2,4,6,8,10s) + a position/state trace, to establish
// whether the clone does ANYTHING on its own (move / face / attack / block) or stands in one fixed idle.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const VID = path.join(ROOT, "harness", "clips"); fs.mkdirSync(VID, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required","--disable-background-timer-throttling"] });

async function observe(who) {
  const context = await browser.newContext({ viewport: { width: 900, height: 520 }, recordVideo: { dir: VID, size: { width: 900, height: 520 } } });
  const page = await context.newPage();
  const st=()=>page.evaluate(()=>window.__harness.state());
  const p1=()=>page.evaluate(()=>window.__harness.p1());
  const clone=()=>page.evaluate(()=>{ const s=window.__harness.summons().filter(x=>x.id==="shadowClone")[0]; return s?{x:Math.round(s.x),sheet:(s.sheet||"").split("/").pop(),frame:s.frame}:null; });
  const cstate=()=>page.evaluate(()=>window.__harness.p1CloneStates()[0]||null);
  async function wf(n){ const s=(await st()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:30000,polling:16}); }
  await page.goto(`${base}/index.html?harness=1&p1=${who}&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(()=>window.__harness&&window.__harness.state,null,{timeout:15000,polling:16});
  await page.evaluate(()=>{window.__harness.start?.();window.__harness.skipToBattle?.();});
  await page.waitForFunction(()=>{const s=window.__harness.state();return s.gameState==="battle"||s.countdown<=0;},null,{timeout:8000,polling:16}).catch(()=>{});
  await wf(20);
  await page.evaluate(()=>{window.__harness.resetFighterInput?.("p1");window.__harness.fillEnergy?.();window.__harness.healP2?.();window.__harness.dispelP1Clones?.();});
  const a=await p1(); await page.evaluate(x=>window.__harness.setP2X(x),a.x+320); await wf(2);   // opponent 320px away
  await page.keyboard.press(",");                                                                  // spawn a clone
  await page.waitForFunction(()=>window.__harness.p1CloneCount()>=1,null,{timeout:5000,polling:16}).catch(()=>{});
  await wf(2);

  const trace = [];
  const sheets = new Set(); const states = new Set();
  let fi = 0;
  for (let t = 0; t <= 10; t++) {              // 0..10 seconds
    const c = await clone(); const cs = await cstate();
    if (c) { sheets.add(c.sheet); }
    if (cs) { states.add(cs.state); }
    trace.push({ t, x: c?.x ?? null, sheet: c?.sheet ?? null, state: cs?.state ?? null });
    if (t % 2 === 0) { await page.screenshot({ path: path.join(OUT, `_fs_${who}_${fi++}.png`) }); }   // filmstrip frames 0,2,4,6,8,10s
    if (t < 10) await wf(60);                  // advance ~1 real second
  }
  await context.close();                       // saves the video
  const vpath = await page.video().path().catch(()=>null);
  if (vpath) { const dest = path.join(VID, `clone_passive_${who}.webm`); try { fs.renameSync(vpath, dest); } catch(_){} }

  const xs = trace.map(r=>r.x).filter(v=>v!=null);
  const xMovedAfterSettle = xs.length ? Math.max(...xs.slice(2)) - Math.min(...xs.slice(2)) : 0;   // movement AFTER the initial approach (t≥2s)
  return { who, trace, sheets:[...sheets], states:[...states], xMovedAfterSettle };
}

for (const who of ["naruto","minato","hashirama","tobirama"]) {
  const r = await observe(who);
  console.log(`\n═══ ${who.toUpperCase()} — 10s observation ═══`);
  console.log("  x over time:", r.trace.map(t=>t.x).join(" → "));
  console.log("  states seen:", JSON.stringify(r.states), " sheets seen:", JSON.stringify(r.sheets));
  console.log(`  movement AFTER initial approach (t≥2s): ${r.xMovedAfterSettle}px`);
  const attacked = r.states.some(s => s && s !== "idle" && s !== "spawn");
  const posesChanged = r.sheets.length > 1;
  console.log(`  → VERDICT: ${(!attacked && !posesChanged && r.xMovedAfterSettle < 8) ? "PASSIVE — approaches once, then stands in ONE fixed idle (never attacks/blocks/reacts)" : "shows some activity"}`);
  console.log(`  clip: harness/clips/clone_passive_${who}.webm · filmstrip: harness/shots/clone_passive_${who}_filmstrip.png`);
}
await browser.close(); server.close();
