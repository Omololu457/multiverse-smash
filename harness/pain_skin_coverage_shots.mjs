// harness/pain_skin_coverage_shots.mjs — Pain skin-coverage EVIDENCE. The audit found NO body-sheet gap for
// Pain (his gen tool tools/gen_pain_creative.py dynamically scans every animationData _uniform sheet, so all
// 23 body sheets × 12 skins are covered — including his newer content: chibaku_cast, dedera_cast/rise,
// super_push, almighty_push/pull). This renders Pain in a vivid skin (Crimson Rinnegan) across his kit to show
// the BODY is consistently skinned; the only base-coloured elements are PROPS/FX (the Chibaku sphere, Almighty
// Push ground wave, Dedera bird/explosion) — celestial objects & effects, not Pain's recolorable body, so they
// are intentionally left canonical. Usage: node harness/pain_skin_coverage_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const SKIN = "painCrimsonRinnegan";
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

await page.goto(`${base}/index.html?harness=1&p1=pain&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
await sleep(300);
await page.evaluate((s) => { window.__harness.setSkin("p1", s); window.__harness.resetFighterInput("p1"); window.__harness.fillEnergy?.(); }, SKIN);
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 260); });
await waitFrames(3);
console.log("skin:", (await P1()).skinId);

// (1) skinned idle
await page.screenshot({ path: path.join(OUT, "pain_skin_1_idle.png") });

// capture a cast pose by polling castMove while firing specials/ultimate
async function captureCast(label, fire, wantPrefix) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.evaluate(() => window.__harness.fillEnergy?.());
    await fire();
    for (let i = 0; i < 26; i++) {
      const p = await P1();
      if (p.castMove && (!wantPrefix || p.castMove.toLowerCase().includes(wantPrefix))) {
        await page.screenshot({ path: path.join(OUT, `pain_skin_${label}.png`) });
        console.log(`${label}: castMove=${p.castMove}`);
        return true;
      }
      await waitFrames(1);
    }
    await waitFrames(6);
  }
  console.log(`${label}: not captured`); return false;
}

// (2) Almighty Push (neutral Special) — pain_almighty_push body pose
await captureCast("2_almightypush", async () => { await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); }, "push");

// (3) Chibaku Tensei ULTIMATE — pain_chibaku_cast body pose (+ the base-coloured sphere prop, by design)
await captureCast("3_chibaku_ult", async () => { await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); }, "chibaku");

// (4) whatever the ult evolves into a few frames later (sphere raised) — shows body still skinned, sphere canonical
await waitFrames(40);
await page.screenshot({ path: path.join(OUT, "pain_skin_4_chibaku_sphere.png") });

console.log(errors.length ? `ERRORS: ${errors.slice(0,4).join(" | ")}` : "no page errors");
await browser.close(); server.close();
