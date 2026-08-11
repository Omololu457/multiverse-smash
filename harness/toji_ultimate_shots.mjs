// harness/toji_ultimate_shots.mjs — EVIDENCE: Toji's Reincarnated Form as a GENUINE, player-chosen ULTIMATE.
// Boots a REAL vs-match at FULL HP, presses the Ultimate button (Super/X) with no HP requirement, and captures
// the freeze-cinematic across its phases (push → hold → burst → settle), then confirms the Reincarnated Form
// persists into live combat. Finally verifies the manual ultimate does NOT conflict with the automatic
// two-stage comeback (both can happen in one match; no double transform, no double buff, no replayed cinematic).
// Usage: node harness/toji_ultimate_shots.mjs
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
const CB = () => page.evaluate(() => window.__harness.tojiComeback());
const CINE = () => page.evaluate(() => window.__harness.tojiReincarnationCine());
const STATE = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await STATE()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function killP1() { await page.evaluate(() => window.__harness.setP1HealthRaw(0)); await waitFrames(2); }

async function bootVs() {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await sleep(300);
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 420); });
  await waitFrames(2);
}

console.log("TOJI ULTIMATE — Reincarnated Form as a manual, player-chosen ultimate (freeze-cinematic)\n");

await bootVs();
let s0 = await CB();
ok(s0.hpPct >= 95 && !s0.reincarnated, `FULL HP before cast — no critical-HP requirement (${s0.hpPct}%)`);
await page.screenshot({ path: path.join(OUT, "toji_ult_0_full_hp_precast.png") });

// PRESS the Ultimate button (Super/X) at full HP.
await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");

// PUSH phase — camera isolates + pushes in on Toji, crimson aura builds.
await waitFrames(20); let c = await CINE(); let s = await CB();
ok(c.active && s.reincarnated, `cinematic PUSH — freeze-cinematic active, form entered (phase=${c.phase}, frame=${c.frame})`);
await page.screenshot({ path: path.join(OUT, "toji_ult_1_push.png") });

// HOLD phase — held close as the aura swells.
await waitFrames(45); c = await CINE();
ok(c.active, `cinematic HOLD (phase=${c.phase}, frame=${c.frame})`);
await page.screenshot({ path: path.join(OUT, "toji_ult_2_hold.png") });

// BURST beat — transformation completes: crimson flash + hard shake.
await waitFrames(42); c = await CINE();
ok(c.active, `cinematic BURST/SETTLE (phase=${c.phase}, frame=${c.frame}, burst=${c.burst})`);
await page.screenshot({ path: path.join(OUT, "toji_ult_3_burst.png") });

// SETTLE → combat resumes with the Reincarnated Form LIVE (crimson tint on the sprite).
await page.waitForFunction(() => !window.__harness.tojiReincarnationCine().active, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(6); c = await CINE(); s = await CB();
ok(!c.active, `cinematic ENDED — combat resumes`);
ok(s.reincarnated && Math.abs(s.dmgMult - 1.25) < 0.01, `Reincarnated Form LIVE after cinematic (dmgMult=${s.dmgMult})`);
ok(s.savesUsed === 0, `manual ultimate did NOT consume a comeback save (savesUsed=${s.savesUsed})`);
await page.screenshot({ path: path.join(OUT, "toji_ult_4_form_live_incombat.png") });

// ── NO CONFLICT: manual ultimate already used → drive the automatic two-stage comeback in the SAME match. ──
await killP1(); s = await CB(); c = await CINE();
ok(s.savesUsed === 1 && s.hpPct >= 20 && s.hpPct <= 30, `auto SAVE 1 still fires after manual ult (${s.hpPct}%)`);
ok(!c.active, `auto SAVE 1 does NOT replay the manual cinematic`);
await killP1(); s = await CB(); c = await CINE();
ok(s.savesUsed === 2 && s.hpPct >= 35 && s.hpPct <= 45, `auto SAVE 2 restores HP without re-transforming (${s.hpPct}%)`);
ok(Math.abs(s.dmgMult - 1.25) < 0.01, `no double buff — dmg stays ×1.25 (dmgMult=${s.dmgMult})`);
ok(!c.active, `auto SAVE 2 does NOT play the manual cinematic`);
await page.screenshot({ path: path.join(OUT, "toji_ult_5_comeback_no_conflict.png") });

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
console.log(`shots → ${path.relative(ROOT, OUT)}/toji_ult_*.png`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
