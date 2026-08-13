// harness/tobirama_combo_diag.mjs — DIAGNOSE Tobirama's launcher → air → down_air route in the REAL game.
// Drives real input/physics. Runs the exact combo and reports, per stage, whether the hit CONNECTED
// (dummy health dropped) and the RELATIVE vertical position of attacker vs dummy at the moment of the hit
// (down_air's spike hitbox sits BELOW the attacker at y+30 — it only connects when the dummy is at/below
// the attacker). Screenshots at launch, after air, and at the down_air attempt.
//
// Usage: node harness/tobirama_combo_diag.mjs <label>     (label e.g. "after30" | "before26")
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const LABEL = process.argv[2] || "after30";
const CHAR = "tobirama", DUMMY = "cell";

const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const wf = async n => { const s=(await st()).frame; await page.waitForFunction(([a,c])=>window.__harness.state().frame>=a+c,[s,n],{timeout:20000,polling:16}); };
const shot = name => page.screenshot({ path: path.join(OUT, name) });
const rel = (a,b) => Math.round((a.y+ (a.h||0)/2) - (b.y+(b.h||0)/2));   // >0 ⇒ attacker CENTER is BELOW dummy

const log = [];
console.log(`\n╔══ TOBIRAMA COMBO DIAG — label="${LABEL}" ══╗`);
try {
  await page.goto(`${base}/index.html?harness=1&p1=${CHAR}&p2=${DUMMY}`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot()); await wf(10);
  // keep the dummy from dying / regen so health deltas are readable
  await page.evaluate(() => { const b = window.__harness.p2(); });
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + (a.w||60) - 8); });
  await wf(1);

  const hp0 = (await p2()).health;
  // 1) LAUNCHER
  await page.keyboard.down("i");
  await page.waitForFunction(() => { const b=window.__harness.p2(); return b && (b.isLaunched || !b.grounded); }, null, { timeout:4000, polling:8 }).catch(()=>{});
  await page.keyboard.up("i");
  const la = await p1(), lb = await p2();
  const launchConnected = lb.health < hp0;
  log.push({ stage:"launcher", connected:launchConnected, dummyVy:+lb.vy.toFixed(1), attackerBelowDummy: rel(la,lb) });
  console.log(`  1) LAUNCHER   connected=${launchConnected}  dummyVy=${lb.vy.toFixed(1)}  atkBelowDummy=${rel(la,lb)}px`);
  await shot(`tobidiag_${LABEL}_1launch.png`);

  // 2) JUMP-CANCEL + AIR
  await page.keyboard.down("w"); await wf(2); await page.keyboard.up("w");
  let airConnected=false, airRel=null, airDummyVy=null; const hpBeforeAir=(await p2()).health;
  for (let k=0;k<7;k++){ const s=await p1(); if (s.grounded) break;
    await page.keyboard.down("j"); await wf(2); await page.keyboard.up("j"); await wf(1);
    const a=await p1(), b=await p2();
    if (b.health < hpBeforeAir){ airConnected=true; airRel=rel(a,b); airDummyVy=+b.vy.toFixed(1); break; }
  }
  log.push({ stage:"air", connected:airConnected, dummyVy:airDummyVy, attackerBelowDummy:airRel });
  console.log(`  2) AIR        connected=${airConnected}  dummyVy=${airDummyVy}  atkBelowDummy=${airRel}px`);
  await shot(`tobidiag_${LABEL}_2air.png`);

  // 3) DOWN-AIR (S+J while airborne) — the spike finisher
  let dnConnected=false, dnRel=null; const hpBeforeDn=(await p2()).health;
  for (let k=0;k<8;k++){ const s=await p1(); if (s.grounded) break;
    const a0=await p1(), b0=await p2(); if (dnRel==null) dnRel=rel(a0,b0);
    await page.keyboard.down("s"); await page.keyboard.down("j"); await wf(2);
    await page.keyboard.up("j"); await page.keyboard.up("s"); await wf(1);
    const b=await p2(); const a=await p1();
    if (b.health < hpBeforeDn){ dnConnected=true; dnRel=rel(a,b); break; }
  }
  log.push({ stage:"down_air", connected:dnConnected, attackerBelowDummy:dnRel });
  console.log(`  3) DOWN_AIR   connected=${dnConnected}  atkBelowDummy(at attempt)=${dnRel}px  ${dnConnected?"":"❌ WHIFF"}`);
  await shot(`tobidiag_${LABEL}_3downair.png`);

  const full = launchConnected && airConnected && dnConnected;
  console.log(`  ▶ FULL ROUTE ${full ? "✅ CONNECTS" : "❌ BROKEN at "+(!airConnected?"AIR":!dnConnected?"DOWN_AIR":"?")}`);
  log.push({ fullRoute: full });
} catch (e) { console.log("  ❌ error:", e.message); log.push({ error:e.message }); }
await page.close(); await browser.close(); server.close();
fs.writeFileSync(path.join(OUT, `tobidiag_${LABEL}.json`), JSON.stringify(log, null, 2));
console.log(`  summary → harness/shots/tobidiag_${LABEL}.json`);
console.log(`╚════════════════════════════════════════╝`);
