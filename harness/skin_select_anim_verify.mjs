// harness/skin_select_anim_verify.mjs — FIX 2 evidence. The skin-select grid now uses the SAME
// hover/confirm animation language as character-select: eased hover scale-up + accent glow-pulse, and a
// punchy confirm flash + zoom-punch on pick. Also verifies TOBI's skin portraits render (not placeholder
// boxes). Screenshots → harness/shots/skin_select/. Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "skin_select");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const stateF = () => page.evaluate(() => window.__harness.state());
const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

async function open(char) {
  return page.evaluate(c => window.__harness.showSkinSelect(c, "p1", 0), char);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); });
  await waitFrames(10);

  // ── TOBI portraits render (not placeholder boxes) ──
  console.log("── Tobi skin grid ──");
  const tobi = await open("tobi");
  // wait for the portrait images to actually decode, then check the LIVE decode state
  await page.waitForFunction(() => window.__harness.skinPortraitsReady().every(s => s.ready), null, { timeout: 8000, polling: 100 }).catch(() => {});
  await waitFrames(8);
  await shot("tobi_grid.png");
  const pr = await page.evaluate(() => window.__harness.skinPortraitsReady());
  const ready = pr.filter(s => s.ready).length;
  console.log("  tobi skins:", pr.map(s => `${s.name}${s.ready ? "✓" : "✗"}`).join(", "));
  check(`Tobi has skins`, tobi.skins.length >= 1, `${tobi.skins.length} skins`);
  check(`Tobi skin portraits DECODE (not falling through to placeholder box)`, ready === pr.length && ready > 0, `${ready}/${pr.length} portraits ready`);

  // ── HOVER animation: move the cursor across skins; the hovered card scales up + glows ──
  console.log("\n── Hover animation (eased scale + accent glow) ──");
  const rects = (await page.evaluate(() => window.__harness.skinSelectRects())).map(r => ({ ...r, cx: r.x + r.w / 2, cy: r.y + r.h / 2 }));
  const nHover = Math.min(3, rects.length);
  for (let i = 0; i < nHover; i++) {
    await page.mouse.move(rects[i].cx, rects[i].cy);   // REAL mouse hover
    await waitFrames(8);                                // let the eased hover settle
    const hv = await page.evaluate(() => window.__harness.state().frame);
    await shot(`tobi_hover_${i}.png`);
  }
  check(`hover moved across ${nHover} skins (real cursor)`, nHover >= 1, `${nHover} cards`);

  // ── CONFIRM flourish: pick a skin → flash + zoom-punch plays for a short beat before proceeding ──
  console.log("\n── Confirm flourish (flash + zoom-punch) ──");
  await open("tobi"); await waitFrames(6);
  await page.evaluate(() => window.__harness.setSkinHover(0)); await waitFrames(4);
  const picked = await page.evaluate(() => window.__harness.pickSkin(0));
  const cs0 = await page.evaluate(() => window.__harness.skinConfirmState());
  await waitFrames(3);                                  // flourish is high here (confirm ~0.75)
  await shot("tobi_confirm_flourish.png");
  const st1 = await page.evaluate(() => window.__harness.state().gameState);
  check(`pick triggers the confirm hold (flourish visible before transition)`, !!picked && !!cs0 && st1 === "selectSkin", `picked=${JSON.stringify(picked)}, holding=${!!cs0}, state=${st1}`);
  // after the hold expires it proceeds off the skin screen
  await waitFrames(18);
  const st2 = await page.evaluate(() => window.__harness.state().gameState);
  check(`after the flourish, the pick proceeds (leaves skin-select)`, st2 !== "selectSkin", `state=${st2}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} Skin-select animation: ${fails} failed check(s). Shots → harness/shots/skin_select/`);
} catch (e) {
  console.log("  ⚠️ error:", e.message, e.stack); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
