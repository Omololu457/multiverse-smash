// brutality_cine_live.mjs — Phase 1 verification for the canon BRUTALITY cutaway (Gojo "Unlimited Void").
// Boots gojo (winner) vs sasuke, asserts the concept table + module loaded, then drives the REAL code path:
// activateBrutalityCinematic → the live updateBattle loop freezes combat & plays it out → on done it hands off to
// the victory screen. Captures screenshots mid-beat (data-flood / head-pop / banner). Deterministic; 0 pageerrors.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const SHOTS = path.join(ROOT, "brutality_work", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let errs = []; page.on("pageerror", e => errs.push(e.message));
const st = () => page.evaluate(() => window.__harness.state());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}); }
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

await page.goto(`${base}/index.html?harness=1&p1=gojo&p2=sasuke`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {});
await wf(4);

console.log("PHASE 1 — Gojo Unlimited Void brutality");
const concepts = await page.evaluate(() => window.__harness.brutality.cineConcepts());
ok(Array.isArray(concepts) && concepts.includes("gojo"), `concept table has gojo (${concepts.join(",")})`);

// Drive the REAL path: activate the cinematic; the live loop should play it out and freeze combat.
const trig = await page.evaluate(() => window.__harness.brutality.cineTrigger("p1"));
ok(trig && trig.started === true && trig.active === true, `cineTrigger started (${JSON.stringify(trig)})`);
ok(trig && trig.wKey === "gojo", `winner key = gojo`);

// frame-exact captures: poll cineStatus().t to a target, then shoot immediately (the loop free-runs at 60fps)
async function shootAt(target, name) {
  await page.waitForFunction(t => { const s = window.__harness.brutality.cineStatus(); return !s.active || s.t >= t; }, target, { timeout: 8000, polling: 8 }).catch(() => {});
  const s = await page.evaluate(() => window.__harness.brutality.cineStatus());
  await page.screenshot({ path: path.join(SHOTS, name) });
  return s.t;
}
const tA = await shootAt(46, "gojo_01_dataflood.png");    // flood pouring in
const tB = await shootAt(100, "gojo_02_overload.png");    // overload peak (white-hot core)
const tC = await shootAt(120, "gojo_03_headpop.png");     // head bursts
const tD = await shootAt(136, "gojo_04_banner.png");      // UNLIMITED VOID stamp
ok(tA >= 40 && tA <= 60, `flood beat captured (t=${tA})`);
ok(tC >= 112, `head-pop beat captured (t=${tC})`);

// play fully out → should finish and hand off to victory (cinematic cleared)
await page.waitForFunction(() => { const s = window.__harness.brutality.cineStatus(); const g = window.__harness.state(); return !s.active || g.gameState === "victory" || g.state === "victory"; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
const endS = await page.evaluate(() => window.__harness.brutality.cineStatus());
ok(!endS.active, `cinematic resolved (cleared/done, status=${JSON.stringify(endS)})`);

ok(errs.length === 0, `0 pageerrors (${errs.slice(0, 3).join(" | ")})`);
console.log(`\nRESULT: ${pass}/${pass + fail} passed, ${fail} failed`);
console.log("shots →", SHOTS);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
