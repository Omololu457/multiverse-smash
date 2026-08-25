// harness/ui_bundle_visual.mjs — Part 3 bundle: menu particles (1), combo rank callout (4),
// UI-scale slider (13), unlock toast (17), controller glyphs (26), XP fill+flash (35).
// Screenshots each + asserts UI-scale changes the canvas backing store and no page errors.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=ippo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.ui);
  await page.waitForTimeout(900); // let loader fully fade

  // #1 menu particles + #35 XP badge (award XP so the bar has a value / can flash)
  await page.evaluate(() => window.__harness.ui.goto("MAIN_MENU"));
  await page.evaluate(() => { try { window.__harness.progress.award(); } catch(e){} });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "BUNDLE_menu_particles_xp.png") });
  check("no page errors on menu (particles + XP badge)", errs.length === 0, errs.slice(0,2).join(" | ") || "none");

  // #17 unlock toast — push a few and screenshot the overlay
  await page.evaluate(() => { window.__harness.ui.pushToast("New fighter: Goku!", { accent:"#fbbf24", icon:"★" }); window.__harness.ui.pushToast("Challenge complete: First Blood", { accent:"#86efac", icon:"✓" }); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, "BUNDLE_toasts.png") });
  check("toasts enqueue", await page.evaluate(() => window.__harness.ui.toastCount()) >= 2);

  // #26 controller glyphs — no pad in headless → generic label
  const padType = await page.evaluate(() => window.__harness.ui.padType());
  check("controller glyph set resolves", !!padType, `label=${padType}`);

  // #13 UI-scale — changing it must change the canvas backing store (not the CSS/display size)
  const before = await page.evaluate(() => window.__harness.ui.setUiScale(1.0));
  const scaled = await page.evaluate(() => window.__harness.ui.setUiScale(1.3));
  check("UI-scale changes canvas backing resolution", scaled.canvasW < before.canvasW && scaled.cssW === before.cssW, `native=${before.canvasW}px → 130%=${scaled.canvasW}px (css ${scaled.cssW}px)`);
  await page.evaluate(() => window.__harness.ui.goto("SETTINGS"));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, "BUNDLE_settings_uiscale.png") });
  await page.evaluate(() => window.__harness.ui.setUiScale(1.0)); // restore

  // #4 combo rank callout — start a match, force a 12-hit combo → "BRUTAL!"
  await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
  const rank = await page.evaluate(() => window.__harness.ui.forceCombo("p1", 12));
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(OUT, "BUNDLE_combo_rank.png"), clip: { x: 0, y: 0, width: 1280, height: 420 } });
  check("combo rank callout fires at tier", rank.rank === "BRUTAL!", `12-hit → ${rank.rank}`);

  check("no page errors across the whole bundle", errs.length === 0, errs.slice(0,3).join(" | ") || "none");
  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }

console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
