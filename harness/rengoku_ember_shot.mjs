// harness/rengoku_ember_shot.mjs — verify the Void Ember procedural overlay renders & TRACKS.
// Boots rengoku, applies rengokuVoidEmber, then captures: idle, after 40 frames (embers risen),
// and an attack pose (rengokuSuperFwd) — cropped around the fighter's drawn bbox.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

await page.goto(`${base}/index.html?harness=1&p1=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(200);
const applied = await page.evaluate(() => window.__harness.setSkin("p1", "rengokuVoidEmber"));
console.log("applied skin:", applied);
await sleep(1100);   // let the __voidember sheets decode before the first capture (async Image load)

const CLIP = { x: 300, y: 225, width: 190, height: 220 };   // tight around p1 (worldX 1320 -> screen ~385)
async function shot(name) {
  const p1 = await page.evaluate(() => window.__harness.p1());
  const raw = path.join(OUT, `rengoku_ember_${name}.png`);
  await page.screenshot({ path: raw, clip: CLIP });
  // upscale 3x nearest for legibility of the small embers
  const { chromium: _ } = {}; // no-op
  console.log(`  ${name}: worldX=${Math.round(p1?.x)} lastDrawY=${p1?.lastDrawY} skin=${p1?.skinId}`);
}
await shot("idle");
await sleep(750); await shot("risen");            // real rAF frames pass → embers drift up
await page.evaluate(() => window.__harness.benPose("rengokuSuperFwd", "p1"));
await sleep(300); await shot("attack");

await browser.close(); server.close();
console.log("shots -> harness/shots/rengoku_ember_{idle,risen,attack}.png");
