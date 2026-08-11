// harness/toji_stage5_shots.mjs — STAGE 5 evidence: Playful Cloud + Fly Heads swarm.
// Playful Cloud (Up Special) = ONE self-contained three-section-staff dash-strike (tojiPlayfulCloud).
// Fly Heads   (Back Special) = a SWARM of shikigami fly-head projectiles — MULTIPLE simultaneous instances.
// Usage: node harness/toji_stage5_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const P1 = () => page.evaluate(() => window.__harness.p1());
const P2 = () => page.evaluate(() => window.__harness.p2());
const CMD = () => page.evaluate(() => window.__harness.tojiCmd());
const PROJ = () => page.evaluate(() => window.__harness.projectiles());
const STATE = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await STATE()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function boot(gap = 110) {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(200);
  await page.evaluate((g) => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + g); }, gap);
  await sleep(60);
}

console.log("STAGE 5 — Playful Cloud + Fly Heads swarm\n");

// ── PLAYFUL CLOUD (Up Special) — three-section-staff dash-strike ──
await boot(120);
let h0 = (await P2()).health;
let x0 = (await P1()).x;
// press Up + Special TOGETHER (so the jump is suppressed and it reads as an up-special)
await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("w");
let sawPose = false;
for (let i = 0; i < 30; i++) { const c = await CMD(); if (c?.move === "tojiPlayfulCloud") { sawPose = true; if (i === 3) await page.screenshot({ path: path.join(OUT, "toji_s5_playfulcloud.png") }); } await waitFrames(1); }
ok(sawPose, `Up+Special fires Playful Cloud (tojiPlayfulCloud staff dash-strike pose)`);
ok((await P1()).x - x0 > 10, `Playful Cloud lunges forward (Δx=${Math.round((await P1()).x - x0)}px — gap-closer)`);
ok((await P2()).health < h0, `Playful Cloud connects (dmg ${Math.round(h0-(await P2()).health)})`);
await page.screenshot({ path: path.join(OUT, "toji_s5_playfulcloud.png") });

// ── FLY HEADS (Back Special) — a SWARM of simultaneous fly-head projectiles ──
await boot(300);   // wide gap so the whole swarm is airborne while we sample
h0 = (await P2()).health;
await page.keyboard.down("a"); await waitFrames(1);   // hold back (dummy to the right → a = away)
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
let maxSimul = 0, castSeen = null, bestShot = 0;
for (let i = 0; i < 40; i++) {
  const projs = await PROJ();
  const heads = projs.filter(p => p.name === "tojiFlyHead");
  if (heads.length > maxSimul) { maxSimul = heads.length; }
  if (heads.length >= 3 && bestShot < heads.length) { bestShot = heads.length; await page.screenshot({ path: path.join(OUT, "toji_s5_flyheads.png") }); }
  const c = await CMD(); if (c?.cast) castSeen = c.cast;
  await waitFrames(1);
}
await page.keyboard.up("a");
ok(castSeen === "tojiFlyHeads", `Back+Special fires the release gesture (cast=${castSeen})`);
ok(maxSimul >= 3, `Fly Heads spawns a SWARM — ${maxSimul} simultaneous fly-head instances on screen (not one prop)`);
ok((await P2()).health < h0, `the swarm harasses/damages (dmg ${Math.round(h0-(await P2()).health)})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
