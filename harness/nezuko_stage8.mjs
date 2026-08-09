// harness/nezuko_stage8.mjs — Stage 8 evidence: Intro / Win / Lose.
//   intro (main box-emergence) + intro2 (short/alt) wired via introPool.
//   win/lose are SPLIT from the ONE nezuko_intro_3 sheet: win = frames 0-1 (sourceX 10), lose = frame 2
//   (sourceX 122). CONFIRMS the split is real (distinct clips, NOT the whole file played for both outcomes),
//   and the match-victory hook poses the winner (win) + loser (lose).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `nezuko_s8_${name}.png`) }); }
const force = (a, who = "p1") => page.evaluate(([act, w]) => window.__harness.forceAction(act, w), [a, who]);

try {
  await page.goto(`${base}/index.html?harness=1&p1=nezuko&p2=nezuko`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });

  // ── INTRO ──
  section("Intro (box-emergence) via introPool");
  await page.evaluate(() => window.__harness.start());   // real intro stage machine
  await waitFrames(4);
  let sawIntro = false, variants = new Set();
  for (let i = 0; i < 40; i++) { const f = await p1(); variants.add(f.introVariant); if (has(f, "nezuko_intro")) sawIntro = true; if (i === 6) await shot("intro"); await waitFrames(1); }
  check("intro plays a nezuko_intro* sheet", sawIntro, `variants=${[...variants].filter(Boolean).join(",")}`);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // both intro clips are wired (render each directly)
  await force("intro"); await waitFrames(2);
  const iv = await p1();
  check("intro clip wired → nezuko_intro.png", has(iv, "nezuko_intro.png"), `sheet=${iv.spriteSheet}`);
  await force("intro2"); await waitFrames(2);
  const iv2 = await p1();
  check("intro2 clip wired → nezuko_intro_2.png", has(iv2, "nezuko_intro_2.png"), `sheet=${iv2.spriteSheet}`);

  // ── WIN / LOSE SPLIT (the STOP condition) ──
  section("Win / Lose — split from ONE nezuko_intro_3 sheet");
  await force("win"); await waitFrames(2);
  const w = await p1(); await shot("win");
  await force("lose"); await waitFrames(2);
  const l = await p1(); await shot("lose");
  await force(null);
  check("win clip → nezuko_intro_3.png", has(w, "nezuko_intro_3"), `sheet=${w.spriteSheet}`);
  check("lose clip → nezuko_intro_3.png (same sheet)", has(l, "nezuko_intro_3"), `sheet=${l.spriteSheet}`);
  check("SPLIT: win ≠ lose (different frame range, NOT the whole file for both)",
        (w.spriteFrames !== l.spriteFrames) && (w.spriteSourceX !== l.spriteSourceX),
        `win=[frames ${w.spriteFrames}, sx ${w.spriteSourceX}]  lose=[frames ${l.spriteFrames}, sx ${l.spriteSourceX}]`);
  check("win uses frames 0-1 (sx 10, 2f)", w.spriteFrames === 2 && w.spriteSourceX === 10, `frames=${w.spriteFrames} sx=${w.spriteSourceX}`);
  check("lose uses frame 2 (sx 122, 1f)", l.spriteFrames === 1 && l.spriteSourceX === 122, `frames=${l.spriteFrames} sx=${l.spriteSourceX}`);

  // ── OUTCOME WIRING: match-victory hook poses winner=win / loser=lose ──
  section("Victory hook — winner→win pose, loser→lose pose");
  const res = await page.evaluate(() => window.__harness.forceMatchWin("p1"));   // P1 wins the match
  await waitFrames(2);
  const wp = await p1(), lp = await p2();
  await shot("victory");
  check("match reached victory", res.victory && res.winner === "p1", `victory=${res.victory} winner=${res.winner}`);
  check("winner (P1) posed → win clip", wp.forceAction === "win", `p1.forceAction=${wp.forceAction}`);
  check("loser (P2) posed → lose clip", lp.forceAction === "lose", `p2.forceAction=${lp.forceAction}`);
  check("posed clips are the split (win frames ≠ lose frames)", wp.spriteFrames !== lp.spriteFrames, `win frames=${wp.spriteFrames} lose frames=${lp.spriteFrames}`);

  section("stability");
  check("no JS errors during Stage 8", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
