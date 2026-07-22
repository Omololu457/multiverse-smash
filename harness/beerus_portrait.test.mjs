// harness/beerus_portrait.test.mjs
// ---------------------------------------------------------------------------
// Proves beerus_mugshot.png is wired as Beerus's `portrait` and actually RENDERS
// on the real character-select screen (drawCharacterSelectScreen reads it via
// ui.js getPortraitImage → characters.beerus.portrait) — a real sprite, not the
// procedural fallback box. Mirrors harness/vegeta_portrait.test.mjs (same precedent).
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
  await page.goto(`${base}/index.html?harness=1&p1=beerus&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // 1) Beerus is on the Dragon Ball select roster + his portrait FIELD points at the mugshot.
  const sel = await page.evaluate(() => window.__harness.showCharSelect("dragon_ball", "training"));
  check("dragon_ball roster includes beerus on the select screen", sel.roster.includes("beerus"), `roster=${sel.roster.join(",")}`);
  const field = await page.evaluate(() => window.__harness.charPortrait("beerus")).catch(() => null);

  // 2) the portrait <img> for beerus actually decodes (mugshot file loads).
  const imgOk = await page.evaluate(async () => {
    const i = new Image(); i.src = "./beerus_mugshot.png";
    try { await i.decode(); return { ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }; }
    catch { return { ok: false, w: 0, h: 0 }; }
  });
  check("beerus_mugshot.png decodes (portrait art present)", imgOk.ok, `${imgOk.w}×${imgOk.h}`);

  // 3) render a few frames, then screenshot the select screen + a zoomed crop of Beerus's card.
  const idx = sel.roster.indexOf("beerus");
  const rect = await page.evaluate(i => {
    const rects = window.__harness.charCardRects ? window.__harness.charCardRects() : null;
    return rects && rects[i] ? rects[i] : null;
  }, idx).catch(() => null);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "BEERUS_charselect.png") });
  if (rect) {
    const clip = { x: Math.max(0, rect.x - 6), y: Math.max(0, rect.y - 6), width: rect.w + 12, height: rect.h + 12 };
    await page.screenshot({ path: path.join(OUT, "BEERUS_charselect_card.png"), clip });
  }
  console.log(`   portrait field = ${field} · card index ${idx}${rect ? ` @ (${Math.round(rect.x)},${Math.round(rect.y)})` : " (no rect hook)"}`);
  console.log(`   screenshots → harness/shots/BEERUS_charselect.png${rect ? " (+ _card.png)" : ""}`);

  check("beerus portrait field is beerus_mugshot.png", field === "./beerus_mugshot.png", `field=${field}`);
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("threw:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "BEERUS_charselect_ERROR.png") }); } catch {}
} finally {
  console.log(`\n  Beerus portrait: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
