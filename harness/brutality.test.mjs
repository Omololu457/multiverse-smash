// harness/brutality.test.mjs — stylized finishing-move (scope A) gating + independence + trigger.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
  await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.brutality));
  await page.waitForTimeout(200);
  const B = () => page.evaluate.bind(page);

  // Independent toggles.
  let t = await page.evaluate(() => { window.__harness.brutality.setBlood(true); window.__harness.brutality.setBrutality(false); return window.__harness.brutality.toggles(); });
  check("blood ON + brutality OFF set independently", t.blood === true && t.brutality === false, JSON.stringify(t));
  t = await page.evaluate(() => { window.__harness.brutality.setBlood(false); window.__harness.brutality.setBrutality(true); return window.__harness.brutality.toggles(); });
  check("blood OFF + brutality ON set independently", t.blood === false && t.brutality === true, JSON.stringify(t));

  // Eligibility (scope A): horror + brutal in; kid franchises out.
  const inSet  = await page.evaluate(() => ["ghostface","jason","sukuna","omniman","hisoka","zaraki"].filter(k => window.__harness.brutality.canTrigger(k)));
  const outSet = await page.evaluate(() => ["omega_ranger","red_ranger_mmpr","ben10","gwen","vilgax","albedo"].filter(k => window.__harness.brutality.canTrigger(k)));
  check("horror + canonically-brutal winners are eligible", inSet.length === 6, `eligible: ${inSet.join(",")}`);
  check("Power Rangers + Ben 10 are excluded", outSet.length === 0, outSet.length ? `LEAKED: ${outSet.join(",")}` : "none eligible");

  // Start a battle so p1/p2 exist (p1=ghostface = eligible winner).
  await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
  await page.waitForTimeout(400);

  // Gate: toggle OFF → no finisher even on a KO by an eligible winner.
  await page.evaluate(() => window.__harness.brutality.setBrutality(false));
  const off = await page.evaluate(() => window.__harness.brutality.trigger("p1", true));
  check("toggle OFF → finisher does NOT trigger on a KO", off === false);

  // Gate: toggle ON + eligible winner + KO → triggers.
  await page.evaluate(() => window.__harness.brutality.setBrutality(true));
  const on = await page.evaluate(() => window.__harness.brutality.trigger("p1", true));
  const st = await page.evaluate(() => window.__harness.brutality.state());
  check("toggle ON + eligible winner + KO → finisher triggers", on === true && st.active === true, JSON.stringify(st));
  await page.waitForTimeout(200);   // let the gore burst + stamp animate a few frames
  await page.screenshot({ path: path.join(OUT, "BRUTALITY_playing.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });

  // Gate: eligible winner but TIME-OVER (loser alive) → never triggers.
  await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
  await page.waitForTimeout(300);
  const timeOver = await page.evaluate(() => window.__harness.brutality.trigger("p1", false));
  check("time-over win (loser alive) → finisher does NOT trigger", timeOver === false);

  // Gate: toggle ON but INELIGIBLE winner → no finisher. Restart with an excluded winner (ben10).
  await page.evaluate(() => window.__harness.brutality.setBrutality(true));
  const inelig = await page.evaluate(() => window.__harness.brutality.canTrigger("ben10"));
  check("ineligible winner (Ben 10) cannot trigger a finisher", inelig === false);

  check("no page errors across the brutality flow", errs.length === 0, errs.slice(0,3).join(" | ") || "none");
  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }

console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
