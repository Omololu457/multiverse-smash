// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL pre-match intro SEQUENCING: P1's intro plays fully to completion FIRST,
// then P2's intro plays — never simultaneously. Tested with TWO different characters
// (Sasuke: 3-intro random introPool  vs  Vegeta: fixed-order introSequence) to prove it's
// universal and doesn't break the per-character intro-rotation system.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 0, y: 120, width: 1280, height: 470 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(REPO, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16, timeout: 15000 }); };
const intro = () => page.evaluate(() => window.__harness.introState());

// Drive one match (p1 vs p2) through the INTRO, sampling introState every frame until BATTLE.
async function runIntro(p1char, p2char, tag) {
  section(`${p1char} (P1) vs ${p2char} (P2)`);
  await page.goto(`${base}/index.html?harness=1&p1=${p1char}&p2=${p2char}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());   // start() = INTRO (NOT boot, which skips it)
  await wf(2);

  const samples = [];
  let shotP1 = false, shotP2 = false;
  for (let i = 0; i < 900; i++) {
    const s = await intro();
    samples.push(s);
    if (s.stage === "p1" && s.p1Playing && !shotP1) { shotP1 = true; await page.screenshot({ path: path.join(OUT, `INTROSEQ_${tag}_p1.png`), clip: CLIP }); }
    if (s.stage === "p2" && s.p2Playing && !shotP2) { shotP2 = true; await page.screenshot({ path: path.join(OUT, `INTROSEQ_${tag}_p2.png`), clip: CLIP }); }
    if (s.gameState !== "intro") break;
    await wf(1);
  }

  const introSamples = samples.filter(s => s.gameState === "intro");
  // 1) NEVER both playing at once
  const overlap = introSamples.some(s => s.p1Playing && s.p2Playing);
  check("intros NEVER overlap (never both playing in the same frame)", !overlap, `${introSamples.filter(s => s.p1Playing && s.p2Playing).length} overlapping frames`);
  // 2) P1 plays first: there is a stretch where P1 plays and P2 does not
  const p1Solo = introSamples.filter(s => s.p1Playing && !s.p2Playing).length;
  const p2Solo = introSamples.filter(s => s.p2Playing && !s.p1Playing).length;
  check("P1 intro plays (solo)", p1Solo > 5, `${p1Solo} frames P1-only`);
  check("P2 intro plays (solo)", p2Solo > 5, `${p2Solo} frames P2-only`);
  // 3) ordering: last P1-playing frame comes BEFORE first P2-playing frame
  const lastP1 = introSamples.map(s => s.p1Playing).lastIndexOf(true);
  const firstP2 = introSamples.map(s => s.p2Playing).indexOf(true);
  check("P1 finishes BEFORE P2 begins (sequential order)", firstP2 > lastP1 && lastP1 >= 0, `lastP1@${lastP1}  firstP2@${firstP2}`);
  // 4) each side got an intro-variant assignment from the (unchanged) rotation system. null is a
  //    valid value = "no named pool variant → default transform/idle intro" (e.g. Naruto has no
  //    introPool). Rotation VARIETY is proven separately for Sasuke below.
  const p1v = introSamples.find(s => s.p1Playing)?.p1Variant;
  const p2v = introSamples.find(s => s.p2Playing)?.p2Variant;
  check("both sides got an intro-variant assignment (null = default intro)", p1v !== undefined && p2v !== undefined, `p1=${p1v} p2=${p2v}`);
  check("captured a P1-only and a P2-only screenshot", shotP1 && shotP2);
  return { p1v, p2v };
}

try {
  // Two different characters, each with a DIFFERENT intro system:
  //   Sasuke = random introPool (3-intro rotation)   ·   Vegeta = fixed-order introSequence
  await runIntro("sasuke", "vegeta", "sasuke_vegeta");
  // A second, different pairing to prove universality (not Goku-Black-specific).
  await runIntro("naruto", "goku_black", "naruto_gb");

  // Sasuke rotation still random across matches: collect the P1 variant a few times, expect variety
  // (best-effort — a fixed pool of 3, so 4 tries should surface ≥2 distinct unless very unlucky).
  section("Sasuke intro-rotation still varies across matches");
  const seen = new Set();
  for (let i = 0; i < 5; i++) {
    await page.goto(`${base}/index.html?harness=1&p1=sasuke&p2=vegeta`, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
    await page.mouse.click(640, 360);
    await page.evaluate(() => window.__harness.start());
    await wf(3);
    seen.add((await intro()).p1Variant);
  }
  check("Sasuke's introPool rotation intact (≥2 distinct variants over 5 matches)", seen.size >= 2, `variants=${[...seen].join(",")}`);

  section("stability");
  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Sequential pre-match intros: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
