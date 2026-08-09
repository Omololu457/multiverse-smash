// Reproduce + measure the "tiny floating character at jump apex" bug. Boots a training match on a
// given stage, makes P1 do a real jump (hold jump key), polls for the apex, and screenshots
// grounded / apex / landing. Reads p1.y + camera zoom (if exposed) to quantify the zoom-out.
//   usage: node jump_repro.mjs "<Stage Name>" <tag>
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const STAGE = process.argv[2] || "Test Map"; const TAG = process.argv[3] || "testmap";
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => {
  const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e,d) => { if (e){res.writeHead(404).end();return;} res.writeHead(200,{ "content-type":MIME[path.extname(f)]||"application/octet-stream" }); res.end(d); });
}); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
const shotDir = path.join(HERE, "shots"); fs.mkdirSync(shotDir, { recursive:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const p1 = () => page.evaluate(() => { const p = window.__harness.p1(); return { y: p.y, h: p.h ?? p.height, grounded: p.grounded, vy: p.vy }; });
const cam = () => page.evaluate(() => { try { return { zoom: window.__harness.cameraZoom?.() ?? null }; } catch { return { zoom: null }; } });
try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await page.evaluate(s => window.__harness.setSession?.({ selectedStage: s }), STAGE);
  await sleep(900);
  const g = await p1();
  await page.screenshot({ path: path.join(shotDir, `jump_${TAG}_1grounded.png`) });
  // real jump: hold jump key, poll for apex (min y)
  await page.keyboard.down("w");
  let minY = g.y, apexShotTaken = false;
  for (let i = 0; i < 70; i++) {
    await sleep(16);
    const s = await p1();
    if (s.y < minY) minY = s.y;
    // capture right around the apex (vy crosses zero / near min)
    if (!apexShotTaken && s.vy >= -0.6 && s.y <= minY + 4 && !s.grounded) {
      await page.screenshot({ path: path.join(shotDir, `jump_${TAG}_2apex.png`) });
      apexShotTaken = true;
    }
  }
  await page.keyboard.up("w");
  if (!apexShotTaken) await page.screenshot({ path: path.join(shotDir, `jump_${TAG}_2apex.png`) });
  await sleep(500);
  await page.screenshot({ path: path.join(shotDir, `jump_${TAG}_3landing.png`) });
  const groundYtop = g.y, apexYtop = minY;
  console.log(JSON.stringify({ stage: STAGE, groundedYtop: Math.round(groundYtop), apexYtop: Math.round(apexYtop),
    riseWorldPx: Math.round(groundYtop - apexYtop), charH: g.h, riseInCharHeights: +((groundYtop-apexYtop)/(g.h||110)).toFixed(2),
    jsErrors: errs.length }));
} catch (e) { console.error("REPRO ERROR:", e); }
finally { await browser.close(); server.close(); }
