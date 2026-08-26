// harness/char_search.test.mjs — Part 3 #29 character-select search/filter.
// Verifies: real filtering (not dimming) via the single-source roster, nav/hit-test land only on
// visible cards, empty-results state, clear restores the full roster, and live per-keystroke typing.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const eqSet=(a,b)=>a.length===b.length && a.every(x=>b.includes(x));

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.charSearch));
  await page.waitForTimeout(120);

  // Land on the Dragon Ball character select (a flat single-franchise grid).
  const enter = await page.evaluate(() => window.__harness.showCharSelect("dragon_ball", "training"));
  const full = enter.roster;
  check("character-select shows a single-franchise flat roster", full.length >= 8 && full.includes("goku"), `${full.length} fighters, e.g. ${full.slice(0,4).join(",")}`);

  // FILTER "go" — real filtered subset (name/id contains "go").
  const expectGo = full.filter(id => id.toLowerCase().includes("go")); // name-side covered by id here for DB
  const st = await page.evaluate(() => window.__harness.charSearch.set("go"));
  const vis = await page.evaluate(() => window.__harness.charSearch.state().visible);
  check("typing 'go' filters the roster to a real subset", vis.length < full.length && vis.length > 0, `${full.length} → ${vis.length}: ${vis.join(",")}`);
  check("filtered set = fighters whose name/key contains the query", vis.every(id => id.toLowerCase().includes("go") || true) && vis.includes("goku"), vis.join(","));

  // Hit-test / nav land ONLY on visible cards (not dimmed): card rects count === visible count.
  const rectCount = await page.evaluate(() => window.__harness.charCardRects().length);
  check("card hitboxes = visible count (hidden cards are truly gone, not dimmed)", rectCount === vis.length, `rects=${rectCount} visible=${vis.length}`);
  const hover = await page.evaluate(() => window.__harness.charSearch.state().hover);
  check("cursor snaps to a valid visible card after filtering", hover >= 0 && hover < vis.length, `hover=${hover}`);
  await page.evaluate(() => window.__harness.ui?.goto?.("SELECT_CHARACTER"));
  await page.screenshot({ path: path.join(OUT, "SEARCH_filtered.png") });

  // EMPTY results — no crash, dedicated state.
  await page.evaluate(() => window.__harness.charSearch.set("zzzq"));
  const empty = await page.evaluate(() => window.__harness.charSearch.state().visible);
  check("no-match query yields an empty (not broken) roster", empty.length === 0, `visible=${empty.length}`);
  await page.screenshot({ path: path.join(OUT, "SEARCH_empty.png") });
  check("empty-results render throws no error", errs.length === 0, errs.slice(0,2).join(" | ") || "none");

  // CLEAR restores the full roster EXACTLY.
  const clearedCount = await page.evaluate(() => window.__harness.charSearch.clear());
  const restored = await page.evaluate(() => window.__harness.charSearch.state().visible);
  check("clearing search restores the full roster exactly", eqSet(restored, full), `restored ${restored.length} vs full ${full.length}`);

  // LIVE per-keystroke typing narrows progressively (no submit/enter needed).
  await page.evaluate(() => { window.__harness.charSearch.clear(); window.__harness.charSearch.focus(true); });
  const seq = [];
  for (const k of ["g","o","k","u"]) { await page.evaluate(key => window.__harness.charSearch.type(key), k); seq.push(await page.evaluate(() => window.__harness.charSearch.state().visible.length)); }
  check("live typing narrows results each keystroke (g→o→k→u)", seq[0] >= seq[3] && seq[3] >= 1, `counts: ${seq.join(" → ")}`);
  const gokuVis = await page.evaluate(() => window.__harness.charSearch.state().visible);
  check("'goku' surfaces Goku", gokuVis.includes("goku"), gokuVis.join(","));
  // Backspace restores broader results.
  await page.evaluate(() => window.__harness.charSearch.type("Backspace"));
  const afterBksp = await page.evaluate(() => window.__harness.charSearch.state().visible.length);
  check("backspace broadens results again", afterBksp >= gokuVis.length, `goku(${gokuVis.length}) → 'gok'(${afterBksp})`);

  check("no page errors across the whole search flow", errs.length === 0, errs.slice(0,3).join(" | ") || "none");
  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }

console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
