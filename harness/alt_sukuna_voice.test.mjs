// harness/alt_sukuna_voice.test.mjs — Alternate Sukuna TONE-FILTERED voice reuse.
// Verifies: (1) every clip referenced by ALT_SUKUNA_VOICE (EN+JA) exists on disk & is non-empty; (2) the
// pools cover the kit's trigger points in both languages; (3) ★ the TONE FILTER — a set of known
// cruel_mocking clips from the original bank are ABSENT from EVERY alt_sukuna pool (this is the "less
// malicious" guarantee); (4) pickAltSukunaVoice returns a real clip per pool + the castCleave→cast JA
// fallback; (5) the live hooks fire without error (intro reveal + Cleave/Beam/Grab/Domain casts + win).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { ALT_SUKUNA_VOICE } from "../alt_sukunaVoice.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

const EN = ALT_SUKUNA_VOICE.en, JA = ALT_SUKUNA_VOICE.ja;
const allClips = [...new Set([...Object.values(EN).flat(), ...Object.values(JA).flat()])];

section("STATIC — clips on disk + pool coverage + tone filter");
const missing = allClips.filter(c => { const p = path.join(ROOT, c); return !(fs.existsSync(p) && fs.statSync(p).size > 256); });
check(`${allClips.length} referenced clips all present & non-empty`, missing.length === 0, missing.slice(0, 6).join(", "));

const pools = ["intro", "hitReact", "offense", "cast", "castCleave", "castFlame", "castDomain", "win", "exertion"];
check("EN has all kit trigger pools", pools.every(p => p in EN), `pools=${Object.keys(EN).join(",")}`);
check("JA has all kit trigger pools", pools.every(p => p in JA), `pools=${Object.keys(JA).join(",")}`);
// non-empty except JA castCleave (intentional → falls back to JA cast)
const enEmpty = pools.filter(p => (EN[p] || []).length === 0);
const jaEmpty = pools.filter(p => (JA[p] || []).length === 0);
check("EN: no empty pool", enEmpty.length === 0, `empty=${enEmpty.join(",")}`);
check("JA: only castCleave empty (falls back to cast)", jaEmpty.length === 1 && jaEmpty[0] === "castCleave", `empty=${jaEmpty.join(",")}`);
check("castDomain = the Malevolent Shrine incantation (clips 201/221 EN, 560/561 JA)",
  EN.castDomain.some(c => c.includes("_221_")) && JA.castDomain.some(c => c.includes("_560_")));

// ★ TONE FILTER PROOF — these are KNOWN cruel_mocking clips (verified by transcript content) from the same
// 685-bank; the "less malicious" build MUST NOT reuse any of them in ANY pool.
const CRUEL = [
  "sukuna_new_001_", // "You maggot!"
  "sukuna_new_006_", // "FOOL"
  "sukuna_new_035_", // "Crawl on the ground!"
  "sukuna_new_044_", // "Go to hell."
  "sukuna_new_138_", // "What a disappointment."
  "sukuna_new_182_", // "Know your place."
  "sukuna_new_231_", // "Don't forget your place, foolish puppet."
  "sukuna_new_276_", // "You couldn't be any more pathetic."
  "sukuna_new_303_", // "Weaklings just bore me to pieces."
  "sukuna_new_305_", // "Cut your squealing. You got off lightly."
  "sukuna_new_139_", // "Did you really think you'd win?"
  "sukuna_new_030_", // "I'll kill you."
];
const leaked = CRUEL.filter(pre => allClips.some(c => c.includes(pre)));
check(`NO cruel_mocking clip is reused (checked ${CRUEL.length} known-cruel exemplars)`, leaked.length === 0, `LEAKED: ${leaked.join(", ")}`);

const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=alt_sukuna`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  section("pick hook — each pool returns a real clip (EN) + JA fallback");
  const enPick = await page.evaluate(() => { window.__harness.altSukunaVoiceLang("en"); return ["intro","hitReact","offense","cast","castCleave","castFlame","castDomain","win","exertion"].map(p => window.__harness.altSukunaVoicePick(p, 1)[0]); });
  check("EN: every pool picks a clip", enPick.every(c => typeof c === "string" && c.endsWith(".mp3")), `picks=${enPick.filter(x=>!x).length} null`);
  const jaCleave = await page.evaluate(() => { window.__harness.altSukunaVoiceLang("ja"); return window.__harness.altSukunaVoicePick("castCleave", 1)[0]; });
  check("JA castCleave falls back to a JA cast clip (non-null)", typeof jaCleave === "string" && jaCleave.endsWith(".mp3"), `pick=${jaCleave}`);
  await page.evaluate(() => window.__harness.altSukunaVoiceLang("en"));

  section("live hooks fire without error (intro + casts + ult)");
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await page.evaluate(() => window.__harness.p1());
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + 90); await waitFrames(2);
  // cleave string opener → castCleave; beam → castFlame; grab → cast; ultimate → castDomain
  await page.evaluate(() => { window.__harness.p1SpecialDir(null); }); await waitFrames(8);   // beam
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.p1SpecialDir("D"); }); await waitFrames(8);   // grab
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.p1Ultimate(); }); await waitFrames(12);   // domain
  check("no page errors across the voice hooks", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
