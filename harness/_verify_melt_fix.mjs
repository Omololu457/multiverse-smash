// Verify the airborne-KO capture fix (the "melt" / Neurotoxin top-of-HUD blob). We RETRY with varied pre-
// trigger timing to catch the loser captured AIRBORNE (tall launch frame, spriteH>=200) — the broken scenario
// — then screenshot full-frame + close-up. Also captures a GROUNDED case to confirm no regression.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = "/Users/omololu/Desktop/project/multiverse-smash";
const OUT = path.join(ROOT, "harness", "brutality_blood_shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true });
const errs = [];

async function crop(page, file, pad = 70, padBottom = 200) {
  const r = await page.evaluate(() => window.__harness.brutality.screenRect());
  let clip = { x: 0, y: 0, width: 1280, height: 720 };
  if (r) { const x = Math.max(0, Math.floor(r.x - pad)), y = Math.max(0, Math.floor(r.y - pad));
    clip = { x, y, width: Math.min(1280 - x, Math.ceil(r.w + pad * 2)), height: Math.min(720 - y, Math.ceil(r.h + pad + padBottom)) }; }
  await page.screenshot({ path: path.join(OUT, file), clip });
}

// mode "air" = retry until spriteH>=200 (airborne launch frame); "ground" = until spriteH<200 (grounded).
async function capture(p1, p2, move, label, mode) {
  for (let attempt = 0; attempt < 14; attempt++) {
    const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", e => errs.push(String(e)));
    await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" });
    await page.waitForFunction(() => !!(window.__harness && window.__harness.brutality));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__harness.brutality.setBrutality(true));
    await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
    await page.waitForTimeout(350 + attempt * 90);              // vary timing to catch different loser poses
    const ok = await page.evaluate(m => window.__harness.brutality.trigger("p1", true, m), move);
    const st = await page.evaluate(() => window.__harness.brutality.state());
    const airborne = st.spriteH >= 200;
    const want = mode === "air" ? airborne : !airborne;
    if (!ok || !want) { await page.close(); continue; }
    await page.waitForTimeout(300);                             // MID
    const rect = await page.evaluate(() => window.__harness.brutality.screenRect());
    await page.screenshot({ path: path.join(OUT, `${label}_MID_full.png`) });
    await crop(page, `${label}_MID_close.png`);
    await page.waitForFunction(() => { const s = window.__harness.brutality.state(); return s && s.active && s.timer <= 28; }, { timeout: 2000 });
    await crop(page, `${label}_LATE_close.png`, 70, 420);        // LATE: halves separated, splat faded, pool grown
    await page.screenshot({ path: path.join(OUT, `${label}_LATE_full.png`) });
    console.log(`  ✅ ${label} [${mode}] spriteH=${st.spriteH} rect.y=${rect.y.toFixed(0)} (attempt ${attempt})`);
    await page.close();
    return true;
  }
  console.log(`  ⚠️  ${label} [${mode}] — could not catch desired pose in 14 tries`);
  return false;
}

await capture("mayuri", "goku",   "mayuriPoison", "FIX_mayuri_NEUROTOXIN_melt_AIR",   "air");    // THE melt finisher, airborne (was broken)
await capture("mayuri", "goku",   "mayuriPoison", "FIX_mayuri_NEUROTOXIN_melt_GROUND","ground"); // melt, grounded (no-regression)
await capture("mayuri", "goku",   "mayuriCmd2",   "FIX_mayuri_VIVISECTION_AIR",       "air");    // same char, dismember, airborne
await capture("frieza", "goku",   "friezaDeathBeam","FIX_frieza_DEATHBEAM_AIR",       "air");    // projectile beam, airborne
await capture("baki",   "omniman","bakiRush",     "FIX_baki_DEMONRUSH_AIR",           "air");    // bisect, airborne, large loser

console.log(errs.length ? `  ❌ page errors: ${errs.slice(0,3).join(" | ")}` : "  ✅ no page errors");
await b.close(); server.close();
process.exit(errs.length ? 1 : 0);
