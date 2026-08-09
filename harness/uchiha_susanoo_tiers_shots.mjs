// harness/uchiha_susanoo_tiers_shots.mjs — VISUAL EVIDENCE for the shared 3-tier Uchiha Susanoo model.
// Captures all tier demonstrations across BOTH Uchiha (Madara + Sasuke) against ONE reference model:
//   TIER 1 — Skeletal/Base Susanoo → a REAL command-grab (resolveGrab; extending arm), not a strike.
//   TIER 2 — Full-Body Armored Susanoo → sustained armored form.
//   TIER 3 — Perfect/Complete Susanoo → giant Ultimate-tier avatar.
// Sasuke has no Tier-3 source art (documented content gap) → 5 firing demos + the gap noted.
// Keys: light=j heavy=k special=l ultimate=u · move a/d. See UCHIHA_SUSANOO_TIER_MODEL.md.
// Usage: node harness/uchiha_susanoo_tiers_shots.mjs
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
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });

async function boot(p1) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(250);
}
// Place the dummy `gap` px to P1's right and reset its health.
const placeP2 = (gap) => page.evaluate(g => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + g); window.__harness.healP2(); }, gap);
// Fire Fwd+Heavy (d+k) and catch the grab state within its window; returns true if isGrabbed seen.
async function grabAndCatch() {
  let seen = false;
  for (let attempt = 0; attempt < 4 && !seen; attempt++) {
    await page.keyboard.down("d"); await sleep(50);
    await page.keyboard.down("k"); await sleep(50); await page.keyboard.up("k"); await page.keyboard.up("d");
    for (let i = 0; i < 18; i++) { if ((await P2()).isGrabbed) { seen = true; break; } await sleep(20); }
    if (!seen) await sleep(120);
  }
  return seen;
}

// ══════════════════════════ MADARA ══════════════════════════
console.log("MADARA — 3-tier Susanoo:");
await boot("madara");

// TIER 1 — Susanoo Base GRAB (Fwd+Heavy → real resolveGrab command-grab)
await placeP2(90);
const mSeen = await grabAndCatch();
ok(mSeen, "T1 grab: opponent enters real isGrabbed state (command-grab, not a strike)");
await shot("uchiha_madara_t1_grab.png");
await sleep(700);

// TIER 2 — Full-Body Armored Susanoo (Back+Heavy toggle)
await boot("madara");
await page.keyboard.down("a"); await sleep(50); await page.keyboard.down("k"); await sleep(70); await page.keyboard.up("k"); await page.keyboard.up("a");
await sleep(200);
ok((await P1()).susanooArmor > 0, `T2 armor: full-body armored form active (susanooArmor=${(await P1()).susanooArmor})`);
await shot("uchiha_madara_t2_armor.png");

// TIER 3 — Complete Susanoo GIANT (HOLD ultimate at full energy)
await boot("madara");
await page.evaluate(() => window.__harness.resetUlt());
await page.evaluate(() => window.__harness.healP2());
await sleep(80);
await page.keyboard.down("u"); await sleep(380); await page.keyboard.up("u");   // HOLD ≥250ms
await sleep(250);
const mGiant = await P1();
ok(mGiant.completeSusanoo > 0 && mGiant.canvasHeightFrac > 0.5, `T3 giant: Complete Susanoo avatar (frac=${mGiant.canvasHeightFrac})`);
await shot("uchiha_madara_t3_giant.png");

// ══════════════════════════ SASUKE ══════════════════════════
console.log("\nSASUKE — 2-tier Susanoo (+ documented T3 gap):");
await boot("sasuke");

// TIER 1 — Susanoo Lv1 GRAB (enter Lv1, then special = real resolveGrab command-grab)
await page.keyboard.down("u"); await sleep(70); await page.keyboard.up("u");   // tap ult → Stage 1
await sleep(200);
ok((await P1()).susanooStage === 1, `Sasuke entered Susanoo Lv1 (stage=${(await P1()).susanooStage})`);
await sleep(300);   // clear Stage-1 recovery
await placeP2(120);
let sSeen = false;
await page.keyboard.down("l"); await sleep(70); await page.keyboard.up("l");   // special = Lv1 grab
for (let i = 0; i < 20; i++) { if ((await P2()).isGrabbed) { sSeen = true; break; } await sleep(20); }
ok(sSeen, "T1 grab: Lv1 special enters real isGrabbed state (command-grab, not a strike)");
await shot("uchiha_sasuke_t1_grab.png");
await sleep(700);
await page.evaluate(() => window.__harness.healP2());

// TIER 2 — Susanoo Lv2 (escalate: release + press again after the Sharingan cinematic)
await sleep(300);
await page.keyboard.down("u"); await sleep(70); await page.keyboard.up("u");
await page.waitForFunction(() => window.__harness.p1().susanooStage === 2, null, { timeout: 9000, polling: 32 }).catch(()=>{});
await sleep(200);
ok((await P1()).susanooStage === 2, `T2 armor: escalated to Susanoo Lv2 full-body armor (stage=${(await P1()).susanooStage})`);
await shot("uchiha_sasuke_t2_lv2.png");

// TIER 3 — none: no giant/Perfect source art on disk (content gap, not faked).
console.log("  N/A  T3 giant: Sasuke has NO Tier-3 source art on disk — documented content gap (not faked).");

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
