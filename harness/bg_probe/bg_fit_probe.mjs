// harness/bg_probe/bg_fit_probe.mjs — STAGE BACKGROUND fit/aspect probe.
// Serves a diagnostic test-pattern PNG IN PLACE OF the real JJK stage background
// (jujutsu_high_courtyard.png), boots a real battle on that stage, and screenshots — so the
// pattern renders through the EXACT production draw path (ui.drawBattleBackground → drawImage,
// world-space, under the camera transform). Reports canvas/world/camera metrics.
//   usage: node bg_fit_probe.mjs <patternPng> <vw> <vh> <outName>
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const [patternRel, vw, vh, outName] = [process.argv[2], +process.argv[3] || 1920, +process.argv[4] || 1080, process.argv[5] || "bg_probe"];
const patternAbs = path.resolve(patternRel);
const SWAP_TARGET = "jujutsu_high_courtyard.png";   // the default stage (stages[0]) background we impersonate

const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  // INTERCEPT the stage background → hand back the test pattern instead (no code/state change)
  if (u.endsWith("/" + SWAP_TARGET) || u === "/" + SWAP_TARGET) {
    const d = fs.readFileSync(patternAbs); res.writeHead(200, { "content-type": "image/png" }); res.end(d); return;
  }
  const f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (e,dd) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(dd); });
}); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: vw, height: vh } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await new Promise(r => setTimeout(r, 900));
  const shotDir = path.join(HERE, "shots"); fs.mkdirSync(shotDir, { recursive: true });
  const shotPath = path.join(shotDir, `${outName}.png`);
  await page.screenshot({ path: shotPath });
  // metrics
  const m = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    const st = window.__harness.state?.() || {};
    return { canvasW: c?.width, canvasH: c?.height, cssW: c?.clientWidth, cssH: c?.clientHeight,
             dpr: window.devicePixelRatio, stage: st.stage || st.stageName || null };
  });
  console.log(JSON.stringify({ pattern: path.basename(patternAbs), viewport: `${vw}x${vh}`, ...m, shot: path.relative(ROOT, shotPath), jsErrors: errs.length }, null, 0));
} catch (e) { console.error("PROBE ERROR:", e); }
finally { await browser.close(); server.close(); }
