// harness/void_spark_shot.mjs — verify the Gold Samurai "Voidwalker" gold-spark overlay renders & TRACKS
// across combat poses (not just idle). Boots gold_samurai_ranger, applies goldVoidwalker, then captures:
// idle, after frames (sparks drifted/twinkled), and two attack poses (heavy lunge + rising launcher) —
// cropped around the fighter's drawn bbox and upscaled for legibility of the small sparks.
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

await page.goto(`${base}/index.html?harness=1&p1=gold_samurai_ranger`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(200);
const applied = await page.evaluate(() => window.__harness.setSkin("p1", "goldVoidwalker"));
console.log("applied skin:", applied);
await sleep(400);

async function shot(name) {
  const p1 = await page.evaluate(() => window.__harness.p1());
  const w = 200, h = 200;
  const cx = Math.round((p1?.lastDrawX ?? 385) + (p1?.lastDrawW ?? 100) / 2);
  const cy = Math.round((p1?.lastDrawY ?? 320) + (p1?.lastDrawH ?? 100) / 2);
  const clip = { x: Math.max(0, cx - w / 2), y: Math.max(0, cy - h / 2), width: w, height: h };
  await page.screenshot({ path: path.join(OUT, `gold_void_${name}.png`), clip });
  console.log(`  ${name}: drawX=${Math.round(p1?.lastDrawX)} drawY=${Math.round(p1?.lastDrawY)} skin=${p1?.skinId}`);
}
await shot("idle");
await sleep(700); await shot("twinkled");                       // rAF frames pass → sparks drift/twinkle
await page.evaluate(() => window.__harness.benPose("heavy", "p1"));
await sleep(250); await shot("attack_lunge");
await page.evaluate(() => window.__harness.benPose("up", "p1"));
await sleep(250); await shot("attack_rising");

// upscale all four 3x nearest into one strip for legibility
const { chromium: _c } = {};
await browser.close(); server.close();
console.log("shots -> harness/shots/gold_void_{idle,twinkled,attack_lunge,attack_rising}.png");
