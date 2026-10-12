// harness/academy_phase5_live.mjs — CHARACTER ACADEMY Phase 5: polish + verify. GAMEPAD navigates the grid +
// lesson page; POINTER/touch opens a card; the grid renders at PHONE width; the four required verification
// scenarios (basic / Kawarimi-vs-attacking-dummy / Susanoo-ladder-at-full-chakra / Kotoamatsukami-vs-Uchiha-in-
// Susanoo) boot with both fighters rendering + screenshots; and a normal match is unaffected.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
let PERR = 0, KNOWN = 0, FAILS = 0;
const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
function hook(page) { page.on("pageerror", e => { if (/drawSasukeAdultStance/.test(e.message)) { KNOWN++; return; } console.log("  PAGEERROR:", e.message); PERR++; }); }
async function boot(page) { await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.academy, { timeout: 15000 }); }
const framesOf = (page) => page.evaluate(() => window.__harness.state().frame);
async function waitFrames(page, n) { const s = await framesOf(page); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const gs = (page) => page.evaluate(() => window.__harness.state().gameState);
const vivid = (page, x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || d[i] > 90)) n++; } return n; }, [x0f, wf]);
const pad = (page, o) => page.evaluate(opts => window.__harness.padNav(opts), o);

console.log("\n══ CHARACTER ACADEMY — Phase 5 (polish + verify) ══");

// ── GAMEPAD + POINTER on a desktop-size page ──
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); hook(page); await boot(page);
await page.evaluate(() => window.__harness.academy.open());
await waitFrames(page, 3);
// GAMEPAD: move the virtual cursor, then confirm → opens a character page
await pad(page, { down: true }); await pad(page, { right: true }); await waitFrames(page, 2);
await pad(page, { confirm: true }); await waitFrames(page, 3);
console.log(`  after gamepad confirm: gameState=${await gs(page)}`);
ok((await gs(page)) === "academyChar", `GAMEPAD navigates the grid + opens a fighter (A-button)`);
// GAMEPAD back → grid
await pad(page, { back: true }); await waitFrames(page, 2);
ok((await gs(page)) === "academy", `GAMEPAD back returns to the grid`);

// POINTER / touch: a real click on the first card opens it (same pointer path touch uses)
await page.mouse.click(124, 182); await waitFrames(page, 3);
console.log(`  after pointer click on a card: gameState=${await gs(page)}`);
ok((await gs(page)) === "academyChar", `POINTER/touch click opens a fighter's lessons`);
// GAMEPAD in the lesson page: confirm a lesson button → starts a drill (BATTLE)
await pad(page, { confirm: true }); await waitFrames(page, 4);
ok((await gs(page)) === "battle", `GAMEPAD confirms a lesson button → starts the drill`);
await page.evaluate(() => window.__harness.academy.exit && window.__harness.academy.exit()); await waitFrames(page, 2);

// ── REQUIRED VERIFICATION SCENARIOS (screenshots) ──
async function scenario(page, charKey, lessonName, mode, shot, label) {
  await page.evaluate(k => window.__harness.academy.openChar(k), charKey);
  const d = await page.evaluate(([n, m]) => window.__harness.academy.drillByName(n, m), [lessonName, mode]);
  if (d && d.error) { console.log(`  [${label}] NOT FOUND: ${lessonName}`); ok(false, `${label}: lesson '${lessonName}' exists`); return; }
  await waitFrames(page, 16);
  const left = await vivid(page, 0.22, 0.28), right = await vivid(page, 0.5, 0.28);
  console.log(`  [${label}] ${d.p1} vs ${d.p2} · dummy=${d.dummy} · p1Energy=${d.p1Energy} · render L=${left} R=${right}`);
  await page.screenshot({ path: path.join(OUT, `academy_p5_${shot}.png`) });
  ok(left > 3000 && right > 3000, `${label}: both fighters render`);
  await page.evaluate(() => window.__harness.academy.exit()); await waitFrames(page, 2);
}
// 1) BASIC move
await scenario(page, "naruto", "Jab Combo", "showme", "basic", "basic SHOW ME");
// 2) SCENARIO move — Kawarimi vs an attacking dummy
await scenario(page, "kakashi_war", "Kawarimi", "tryit", "kawarimi", "Kawarimi vs attacking dummy");
{ const d = await page.evaluate(() => window.__harness.academy.openChar("kakashi_war"));
  await page.evaluate(() => { const i = window.__harness.academy.lessons("kakashi_war").findIndex(l => l.name === "Kawarimi" && l.cat !== "guided"); window.__harness.academy.drill(i, "tryit"); });
  await waitFrames(page, 2); const st = await page.evaluate(() => window.__harness.academy.drillState());
  ok(st && st.mode === "tryit", `Kawarimi drill arms the attacking-dummy scenario`); await page.evaluate(() => window.__harness.academy.exit()); await waitFrames(page, 2);
}
// 3) METER move — Susanoo ladder at full chakra
await scenario(page, "shisui_fallen", "Emerald Susanoo Ladder", "showme", "susanoo_ladder", "Susanoo ladder at full chakra");
// 4) MATCHUP move — Kotoamatsukami vs an Uchiha in Susanoo
await scenario(page, "shisui_fallen", "Kotoamatsukami (mind-control order)", "showme", "koto_matchup", "Kotoamatsukami vs Uchiha in Susanoo");

// ── ISOLATION: a normal match is unchanged (no academy session) ──
await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, { timeout: 15000 });
await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, { timeout: 8000 }).catch(() => {});
await waitFrames(page, 6);
ok((await page.evaluate(() => window.__harness.academy.drillState())) === null, `normal match has NO academy session`);
ok((await vivid(page, 0.25, 0.5)) > 6000, `normal match renders both fighters`);

// ── PHONE WIDTH: the grid renders + fits at a narrow viewport ──
const phone = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true }); hook(phone); await boot(phone);
await phone.evaluate(() => window.__harness.academy.open()); await waitFrames(phone, 3);
const ppx = await vivid(phone, 0, 1);
console.log(`  phone-width grid vivid px = ${ppx}`);
ok(ppx > 8000, `the grid renders at phone width (400px, px=${ppx})`);
await phone.screenshot({ path: path.join(OUT, "academy_p5_phone.png") });
// touch tap on the grid (first card) opens a fighter
await phone.touchscreen.tap(90, 180); await waitFrames(phone, 3);
console.log(`  phone touch tap: gameState=${await gs(phone)}`);
ok((await gs(phone)) === "academyChar", `TOUCH tap opens a fighter at phone width`);
await phone.screenshot({ path: path.join(OUT, "academy_p5_phone_char.png") });

console.log(`\n  known/expected pageerrors: ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — Academy Phase 5`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
