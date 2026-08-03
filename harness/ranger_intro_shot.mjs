// harness/ranger_intro_shot.mjs — capture a character's pre-match INTRO phase animating.
// Usage: node harness/ranger_intro_shot.mjs --char=gold_samurai_ranger --label=gold
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1]) || "";
const char = arg("char") || "gold_samurai_ranger"; const label = arg("label") || char;
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(`${base}/index.html?harness=1&p1=${char}`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
// enter the real INTRO phase (start = startHarnessMatch WITHOUT skipToBattle)
const info = await page.evaluate(() => { window.__harness.start(); const p = window.__harness.p1(); return { gameState: window.__harness.state().gameState, variant: p?.introVariant, sheet: p?.spriteSheet }; });
console.log(`${char}: gameState=${info.gameState} introVariant=${info.variant} sheet=${info.sheet}`);
// the browser rAF game-loop advances intro frames in real time during INTRO — sample across the play
const marks = [120, 450, 800, 1200, 1700];
for (let i = 0; i < marks.length; i++) {
  await sleep(i === 0 ? marks[0] : marks[i] - marks[i-1]);
  const r = await page.evaluate(() => { const p = window.__harness.p1(); return { variant: p?.introVariant, sheet: p?.spriteSheet, frame: p?.spriteFrame ?? null }; });
  await page.screenshot({ path: path.join(OUT, `intro_${label}_m${i}.png`) });
  console.log(`  ${marks[i]}ms: variant=${r.variant} sheet=${r.sheet}`);
}
await browser.close(); server.close();
