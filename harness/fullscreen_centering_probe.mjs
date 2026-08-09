// harness/fullscreen_centering_probe.mjs — MEASURE the vertical framing of the battle scene at several
// screen resolutions/aspect ratios. For each: where does the drawn stage sit on screen, and how big are
// the empty (undrawn) margins ABOVE the stage top and BELOW the stage bottom? A bottom-favoring split
// shows up as topMargin ≫ botMargin (or vice-versa). Pure diagnostics — prints, asserts nothing hard.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const RES = [ {w:1920,h:1080,name:"16:9 FHD"}, {w:2560,h:1080,name:"21:9 ultrawide"}, {w:1920,h:1200,name:"16:10 tall"}, {w:2560,h:1440,name:"16:9 QHD"} ];

for (const r of RES) {
  const page = await browser.newPage({ viewport: { width: r.w, height: r.h } });
  await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  const s0 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(a => window.__harness.state().frame >= a + 6, s0, { polling: 16, timeout: 15000 }).catch(()=>{});
  await page.evaluate(() => window.__harness.skipToBattle());
  const s1 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(a => window.__harness.state().frame >= a + 40, s1, { polling: 16, timeout: 15000 }).catch(()=>{});
  const g = await page.evaluate(() => window.__harness.frameGeom());
  const topMargin = Math.max(0, g.stageTopScreenY);              // undrawn band above the stage
  const botMargin = Math.max(0, g.ch - g.stageBotScreenY);       // undrawn band below the stage
  const floorPct  = (g.floorLineScreenY / g.ch * 100).toFixed(1);
  console.log(`\n${r.name}  ${r.w}×${r.h}  zoom=${g.zoom.toFixed(3)}`);
  console.log(`  floor line on screen: y=${Math.round(g.floorLineScreenY)} (${floorPct}% down)`);
  console.log(`  stage drawn: top y=${Math.round(g.stageTopScreenY)} … bottom y=${Math.round(g.stageBotScreenY)}`);
  console.log(`  UNDRAWN margin above=${Math.round(topMargin)}px  below=${Math.round(botMargin)}px  → ${topMargin>botMargin+8?"TOP-heavy":botMargin>topMargin+8?"BOTTOM-heavy (gap under stage)":"balanced"}`);
  await page.close();
}
await browser.close(); server.close(); process.exit(0);
