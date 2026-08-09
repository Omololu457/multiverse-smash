// harness/madara_stage1_shots.mjs — Stage 1 evidence for Madara Uchiha.
// Captures: char-select roster inclusion, the coffin-emergence INTRO cinematic,
// and in-battle movement/state poses (idle / run / jump / guard / knockdown-getup)
// via the generic _forceAction hook (harness.benPose).
// Usage: node harness/madara_stage1_shots.mjs
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
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(`${base}/index.html?harness=1&p1=madara&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);

// ── 1. Char-select: prove Madara is in the roster ──
await page.evaluate(() => window.__harness.showCharSelect());
await sleep(300);
await page.screenshot({ path: path.join(OUT, "madara_s1_charselect.png") });

// ── 2. INTRO cinematic (coffin emergence) — start() enters the real INTRO phase ──
const introInfo = await page.evaluate(() => { window.__harness.start(); const p = window.__harness.p1(); return { gameState: window.__harness.state().gameState, sheet: p?.spriteSheet }; });
console.log(`intro: gameState=${introInfo.gameState} sheet=${introInfo.sheet}`);
const marks = [100, 500, 900, 1400, 2000];
for (let i = 0; i < marks.length; i++) {
  await sleep(i === 0 ? marks[0] : marks[i] - marks[i-1]);
  const r = await page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, frame: p?.spriteFrame ?? null }; });
  await page.screenshot({ path: path.join(OUT, `madara_s1_intro_m${i}.png`) });
  console.log(`  intro ${marks[i]}ms: sheet=${r.sheet} frame=${r.frame}`);
}

// ── 3. Battle poses via forced action ──
await page.evaluate(() => window.__harness.skipToBattle());
await sleep(200);
const poses = ["idle", "run", "jump", "guard", "knockdown"];
for (const pose of poses) {
  await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose);
  await sleep(180);
  const r = await page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, frame: p?.spriteFrame ?? null, scale: p?.spriteScale ?? null }; });
  await page.screenshot({ path: path.join(OUT, `madara_s1_pose_${pose}.png`) });
  console.log(`  pose ${pose}: sheet=${r.sheet} frame=${r.frame} scale=${r.scale}`);
}

// measure the on-screen idle sprite height (roster-band check)
await page.evaluate(() => window.__harness.benPose(null));
await sleep(120);
const measure = await page.evaluate(() => window.__harness.measureSprite?.("p1") ?? null);
console.log("idle measureSprite:", JSON.stringify(measure));

console.log(errors.length ? `\nERRORS:\n${errors.join("\n")}` : "\nno page errors");
await browser.close(); server.close();
