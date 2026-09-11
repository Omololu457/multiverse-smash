// harness/brutality_split_verify.mjs — visual confirmation of the sprite-bisection finisher separation.
// The LOSER is the bisected sprite, so to span sprite SIZES we vary the loser (p2) across the roster while
// the winner (p1) is an eligible Brutality character. Captures a MID and a LATE frame, tight-cropped around
// the effect (via brutality.screenRect), so the halves must show a clear GAP with the bone in the daylight.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};

// [winner, move, loser, label] — winner drives the finisher name; loser is the sprite that gets bisected
// (chosen to span a range of sprite sizes/scales). Case 1 = the exact Baki Demon Rush screenshot case.
const CASES = [
  ["baki",    "bakiRush",        "goku",    "baki_DEMONRUSH_vs_goku"],
  ["sukuna",  "cleave",          "omniman", "sukuna_CLEAVE_vs_omniman"],   // large loser sprite
  ["madara",  "heavy",           "frieza",  "madara_SUSANOOBLADE_vs_frieza"], // small/short loser sprite
  ["ghostface","gfLunge",        "zaraki",  "ghostface_GUTTINGLUNGE_vs_zaraki"], // tall loser sprite
  ["frieza",  "friezaDeathBeam", "jason",   "frieza_DEATHBEAM_vs_jason"],
];

async function shotCropped(page, file, pad = 60) {
  const r = await page.evaluate(() => window.__harness.brutality.screenRect());
  let clip = { x: 0, y: 0, width: 1280, height: 720 };
  if (r) {
    const x = Math.max(0, Math.floor(r.x - pad)), y = Math.max(0, Math.floor(r.y - pad));
    clip = { x, y, width: Math.min(1280 - x, Math.ceil(r.w + pad * 2)), height: Math.min(720 - y, Math.ceil(r.h + pad * 2)) };
  }
  await page.screenshot({ path: path.join(OUT, file), clip });
  return r;
}

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; page.on("pageerror",e=>errs.push(String(e)));

  for (const [win, move, lose, label] of CASES) {
    await page.goto(`${base}/index.html?harness=1&p1=${win}&p2=${lose}`, { waitUntil: "load" });
    await page.waitForFunction(() => !!(window.__harness && window.__harness.brutality));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__harness.brutality.setBrutality(true));
    await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
    await page.waitForTimeout(400);
    const ok = await page.evaluate(m => window.__harness.brutality.trigger("p1", true, m), move);
    await page.waitForTimeout(300);   // MID — halves clearly parted
    const mid = await page.evaluate(() => window.__harness.brutality.state());
    const rect = await shotCropped(page, `SEP_${label}_mid.png`);
    await page.waitForTimeout(430);   // LATE — settled, still clearly apart
    const late = await page.evaluate(() => window.__harness.brutality.state());
    await shotCropped(page, `SEP_${label}_late.png`);
    check(`${win} ${move} vs ${lose}: bisection active + captured (loser frame ${mid.spriteW}x${mid.spriteH})`,
      ok === true && mid.captured === true && mid.split === true && late.active === true && rect && rect.w > 0,
      `mid t${mid.timer} late t${late.timer} rect=${rect ? Math.round(rect.w)+"x"+Math.round(rect.h) : "null"}`);
  }
  check("no page errors", errs.length === 0, errs.slice(0,3).join(" | ") || "none");
  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }
console.log(`\n  SEPARATION VERIFY: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
