// harness/naruto_clone_diag.mjs — DIAGNOSIS ONLY. Boot a real Naruto match, spawn a shadow clone,
// and capture (a) which render path the clone uses (MIRROR vs CLONE_BODY_SETS fallback), (b) the
// resolved sheet + on-screen size of the clone vs the real Naruto, and (c) a side-by-side screenshot.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.spawnP1Clones, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await P(() => window.__harness.boot());
  await sleep(700);   // let the match settle + the owner draw at least once (populates _lastRender)

  log("\n=== p1 identity ===");
  log(await P(() => ({ rosterKey: window.__p1?.rosterKey, skinId: window.__p1?.skinId,
    idleSheet: window.__p1?.animationData?.idle?.sheet, hasSpriteHandler: !!window.__p1?.spriteHandler,
    hasLastRender: !!window.__p1?.spriteHandler?._lastRender })).catch(() => "no __p1 global"));

  // Spawn one clone and let it settle to idle.
  const n = await P(() => window.__harness.spawnP1Clones(1));
  log("\nclones spawned:", n);
  await sleep(800);

  log("\n=== clone lifecycle state ===");
  log(JSON.stringify(await P(() => window.__harness.p1CloneStates())));

  log("\n=== resolved render sheet (owner-skin-inherited) ===");
  log(JSON.stringify(await P(() => window.__harness.cloneRenderSheets())));

  // Sample mirror-render count across ~30 frames: if it climbs while the clone is idle, the clone is
  // on the MIRROR path (pixel-identical). If it stays flat, the clone is on the CLONE_BODY_SETS fallback.
  const m0 = await P(() => window.__harness.cloneRenderMetrics());
  await sleep(500);
  const m1 = await P(() => window.__harness.cloneRenderMetrics());
  log("\n=== render metrics — owner vs clone, mirror path? ===");
  log("owner :", JSON.stringify(m0.owner));
  log("clone :", JSON.stringify(m0.clones));
  log(`mirrorRenders: ${m0.mirrorRenders} -> ${m1.mirrorRenders}  (${m1.mirrorRenders > m0.mirrorRenders ? "CLIMBING → MIRROR path IN USE" : "FLAT → FALLBACK (CLONE_BODY_SETS) path"})`);

  // Size parity: real Naruto lastDraw vs clone render size.
  const oH = m1.owner?.lastDrawH || 0, cH = (m1.clones[0]?.renderH) || 0;
  log(`size: ownerH=${oH}  cloneH=${cH}  ratio=${oH ? (cH / oH).toFixed(3) : "n/a"}`);

  // Screenshot the whole canvas (real Naruto + clone side by side).
  const canvas = await page.locator("canvas").first();
  await canvas.screenshot({ path: path.join(OUT, "NARUTO_CLONE_DIAG.png") });
  log("\nscreenshot → harness/shots/NARUTO_CLONE_DIAG.png");

  log("\njsErrors:", jsErrors.length ? jsErrors.join(" | ") : "none");
} catch (e) {
  log("DIAG CRASH:", String(e && e.stack || e));
} finally {
  await browser.close(); server.close();
}
