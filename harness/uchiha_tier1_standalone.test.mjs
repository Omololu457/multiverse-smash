// harness/uchiha_tier1_standalone.test.mjs
// QUESTION: is the Tier-1 skeletal Susanoo GRAB a STANDALONE special (its own input, pullable any
// time a normal special is usable), fully SEPARATE from the tiered Ultimate — with no cross-effect,
// and never a phase inside the Ultimate cinematic?
// This measures the REAL wiring on BOTH Uchiha and prints a per-character VERDICT.
// Keys: light=j heavy=k special=l ultimate=u · move a/d.
// Usage: node harness/uchiha_tier1_standalone.test.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
async function boot(p1) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(250);
}
const placeP2 = (gap) => page.evaluate(g => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + g); window.__harness.healP2(); }, gap);
const pressFwdHeavy = async () => { await page.keyboard.down("d"); await sleep(50); await page.keyboard.down("k"); await sleep(50); await page.keyboard.up("k"); await page.keyboard.up("d"); };
const pressSpecial = async () => { await page.keyboard.down("l"); await sleep(70); await page.keyboard.up("l"); };
const pressGrab    = async () => { await page.keyboard.down("o"); await sleep(70); await page.keyboard.up("o"); };   // dedicated grab button
const pressUltTap  = async () => { await page.keyboard.down("u"); await sleep(80); await page.keyboard.up("u"); };
async function catchGrab(win = 20) { for (let i = 0; i < win; i++) { if ((await P2()).isGrabbed) return true; await sleep(20); } return false; }

// ═══════════════════════ MADARA ═══════════════════════
console.log("MADARA — Tier-1 grab (Fwd+Heavy) vs Ultimate ('u' tap/hold):");
await boot("madara");
await page.evaluate(() => window.__harness.resetUlt());   // full energy, no ult cooldown
await sleep(60);
const mCine0 = await page.evaluate(() => window.__harness.madaraUltCine());
const mE0    = (await P1()).energy;

// (a) fire Tier-1 grab with NO ultimate input at all
await placeP2(90);
let mGrabbed = false;
for (let a = 0; a < 4 && !mGrabbed; a++) { await pressFwdHeavy(); mGrabbed = await catchGrab(18); if (!mGrabbed) await sleep(120); }
const mCineDuringGrab = await page.evaluate(() => window.__harness.madaraUltCine());
const mComplete = (await P1()).completeSusanoo;
const mE1 = (await P1()).energy;
ok(mGrabbed, "(a) Tier-1 grab FIRES with no ultimate input (standalone special)");
ok(!mCine0.active && !mCineDuringGrab.active, "(a) grab does NOT start the Ultimate cinematic");
ok(mComplete === 0, "(a) grab does NOT enter Complete Susanoo (no ultimate state touched)");
ok(Math.abs(mE1 - mE0) < 1, `(a) grab leaves Ultimate energy untouched (${mE0.toFixed(0)}→${mE1.toFixed(0)}, grab is free)`);
await sleep(700);   // let the throw resolve + grab recovery clear

// (b) now fire the Ultimate independently and watch its phases
await page.evaluate(() => window.__harness.resetUlt());
await page.evaluate(() => window.__harness.healP2());
await sleep(60);
await pressUltTap();
await sleep(120);
const phases = new Set();
for (let i = 0; i < 16; i++) { const c = await page.evaluate(() => window.__harness.madaraUltCine()); if (c.active) phases.add(c.phase); await sleep(60); }
const ultFired = phases.size > 0;
const grabIsAPhase = [...phases].some(p => /grab|susanoo_?arm|punch/i.test(p || ""));
ok(ultFired, `(b) Ultimate fires independently afterward (phases seen: ${[...phases].join(",") || "none"})`);
ok(!grabIsAPhase, "(b) Tier-1 grab NEVER appears as a phase inside the Ultimate cinematic");
const madaraCompliant = mGrabbed && !mCineDuringGrab.active && mComplete === 0 && Math.abs(mE1 - mE0) < 1 && ultFired && !grabIsAPhase;
console.log(`  ▶ MADARA VERDICT: ${madaraCompliant ? "COMPLIANT — Tier-1 grab is a standalone special, fully independent of the Ultimate." : "NOT COMPLIANT (see fails above)."}`);

// ═══════════════════════ SASUKE ═══════════════════════
console.log("\nSASUKE — Tier-1 skeletal grab (grab button = Down+Light) vs the staged Susanoo Ultimate:");
await boot("sasuke");
const sStage0 = (await P1()).susanooStage;

// (a) fire the Tier-1 skeletal grab STANDALONE from neutral — grab BUTTON, no ultimate input at all
await placeP2(120);
let sGrabbed = false;
for (let a = 0; a < 4 && !sGrabbed; a++) { await pressGrab(); sGrabbed = await catchGrab(18); if (!sGrabbed) await sleep(120); }
const sStageAfterGrab = (await P1()).susanooStage;
ok(sGrabbed, "(a) Tier-1 grab FIRES from neutral via the grab button (standalone special, no ultimate)");
ok(sStageAfterGrab === 0, `(a) grab does NOT enter the staged Susanoo / touch the ultimate (stage ${sStage0}→${sStageAfterGrab})`);
await page.screenshot({ path: path.join(ROOT, "harness", "shots", "uchiha_sasuke_t1_grab_standalone.png") });   // base-form skeletal arm
await sleep(700);   // let the throw resolve + grab recovery clear

// (b) the Ultimate still fires independently afterward (using the grab did not consume/block it)
await page.evaluate(() => window.__harness.healP2());
await page.keyboard.down("u"); await sleep(80); await page.keyboard.up("u");   // Ultimate → Susanoo Stage 1
await sleep(300);
const sStageAfterUlt = (await P1()).susanooStage;
ok(sStageAfterUlt === 1, `(b) Ultimate fires independently afterward → Susanoo Stage 1 (stage=${sStageAfterUlt})`);
const sasukeCompliant = sGrabbed && sStageAfterGrab === 0 && sStageAfterUlt === 1;
console.log(`  ▶ SASUKE VERDICT: ${sasukeCompliant ? "COMPLIANT — Tier-1 grab is a standalone special (grab button), fully independent of the staged Susanoo Ultimate." : "NOT COMPLIANT (see fails above)."}`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
