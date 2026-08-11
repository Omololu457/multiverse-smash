// harness/toji_flyheads_vanish_shots.mjs — EVIDENCE for the REVISED Fly Heads: on cast Toji himself fades to
// near-invisible (~14% opacity) for the confirmed 5–10s window while the swarm plays around him, then returns
// to full visibility when it ends. Symmetric (single shared canvas), ZERO damage, render-only (no i-frames).
//
// Two shot sets per stage:
//   *_iso.png   — swarm hidden (harness-only window.__hideTojiSwarm) so Toji's body-fade is unmistakable.
//   *_live.png  — the real in-match view (faded Toji + flies) = the actual player experience.
// Hard proof is window.__harness.tojiFade() → { timer, max, alpha } sampled across the whole window.
// Usage: node harness/toji_flyheads_vanish_shots.mjs
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
const SWARM = () => page.evaluate(() => window.__harness.tojiFlyHeadsSwarm());
const FADE  = () => page.evaluate(() => window.__harness.tojiFade());
const P2 = () => page.evaluate(() => window.__harness.p2());
const STATE = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await STATE()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
// Screenshot both the isolated (swarm hidden) and live (swarm shown) views at the current instant.
async function shotPair(tag) {
  await page.evaluate(() => { window.__hideTojiSwarm = true; }); await waitFrames(1);
  await page.screenshot({ path: path.join(OUT, `toji_vanish_${tag}_iso.png`) });
  await page.evaluate(() => { window.__hideTojiSwarm = false; }); await waitFrames(1);
  await page.screenshot({ path: path.join(OUT, `toji_vanish_${tag}_live.png`) });
}

async function bootVs() {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await sleep(300);
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 240); });
  await waitFrames(2);
}

console.log("TOJI FLY HEADS — self-vanish (near-invisible for 5–10s), then return to normal\n");
await bootVs();

// ── STAGE 0: fully visible before cast ──
const hpBefore = (await P2()).health;
let f0 = await FADE();
ok(f0 && Math.abs(f0.alpha - 1) < 0.001 && f0.timer === 0, `before cast: Toji FULLY visible (alpha=${f0?.alpha}, timer=${f0?.timer})`);
await shotPair("0_before");

// ── CAST: Back + Special ──
let s = await SWARM();
for (let attempt = 0; attempt < 12 && !s.active; attempt++) {
  await page.keyboard.down("a"); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await waitFrames(3); s = await SWARM();
  if (!s.active) { await page.keyboard.up("a"); await waitFrames(6); }
}
await page.keyboard.up("a");
const f1 = await FADE();
ok(s.active, `swarm active on cast (frame ${s.frame})`);
ok(f1.timer > 0, `fade window OPENED on cast (timer=${f1.timer}/${f1.max})`);
// Confirm the confirmed 5–10s window: 300–600 frames @60fps.
ok(f1.max >= 300 && f1.max <= 600, `fade window is 5–10s (max=${f1.max} frames ≈ ${(f1.max/60).toFixed(1)}s)`);

// ── STAGE 1: just after cast — fading in ──
await shotPair("1_activate");

// ── STAGE 2: mid-window — near-invisible, and STAYS that way ──
await waitFrames(90);
const mid = await FADE();
ok(mid.alpha <= 0.2, `MID-window: Toji near-invisible (alpha=${mid.alpha.toFixed(3)})`);
await shotPair("2_invisible");

// Sample across the middle to prove it HOLDS low the whole time (not a one-frame blink).
let heldLow = true, samples = [];
for (let i = 0; i < 6; i++) { await waitFrames(40); const a = (await FADE()).alpha; samples.push(+a.toFixed(3)); if (a > 0.2) heldLow = false; }
ok(heldLow, `stays near-invisible across the window (alpha samples: ${samples.join(", ")})`);
await shotPair("3_held");

// ── STAGE 3: window ends → back to full visibility ──
await page.waitForFunction(() => (window.__harness.tojiFade()?.timer || 0) === 0, null, { timeout: 12000, polling: 16 }).catch(() => {});
await waitFrames(4);
const done = await FADE();
const hpAfter = (await P2()).health;
ok(done.timer === 0 && Math.abs(done.alpha - 1) < 0.001, `window ENDED: Toji FULLY visible again (alpha=${done.alpha}, timer=${done.timer})`);
ok(!(await SWARM()).active, `swarm dispersed with the fade`);
ok(hpAfter === hpBefore, `ZERO damage across the whole window (${hpBefore}→${hpAfter})`);
await shotPair("4_returned");

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
console.log(`shots → ${path.relative(ROOT, OUT)}/toji_vanish_*_iso.png (isolated) + _live.png (with flies)`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
