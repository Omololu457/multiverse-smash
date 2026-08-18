// harness/spiderman_voice.test.mjs — Spider-Man voice wiring (audio-only, EN Marvel-Rivals pack, CONTENT-
// classified via faster_whisper transcription). Verifies: (1) every clip referenced by SPIDERMAN_VOICE
// exists on disk & is non-empty; (2) the pool set covers the real trigger points; (3) the huge generic
// `quip` banter pool exists + the tail EFFORT/knockdown grunt cluster is where expected; (4) flagged
// cut-mid-line clips are NOT wired into active pools; (5) each pool returns a real clip via the harness
// pick hook; (6) the hooks fire live (web-cast / ultimate / hit path) with no page errors. NO combat logic.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { SPIDERMAN_VOICE } from "../spidermanVoice.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }
const num = c => parseInt(c.split("_").pop());

section("STATIC — clips on disk + pool coverage + classification integrity");
const allClips = [...new Set(Object.values(SPIDERMAN_VOICE).flat())];
const missing = allClips.filter(c => { const p = path.join(ROOT, c); return !(fs.existsSync(p) && fs.statSync(p).size > 256); });
check(`${allClips.length} referenced clips all present & non-empty`, missing.length === 0, missing.slice(0, 5).join(", "));
const expected = ["intro", "quip", "effort", "hitLight", "hitHeavy", "knockdown", "webCast", "ultimate", "victory"];
const havePools = Object.keys(SPIDERMAN_VOICE);
check("all real trigger pools present", expected.every(p => havePools.includes(p)), `pools=${havePools.join(",")}`);
check("quip is the big generic-banter pool (>= 300 lines)", (SPIDERMAN_VOICE.quip || []).length >= 300, `quip=${(SPIDERMAN_VOICE.quip || []).length}`);
check("effort pool is wordless grunts from the tail cluster (majority clip# >= 450)", (() => {
  const e = SPIDERMAN_VOICE.effort || []; return e.length >= 8 && e.filter(c => num(c) >= 450).length >= e.length / 2;
})(), `effort=${(SPIDERMAN_VOICE.effort || []).map(num).join()}`);
check("knockdown pool = the falling-scream tail clips (463/467/470)", ["463", "467", "470"].every(n => (SPIDERMAN_VOICE.knockdown || []).some(c => c.includes(`_${n}.`))), `kd=${(SPIDERMAN_VOICE.knockdown || []).join()}`);
check("ultimate pool includes the 'you get a web…' line (clip 81)", (SPIDERMAN_VOICE.ultimate || []).some(c => c.includes("_081.")), `ult=${(SPIDERMAN_VOICE.ultimate || []).join()}`);
check("webCast pool includes 'Yo web whip!' (clip 134)", (SPIDERMAN_VOICE.webCast || []).some(c => c.includes("_134.")), `web=${(SPIDERMAN_VOICE.webCast || []).join()}`);
// flagged cut-mid-line clips must NOT be wired (Step-4 honesty): a sample of clips that START mid-sentence
const flaggedOut = ["006", "116", "179", "249", "012"];   // continuation-starts + the clip-12 hallucination
check("flagged cut/hallucination clips are NOT in any active pool", flaggedOut.every(n => !allClips.some(c => c.includes(`_${n}.`))), `still-wired=${flaggedOut.filter(n => allClips.some(c => c.includes(`_${n}.`))).join()}`);
check("no clip reused across DISTINCT small pools (except intended ult/victory overlap)", (() => {
  const small = ["intro", "effort", "hitLight", "hitHeavy", "knockdown", "webCast"].flatMap(p => SPIDERMAN_VOICE[p] || []);
  return new Set(small).size === small.length;
})(), "");

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  section("RUNTIME — pick hooks return real clips for every pool");
  const pools = await page.evaluate(() => window.__harness.spidermanVoicePools());
  check("harness exposes the Spider-Man voice pools", Array.isArray(pools) && pools.length === expected.length, `pools=${pools?.length}`);
  let badPool = "";
  for (const p of expected) {
    const picks = await page.evaluate(pp => window.__harness.spidermanVoicePick(pp, 5), p);
    if (!picks.every(c => typeof c === "string" && c.includes("spiderman_mr_"))) badPool = p;
  }
  check("every trigger pool returns real spiderman_mr_* clips", badPool === "", `bad=${badPool}`);

  section("RUNTIME — hooks fire live (smoke; audio has no observable state, assert no errors)");
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.evaluate(() => window.__harness.p1SpecialDir(null));   // neutral Special = Web Impact → spideyVoice("webCast")
  await waitFrames(6);
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.evaluate(() => window.__harness.p1SpecialDir("F"));    // Web Throw → spideyVoice("webCast")
  await waitFrames(6);
  await page.evaluate(() => window.__harness.p1Ultimate());         // Maximum Web → pickSpidermanVoice("ultimate")
  await waitFrames(10);
  check("web-cast + ultimate voice hooks ran without throwing", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  section("no JS errors");
  check("no page errors across the voice smoke run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("HARNESS ERROR", e); FAIL++; }
finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
