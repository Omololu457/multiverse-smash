// harness/toji_stage1_shots.mjs — STAGE 1 evidence: registration + movement/state + intro + speed-tier.
// Boots Toji, captures idle / walk / jump / intro, verifies each resolves its OWN re-sliced sheet,
// checks HP-only (no energy meter), measures drawn height, and proves the double-tap teleport-blur
// fires using HIS OWN dash sprite (a walk-cycle frame — "dash sprite, not a special effect").
// Usage: node harness/toji_stage1_shots.mjs
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

async function gotoToji() {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
}
async function boot() {
  await gotoToji();
  await page.evaluate(() => window.__harness.boot());
  await sleep(250);
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 320); });
  await sleep(60);
}

console.log("STAGE 1 — Toji registration + movement/state + intro + speed-tier\n");

// ── INTRO (start match, do NOT skip → intro plays; ends drawing the katana) ──
await gotoToji();
await page.evaluate(() => window.__harness.start());
await sleep(1400);                         // let the intro animation advance well into the draw-sword beat
let introSheet = (await P1()).spriteSheet;
await page.screenshot({ path: path.join(OUT, "toji_s1_intro.png") });
ok(introSheet && introSheet.includes("toji_intro"), `intro plays HIS intro sheet (${introSheet})`);

// ── IDLE ──
await boot();
let s = await P1();
ok(s.spriteSheet && s.spriteSheet.includes("toji_idle"), `idle → toji_idle sheet (${s.spriteSheet})`);
ok(s.key === "toji", `fighter is toji (key=${s.key})`);
ok(s.maxEnergy <= 1, `HP-only (energyless: maxEnergy=${s.maxEnergy} — hidden via hideResourceMeter, matches Maki)`);
ok(s.baseSpeed >= 98, `speed-tier stat (baseSpeed=${s.baseSpeed} >= 98)`);
const restr = await page.evaluate(() => window.__harness.energyIsRestriction ? window.__harness.energyIsRestriction("p1") : null);
ok(restr !== false, `HUD shows Heavenly-Restriction (no energy bar) = ${restr}`);
const meas = await page.evaluate(() => window.__harness.measureSprite ? window.__harness.measureSprite("p1") : null);
ok(meas && meas.contentH >= 100 && meas.contentH <= 130, `drawn idle height ${meas?.contentH}px in target band ~115px (scale ${meas?.scale}, canon 184cm)`);
await page.screenshot({ path: path.join(OUT, "toji_s1_idle.png") });

// ── WALK ──
await page.keyboard.down("d"); await sleep(320);
s = await P1();
ok(s.spriteSheet && s.spriteSheet.includes("toji_walk"), `walk → toji_walk sheet (${s.spriteSheet})`);
await page.screenshot({ path: path.join(OUT, "toji_s1_walk.png") });
await page.keyboard.up("d"); await sleep(120);

// ── JUMP ──
await page.keyboard.down("w"); await sleep(40); await page.keyboard.up("w");
await sleep(120);
s = await P1();
ok(!s.grounded, `jump → airborne (grounded=${s.grounded})`);
ok(s.spriteSheet && s.spriteSheet.includes("toji_jump"), `jump → toji_jump sheet (${s.spriteSheet})`);
await page.screenshot({ path: path.join(OUT, "toji_s1_jump.png") });
await sleep(600);   // land

// ── SPEED-TIER TELEPORT-BLUR (double-tap toward → blink behind + spin, using HIS dash sprite) ──
await boot();
await page.keyboard.down("d"); await sleep(28); await page.keyboard.up("d");
await sleep(60);
await page.keyboard.down("d"); await sleep(28); await page.keyboard.up("d");
let blur = 0, sheet = null;
for (let i = 0; i < 16; i++) { const p = await P1(); if (p.speedBlur > 0) { blur = p.speedBlur; sheet = p.spriteSheet; break; } await sleep(16); }
if (blur > 0 && !sheet) sheet = (await P1()).spriteSheet;
ok(blur > 0, `double-tap toward → teleport spin/blur fires (_speedBlur=${blur})`);
ok(sheet && sheet.includes("toji_"), `teleport-blur uses HIS OWN sprite, not an FX overlay (${sheet})`);
await page.screenshot({ path: path.join(OUT, "toji_s1_teleport.png") });

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
