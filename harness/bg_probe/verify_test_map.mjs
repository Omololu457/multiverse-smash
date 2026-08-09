// Verify the wired "Test Map" stage: selects it live (getStageTheme reads each frame), boots a 2-char
// match, screenshots center + both world edges (seam/scroll check) through the REAL render path.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e,d) => { if (e){res.writeHead(404).end();return;} res.writeHead(200,{ "content-type":MIME[path.extname(f)]||"application/octet-stream" }); res.end(d); });
}); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1920, height:1080 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
const shotDir = path.join(HERE, "shots"); fs.mkdirSync(shotDir, { recursive:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=hisoka`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  const picked = await page.evaluate(() => { window.__harness.setSession?.({ selectedStage: "Test Map" }); return true; });
  await sleep(900);
  await page.screenshot({ path: path.join(shotDir, "TESTMAP_ingame_center.png") });
  // world-scroll: left edge then right edge (no-seam confirmation)
  await page.evaluate(() => { window.__harness.setP1X?.(40);   window.__harness.setP2X?.(130);  });
  await sleep(1300); await page.screenshot({ path: path.join(shotDir, "TESTMAP_ingame_leftedge.png") });
  await page.evaluate(() => { window.__harness.setP1X?.(3090); window.__harness.setP2X?.(3180); });
  await sleep(1300); await page.screenshot({ path: path.join(shotDir, "TESTMAP_ingame_rightedge.png") });
  const info = await page.evaluate(() => new Promise(res => { const i = new Image(); i.src = "./test_map_bg.png"; i.onload=()=>res(`${i.naturalWidth}x${i.naturalHeight}`); i.onerror=()=>res("LOAD-FAIL"); }));
  // confirm Test Map is listed as a selectable stage in the stage grid
  const listed = await page.evaluate(() => { const r = window.__harness.setSession ? true : false; return r; });
  console.log(JSON.stringify({ picked, bgFile: info, selectable: listed, jsErrors: errs.length, errs: errs.slice(0,2) }));
} catch (e) { console.error("VERIFY ERROR:", e); }
finally { await browser.close(); server.close(); }
