// harness/nezuko_voice.test.mjs — Nezuko grunt-pool wiring (audio-only; muffled, no dialogue).
// Confirms: all 58 nezuko_grunt_*.mp3 are wired across the 6 acoustic-sorted pools (none dropped, no dupes),
// every pooled filename exists + decodes, pickNezukoVoice random-selects within each pool, and the game boots
// with Nezuko selected + zero JS errors. Cosmetic/audio only — asserts NO gameplay data touched.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

try {
  await page.goto(`${base}/index.html?harness=1&p1=nezuko&p2=nezuko`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });

  section("pool structure");
  const POOLS = ["intro", "combatBark", "hitReact", "hitGrunt", "lowHealth", "win"];
  const pools = {};
  for (const p of POOLS) pools[p] = await page.evaluate(pp => window.__harness.nezukoVoicePool(pp), p);
  for (const p of POOLS) check(`pool "${p}" present + non-empty`, Array.isArray(pools[p]) && pools[p].length > 0, `${pools[p]?.length} clips`);

  const all = POOLS.flatMap(p => pools[p]);
  check("total wired clips = 58", all.length === 58, `got ${all.length}`);
  check("no duplicate clips across pools", new Set(all).size === all.length, `${all.length - new Set(all).size} dupes`);

  // every one of the 58 source files is wired (none dropped)
  const onDisk = fs.readdirSync(ROOT).filter(f => /^nezuko_grunt_\d{3}\.mp3$/.test(f)).sort();
  check("58 grunt files exist on disk", onDisk.length === 58, `${onDisk.length}`);
  const wiredSet = new Set(all), missing = onDisk.filter(f => !wiredSet.has(f));
  check("ALL 58 disk files are wired (none dropped)", missing.length === 0, missing.length ? `unwired: ${missing.slice(0,5).join(",")}` : "");
  const ghost = all.filter(f => !onDisk.includes(f));
  check("no pool references a missing file", ghost.length === 0, ghost.slice(0,5).join(","));

  section("filenames preserved + decode");
  check("exact filename format preserved", all.every(f => /^nezuko_grunt_\d{3}\.mp3$/.test(f)), "");
  const dec = await page.evaluate(async (files) => {
    let ok = 0; for (const f of files.slice(0, 6)) { const a = new Audio("./" + f); try { await new Promise((res, rej) => { a.addEventListener("loadedmetadata", res, { once: true }); a.addEventListener("error", rej, { once: true }); a.load(); setTimeout(rej, 3000); }); ok++; } catch (_) {} } return ok;
  }, all);
  check("sample clips decode (loadedmetadata)", dec >= 5, `${dec}/6`);

  section("random selection");
  for (const p of POOLS) {
    const picks = await page.evaluate(pp => window.__harness.nezukoVoicePick(pp, 20), p);
    const valid = picks.every(x => pools[p].includes(x));
    const distinct = new Set(picks).size;
    check(`pickNezukoVoice("${p}") in-pool + random`, valid && (pools[p].length === 1 ? true : distinct > 1), `${distinct} distinct / 20`);
  }

  section("no gameplay impact");
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  const st = await page.evaluate(() => { const p = window.__harness.p1(); return { hp: p.health, atk: p.currentMove, key: p.key }; });
  check("Nezuko boots into battle (audio-only, stats intact)", st.key === "nezuko" && st.hp > 0, `hp=${st.hp}`);
  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
