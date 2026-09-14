// harness/stage_resize_verify.mjs — LIVE verification of the fullscreen<->windowed ground/background sync.
// For 4 stages (3 bitmap + 1 procedural control) it drives a REAL mid-match resize toggle
// (windowed 720 → fullscreen-like 1080/1440 → back to 720, both directions) and asserts:
//   • physics reflow: groundY == canvasH − (floorHeight+groundOffset) at every size,
//   • p1 feet stay exactly on groundY,
//   • GROUND-ANCHOR INVARIANT: the fraction of the drawn backdrop the floor sits at is CONSTANT across
//     every viewport size (the fix — before, this drifted 0.69→0.85 with height),
//   • round-trip determinism: the 720 geometry is identical before and after the toggle,
//   • no JS errors.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "resize"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });

let PASS = 0, FAIL = 0;
const ok = (n,c,d="") => { (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`); };
const near = (a,b,eps=1.5) => Math.abs(a-b) <= eps;

const STAGES = [
  { name: "Jujutsu High Courtyard", bitmap: true },
  { name: "Valley of the End",      bitmap: true },
  { name: "Test Map",               bitmap: true },
  { name: "Hidden Leaf Village",    bitmap: false },  // procedural control
];
// windowed → fullscreen(16:9) → tall → back to windowed  (both directions covered)
const SEQ = [ {w:1280,h:720,tag:"win720"}, {w:1920,h:1080,tag:"fs1080"}, {w:1280,h:1440,tag:"tall1440"}, {w:1280,h:720,tag:"back720"} ];

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => { jsErrors.push(String(e)); console.log("PAGEERR:", (e.stack||String(e)).split("\n").slice(0,5).join("\n   ")); });
await page.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.start());
let s0 = await page.evaluate(() => window.__harness.state().frame);
await page.waitForFunction(a => window.__harness.state().frame >= a + 6, s0, { polling:16, timeout:15000 }).catch(()=>{});
await page.evaluate(() => window.__harness.skipToBattle());

async function settle(n=24){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{polling:16,timeout:15000}).catch(()=>{}); }

for (const st of STAGES) {
  console.log(`\n═══ ${st.name}  [${st.bitmap ? "BITMAP" : "PROCEDURAL control"}] ═══`);
  await page.evaluate(name => window.__harness.setSession({ selectedStage: name }), st.name);
  const fracs = []; const geom720 = [];
  for (const sz of SEQ) {
    await page.setViewportSize({ width: sz.w, height: sz.h });   // real resize → fires window 'resize' → applyViewportSize
    await settle(24);
    const g = await page.evaluate(() => window.__harness.frameGeom());
    const f = await page.evaluate(() => window.__harness.p1());
    const feet = f.y + f.h;
    ok(`${sz.tag}: groundY reflows to canvasH-220 (physics+bg from same source)`, near(g.groundY, g.ch - 220), `groundY=${g.groundY} ch=${g.ch}`);
    ok(`${sz.tag}: p1 feet sit exactly on groundY`, near(feet, g.groundY, 0.6), `feet=${Math.round(feet)} groundY=${g.groundY}`);
    fracs.push({ tag: sz.tag, frac: g.floorImgFrac });
    if (sz.tag.endsWith("720")) geom720.push(g);
    await page.screenshot({ path: path.join(OUT, `${st.name.replace(/\s+/g,"_")}__${sz.tag}.png`) });
  }
  // GROUND-ANCHOR INVARIANT: the floor's fraction of the drawn backdrop must be identical at every size.
  const f0 = fracs[0].frac;
  const allSame = fracs.every(x => f0 != null && x.frac != null && near(x.frac, f0, 0.004));
  ok(`ground-anchor INVARIANT: floor-fraction constant across all sizes`, allSame, fracs.map(x=>`${x.tag}=${x.frac==null?"–":x.frac.toFixed(3)}`).join(" "));
  // round-trip determinism: windowed geometry identical before/after the fullscreen excursion
  // Round-trip: after the fullscreen excursion, the windowed floor reflow must return to the exact same
  // groundY (deterministic). floorLineScreenY can differ by a couple px (live camera pan), so it's not asserted.
  ok(`round-trip: 720 groundY identical before & after toggle`, geom720.length===2 && near(geom720[0].groundY,geom720[1].groundY,0.01), `groundY ${geom720[0]?.groundY}/${geom720[1]?.groundY}`);
}

ok("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0,3).join(" | "));
console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n  Shots → ${OUT}\n════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
