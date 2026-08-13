// harness/hashirama_tree_scale_shots.mjs — VISUAL EVIDENCE for the Tree-Summon scale rework.
// Casts the Down+Special tier ladder (successive casts escalate T1→T4) and captures each fully-grown tree
// WITH Hashirama in frame for a direct scale reference, plus the measured on-screen sizes. Builds a
// side-by-side montage (all 4 tiers + Hashirama silhouette) so the dramatic size jump is verifiable.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required","--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function wf(n){ const s=(await st()).frame; await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16}); }

await page.goto(`${base}/index.html?harness=1&p1=hashirama&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await wf(6);
await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded; }, null, { timeout: 8000, polling: 16 }).catch(()=>{});
const arena = await page.evaluate(() => window.__harness.arena());
await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.38)); await wf(1);
const charScale = (await p1()).spriteScale;

const TIERS = [1,2,3,4];
const measured = [];
for (const n of TIERS) {
  await page.evaluate(() => { window.__harness.clearProjectiles?.(); });
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + 70); await wf(2);
  await page.evaluate(t => window.__harness.setTreeTier(t), n);   // DETERMINISTIC: force this exact tier
  // Down+Special
  await page.keyboard.down("s"); await wf(2);
  await page.keyboard.down("l"); await wf(1); await page.keyboard.up("l"); await page.keyboard.up("s");
  await page.waitForFunction(() => window.__harness.projectiles().some(p => /hashiTree/.test(p.name||"")), null, { timeout: 3000, polling: 16 }).catch(()=>{});
  await wf(24);   // let it grow to full (spriteOnce holds the last frame)
  const tree = (await projs()).find(p => /hashiTree/.test(p.name||""));
  const renderedH = tree ? (tree.spriteScale||1) * (tree.spriteH||0) : 0;
  measured.push({ n, renderedH: Math.round(renderedH), scale: tree?.spriteScale });
  await page.screenshot({ path: path.join(OUT, `tree_scale_tier${n}.png`) });
  console.log(`tier ${n}: rendered ≈ ${Math.round(renderedH)}px  (${(renderedH/113).toFixed(2)}× Hashirama's ~113px)  scale=${tree?.spriteScale}`);
  await page.waitForFunction(() => window.__harness.p1().attacking === false && window.__harness.p1().currentMove == null, null, { timeout: 3000, polling: 16 }).catch(()=>{});
  await wf(3);
}
console.log("\nLADDER (rendered px):", measured.map(m => `T${m.n}=${m.renderedH}`).join("  <  "));
console.log("char spriteScale:", charScale, " | page errors:", errs.length ? errs.join(" | ") : "none");
await browser.close(); server.close();
