// harness/tobirama_edo_stepB.mjs — Stage 6 Step B: pre-match Edo Tensei vessel-select UI.
// Drives the REAL flow: char-select → click Tobirama → detour to SELECT_EDO_BACKUP → pick a
// vessel → it's stored in matchConfig + stamped on the fighter at match start.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const clickCenter = r => page.mouse.click(Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2));

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // 1) open the naruto character-select
  const sel = await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
  check("char-select shows Tobirama", sel.roster.includes("tobirama"), `roster=${sel.roster.join(",")}`);
  await page.waitForTimeout(150);

  // 2) click Tobirama → should DETOUR to the vessel-select
  const tobIdx = sel.roster.indexOf("tobirama");
  const cardRects = await page.evaluate(() => window.__harness.charCardRects());
  await clickCenter(cardRects[tobIdx]);
  await page.waitForTimeout(150);
  let st = await page.evaluate(() => window.__harness.edoBackup.state());
  check("selecting Tobirama detours to SELECT_EDO_BACKUP", st.gameState === st.selectState, `state=${st.gameState}`);
  check("vessel roster excludes Tobirama", !st.roster.includes("tobirama"), `roster=${st.roster.join(",")}`);
  check("vessel roster = built (sprite) chars", st.roster.length >= 5 && st.roster.includes("naruto"), `n=${st.roster.length}`);
  await page.screenshot({ path: path.join(OUT, "tobirama_edo_vesselselect.png") });

  // 3) pick a vessel (Sasuke) → stored + advances to skin-select
  const vIdx = st.roster.indexOf("sasuke");
  const vRects = await page.evaluate(() => window.__harness.edoBackup.cardRects());
  await clickCenter(vRects[vIdx]);
  await page.waitForTimeout(150);
  st = await page.evaluate(() => window.__harness.edoBackup.state());
  check("vessel choice stored (p1EdoBackup=sasuke)", st.p1Backup === "sasuke", `p1Backup=${st.p1Backup}`);
  check("advanced past vessel-select (→ skin)", st.gameState !== st.selectState, `state=${st.gameState}`);

  // 4) the choice survives into the live fighter at match start (preserving UI selections)
  const started = await page.evaluate(() => window.__harness.edoBackup.startPreserving());
  check("fighter is Tobirama with _edoBackup=sasuke", started.p1 === "tobirama" && started.edo === "sasuke", `p1=${started.p1} edo=${started.edo}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Step B (vessel-select): ${PASS} passed, ${FAIL} failed — shot: tobirama_edo_vesselselect.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
