// harness/naoya_voice.test.mjs — Naoya Zenin voice wiring (audio-only, JA/Kansai; self-transcribed).
// Verifies: (1) every clip referenced by NAOYA_VOICE exists on disk & is non-empty; (2) the pool set covers
// Naoya's real kit trigger points; (3) all 39 source clips are accounted for EXACTLY once (nothing lost /
// double-wired); (4) the flagged fragment (line_010) is BANKED in `unclear`, not wired; (5) each pool returns
// a real clip via the harness pick hook; (6) the live hooks fire without error (intro reveal + Frame-Trap /
// special / ultimate casts + a smoke tick). NO combat logic is exercised.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { NAOYA_VOICE } from "../naoyaVoice.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC — every referenced clip exists & is non-empty; pool coverage; full-set accounting. ──
section("STATIC — clips on disk + pool coverage + accounting");
const allClips = [...new Set(Object.values(NAOYA_VOICE).flat())];
const missing = allClips.filter(c => { const p = path.join(ROOT, c); return !(fs.existsSync(p) && fs.statSync(p).size > 256); });
check(`${allClips.length} referenced clips all present & non-empty`, missing.length === 0, missing.join(", "));
// all 39 source clips accounted for EXACTLY once across all pools (incl. `unclear` bank) — nothing lost/dup.
const flat = Object.values(NAOYA_VOICE).flat();
check("no clip appears in two pools", flat.length === new Set(flat).size, `flat=${flat.length} unique=${new Set(flat).size}`);
check("all 39 source clips accounted for (001..039)", new Set(flat).size === 39, `accounted=${new Set(flat).size}`);
const wiredPools = ["intro", "frameTrap", "special", "ultimate", "effort", "hitLight", "hitHeavy", "knockdown", "win"];
const havePools = Object.keys(NAOYA_VOICE);
check("all kit trigger pools present", wiredPools.every(p => havePools.includes(p)), `pools=${havePools.join(",")}`);
check("intro folds in the NAMECALL clip (line_011 = 'Zen'in Naoya!')", (NAOYA_VOICE.intro || []).some(c => c.includes("naoya_line_011")), `intro=${(NAOYA_VOICE.intro || []).join()}`);
check("ultimate = the smug monologue line (line_019)", (NAOYA_VOICE.ultimate || []).some(c => c.includes("naoya_line_019")), `ult=${(NAOYA_VOICE.ultimate || []).join()}`);
check("Frame-Trap has a DEDICATED arrogant pool (≥2 lines, prompt Step 3)", (NAOYA_VOICE.frameTrap || []).length >= 2, `frameTrap=${(NAOYA_VOICE.frameTrap || []).join()}`);
// the flagged mid-word FRAGMENT must be banked, NOT wired to any live trigger.
const wiredClips = wiredPools.flatMap(p => NAOYA_VOICE[p] || []);
check("flagged fragment line_010 is BANKED (unclear), not wired", !wiredClips.some(c => c.includes("naoya_line_010")) && (NAOYA_VOICE.unclear || []).some(c => c.includes("naoya_line_010")), "");

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=naoya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  section("RUNTIME — pick hooks return real clips for every pool");
  const pools = await page.evaluate(() => window.__harness.naoyaVoicePools());
  check("harness exposes the Naoya voice pools", Array.isArray(pools) && pools.length >= wiredPools.length, `pools=${pools?.length}`);
  let badPool = "";
  for (const p of wiredPools) {
    const picks = await page.evaluate(pp => window.__harness.naoyaVoicePick(pp, 5), p);
    if (!picks.every(c => typeof c === "string" && c.includes("naoya_line_"))) badPool = p;
  }
  check("every trigger pool returns real naoya_line_* clips", badPool === "", `bad=${badPool}`);

  section("RUNTIME — hooks fire live (smoke; audio has no observable state, assert no errors)");
  await page.evaluate(() => window.__harness.setEnergy(180));
  await page.evaluate(() => window.__harness.p1SpecialDir("D"));   // Frame-Trap open → naoyaCastVoice("frameTrap")
  await waitFrames(6);
  await page.evaluate(() => window.__harness.setEnergy(180));
  await page.evaluate(() => window.__harness.p1SpecialDir(null));  // Energy Dart → naoyaCastVoice("special")
  await waitFrames(6);
  await page.evaluate(() => window.__harness.setEnergy(180));
  await page.evaluate(() => window.__harness.p1Ultimate());        // ultimate → pickNaoyaVoice("ultimate")
  await waitFrames(6);
  check("no page errors while casts fire their voice hooks", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  section("no JS errors");
  check("no page errors across the voice suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Naoya voice suite: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
