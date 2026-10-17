// brutality_phase2_live.mjs — Phase 3 (The Sharingan / Uchiha) verification.
// For each winner, boots <winner> vs a victim, drives the REAL cinematic path (activate → live loop plays it out →
// victory handoff), asserts started/advanced/resolved + 0 pageerrors, and screenshots the payoff beat.
// Sharingan Uchiha.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const SHOTS = path.join(ROOT, "brutality_work", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let errs = []; page.on("pageerror", e => errs.push(`${e.message}`));
const st = () => page.evaluate(() => window.__harness.state());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}); }
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const WINNERS = ["obito", "tobi"];
const VICTIM = "naruto";
const SHOT_AT = { obito: 104, tobi: 96 };

for (const w of WINNERS) {
  console.log(`\n── ${w} vs ${VICTIM} ──`);
  const before = errs.length;
  await page.goto(`${base}/index.html?harness=1&p1=${w}&p2=${VICTIM}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await wf(4);
  const has = await page.evaluate(k => window.__harness.brutality.cineConcepts().includes(k), w);
  ok(has, `${w} has a concept`);
  const trig = await page.evaluate(() => window.__harness.brutality.cineTrigger("p1"));
  ok(trig && trig.started && trig.wKey === w, `activated (${JSON.stringify(trig)})`);
  // shoot the payoff beat
  const target = SHOT_AT[w] || 90;
  await page.waitForFunction(t => { const s = window.__harness.brutality.cineStatus(); return !s.active || s.t >= t; }, target, { timeout: 8000, polling: 8 }).catch(() => {});
  const mid = await page.evaluate(() => window.__harness.brutality.cineStatus());
  await page.screenshot({ path: path.join(SHOTS, `p3_${w}.png`) });
  ok(mid && mid.t >= 1, `advanced to payoff (t=${mid && mid.t})`);
  // play out → resolved
  await page.waitForFunction(() => !window.__harness.brutality.cineStatus().active, null, { timeout: 8000, polling: 16 }).catch(() => {});
  ok(!(await page.evaluate(() => window.__harness.brutality.cineStatus().active)), `resolved`);
  ok(errs.length === before, `0 new pageerrors (${errs.slice(before).slice(0, 2).join(" | ")})`);
}
console.log(`\nRESULT: ${pass}/${pass + fail} passed, ${fail} failed`);
console.log("shots →", SHOTS);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
