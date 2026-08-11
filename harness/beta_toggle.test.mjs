// harness/beta_toggle.test.mjs — "BETA" sprite-gated unlock code, REVERSIBLE TOGGLE.
// Extends the existing beta_code system (progression.js). Proves the literal code "BETA":
//   (1) LOCKS every non-sprited character on character-select (roster filtered to hasSprites+animData),
//   (2) UNLOCKS every skin for the sprited characters (isSkinUnlocked → true under beta),
//   (3) is an EASILY REVERSIBLE toggle — entering "BETA" again turns it back off, AND a separate
//       clearBeta() action also turns it off,
//   (4) leaves DEV unlock untouched, and the legacy "GojoV1" alias still drives the same beta unlock.
// Also captures BEFORE/AFTER screenshots of the REAL character-select screen (dragon_ball: a mix of
// sprited goku/goku_black/vegeta/beerus + non-sprited piccolo/frieza/cell).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const sortJoin = a => [...a].sort().join(",");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const applyCode = c => page.evaluate(c => window.__harness.applyCode(c), c);
const clearBeta = () => page.evaluate(() => window.__harness.clearBeta());
const menu = () => page.evaluate(() => window.__harness.menuRoster());
const sets = () => page.evaluate(() => window.__harness.rosterSets());
const skin = (k, s) => page.evaluate(([k, s]) => window.__harness.skinUnlocked(k, s), [k, s]);
const charSelect = (u = "dragon_ball") => page.evaluate(u => window.__harness.showCharSelect(u, "training"), u);
async function load() { await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness); await page.waitForTimeout(80); }

try {
  await load();
  const gt = await sets();

  // ── BEFORE: full mixed roster ──
  section("BEFORE — no code: full mixed roster (sprited + non-sprited)");
  let m = await menu();
  check("no unlock flags set", m.beta === false && m.dev === false);
  check("full roster selectable (unfiltered)", sortJoin(m.selectable) === sortJoin(gt.all), `n=${m.selectable.length}`);
  const before = await charSelect("dragon_ball");
  await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, "beta_charselect_BEFORE.png") });
  check("dragon_ball shows the FULL mix (sprited + non-sprited)", ["goku", "goku_black", "vegeta", "beerus", "piccolo", "frieza", "cell"].every(k => before.roster.includes(k)), `roster=${before.roster.join(",")}`);
  // Level-gated fixture repointed gojo2 → sukuna3 (lvl8) after all Gojo alt skins were deleted 2026-07-30.
  const gatedBefore = await skin("sukuna", "sukuna3");
  check("level-gated skin sukuna3 LOCKED before BETA (makes the unlock check meaningful)", gatedBefore === false);

  // ── ENTER "BETA" → ON ──
  section('ENTER "BETA" → sprited-only roster + all skins unlocked');
  const on = await applyCode("BETA");
  check('applyCode("BETA") accepted, beta ON, dev untouched', on.result === "beta" && on.beta === true && on.dev === false, `result=${on.result} beta=${on.beta} dev=${on.dev}`);
  m = await menu();
  check("(1) selectable roster == live sprite set (non-sprited LOCKED OUT)", sortJoin(m.selectable) === sortJoin(gt.sprite), `n=${m.selectable.length}`);
  // MK-feel Stage 5: goku sprite-flag-removed → drops off the beta sprite roster (moved to the "not selectable" list).
  for (const gone of ["piccolo", "frieza", "cell", "tanjiro", "morty", "goku"]) check(`   '${gone}' (no sprites) NOT selectable`, !m.selectable.includes(gone));
  for (const has of ["goku_black", "vegeta", "beerus", "gojo", "naruto"]) check(`   '${has}' (has sprites) IS selectable`, m.selectable.includes(has));
  check("(2) all skins unlocked under BETA (sukuna3 now OPEN)", (await skin("sukuna", "sukuna3")) === true);
  const after = await charSelect("dragon_ball");
  await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, "beta_charselect_AFTER.png") });
  check("dragon_ball now shows ONLY sprited chars (goku dropped in Stage 5)", sortJoin(after.roster) === sortJoin(["goku_black", "vegeta", "beerus"]), `roster=${after.roster.join(",")}`);

  // ── ENTER "BETA" AGAIN → OFF (reversible toggle) ──
  section('ENTER "BETA" AGAIN → toggles back OFF (fully reversible)');
  const off = await applyCode("BETA");
  check('re-entering "BETA" turns beta OFF', off.result === "beta" && off.beta === false, `beta=${off.beta}`);
  m = await menu();
  check("(3a) full roster restored after toggle-off", sortJoin(m.selectable) === sortJoin(gt.all), `n=${m.selectable.length}`);
  check("(3a) skins re-locked after toggle-off (sukuna3 LOCKED again)", (await skin("sukuna", "sukuna3")) === false);

  // ── separate CLEAR action ──
  section("separate clearBeta() action also turns it off");
  const on2 = await applyCode("BETA");
  check("BETA back ON", on2.beta === true);
  const cleared = await clearBeta();
  check("(3b) clearBeta() turns beta OFF", cleared.beta === false && cleared.dev === false, `beta=${cleared.beta}`);
  check("full roster restored after clearBeta()", sortJoin((await menu()).selectable) === sortJoin(gt.all));

  // ── legacy alias + dev independence ──
  section("legacy 'GojoV1' alias + DEV independence");
  const alias = await applyCode("GojoV1");
  check("legacy 'GojoV1' alias still drives the same beta unlock", alias.result === "beta" && alias.beta === true);
  await clearBeta();
  await load();   // fresh page → all flags reset
  const dev = await applyCode("Omololu");
  check("DEV code unaffected: dev ON, beta OFF, roster UNFILTERED", dev.dev === true && dev.beta === false && sortJoin((await menu()).selectable) === sortJoin(gt.all), `dev=${dev.dev} beta=${dev.beta}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} BETA toggle: ${PASS} passed, ${FAIL} failed — shots: beta_charselect_BEFORE/AFTER.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
