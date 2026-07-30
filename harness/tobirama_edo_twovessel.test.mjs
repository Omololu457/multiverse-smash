// harness/tobirama_edo_twovessel.test.mjs — REGRESSION TEST for the Edo Tensei "two-vessel" duplicate-render
// bug (duplicate-render sweep, 2026-07-29). The body-swap fires at cinematic frame IN.SWAP=144 (the real
// fighter becomes the vessel at casterSX) while the cinematic's own vessel OVERLAY keeps drawing at
// coffinX = casterSX + face*0.16*cw until IN.CLOSE=176 → a ~32-frame window that USED to show TWO copies of
// the vessel. Fix (tobiramaEdoTenseiCinematic._updateIn): hide the real body (_kuramaHide) for [SWAP, CLOSE).
// The canonical edotensei test uses skipCine() so it never renders this window — this drives the REAL
// cinematic (no skip) and asserts: in-window the swapped body is HIDDEN, post-close it is VISIBLE again.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const cine = () => page.evaluate(() => window.__harness.edoBackup.cine());
const p1 = () => page.evaluate(() => window.__harness.p1());

await page.goto(`${base}/index.html?harness=1&p1=tobirama&p2=gon`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness && !!window.__harness.edoBackup, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await page.waitForFunction(() => window.__harness.state().frame > 6, null, { timeout: 8000, polling: 16 });
// vessel = a visually distinct character so two copies are unmistakable
await page.evaluate(() => { window.__harness.edoBackup.setBackup("sasuke"); window.__harness.setP1Energy(200); window.__harness.resetUlt(); window.__harness.healP1(); });
async function waitFrames(n) { const s = (await page.evaluate(() => window.__harness.state().frame)); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
await page.keyboard.down("u"); await waitFrames(4); await page.keyboard.up("u");
await page.waitForFunction(() => window.__harness.edoBackup.cine().active, null, { timeout: 8000, polling: 16 }).catch(() => {});

// Deterministically block until the cinematic reaches a target frame, then capture + screenshot.
// (rAF-stepping from JS skips game frames → flaky; waitForFunction is exact.)
async function captureAt(target, tag) {
  await page.waitForFunction(t => { const c = window.__harness.edoBackup.cine(); return !c.active || c.frame >= t; }, target, { timeout: 12000, polling: 8 }).catch(() => {});
  const c = await cine(); const f = await p1();
  await page.screenshot({ path: path.join(OUT, `DUP_edo_${tag}_crop.png`), clip: { x: 0, y: 300, width: 1280, height: 260 } });
  console.log(`  [${tag}] cineActive=${c.active} cineFrame=${c.frame} | real fighter edoActive=${f.edoActive} kuramaHide=${f.kuramaHide}`);
  return { c, f };
}
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { ok ? pass++ : fail++; console.log(`  ${ok ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
console.log("── EDO TENSEI two-vessel regression (expect NO two-copy window) ──");
// (1) INSIDE the old double window (144..176): real fighter swapped to the vessel BUT its body must be HIDDEN
//     (kuramaHide) so the coffin overlay is the ONLY vessel drawn — no second copy.
const a = await captureAt(160, "inwindow");
check("in-window: real fighter swapped to vessel", a.c.active && a.f.edoActive, `cineF=${a.c.frame} edoActive=${a.f.edoActive}`);
check("in-window: real body HIDDEN (no 2nd vessel next to the coffin overlay)", a.f.kuramaHide === true, `kuramaHide=${a.f.kuramaHide}`);
// (2) AFTER close (>=176): overlay stopped → the real vessel must be VISIBLE again (never left invisible).
const b = await captureAt(188, "postclose");
check("post-close: real vessel body VISIBLE again (un-hidden)", b.f.kuramaHide === false, `kuramaHide=${b.f.kuramaHide}`);
console.log(`\nEDO two-vessel: ${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
