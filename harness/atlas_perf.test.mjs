// harness/atlas_perf.test.mjs — STAGE 22 atlas request-count win + profiling overlay.
// Counts the sprite-sheet HTTP requests a match makes for an ATLASED character (Killua: 20 source
// sheets → 1 atlas) vs an UN-atlased one (Zaraki), proving the request count drops measurably.
// Also verifies the ?debug=1 profiling overlay is live (FPS/frame-time/draw-calls/counts/images).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);

const server=await srv(); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true, args:["--autoplay-policy=no-user-gesture-required"]});

try {
  // ══ Request-count win — atlased vs un-atlased ══
  section("Request-count — an atlased character loads 1 sheet, not ~20");
  // Use the REAL boot path that preloads a character's sheets. bootChar loads P1=key vs a dummy.
  async function bootAndCount(key) {
    const page = await browser.newPage({ viewport:{width:1280,height:720} });
    const reqs = new Set();
    page.on("request", r => { const m = r.url().match(/\/([^/?]+\.png)/); if (m && m[1].startsWith(key+"_")) reqs.add(m[1]); });
    await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=${key}`,{waitUntil:"load"});
    await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(120);
    await page.evaluate(()=>{ try{ window.__harness.boot(); }catch(_){} });   // starts a match with the URL p1/p2 chars → preloads their sheets
    await page.waitForTimeout(800);
    const perf = await page.evaluate(()=>window.__harness.perf?.() || null);
    await page.close();
    return { sheets: [...reqs].filter(s=>!s.includes("portrait")), perf };
  }
  const killua = await bootAndCount("killua");   // ATLASED (Stage 22B)
  const zaraki = await bootAndCount("zaraki");   // not atlased
  console.log(`     killua sheet requests: ${killua.sheets.join(", ")}`);
  console.log(`     zaraki sheet requests: ${zaraki.sheets.length} distinct`);
  // All of Killua's per-ACTION sheets (the *_uniform strips) collapse into the one atlas. A couple of
  // non-action sheets legitimately remain (e.g. killua_yoyo_fx.png = a projectile FX sheet, not part
  // of animationData) — those aren't atlased and shouldn't be.
  const killuaActionSheets = killua.sheets.filter(s => /_uniform\.png$|_sheet\.png$/.test(s));
  check("Killua loads the atlas", killua.sheets.includes("killua_atlas.png"), `sheets=${killua.sheets.join(",")}`);
  check("NO per-action _uniform strips load for atlased Killua (all folded into the atlas)", killuaActionSheets.length === 0, `stragglers=${killuaActionSheets.join(",")}`);
  check("un-atlased Zaraki loads many separate sheets (the before-state)", zaraki.sheets.length >= 8, `n=${zaraki.sheets.length}`);
  check("atlas cuts total sprite-sheet requests by >80%", killua.sheets.length <= zaraki.sheets.length * 0.2, `killua=${killua.sheets.length} zaraki=${zaraki.sheets.length}`);

  // ══ Profiling overlay (?debug=1) ══
  section("Profiling overlay — ?debug=1 exposes FPS / frame-time / draw-calls / counts / images");
  const page = await browser.newPage({ viewport:{width:1280,height:720} });
  await page.goto(`${base}/index.html?harness=1&debug=1&p1=killua&p2=zaraki`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(120);
  await page.evaluate(()=>{ try{ window.__harness.boot(); }catch(_){} });
  await page.waitForTimeout(500);
  const perf = await page.evaluate(()=>window.__harness.perf());
  check("debug overlay is ON under ?debug=1", perf.debugOverlay === true);
  check("draw-call count is being measured (>0 in a live match)", perf.drawCalls > 0, `drawCalls=${perf.drawCalls}`);
  check("loaded-image count is reported", perf.loadedImages > 0, `images=${perf.loadedImages}`);
  check("live projectile/summon/fx counts are exposed", typeof perf.projectiles === "number" && typeof perf.summons === "number" && typeof perf.fx === "number");
  await page.screenshot({ path: path.join(OUT, "debug_overlay.png") });

  // Overlay OFF by default (no ?debug).
  const page2 = await browser.newPage({ viewport:{width:1280,height:720} });
  await page2.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page2.waitForFunction(()=>!!window.__harness); await page2.waitForTimeout(80);
  const off = await page2.evaluate(()=>window.__harness.perf());
  check("overlay is OFF without ?debug=1 (zero cost when unused)", off.debugOverlay === false);
  await page2.close(); await page.close();
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
