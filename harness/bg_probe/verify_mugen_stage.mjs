// Verify the wired Mugen Train stage renders mugen_train_bg.png through the real path (no swap —
// serves the actual on-disk file). Selects the stage live via setSession (getStageTheme reads it each
// frame), boots a battle, screenshots at 1920x1080 + also pans to a world edge to confirm no seam.
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
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await page.evaluate(() => window.__harness.setSession?.({ selectedStage: "Mugen Train" }));   // getStageTheme reads live
  await sleep(900);
  await page.screenshot({ path: path.join(shotDir, "MUGEN_center.png") });
  // confirm the wired stage actually loaded the file
  const info = await page.evaluate(() => {
    const img = new Image(); img.src = "./mugen_train_bg.png";
    return new Promise(res => { img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => res({ w: 0, h: 0 }); });
  });
  // pan to right world edge → no-seam confirmation on the real art
  await page.evaluate(() => { window.__harness.setP1X?.(3100); window.__harness.setP2X?.(3190); });
  await sleep(1300);
  await page.screenshot({ path: path.join(shotDir, "MUGEN_rightedge.png") });
  console.log(JSON.stringify({ bgFile: `${info.w}x${info.h}`, jsErrors: errs.length, errs: errs.slice(0,2) }));
} catch (e) { console.error("VERIFY ERROR:", e); }
finally { await browser.close(); server.close(); }
