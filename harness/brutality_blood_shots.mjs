// harness/brutality_blood_shots.mjs — capture FULL-FRAME + CLOSE-UP shots of the escalated blood/wound render.
// Winner drives the finisher; loser (p2) is the sprite that gets bisected — chosen to span sprite SIZES.
// For each case we grab a MID frame (splat + wound + early pool) and a LATE frame (pool grown, halves settled),
// each as a full 1280x720 frame AND a tight crop around the effect (brutality.screenRect).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "brutality_blood_shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}

// [winner, move, loser, label] — spans small→large loser sprites.
const CASES = [
  ["baki",     "bakiRush",        "goku",    "baki_vs_goku"],
  ["sukuna",   "cleave",          "omniman", "sukuna_vs_omniman"],
  ["madara",   "heavy",           "frieza",  "madara_vs_frieza"],
  ["ghostface","gfLunge",         "zaraki",  "ghostface_vs_zaraki"],
  ["frieza",   "friezaDeathBeam", "jason",   "frieza_vs_jason"],
];

async function full(page, file) { await page.screenshot({ path: path.join(OUT, file) }); }
// screenRect is the ORIGINAL (pre-fall) cut position; on an airborne KO the halves + pool fall well below it,
// so `padBottom` extends the crop downward to keep the settled pool/wound in frame for the LATE close-up.
async function crop(page, file, pad = 70, padBottom = 70) {
  const r = await page.evaluate(() => window.__harness.brutality.screenRect());
  let clip = { x: 0, y: 0, width: 1280, height: 720 };
  if (r) { const x = Math.max(0, Math.floor(r.x - pad)), y = Math.max(0, Math.floor(r.y - pad));
    clip = { x, y, width: Math.min(1280 - x, Math.ceil(r.w + pad * 2)), height: Math.min(720 - y, Math.ceil(r.h + pad + padBottom)) }; }
  await page.screenshot({ path: path.join(OUT, file), clip });
}

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  for (const [win, move, lose, label] of CASES) {
    await page.goto(`${base}/index.html?harness=1&p1=${win}&p2=${lose}`, { waitUntil: "load" });
    await page.waitForFunction(() => !!(window.__harness && window.__harness.brutality));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__harness.brutality.setBrutality(true));
    await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
    await page.waitForTimeout(400);
    await page.evaluate(m => window.__harness.brutality.trigger("p1", true, m), move);
    await page.waitForTimeout(300);                              // MID — splat + wound core + early pool
    await full(page, `${label}_MID_full.png`);
    await crop(page, `${label}_MID_close.png`);
    // LATE — wait on the beat's own timer (near the end but STILL active) so the grown pool is always in-shot.
    await page.waitForFunction(() => { const s = window.__harness.brutality.state(); return s && s.active && s.timer <= 30; }, { timeout: 2000 });
    await crop(page, `${label}_LATE_close.png`, 70, 420);        // close-up FIRST (pool well-grown, beat still active); extend down to follow the fall
    await full(page, `${label}_LATE_full.png`);
    console.log(`  📸 ${label}`);
  }
  console.log(errs.length ? `  ❌ page errors: ${errs.slice(0,3).join(" | ")}` : "  ✅ no page errors");
  await b.close(); server.close();
  process.exit(errs.length ? 1 : 0);
} catch (e) { console.error(e); process.exit(1); }
