// harness/bg_probe/bg_edge_pan.mjs — proves the background is ONE stretched copy across the full
// 3200 world (not a tile/segment): serves the test pattern as the JJK bg, then pans the camera to the
// FAR-LEFT (world x≈0) and FAR-RIGHT (world x≈3200) world edges and screenshots each. If it were tiled
// there'd be a repeated frame/seam mid-world; if too narrow there'd be a gap at an edge. A single
// stretched image → left edge shows the pattern's LEFT red frame (TL/BL), right edge shows the RIGHT
// frame (TR/BR), continuous between. Usage: node bg_edge_pan.mjs <patternPng>
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const patternAbs = path.resolve(process.argv[2] || path.join(HERE, "pat_2752x1536.png"));
const SWAP = "jujutsu_high_courtyard.png";
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  if (u.endsWith("/"+SWAP)) { res.writeHead(200,{ "content-type":"image/png" }); res.end(fs.readFileSync(patternAbs)); return; }
  const f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e,d) => { if (e){res.writeHead(404).end();return;} res.writeHead(200,{ "content-type":MIME[path.extname(f)]||"application/octet-stream" }); res.end(d); });
}); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1920, height:1080 } });
const shotDir = path.join(HERE, "shots"); fs.mkdirSync(shotDir, { recursive:true });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function panShot(worldX, name) {
  // put BOTH fighters at worldX so the camera midpoint clamps to that world edge, let it settle, shoot
  await page.evaluate(x => { window.__harness.setP1X?.(x); window.__harness.setP2X?.(x + 90); }, worldX);
  await sleep(1400);
  await page.screenshot({ path: path.join(shotDir, `${name}.png`) });
}
try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await sleep(600);
  await panShot(40,   "PAN_left_worldedge");     // far left  (world x≈0)
  await panShot(3100, "PAN_right_worldedge");    // far right (world x≈3200)
  console.log("panned + shot: PAN_left_worldedge.png, PAN_right_worldedge.png");
} catch (e) { console.error("PAN ERROR:", e); }
finally { await browser.close(); server.close(); }
