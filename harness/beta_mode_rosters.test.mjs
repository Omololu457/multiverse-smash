// harness/beta_mode_rosters.test.mjs — BETA sprite-filter must cover EVERY character pool, not just the
// main character-select screen. Proves the central gate (rosterKeyAllowed) filters: Tower-Mode opponent
// pool (incl. the LIVE random picker), FFA character-select grid, AI-vs-AI spectator picker, and the
// safety fallback — and that toggling BETA off restores the full roster to all of them.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const applyCode = c => page.evaluate(c => window.__harness.applyCode(c), c);
const sets = () => page.evaluate(() => window.__harness.rosterSets());
const modes = () => page.evaluate(() => window.__harness.modeRosters());
const towerSample = (n = 300) => page.evaluate(n => window.__harness.towerSample(n), n);
async function load() { await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness); await page.waitForTimeout(80); }
const NONSPRITED = ["piccolo", "frieza", "cell", "tanjiro", "morty", "omololu", "ben10"];   // known box chars
const subset = (arr, of) => arr.every(k => of.includes(k));
const noneOf = (arr, banned) => banned.every(k => !arr.includes(k));

try {
  await load();
  const gt = await sets();
  const spriteSet = gt.sprite;
  check("ground truth: sprite roster < full roster (filter is meaningful)", gt.sprite.length > 0 && gt.all.length > gt.sprite.length + 10, `sprite=${gt.sprite.length} all=${gt.all.length}`);

  // ── BASELINE (no code): every mode pool INCLUDES non-sprited chars (proves they were unfiltered) ──
  section("baseline (no BETA) — every mode pool includes non-sprite characters");
  let m = await modes();
  check("Tower pool = full roster (includes piccolo)", m.tower.includes("piccolo") && m.tower.length === gt.all.length, `n=${m.tower.length}`);
  check("FFA grid includes non-sprite chars", m.ffa.includes("piccolo") && m.ffa.includes("tanjiro"), `n=${m.ffa.length}`);
  check("AI-vs-AI picker includes non-sprite chars", m.aiVsAi.includes("piccolo"), `n=${m.aiVsAi.length}`);

  // ── BETA ON: EVERY pool must be sprite-only ──
  section("BETA ON — every mode pool filtered to sprite-having characters");
  const on = await applyCode("BETA");
  check("BETA active", on.beta === true && on.dev === false);
  m = await modes();
  check("main select == sprite set (regression)", subset(m.mainSelect, spriteSet) && m.mainSelect.length === spriteSet.length, `n=${m.mainSelect.length}`);
  // Tower Mode — the reported bug
  check("Tower opponent POOL is sprite-only (no non-sprite)", subset(m.tower, spriteSet) && noneOf(m.tower, NONSPRITED), `n=${m.tower.length} tower=${m.tower.slice(0,50).join(",")}`);
  const sample = await towerSample(400);
  check("Tower LIVE random picker (400 draws) NEVER yields a non-sprite opponent", subset(sample, spriteSet) && noneOf(sample, NONSPRITED), `distinct=${sample.length} → ${sample.sort().join(",")}`);
  // FFA
  check("FFA character grid is sprite-only", subset(m.ffa, spriteSet) && noneOf(m.ffa, NONSPRITED), `n=${m.ffa.length}`);
  // AI-vs-AI spectator
  check("AI-vs-AI picker is sprite-only", subset(m.aiVsAi, spriteSet) && noneOf(m.aiVsAi, NONSPRITED), `n=${m.aiVsAi.length}`);
  // fallback
  check("safety fallback resolves to a sprite character", spriteSet.includes(m.fallback), `fallback=${m.fallback}`);
  // skins: the only skin-selection surface is the main select; isSkinUnlocked is global so BETA unlocks
  // skins everywhere a skin could be chosen. (Tower/FFA/AI-vs-AI have no skin-select surface.)
  const gojo2 = await page.evaluate(() => window.__harness.skinUnlocked("gojo", "gojo2"));
  check("level-gated skin (gojo2) unlocked under BETA (global — covers any mode's skin surface)", gojo2 === true);

  // screenshot the FFA character-select grid honoring the filter
  const ffaShow = await page.evaluate(() => window.__harness.showFfaCharSelect(4));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "beta_ffa_charselect.png") });
  check("FFA char-select screen renders the filtered roster", subset(ffaShow.roster, spriteSet) && noneOf(ffaShow.roster, NONSPRITED), `roster=${ffaShow.roster.join(",")}`);

  // ── BETA OFF: pools restored (reversible) ──
  section("BETA OFF — every pool restored to the full roster");
  const off = await applyCode("BETA");
  check("BETA toggled off", off.beta === false);
  m = await modes();
  check("Tower pool full again (includes piccolo)", m.tower.includes("piccolo") && m.tower.length === gt.all.length);
  check("FFA grid full again (includes non-sprite)", m.ffa.includes("piccolo"));
  check("AI-vs-AI picker full again (includes non-sprite)", m.aiVsAi.includes("piccolo"));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} BETA mode-roster coverage: ${PASS} passed, ${FAIL} failed — shot: beta_ffa_charselect.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
