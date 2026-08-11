// harness/toji_flyheads_shots.mjs — EVIDENCE: Toji's redesigned FLY HEADS as a dense, screen-filling
// VISION-DENIAL swarm on the ONE shared canvas (this game has no split-screen / per-player rendering, so the
// literal "opponent can't see, caster can" is impossible — this is the closest achievable: heavy symmetric
// clutter for BOTH players). Captures the swarm building → peak coverage → dispersal, and proves ZERO damage
// and NO projectiles (pure overlay). Usage: node harness/toji_flyheads_shots.mjs
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
const PROJS = () => page.evaluate(() => window.__harness.projectiles());
const P2 = () => page.evaluate(() => window.__harness.p2());
const STATE = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await STATE()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

async function bootVs() {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await sleep(300);
  // Stand the opponent clear of Toji's reach (the ~7s live window means a stray cast could otherwise graze the
  // easy AI and muddy the zero-damage proof — the swarm itself never damages; see test:toji + vanish test).
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 360); });
  await waitFrames(2);
}

console.log("TOJI FLY HEADS — dense vision-denial swarm on the shared screen\n");

await bootVs();
await page.screenshot({ path: path.join(OUT, "toji_flyheads_0_before.png") });
const hpBefore = (await P2()).health;
let s0 = await SWARM();
ok(!s0.active, `no swarm before cast`);

// CAST: Back + Special (hold Back = A while facing right, tap L = special). Retry a few times in case the
// easy AI interrupts the first attempt (hitstun/spacing) — the swarm fires once the press lands cleanly.
let s = await SWARM();
for (let attempt = 0; attempt < 12 && !s.active; attempt++) {
  await page.keyboard.down("a"); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await waitFrames(3); s = await SWARM();
  if (!s.active) { await page.keyboard.up("a"); await waitFrames(6); }
}

// BUILD (fade-in) — swarm just erupted.
ok(s.active && s.count >= 20, `swarm ACTIVE, dense (${s.count} heads, frame ${s.frame})`);
await page.screenshot({ path: path.join(OUT, "toji_flyheads_1_build.png") });

// PEAK — full density mid-life, arena/fighters swamped.
await waitFrames(70); s = await SWARM();
ok(s.active, `swarm at PEAK coverage (frame ${s.frame})`);
await page.screenshot({ path: path.join(OUT, "toji_flyheads_2_peak.png") });
await page.keyboard.up("a");
for (const k of ["a","d","w","s","j","k","l","i","u"]) await page.keyboard.up(k).catch(() => {});   // drop every held key so no stray cast/melee grazes the AI over the long live window

// Proof it's non-damaging + non-projectile the whole time.
let maxProjs = 0; for (let i = 0; i < 8; i++) { maxProjs = Math.max(maxProjs, (await PROJS()).filter(p => p.name === "tojiFlyHead").length); await waitFrames(2); }
ok(maxProjs === 0, `NO fly-head projectiles exist (pure overlay) — max ${maxProjs}`);

// ZERO-damage proof isolated from live combat: park the opponent well clear + heal to full, THEN measure across
// the dispersal. The swarm is a pure draw overlay, so a parked, un-engaged opponent must end exactly as it began
// (avoids the pre-existing flake where a stray cast during the retry loop grazed the adjacent easy AI).
await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 560); window.__harness.healP2?.(); });
await waitFrames(2);
const hpBaseline = (await P2()).health;

// DISPERSE — let the full ~7s window run out; combat was never frozen.
await page.waitForFunction(() => !window.__harness.tojiFlyHeadsSwarm().active, null, { timeout: 14000, polling: 16 }).catch(() => {});
s = await SWARM();
const hpAfter = (await P2()).health;
ok(!s.active, `swarm dispersed — view is clear again`);
ok(hpAfter === hpBaseline, `ZERO damage across the swarm (parked opponent ${hpBaseline}→${hpAfter})`);
await page.screenshot({ path: path.join(OUT, "toji_flyheads_3_cleared.png") });

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
console.log(`shots → ${path.relative(ROOT, OUT)}/toji_flyheads_*.png`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
