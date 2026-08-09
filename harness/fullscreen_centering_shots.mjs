// harness/fullscreen_centering_shots.mjs — real in-match screenshots proving the fullscreen vertical
// framing is EVEN (no bottom-favouring gap) across several screen resolutions / aspect ratios.
// Captures harness/shots/centering_<w>x<h>.png at each. Reuses the proven fullscreen test approach
// (real viewport sizes = what the native Fullscreen API expands the page to).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const RES = [ {w:1920,h:1080,name:"16:9 FHD"}, {w:2560,h:1080,name:"21:9 ultrawide"}, {w:2560,h:1440,name:"16:9 QHD"} ];
let PASS = 0, FAIL = 0; const chk = (n,c,d="") => { c?PASS++:FAIL++; console.log(`  ${c?"✅":"❌"} ${n}${d?" — "+d:""}`); };

for (const r of RES) {
  const page = await browser.newPage({ viewport: { width: r.w, height: r.h } });
  await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  let s = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(a => window.__harness.state().frame >= a + 6, s, { polling: 16, timeout: 15000 }).catch(()=>{});
  await page.evaluate(() => window.__harness.skipToBattle());
  s = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(a => window.__harness.state().frame >= a + 40, s, { polling: 16, timeout: 15000 }).catch(()=>{});
  const g = await page.evaluate(() => window.__harness.frameGeom());
  const topMargin = Math.max(0, g.stageTopScreenY), botMargin = Math.max(0, g.ch - g.stageBotScreenY);
  const file = `centering_${r.w}x${r.h}.png`;
  await page.screenshot({ path: path.join(OUT, file) });
  console.log(`\n${r.name}  ${r.w}×${r.h}`);
  chk(`no undrawn band above the stage`, topMargin <= 1, `${Math.round(topMargin)}px`);
  chk(`no undrawn band below the stage (was the bottom-favouring gap)`, botMargin <= 1, `${Math.round(botMargin)}px`);
  chk(`floor line framed in the lower-middle (not hugging an edge)`, g.floorLineScreenY/g.ch > 0.5 && g.floorLineScreenY/g.ch < 0.62, `${(g.floorLineScreenY/g.ch*100).toFixed(1)}%`);
  console.log(`  📸 harness/shots/${file}`);
  await page.close();
}
await browser.close(); server.close();
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
process.exit(FAIL ? 1 : 0);
