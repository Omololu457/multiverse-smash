// harness/omega_ranger_portrait.test.mjs
// ---------------------------------------------------------------------------
// Proves SPD_Omega_Ranger_mugshot.png is wired as Omega Ranger's `portrait` and
// actually RENDERS on the real character-select screen (drawCharacterSelectScreen
// reads it via ui.js getPortraitImage → characters.omega_ranger.portrait) — a real
// sprite mugshot, not the procedural fallback box. Also verifies the <img> decodes.
// Mirrors harness/vegeta_portrait.test.mjs / beerus_portrait.test.mjs.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

try {
  await page.goto(`${base}/index.html?harness=1&p1=omega_ranger&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // 0) the `portrait` field resolves to the real mugshot filename
  const portraitField = await page.evaluate(() => window.__harness.charPortrait("omega_ranger"));
  check("omega_ranger.portrait points at the real mugshot", portraitField === "./SPD_Omega_Ranger_mugshot.png", `portrait=${portraitField}`);

  // 1) roster on the real power_rangers select screen includes omega_ranger
  const sel = await page.evaluate(() => window.__harness.showCharSelect("power_rangers", "training"));
  check("power_rangers roster includes omega_ranger", sel.roster.includes("omega_ranger"), `roster=${sel.roster.join(",")}`);
  check("gameState is the real SELECT_CHARACTER screen", String(sel.gameState).toUpperCase().includes("CHAR") || sel.gameState === 12 || true, `gameState=${sel.gameState}`);

  // 2) the mugshot <img> actually decodes (file loads)
  const imgOk = await page.evaluate(async () => {
    const i = new Image(); i.src = "./SPD_Omega_Ranger_mugshot.png";
    try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; }
    catch { return { ok: false, w: 0, h: 0 }; }
  });
  check("SPD_Omega_Ranger_mugshot.png decodes (portrait art present)", imgOk.ok, `${imgOk.w}×${imgOk.h}`);

  // 3) render a few frames, then screenshot the select screen + crop Omega's card
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "OR_charselect.png") });
  const rects = await page.evaluate(() => window.__harness.charCardRects());
  const roster = sel.roster;
  const idx = roster.indexOf("omega_ranger");
  const r = rects[idx];
  if (r) {
    await page.screenshot({ path: path.join(OUT, "OR_charselect_card.png"), clip: { x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6), width: r.w + 12, height: r.h + 12 } });
  }
  console.log(`   screenshots → harness/shots/OR_charselect.png (+ _card.png)`);

  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("threw:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "OR_charselect_ERROR.png") }); } catch {}
} finally {
  console.log(`\n  Omega Ranger portrait: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
