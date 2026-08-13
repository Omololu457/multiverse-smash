// harness/launch_before_after.mjs — BEFORE/AFTER evidence for the roster-wide launcher HEIGHT raise.
// Drives the REAL running game (canvas + input + physics). For each of 3 archetype-spanning characters it:
//   1. boots a battle vs a passive dummy, stands the dummy point-blank in launcher reach,
//   2. presses the real Up-Attack key ("i") on the ground → launches the dummy,
//   3. POLLS the live dummy's y every frame and records the PEAK RISE (px) + airborne frames,
//   4. captures a screenshot at/near the apex,
//   5. jump-cancels ("w") and taps air Light ("j") to count how many air follow-ups LINK within the
//      maxAirHits=3 cap (the "real air-combo room" the raise is meant to buy).
//
// Run it once on the NEW code, then again with characters.js + physics.js git-stashed (the OLD flat -26
// floor) → the two label runs give a true same-engine A/B. Screenshots → harness/shots/launchba_<label>_<char>.png
//
// Usage: node harness/launch_before_after.mjs <label>            (label e.g. "after" | "before")
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };

const LABEL = process.argv[2] || "after";
// One char per archetype, spanning Fast → Balanced → Heavy.
const CHARS = [
  { key: "maki",     arch: "Fast/GC (Rising Kick)" },
  { key: "gojo",     arch: "Balanced (Rising Palm)" },
  { key: "superman", arch: "Heavy-tank (roster max)" },
];
const DUMMY = "cell";

const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args:["--autoplay-policy=no-user-gesture-required"] });

const results = [];
console.log(`\n╔══ LAUNCH BEFORE/AFTER — label="${LABEL}" ══╗`);

for (const { key, arch } of CHARS) {
  const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
  page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
  const st = () => page.evaluate(() => window.__harness.state());
  const p2 = () => page.evaluate(() => window.__harness.p2());
  const p1 = () => page.evaluate(() => window.__harness.p1());
  const wf = async n => { const s=(await st()).frame; await page.waitForFunction(([a,c])=>window.__harness.state().frame>=a+c,[s,n],{timeout:20000,polling:16}); };
  try {
    await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=${DUMMY}`, { waitUntil:"load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
    await page.mouse.click(640, 360);
    await page.evaluate(() => window.__harness.boot()); await wf(10);

    // Stand the dummy point-blank in launcher reach.
    await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + (a.w||60) - 8); });
    await wf(1);
    const groundY = (await p2()).y;   // dummy's resting y (top) before launch

    // Fire the launcher (hold Up so it buffers to the first actionable frame).
    await page.keyboard.down("i");
    await page.waitForFunction(() => { const b=window.__harness.p2(); return b && (b.isLaunched || !b.grounded); }, null, { timeout:4000, polling:8 }).catch(()=>{});
    await page.keyboard.up("i");

    // Poll the dummy's flight, tracking the PEAK (minimum y = highest point) and airborne frames.
    let minY = groundY, launchVy = 0, airborneFrames = 0, apexShot = false;
    for (let i = 0; i < 130; i++) {
      const b = await p2();
      if (i === 0) launchVy = b.vy;
      if (b.vy < launchVy) launchVy = b.vy;     // most-negative pop velocity seen
      if (b.y < minY) minY = b.y;
      if (!b.grounded) airborneFrames++;
      // grab the apex screenshot once the dummy has begun to descend (near peak)
      if (!apexShot && b.vy >= -1 && !b.grounded && airborneFrames > 3) {
        await page.screenshot({ path: path.join(OUT, `launchba_${LABEL}_${key}.png`) });
        apexShot = true;
      }
      if (b.grounded && i > 5) break;
      await wf(1);
    }
    if (!apexShot) await page.screenshot({ path: path.join(OUT, `launchba_${LABEL}_${key}.png`) });

    // Air-combo room: jump-cancel and tap air Light, counting linked follow-ups within the cap.
    await page.keyboard.down("w"); await wf(2); await page.keyboard.up("w"); await wf(1);
    let airHits = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      if ((await p1()).grounded) break;
      await page.keyboard.down("j"); await wf(2); await page.keyboard.up("j"); await wf(2);
      airHits = (await p1()).airHits || 0;
      if (airHits >= 3) break;
    }

    const peakRise = Math.round(groundY - minY);
    results.push({ key, arch, launchVy: Math.round(launchVy), peakRise, airborneFrames, airHits });
    console.log(`  ▸ ${key.padEnd(9)} [${arch}]  launchVy=${Math.round(launchVy)}  peakRise=${peakRise}px  airborne=${airborneFrames}f  airComboHits=${airHits}`);
    console.log(`     📸 launchba_${LABEL}_${key}.png`);
  } catch (e) {
    console.log(`  ❌ ${key}: ${e.message}`);
    results.push({ key, arch, error: e.message });
  } finally {
    await page.close();
  }
}

await browser.close(); server.close();
fs.writeFileSync(path.join(OUT, `launchba_${LABEL}.json`), JSON.stringify(results, null, 2));
console.log(`\n  summary → harness/shots/launchba_${LABEL}.json`);
console.log(`╚════════════════════════════════════════╝`);
