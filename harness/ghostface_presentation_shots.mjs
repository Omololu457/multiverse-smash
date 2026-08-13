// harness/ghostface_presentation_shots.mjs — clip evidence for the Ghostface presentation upgrade:
//   PART 1: Stalk Vanish (Backstage Pass getaway) — off-screen fade-out → opposite-edge stalk-back-in.
//   PART 2: killer swap — 3-beat EXIT → identity-tinted FLASH → EMERGE, for 2 different-colored identities.
// Usage: node harness/ghostface_presentation_shots.mjs <label>   (label e.g. "after" | "before")
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const LABEL = process.argv[2] || "after";
const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
page.on("pageerror", e => console.log("  PAGEERR:", e.message));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const pres = () => page.evaluate(() => window.__harness.gfPres?.("p1") || null);
const wf = async n => { const s=(await st()).frame; await page.waitForFunction(([a,c])=>window.__harness.state().frame>=a+c,[s,n],{timeout:15000,polling:16}); };
const shot = n => page.screenshot({ path: path.join(OUT, n) });
const MOTION = { s:["s","d"], a:["s","a"], d:["s","a","d"], w:["s","d","a"] };

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil:"load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await wf(16);

async function ready(skin) {
  await page.evaluate(() => window.__harness.expireGfSwap?.());
  await wf(4);
  await page.evaluate(s => { window.__harness.setSkin?.("p1", s); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); }, skin);
  await page.waitForFunction(() => { const p=window.__harness.p1(); return p && p.key==="ghostface" && p.grounded && !p.attacking; }, null, {timeout:5000,polling:16}).catch(()=>{});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 90); await wf(6);
}

console.log(`\n╔══ GHOSTFACE PRESENTATION — label="${LABEL}" ══╗`);

// ── PART 1 — Stalk Vanish (getaway): hold Back (a) + Special (l) ──
await ready("ghostfaceBilly");
const x0 = Math.round((await p1()).x);
await page.keyboard.down("a"); await wf(1);
await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l"); await page.keyboard.up("a");   // release Back immediately → clean reposition
// tight poll (sample faster than the game advances) so the fast 13f enter-slide isn't skipped
let gotExit=false, maxDx=0, sawEnter=false;
const sleepMs = ms => new Promise(r=>setTimeout(r,ms));
for (let i=0;i<340;i++){
  const pr = await pres();
  if (pr?.vanish?.phase === "exit" && !gotExit && pr.alpha < 0.5) { gotExit=true; await shot(`gfpres_${LABEL}_vanish_exit.png`); console.log(`  📸 PART1 exit  alpha=${pr.alpha} (fading off-screen)`); }
  if (pr?.vanish?.phase === "enter") { sawEnter=true; if (Math.abs(pr.dx) > maxDx) { maxDx = Math.abs(pr.dx); await shot(`gfpres_${LABEL}_vanish_enter.png`); } }
  if (!pr?.vanish && sawEnter) break;
  await sleepMs(4);
}
console.log(`  📸 PART1 enter maxDx=${Math.round(maxDx)}px (stalking back from opposite edge)`);
await wf(8);
const x1 = Math.round((await p1()).x);
await shot(`gfpres_${LABEL}_vanish_settled.png`);
console.log(`  ▶ PART1 reposition: x ${x0} → ${x1} (Δ${x1-x0}px), exitShot=${gotExit} enterMaxDx=${Math.round(maxDx)}px`);

// ── PART 2 — killer swap 3-beat, two different-colored identities ──
const SWAPS = [["ghostfaceBilly","s","sasuke","crimson #6E1520"], ["ghostfaceAmber","s","shinobu","toxic-green #1C5A30"]];
for (const [skin, key, want, colorName] of SWAPS) {
  await ready(skin);
  // slot 0 = QCF = this identity's pool[0]; fire deterministically (same triggerGhostfaceSwap path as motion+Grab).
  await page.evaluate(() => window.__harness.forceGfSwap(0, "p1"));
  let gotFlash=false, gotEmerge=false, flashColor=null;
  for (let i=0;i<80;i++){
    const pr = await pres();
    if (pr?.swapCine && pr.flash && pr.flash.alpha > 0.4 && !gotFlash) { gotFlash=true; flashColor=pr.flash.color; await shot(`gfpres_${LABEL}_swap_${skin}_flash.png`); console.log(`  📸 PART2 ${skin} FLASH color=${pr.flash.color} (${colorName})`); }
    if (pr?.swapCine && pr.alpha > 0.3 && pr.alpha < 0.95 && gotFlash && !gotEmerge) { gotEmerge=true; await shot(`gfpres_${LABEL}_swap_${skin}_emerge.png`); console.log(`  📸 PART2 ${skin} EMERGE alpha=${pr.alpha} → ${want}`); }
    if (gotFlash && gotEmerge) break;
    await wf(1);
  }
  const a = await p1();
  console.log(`  ▶ PART2 ${skin}: now=${a.rosterKey||a.key} flashColor=${flashColor} (expected ${colorName})`);
}

console.log(`╚════════════════════════════════════════╝`);
await browser.close(); server.close();
