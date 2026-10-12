// harness/academy_phase4_live.mjs — CHARACTER ACADEMY Phase 4: curated multi-step lessons. Verifies that curated
// "Guided Lessons" exist for the complex fighters, that a guided lesson is a multi-STEP drill, that SHOW ME walks
// through the steps, that TRY IT advances a step on success, and that a step's opponent scenario fixes the dummy.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0, KNOWN = 0;
page.on("pageerror", e => { if (/drawSasukeAdultStance/.test(e.message)) { KNOWN++; return; } console.log("  PAGEERROR:", e.message); PERR++; });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const dstate = () => page.evaluate(() => window.__harness.academy.drillState());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
const vivid = (x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || d[i] > 90)) n++; } return n; }, [x0f, wf]);

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.academy, { timeout: 15000 });
await page.evaluate(() => window.__harness.academy.open());

console.log("\n══ CHARACTER ACADEMY — Phase 4 (curated lessons) ══");

// 1) Curated fighters exist.
const guided = await page.evaluate(() => window.__harness.academy.guided());
console.log(`  curated fighters (${guided.length}): ${guided.join(", ")}`);
for (const k of ["naruto", "naruto_seventh", "gaara", "madara", "shisui_trinity", "shisui_fallen", "kakashi_war", "kakashi_anbu", "sasuke_sensei"])
  ok(guided.includes(k), `curated lessons exist for ${k}`);

// 2) A fighter's page leads with a "Guided Lessons" section.
const c = await page.evaluate(() => window.__harness.academy.openChar("shisui_fallen"));
console.log(`  shisui_fallen sections: ${c.sections.join(", ")}`);
ok(c.sections[0].startsWith("Guided Lessons"), `the lesson page leads with a Guided Lessons section`);

// 3) A guided lesson is MULTI-STEP and boots the right (fixed) opponent.
const d1 = await page.evaluate(() => window.__harness.academy.drillByName("Kotoamatsukami (mind-control order)", "showme"));
await waitFrames(4);
console.log(`  guided 'Kotoamatsukami': guided=${d1.guided}, steps=${d1.steps}, p1=${d1.p1}, p2=${d1.p2}`);
ok(d1.guided, `a curated lesson is a guided (multi-step) drill`);
ok(d1.p2 === "itachi", `the step's opponent scenario fixes the dummy (p2=${d1.p2})`);
await page.evaluate(() => window.__harness.academy.exit()); await waitFrames(2);

// 4) SHOW ME walks through the steps (stepIdx advances past 0).
await page.evaluate(() => window.__harness.academy.openChar("shisui_fallen"));
const d2 = await page.evaluate(() => window.__harness.academy.drillByName("Emerald Susanoo Ladder", "showme"));
console.log(`  'Emerald Susanoo Ladder': steps=${d2.steps}`);
ok(d2.steps >= 2, `it has multiple steps (${d2.steps})`);
ok((await vivid(0.25, 0.25)) > 2000 || (await vivid(0.45, 0.25)) > 2000, `the demo match renders`);
let reachedStep1 = false;
for (let k = 0; k < 10; k++) { await waitFrames(10); const st = await dstate(); if (st && st.stepIdx >= 1) { reachedStep1 = true; break; } }
console.log(`  SHOW ME stepIdx reached 1: ${reachedStep1}`);
ok(reachedStep1, `SHOW ME walks from step 1 into step 2 automatically`);
await page.screenshot({ path: path.join(OUT, "academy_p4_guided.png") });
await page.evaluate(() => window.__harness.academy.exit()); await waitFrames(2);

// 5) TRY IT advances a step on success.
await page.evaluate(() => window.__harness.academy.openChar("shisui_fallen"));
const d3 = await page.evaluate(() => window.__harness.academy.drillByName("Body Flicker & Afterimages", "tryit"));
console.log(`  'Body Flicker & Afterimages' TRY IT: steps=${d3.steps}, startStep=${d3.stepIdx}`);
await waitFrames(4);
// step 1 = Flicker Step (Forward + Special) — do it (dash-through moves P1)
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("d");
await waitFrames(60);   // allow the step-done flash → arm step 2
const st2 = await dstate();
console.log(`  after doing step 1: stepIdx=${st2?.stepIdx}, step='${st2?.stepName}'`);
ok(st2 && st2.stepIdx >= 1, `TRY IT advances to the next step after the first is performed`);
await page.evaluate(() => window.__harness.academy.exit()); await waitFrames(2);

console.log(`\n  known/expected pageerrors: ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — Academy Phase 4`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
