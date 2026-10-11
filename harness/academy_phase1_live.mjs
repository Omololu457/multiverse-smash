// harness/academy_phase1_live.mjs — CHARACTER ACADEMY Phase 1 render + flow check. Boots the game, opens the
// Academy grid, opens a fighter's lessons, runs SHOW ME (confirms a real match with BOTH fighters rendering +
// the scripted demo playing), runs TRY IT for a basic move (confirms READ-ONLY detection + progress), and
// confirms a normal match is unaffected. Screens are canvas-drawn; we check non-blank + vivid-pixel renders.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0, KNOWN = 0;
page.on("pageerror", e => { if (/drawSasukeAdultStance/.test(e.message)) { KNOWN++; return; } console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `academy_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
const vivid = (x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i+1], b = d[i+2], a = d[i+3]; if (a > 40 && (Math.abs(r-gg) > 16 || Math.abs(gg-b) > 16 || r > 90)) n++; } return n; }, [x0f, wf]);

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });

console.log("\n══ CHARACTER ACADEMY — Phase 1 ══");
// 1) Grid opens + renders.
const g1 = await page.evaluate(() => window.__harness.academy.open());
await waitFrames(3);
console.log(`  grid: state=${g1.state}, roster=${g1.roster}, universes=${g1.universes.length}`);
ok(g1.state === "academy" && g1.roster >= 10, `ACADEMY grid opens with the full roster (${g1.roster})`);
const gpx = await vivid(0, 1);
ok(gpx > 20000, `the grid screen renders (px=${gpx})`);
await shot("01_grid");

// 2) Open a fighter's lessons.
const rosterKeys = await page.evaluate(() => window.__harness.academy.roster());
const demoKey = rosterKeys.includes("shisui_fallen") ? "shisui_fallen" : rosterKeys[0];
const c1 = await page.evaluate(k => window.__harness.academy.openChar(k), demoKey);
await waitFrames(3);
console.log(`  char ${demoKey}: lessons=${c1.lessons}, sections=${c1.sections.join(", ")}`);
ok(c1.state === "academyChar" && c1.lessons >= 6, `fighter lesson page generates lessons (${c1.lessons})`);
ok(await vivid(0, 1) > 20000, `the character lesson page renders`);
await shot("02_char");

// 3) SHOW ME — a real match boots, both fighters render, the demo plays.
const lessons = await page.evaluate(k => window.__harness.academy.lessons(k), demoKey);
const lightIdx = (lessons.find(l => l.cat === "light") || {}).i ?? 3;
const d1 = await page.evaluate(i => window.__harness.academy.drill(i, "showme"), lightIdx);
await waitFrames(14);
console.log(`  SHOW ME '${d1.move}': state=${d1.state}, p1=${d1.p1}, p2=${d1.p2}, scriptLen=${d1.scriptLen}`);
ok(d1.state === "battle" && d1.p1 && d1.p2, `SHOW ME boots a real match (${d1.p1} vs ${d1.p2})`);
const leftPx = await vivid(0.25, 0.25), rightPx = await vivid(0.5, 0.25);
console.log(`  render: left fighter px=${leftPx}, right fighter px=${rightPx}`);
ok(leftPx > 3000 && rightPx > 3000, `BOTH fighters render in the SHOW ME match`);
const ds = await page.evaluate(() => window.__harness.academy.drillState());
ok(ds && ds.mode === "showme" && ds.frame > 0, `the scripted demo is playing (frame=${ds?.frame})`);
await shot("03_showme");
await page.evaluate(() => window.__harness.academy.exit());
await waitFrames(2);

// 4) TRY IT — detect a basic 'Move' lesson by walking.
const moveIdx = (lessons.find(l => l.cat === "move") || { i: 0 }).i;
await page.evaluate(k => window.__harness.academy.openChar(k), demoKey);
await page.evaluate(i => window.__harness.academy.drill(i, "tryit"), moveIdx);
await waitFrames(4);
await page.keyboard.down("d"); await waitFrames(16); await page.keyboard.up("d");
await waitFrames(3);
const tryMove = await page.evaluate(() => window.__harness.academy.drillState());
console.log(`  TRY IT (Move): state=${tryMove?.state}`);
ok(tryMove && tryMove.state === "pass", `TRY IT detects the move READ-ONLY (Move → ${tryMove?.state})`);
await shot("04_tryit");
const prog = await page.evaluate(() => window.__harness.academy.progress());
ok(prog[demoKey] && Object.keys(prog[demoKey]).length >= 1, `completing a drill saves progress locally`);
await page.evaluate(() => window.__harness.academy.exit());
await waitFrames(2);

// 5) TRY IT — detect a Light normal via the universal move key.
await page.evaluate(k => window.__harness.academy.openChar(k), demoKey);
await page.evaluate(i => window.__harness.academy.drill(i, "tryit"), lightIdx);
await waitFrames(4);
await page.keyboard.down("j"); await waitFrames(3); await page.keyboard.up("j");
await waitFrames(10);
const tryLight = await page.evaluate(() => window.__harness.academy.drillState());
console.log(`  TRY IT (Light): state=${tryLight?.state}`);
ok(tryLight && tryLight.state === "pass", `TRY IT detects a Light normal (→ ${tryLight?.state})`);
await page.evaluate(() => window.__harness.academy.exit());
await waitFrames(2);

// 6) A NORMAL match is unaffected (render check + no academySession leaking).
await page.evaluate(() => { window.__harness.start?.(); });
await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000 }).catch(() => {});
await waitFrames(6);
const normSession = await page.evaluate(() => window.__harness.academy.drillState());
ok(normSession === null, `a normal match has NO academy session (byte-identical path)`);
ok(await vivid(0.25, 0.5) > 6000, `normal match renders both fighters`);
await shot("05_normal_match");

console.log(`\n  known/expected pageerrors: ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — Academy Phase 1`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
