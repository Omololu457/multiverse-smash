// harness/pain_ult_explosion_diag.mjs — diagnose the Chibaku Tensei EXPLOSION (ground effect) position.
// Captures the dome + pillar frames of the SLAM and compares the cinematic's HARDCODED screen target
// (oppX = cw*(0.5+dir*0.16), groundY = ch*0.66) against the opponent's REAL projected screen position.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(`${base}/index.html?harness=1&p1=pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);
const cine = () => page.evaluate(() => window.__harness.painUltCine?.() || null);
// Real opponent screen position + the cinematic's hardcoded target, both computed live.
const geom = () => page.evaluate(() => {
  const p = window.__harness.p1(), q = window.__harness.p2();
  const cam = window.__harness.camera();
  const cw = window.innerWidth, ch = window.innerHeight;
  const proj = (wx, wy) => ({ x: (wx - cam.x) * cam.zoom + cw / 2, y: (wy - cam.y) * cam.zoom + ch / 2 });
  const oppFeet = proj((q.x||0) + (q.w||0)/2, (q.y||0) + (q.h||0));       // opponent's feet, world→screen
  const oppMid  = proj((q.x||0) + (q.w||0)/2, (q.y||0) + (q.h||0)/2);
  const dir = (p.facing ?? 1) >= 0 ? 1 : -1;
  const hardX = cw * (0.5 + dir * 0.16), hardGroundY = ch * 0.66;         // what the cinematic uses
  return { cw, ch, dir, oppFeet, oppMid, hardX, hardGroundY, camZoom: cam.zoom };
});

await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.setP1Energy?.(210); const p=window.__harness.p1(); window.__harness.setP2X?.(p.x + (p.facing||1)*180); });
await sleep(80);
await page.keyboard.down("u"); await sleep(60); await page.keyboard.up("u");

// Scan the game canvas for the ARTIFACT: bright-saturated-green pixels in the upper-right SKY band
// (x 0.61–0.72·w, y 0.10–0.36·h) where the removed flame-pillar's baked-in green separator line used to
// run. Sky is blue + buildings gray there → any bright green = the artifact returning. (Grass/HP-bar
// greens sit outside this band.) Returns the count of artifact-green pixels.
const scanGreen = () => page.evaluate(() => {
  const cv = document.querySelector("canvas"); if (!cv) return -1;
  const g = cv.getContext("2d", { willReadFrequently: true }); if (!g) return -1;
  const w = cv.width, h = cv.height;
  const x0 = Math.floor(w * 0.61), x1 = Math.floor(w * 0.72), y0 = Math.floor(h * 0.10), y1 = Math.floor(h * 0.36);
  const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i+1], b = d[i+2], a = d[i+3];
    if (a > 40 && gg > 120 && gg > r + 45 && gg > b + 45) n++; }
  return n;
});

let everActive = false, grabbed = {}, maxGreen = 0;
for (let i = 0; i < 260; i++) {
  await sleep(16);
  const c = await cine();
  if (c?.active) {
    everActive = true;
    const since = c.frame - c.impactFrame;   // frames since SLAM
    if (c.phase === "rise" && c.frame > 90 && !grabbed.rise) { await page.screenshot({ path: path.join(OUT, "pain_ult_1_rise.png") }); grabbed.rise = c.frame; }
    if (c.phase === "slam") {
      if (!grabbed.geom) { grabbed.geom = await geom(); }
      if (since >= 2 && since <= 5 && !grabbed.impact) { await page.screenshot({ path: path.join(OUT, "pain_ult_2_impact.png") }); grabbed.impact = since; }
      // The window where the green-line flame PILLAR used to erupt — must now be clean.
      if (since >= 6) { const gr = await scanGreen(); if (gr > maxGreen) maxGreen = gr; }
      if (since >= 20 && since <= 24 && !grabbed.late) { await page.screenshot({ path: path.join(OUT, "pain_ult_3_postimpact.png") }); grabbed.late = since; }
    }
    if (c.phase === "settle" && !grabbed.settle) { await page.screenshot({ path: path.join(OUT, "pain_ult_4_settle.png") }); grabbed.settle = c.frame; }
  } else if (everActive) { await page.screenshot({ path: path.join(OUT, "pain_ult_5_resumed.png") }); break; }
}
const g = grabbed.geom || await geom();
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
console.log("── CHIBAKU TENSEI ULTIMATE — explosion removed, meteor-impact intact ──");
console.log(`(pre-fix: sprite explosion drew at x=${Math.round(g.hardX)}/y=${Math.round(g.hardGroundY)} vs opponent feet x=${Math.round(g.oppFeet.x)}/y=${Math.round(g.oppFeet.y)} → Δx=${Math.round(g.hardX-g.oppFeet.x)}px Δy=${Math.round(g.hardGroundY-g.oppFeet.y)}px, plus baked-in green lines)`);
ok(everActive, "ultimate cinematic ran");
ok(grabbed.impact != null, "meteor SLAM impact flash captured (payoff intact)");
ok(maxGreen <= 8, `NO green-line pillar artifact in the sky band (bright-green px=${maxGreen}, was a full vertical line)`);
console.log(`shots: pain_ult_{1_rise,2_impact,3_postimpact,4_settle,5_resumed}.png`);
console.log(`\n${pass} pass / ${fail} fail`);
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
