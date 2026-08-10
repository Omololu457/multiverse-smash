// harness/determinism.test.mjs — Stage 11A: seeded gameplay PRNG.
//
// Proves the determinism foundation:
//   1. PRNG is deterministic + seed-sensitive (same seed → identical stream; different seed → differs).
//   2. startMatch stamps matchConfig.seed and a forced seed reproduces it.
//   3. A full AI-vs-AI match is STATE-reproducible under a forced seed (same seed → identical fighter
//      state after N frames; different seed → diverges). This is the real payoff: AI rolls now flow
//      through the seeded stream, so a match replays bit-identically from its seed.
//   4. Source proof: no gameplay-affecting Math.random() remains (ai.js rand + abilities.js Kamui).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

// ── (4) SOURCE PROOF (node-side, no browser) ────────────────────────────────
section("source proof — no gameplay Math.random()");
const aiSrc = fs.readFileSync(path.join(ROOT, "ai.js"), "utf8");
const abSrc = fs.readFileSync(path.join(ROOT, "abilities.js"), "utf8");
// strip comments so a comment mentioning "Math.random" doesn't count
const strip = s => s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check("ai.js rand() routes through gameRng (no functional Math.random)", !/Math\.random/.test(strip(aiSrc)) && /gameRng\.next\(\)/.test(aiSrc), "");
const kamuiGameRng = (abSrc.match(/gameRng\.next\(\) \* \((?:maxX|worldW)/g) || []).length;
check("abilities.js Kamui teleport uses gameRng (4 sites)", kamuiGameRng === 4, `sites=${kamuiGameRng}`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.aiVsAi && window.__harness.rng, null, { timeout: 15000 });

  // ── (1) PRNG determinism + seed-sensitivity ──────────────────────────────
  section("PRNG — deterministic + seed-sensitive");
  const draw = (seed, n) => page.evaluate(([s, k]) => { window.__harness.rng.reseed(s); return window.__harness.rng.draw(k); }, [seed, n]);
  const a1 = await draw(12345, 32);
  const a2 = await draw(12345, 32);
  const b1 = await draw(99999, 32);
  check("same seed → identical 32-value stream", JSON.stringify(a1) === JSON.stringify(a2), "");
  check("different seed → different stream", JSON.stringify(a1) !== JSON.stringify(b1), "");
  check("values are well-formed floats in [0,1)", a1.every(v => v >= 0 && v < 1) && new Set(a1).size > 25, `distinct=${new Set(a1).size}`);

  // ── (2)+(3) match reproduces bit-identically under a forced seed ──────────
  // Run an AI-vs-AI match to a fixed frame count, snapshot both fighters' STATE, repeat with the SAME
  // forced seed → identical; then a DIFFERENT seed → diverges. Uses netero vs beerus (both have AI
  // signature moves + projectiles → lots of RNG-driven decisions to diverge on).
  section("match STATE reproduces under a forced seed");
  const runSnapshot = async (seed, frames) => page.evaluate(([s, f]) => {
    window.__harness.rng.forceSeed(s);
    window.__harness.aiVsAi.start({ p1: "netero", p2: "beerus", matches: 1, speed: 1 });
    const stamped = window.__harness.rng.seed();            // matchConfig.seed after startMatch
    window.__harness.aiVsAi.step(f);
    const snap = who => { const p = window.__harness[who](); return { x: +p.x.toFixed(4), y: +p.y.toFixed(4), health: p.health, energy: +(p.energy || 0).toFixed(4) }; };
    return { stamped, p1: snap("p1"), p2: snap("p2") };
  }, [seed, frames]);

  const FRAMES = 1500;
  const r1 = await runSnapshot(7777, FRAMES);
  const r2 = await runSnapshot(7777, FRAMES);
  const r3 = await runSnapshot(4242, FRAMES);

  check("forced seed is stamped onto matchConfig.seed", r1.stamped === 7777, `stamped=${r1.stamped}`);
  const same = JSON.stringify({ p1: r1.p1, p2: r1.p2 }) === JSON.stringify({ p1: r2.p1, p2: r2.p2 });
  check(`same seed → identical fighter state after ${FRAMES} frames`, same,
    same ? "" : `run1=${JSON.stringify(r1.p1)}/${JSON.stringify(r1.p2)}  run2=${JSON.stringify(r2.p1)}/${JSON.stringify(r2.p2)}`);
  const diverged = JSON.stringify({ p1: r1.p1, p2: r1.p2 }) !== JSON.stringify({ p1: r3.p1, p2: r3.p2 });
  check("different seed → diverged fighter state", diverged, diverged ? "" : "seeds 7777 and 4242 produced identical state (suspicious)");

  // ── auto-generated seed path (normal play) ───────────────────────────────
  section("normal play — fresh seed per match");
  const freshSeeds = await page.evaluate(() => {
    window.__harness.rng.clearForceSeed();
    const seeds = [];
    for (let i = 0; i < 3; i++) { window.__harness.aiVsAi.start({ p1: "netero", p2: "beerus", matches: 1, speed: 1 }); seeds.push(window.__harness.rng.seed()); }
    return seeds;
  });
  check("un-forced matches each get a stamped seed", freshSeeds.every(s => Number.isFinite(s) && s > 0), `seeds=${freshSeeds.join(",")}`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  DETERMINISM (Stage 11A): ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
