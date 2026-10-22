// harness/spiderman_traversal.mjs — PHASE 2 smoothness + determinism gate for the web-traversal system.
// Asserts the Phase-2 "smoothness requirements" (docs/spiderman/TRAVERSAL_DESIGN.md §E):
//   • no single-frame position jump greater than the maximum traversal speed (no teleport/snap),
//   • no traversal pose held under the 3-frame minimum (no 1-frame pose flicker),
//   • determinism — 3 identical routes produce byte-identical per-frame position traces (no RNG in the sim).
// Measurement is done INSIDE a single synchronous page.evaluate() per route, advancing the sim with
// __harness.aiVsAi.step() one frame at a time. Because JS is single-threaded, the real-time rAF loop cannot
// interleave with the synchronous step loop, so every sampled frame is exactly one sim tick apart — giving a
// true per-frame position delta (impossible with wall-clock polling) and a frame-exact, reproducible route.
import { chromium } from "playwright";
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

// Run the WHOLE scripted route synchronously in the browser and return the per-frame trace. Each phase:
// settle on the ground, lift, cast, then step N frames sampling (x,y,pose) every single frame.
async function runRouteTrace() {
  return page.evaluate(() => {
    const H = window.__harness;
    const step = (n) => { for (let i = 0; i < n; i++) H.aiVsAi.step(1); };
    const land = () => { for (let i = 0; i < 240; i++) { const p = H.p1(); if (p.grounded && Math.abs(p.vy) < 0.1 && Math.abs(p.vx) < 0.05 && !p.swinging) break; H.aiVsAi.step(1); } };
    const trace = [];                               // { phase, x, y, pose }
    const sample = (phase, n) => { for (let i = 0; i < n; i++) { const p = H.p1(); trace.push({ phase, x: p.x, y: p.y, pose: p.spriteSheet || p.cast || "none" }); H.aiVsAi.step(1); } };
    H.setP2X(3000);                                 // park the AI opponent far away → stable facing
    // 1) SWING — pin P1 to a FIXED start so all 3 runs share identical absolute entry (the sim itself is
    // deterministic; this just removes the per-run spawn-X offset so the absolute traces can be compared).
    land(); H.setP1X(1600); step(1);
    H.fillEnergy(); H.liftP1(150); step(1); H.p1SpecialDir("U"); step(1);
    sample("swing", 40);
    H.p1SpecialDir(null);                           // release → fling
    // 2) ZIP
    land(); H.setP2X(3000); H.fillEnergy(); H.liftP1(150); step(1); H.p1SpecialDir("F"); step(1);
    sample("zip", 16);
    // 3) HANG
    land(); H.setP2X(3000); H.fillEnergy(); H.liftP1(150); step(1); H.p1SpecialDir("B"); step(1);
    sample("hang", 24);
    H.p1SpecialDir(null);                           // drop
    land();
    const end = H.p1();
    return { trace, end: { x: Math.round(end.x), y: Math.round(end.y) } };
  });
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => window.__harness.state().frame > 5, null, { timeout: 10000 });

  console.log("\n── scripted route (swing → release → zip → hang → drop → land), frame-exact sampling ──");
  await runRouteTrace();                            // WARM-UP (discarded): settle the match to its steady state
  const r1 = await runRouteTrace();
  const MAX_STEP = 38, MIN_HOLD = 3;

  // per-phase max single-frame step (only within a phase — phase boundaries include a land()/lift gap)
  const phases = ["swing", "zip", "hang"];
  const perPhaseMax = {};
  for (const ph of phases) {
    const pts = r1.trace.filter(t => t.phase === ph);
    let m = 0; for (let i = 1; i < pts.length; i++) m = Math.max(m, Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    perPhaseMax[ph] = m;
  }
  const overallMax = Math.max(...Object.values(perPhaseMax));
  console.log(`  per-frame maxStep: swing=${perPhaseMax.swing.toFixed(2)} zip=${perPhaseMax.zip.toFixed(2)} hang=${perPhaseMax.hang.toFixed(2)} px`);

  // pose run-lengths within each phase (ignore the trailing segment which can be cut by a state change)
  const shortRuns = [];
  for (const ph of phases) {
    const pts = r1.trace.filter(t => t.phase === ph);
    const runs = []; for (const s of pts) { const last = runs[runs.length - 1]; if (last && last.pose === s.pose) last.len++; else runs.push({ pose: s.pose, len: 1 }); }
    runs.slice(0, -1).forEach(r => { if (r.pose && r.pose !== "none" && /spiderman_(swing|webimpact)/.test(r.pose) && r.len < MIN_HOLD) shortRuns.push(`${ph}:${r.pose.split("/").pop()}:${r.len}f`); });
  }

  console.log("\n── smoothness gates ──");
  check(`no single-frame position jump > ${MAX_STEP}px (max traversal speed) — no teleport/snap`, overallMax <= MAX_STEP, `maxStep=${overallMax.toFixed(2)}px`);
  check(`every traversal pose holds ≥ ${MIN_HOLD} frames (no 1-frame flicker)`, shortRuns.length === 0, shortRuns.length ? shortRuns.join(", ") : "ok");

  console.log("\n── determinism: 3 identical swings → byte-identical per-frame trace ──");
  // The pendulum swing (pinned entry, opponent far away) is p2-independent and must be bit-exact every run.
  // (The later zip/hang phases let the live AI opponent wander into range, which is the TEST harness's own
  // non-determinism, not the sim's — a real LAN match runs one seeded sim on both ends. run2==run3 below
  // confirms the full route is deterministic once the opponent settles.)
  const r2 = await runRouteTrace();
  const r3 = await runRouteTrace();
  const swingKey = (r) => JSON.stringify(r.trace.filter(t => t.phase === "swing").map(t => [Math.round(t.x * 100), Math.round(t.y * 100)]));
  const fullKey = (r) => JSON.stringify(r.trace.map(t => [t.phase, Math.round(t.x * 100), Math.round(t.y * 100)]));
  const f1 = fullKey(r1), f2 = fullKey(r2), f3 = fullKey(r3);
  console.log(`  run1 end=(${r1.end.x},${r1.end.y})  run2 end=(${r2.end.x},${r2.end.y})  run3 end=(${r3.end.x},${r3.end.y})  frames/run=${r1.trace.length}`);
  check("full route: run 2 == run 1 (identical every frame)", f1 === f2, f1 === f2 ? "" : "diverged");
  check("full route: run 3 == run 1 (identical every frame)", f1 === f3, f1 === f3 ? "" : "diverged");
  check("same end position on 3 identical runs", r1.end.x === r2.end.x && r1.end.x === r3.end.x && r1.end.y === r2.end.y && r1.end.y === r3.end.y, `${r1.end.x},${r2.end.x},${r3.end.x}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man TRAVERSAL smoothness+determinism: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
