// harness/obito_kamui_skin_shots.mjs — BEFORE/AFTER evidence for the skin-backfill of the Kamui-activate
// pose. Renders Obito in a vivid skin (Crimson Eye), captures (a) his skinned IDLE (proves the skin works
// on his body) and (b) the Kamui INITIATION pose (obito_kamui_activate) which — until backfilled — has no
// __<tag> recolor file and therefore renders as the broken procedural-box fallback. Pass a label arg
// ("before" | "after") to name the shots. Usage: node harness/obito_kamui_skin_shots.mjs before
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const LABEL = process.argv[2] || "shot";
const SKIN = "obitoCrimsonEye";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const P1 = () => page.evaluate(() => window.__harness.p1());
const STATE = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await STATE()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
await sleep(300);
await page.evaluate((s) => { window.__harness.setSkin("p1", s); window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); }, SKIN);
// push opponent far away so it can't interrupt
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 500); });
await waitFrames(3);

// (a) skinned idle — proof the body recolor is applied
await page.screenshot({ path: path.join(OUT, `obito_kamui_${LABEL}_idle.png`) });
console.log(`idle skin=${(await P1()).skinId}`);

// (b) Kamui INITIATION pose — toggle ON, then poll for the obitoKamuiActivate cast pose and shoot it.
let captured = false;
for (let attempt = 0; attempt < 6 && !captured; attempt++) {
  await page.evaluate(() => { window.__harness.fillEnergy?.(); });
  const on = await page.evaluate(() => window.__harness.obitoKamuiToggle());   // toggle ON → sets _spriteCastMove
  if (!on?.intangible) { await page.evaluate(() => window.__harness.obitoKamuiToggle()); continue; }  // was already on → flip off, retry
  // poll the 14-frame pose window
  for (let i = 0; i < 14; i++) {
    const p = await P1();
    if (p.castMove === "obitoKamuiActivate") {
      await page.screenshot({ path: path.join(OUT, `obito_kamui_${LABEL}_activatepose.png`) });
      console.log(`captured kamui-activate pose (frame ${i}), skin=${p.skinId}`);
      captured = true; break;
    }
    await waitFrames(1);
  }
  await page.evaluate(() => window.__harness.obitoKamuiToggle());   // toggle OFF for a clean retry
  await waitFrames(2);
}
console.log(captured ? "POSE CAPTURED" : "POSE NOT CAPTURED");
console.log(errors.length ? `ERRORS: ${errors.slice(0,4).join(" | ")}` : "no page errors");
await browser.close(); server.close();
process.exit(captured ? 0 : 1);
