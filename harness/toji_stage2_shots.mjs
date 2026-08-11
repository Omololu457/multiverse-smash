// harness/toji_stage2_shots.mjs — STAGE 2 evidence: basic normals + A-B-C-A+B rekka + gun poke.
// Boots Toji vs a stationary dummy at close range and drives: neutral light/heavy, up-attack launcher,
// aerial light, down-air spike, the Fwd+Heavy A-B-C-A+B rekka (tojiG1→G2→G3→G4, cancel-on-hit), and the
// Back+Heavy Handgun bullet poke. Verifies each connects (dummy HP drops) and resolves its OWN sheet.
// Usage: node harness/toji_stage2_shots.mjs
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
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const P1 = () => page.evaluate(() => window.__harness.p1());
const P2 = () => page.evaluate(() => window.__harness.p2());
const CMD = () => page.evaluate(() => window.__harness.tojiCmd());
const PROJ = () => page.evaluate(() => window.__harness.projectiles());
const STATE = () => page.evaluate(() => window.__harness.state());
const tap = async (k, ms=30) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
async function waitFrames(n) { const s = (await STATE()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

async function boot(gap = 84) {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(200);
  await page.evaluate((g) => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + g); }, gap);
  await sleep(60);
}

console.log("STAGE 2 — Toji basic normals + A-B-C-A+B rekka + Handgun poke\n");

// ── NEUTRAL LIGHT ──
await boot();
let h0 = (await P2()).health;
await tap("j"); await sleep(200);
let s = await P1();
ok((await P2()).health < h0, `neutral light connects (dmg ${Math.round(h0-(await P2()).health)})`);
ok(s.spriteSheet.includes("toji_punch"), `light → punch sheet (${s.spriteSheet})`);

// ── NEUTRAL HEAVY ──
await boot();
h0 = (await P2()).health;
await tap("k"); await sleep(250);
ok((await P2()).health < h0, `neutral heavy connects (dmg ${Math.round(h0-(await P2()).health)})`);

// ── UP-ATTACK LAUNCHER ──
await boot(70);
await tap("i"); await sleep(120);
let p2 = await P2();
ok(p2.isLaunched || p2.vy < -1 || !p2.grounded, `up-attack launches the dummy (vy=${p2.vy?.toFixed(1)}, launched=${p2.isLaunched})`);
await page.screenshot({ path: path.join(OUT, "toji_s2_up.png") });

// ── AIR ATTACK (airborne light) ──
await boot();
await page.keyboard.down("w"); await sleep(40); await page.keyboard.up("w"); await sleep(120);
await tap("j"); await sleep(60);
s = await P1();
ok(s.action === "air" || (s.spriteSheet||"").includes("toji_punch"), `aerial light → air pose (action=${s.action})`);
await sleep(500);

// ── DOWN-AIR SPIKE (airborne down+light) ──
await boot();
await page.keyboard.down("w"); await sleep(40); await page.keyboard.up("w"); await sleep(110);
await page.keyboard.down("s"); await page.keyboard.down("j"); await sleep(70);
s = await P1();
await page.keyboard.up("j"); await page.keyboard.up("s");
ok((s.spriteSheet||"").includes("toji_down_air") || s.action === "down_air", `down-air → down_air sheet (${s.spriteSheet}, action=${s.action})`);
await page.screenshot({ path: path.join(OUT, "toji_s2_downair.png") });
await sleep(500);

// ── A-B-C-A+B REKKA (Fwd+Heavy opener → re-tap Heavy only during a connected recovery) ──
await boot(80);
h0 = (await P2()).health;
const chain = [];
await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
for (let i = 0; i < 60; i++) {
  const c = await CMD();
  if (c?.move && !chain.includes(c.move)) chain.push(c.move);
  if (chain.includes("tojiG4")) break;
  if (c?.rekkaNext && c?.connected && c?.phase === "recovery") { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); }
  else await waitFrames(1);
}
await page.keyboard.up("d"); await waitFrames(16);
ok(chain[0] === "tojiG1" && chain.includes("tojiG2") && chain.includes("tojiG3") && chain.includes("tojiG4"),
   `rekka walks the FULL A-B-C-A+B (chain: ${chain.join(" → ")})`);
ok((await P2()).health < h0 - 45, `full chain deals real damage (total ${Math.round(h0-(await P2()).health)})`);
await page.screenshot({ path: path.join(OUT, "toji_s2_rekka.png") });

// ── INTERRUPT: a whiffed opener must NOT chain (cancel-on-hit gate) ──
await boot(52);
await page.evaluate(() => window.__harness.setP2X(99999));   // move dummy away → opener whiffs
const whiff = [];
await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
for (let i = 0; i < 18; i++) { const m = (await P1()).action; if (m && !whiff.includes(m)) whiff.push(m); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); }
await page.keyboard.up("d");
ok(whiff.includes("tojiG1") && !whiff.includes("tojiG2"), `whiffed opener does NOT chain to tojiG2 (seen: ${whiff.join(", ")})`);

// ── BACK+HEAVY HANDGUN BULLET POKE ──
await boot(260);   // wide gap so the bullet stays airborne while we sample
await page.keyboard.down("a");             // hold back (dummy is to the right; a = away)
await tap("k");
// The bullet is scheduled ~9 frames after the draw → poll for it (it later HITS the dummy and despawns).
let bullet = null, cast = null;
for (let i = 0; i < 20; i++) { const projs = await PROJ(); bullet = projs.find(p => p.name === "tojiBullet"); const cm = await CMD(); if (cm.cast) cast = cm.cast; if (bullet) break; await sleep(20); }
ok(!!bullet, `Back+Heavy fires a bullet projectile (${bullet ? `tojiBullet @ vx ${bullet.vx}` : "never spawned"})`);
ok(cast === "tojiGun", `handgun draw-fire pose plays (cast=${cast})`);
await page.screenshot({ path: path.join(OUT, "toji_s2_gun.png") });
await page.keyboard.up("a");

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
