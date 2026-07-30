// harness/rick_portalvoid_shot.mjs — REAL in-match screenshots of Rick's Portal Void skin: idle + a
// heavy attack + an airborne pose + a Portal-Behind teleport, to confirm the black base + procedural
// green swirl overlay both render and stay attached to the sprite across very different poses.
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

await page.goto(`${base}/index.html?harness=1&p1=rick`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(300);
const applied = await page.evaluate(() => window.__harness.setSkin("p1", "rickPortalVoid"));
await sleep(1100);   // let __portalvoid sheets decode before first capture
console.log("applied:", applied);

async function shot(name) {
  const p1 = await page.evaluate(() => window.__harness.p1());
  await page.screenshot({ path: path.join(OUT, `rick_portalvoid_${name}_full.png`) });
  console.log(`  ${name}: worldX=${Math.round(p1?.x)} lastDrawY=${p1?.lastDrawY} skin=${p1?.skinId}`);
  return p1;
}
await shot("idle");
await page.keyboard.down("k"); await sleep(110); await shot("attack"); await page.keyboard.up("k");
await sleep(200);
await page.keyboard.down("w"); await sleep(180); await shot("air"); await page.keyboard.up("w");
await sleep(400);
const before = await page.evaluate(() => window.__harness.p1()?.x);
// B->B teleport (back = 'a' since p1 faces right): double-tap, then also press special as a fallback
await page.keyboard.press("a"); await sleep(40); await page.keyboard.press("a"); await sleep(30);
await page.keyboard.press("l"); await sleep(90);
const after = await page.evaluate(() => window.__harness.p1()?.x);
await shot("teleport");
console.log(`  teleport reposition: x ${Math.round(before)} -> ${Math.round(after)} (Δ=${Math.round(after-before)})`);
await browser.close(); server.close();
console.log("shots -> harness/shots/rick_portalvoid_*_full.png");
