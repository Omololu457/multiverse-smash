// harness/ghostface_ambush_shots.mjs — clip evidence for the "Phone Call" / Always-Outnumbered AMBUSH swap.
// Captures the full 4 beats: BAIT (phone pose) → RETREAT (original backs off + 2nd killer spawns) →
// AMBUSH STRIKE (2nd killer hits the foe + identity flash) → HANDOFF (2nd killer becomes the controlled fighter).
// Proves: two instances on screen at once, a REAL strike (opponent HP drops), identity-tinted flash, handoff.
// Usage: node harness/ghostface_ambush_shots.mjs [identitySkin] [slot]
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const SKIN = process.argv[2] || "ghostfaceBilly"; const SLOT = +(process.argv[3] || 0);
const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
page.on("pageerror", e => console.log("  PAGEERR:", e.message));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const amb = () => page.evaluate(() => window.__harness.gfAmbush?.("p1") || null);
const shot = n => page.screenshot({ path: path.join(OUT, n) });
const sleep = ms => new Promise(r=>setTimeout(r,ms));

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil:"load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await page.waitForFunction(()=>{ const p=window.__harness.p1(); return p && p.grounded; }, null, {timeout:8000,polling:16}).catch(()=>{});
await page.evaluate(s => { window.__harness.setSkin?.("p1", s); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); }, SKIN);
const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 150);   // give the striker room to rush in
await new Promise(r=>setTimeout(r,120));

console.log(`\n╔══ GHOSTFACE PHONE-CALL AMBUSH — ${SKIN} slot ${SLOT} ══╗`);
const hp0 = (await p2()).health;
await page.evaluate(s => window.__harness.forceGfAmbush(s, "p1"), SLOT);

const seen = {}; let flashColor=null, hpAtStrike=null, twoInstances=false;
for (let i=0;i<260;i++){
  const a = await amb();
  const ph = a?.phase;
  const nStrikers = a?.strikers?.length || 0;
  const b = await p2();
  if (ph === "bait"    && !seen.bait)    { seen.bait=true;    await shot(`gfambush_${SKIN}_1bait.png`);    console.log(`  📸 1 BAIT    — Ghostface on the phone`); }
  if (ph === "retreat" && !seen.retreat && nStrikers>0) { seen.retreat=true; twoInstances=true; await shot(`gfambush_${SKIN}_2retreat.png`); console.log(`  📸 2 RETREAT — original backs off + 2nd killer (${a.strikers[0].sheet}) spawned  [TWO instances]`); }
  if (a?.ambushFlash && !seen.strike)   { seen.strike=true;  flashColor=a.ambushFlash.color; hpAtStrike=b.health; await shot(`gfambush_${SKIN}_3strike.png`); console.log(`  📸 3 STRIKE  — 2nd killer connects, flash=${a.ambushFlash.color}`); }
  if (!a?.active && a?.roster && a.roster !== "ghostface" && !seen.handoff) { seen.handoff=true; await shot(`gfambush_${SKIN}_4handoff.png`); console.log(`  📸 4 HANDOFF — now controlling ${a.roster}`); }
  if (seen.handoff) break;
  await sleep(6);
}
const after = await p1(); const hpEnd = (await p2()).health;
console.log(`  ▶ opponent HP ${Math.round(hp0)} → ${Math.round(hpEnd)} (strike dealt ${Math.round(hp0 - hpEnd)})`);
console.log(`  ▶ handoff fighter = ${after.rosterKey} · swapActive = ${after.gfSwapActive ?? after.edoActive ?? '?'} · flashColor = ${flashColor} · twoInstances = ${twoInstances}`);
console.log(`╚════════════════════════════════════════╝`);
await browser.close(); server.close();
