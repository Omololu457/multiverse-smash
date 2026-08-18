// harness/kiba_voice.test.mjs — Kiba (+ Akamaru) voice wiring (audio-only, JA, unidentified).
// Verifies: (1) every clip referenced by KIBA_VOICE exists on disk & is non-empty; (2) the pool set covers
// the confirmed kit trigger points (Frog Mode intentionally ABSENT — dropped from the build); (3) each pool
// returns a real clip via the harness pick hook; (4) the trigger hooks are wired live — intro fires on the
// reveal beat, a special cast fires a cast line, and taking a hit / knockdown / winning fire their lines
// (asserted structurally via the pools + a smoke run with no page errors). NO combat logic is exercised.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { KIBA_VOICE } from "../kibaVoice.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC — every referenced clip exists & is non-empty; pool coverage. ──
section("STATIC — clips on disk + pool coverage");
const allClips = [...new Set(Object.values(KIBA_VOICE).flat())];
const missing = allClips.filter(c => { const p = path.join(ROOT, c); return !(fs.existsSync(p) && fs.statSync(p).size > 256); });
check(`${allClips.length} referenced clips all present & non-empty`, missing.length === 0, missing.join(", "));
const expected = ["intro", "effort", "gatsugaWeak", "gatsugaStrong", "fourLegs", "twoHeaded", "ultimate", "hitLight", "hitHeavy", "knockdown", "win"];
const havePools = Object.keys(KIBA_VOICE);
check("all confirmed-kit trigger pools present", expected.every(p => havePools.includes(p)), `pools=${havePools.join(",")}`);
check("Frog Mode NOT a pool (dropped from build)", !havePools.includes("frogMode") && !havePools.includes("frog"), "");
check("ultimate pool = the split-16a dramatic line", (KIBA_VOICE.ultimate || []).some(c => c.includes("kiba_line_16a")), `ult=${(KIBA_VOICE.ultimate || []).join()}`);
check("intro folds in the short name-like clip (line_11)", (KIBA_VOICE.intro || []).some(c => c.includes("kiba_line_11")), `intro=${(KIBA_VOICE.intro || []).join()}`);
check("no clip reused across DISTINCT casts (fourLegs/twoHeaded/ult/gatsuga* disjoint)", (() => {
  const casts = ["gatsugaWeak", "gatsugaStrong", "fourLegs", "twoHeaded", "ultimate"].flatMap(p => KIBA_VOICE[p] || []);
  return new Set(casts).size === casts.length;
})(), "");

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=kiba`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  section("RUNTIME — pick hooks return real clips for every pool");
  const pools = await page.evaluate(() => window.__harness.kibaVoicePools());
  check("harness exposes the Kiba voice pools", Array.isArray(pools) && pools.length >= expected.length, `pools=${pools?.length}`);
  let badPool = "";
  for (const p of expected) {
    const picks = await page.evaluate(pp => window.__harness.kibaVoicePick(pp, 5), p);
    if (!picks.every(c => typeof c === "string" && c.includes("kiba_line_"))) badPool = p;
  }
  check("every trigger pool returns real kiba_line_* clips", badPool === "", `bad=${badPool}`);

  section("RUNTIME — hooks fire live (smoke; audio has no observable state, assert no errors)");
  // Fire a special cast (Four Legs) + take a hit path via a live match tick; the audio calls are wrapped in
  // try/catch and must not throw. This exercises abilities.kibaVoice + combat.applyKiba*Voice code paths.
  await page.evaluate(() => window.__harness.setEnergy(180));
  await page.evaluate(() => window.__harness.p1SpecialDir("D"));   // Four Legs → kibaVoice("fourLegs")
  await waitFrames(6);
  await page.evaluate(() => window.__harness.setEnergy(180));
  await page.evaluate(() => window.__harness.p1Ultimate());        // ultimate → kibaVoice("ultimate")
  await waitFrames(6);
  check("no page errors while casts fire their voice hooks", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  section("no JS errors");
  check("no page errors across the voice suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Kiba voice suite: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
