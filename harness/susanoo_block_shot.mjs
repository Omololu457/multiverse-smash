// harness/susanoo_block_shot.mjs — Sasuke SUSANOO block-animation verification.
// Enters Susanoo (Stage 1), then proves the guard state responds to REAL block input:
//   • NOT blocking → idle,
//   • holding block (Down) → a DISTINCT, STATIC guard pose (real frame from the Susanoo sheet),
//     NOT the calm idle loop replaying regardless of input,
//   • releasing block → reverts to idle (guard not stuck on).
// Screenshots harness/shots/susanoo_notblocking.png + susanoo_blocking.png. Run ALONE.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ["--disable-background-timer-throttling", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`  ${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { timeout: 20000, polling: 16 }); }
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
// resolved sprite action + current frame index, sampled over a window
async function sample(frames = 10) { const acts = new Set(), fis = new Set(); for (let i = 0; i < frames; i++) { const p = await p1(); acts.add(p.action); fis.add(p.frameIndex); await wf(3); } return { acts: [...acts], fis: [...fis] }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot()); await wf(5);
  await page.evaluate(() => window.__harness.fillEnergy?.());

  // Enter Susanoo Stage 1 (press ultimate like a player; wait for the entry cinematic to end).
  await page.keyboard.down("u"); await wf(3); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.p1().susanooStage >= 1 && !(window.__harness.sasukeCine?.().active), null, { timeout: 12000, polling: 16 }).catch(() => {});
  await wf(20);
  const inS = await p1();
  check("entered Susanoo (stage ≥ 1)", (inS.susanooStage || 0) >= 1, `stage=${inS.susanooStage}`);

  // ── NOT blocking → idle ──
  console.log("── Susanoo NOT blocking ──");
  const nb = await sample(8);
  check("not blocking → action is idle (no guard pose stuck on)", nb.acts.length === 1 && nb.acts[0] === "idle", `actions=[${nb.acts.join(",")}]`);
  await shot("susanoo_notblocking.png");

  // ── Blocking (hold the dedicated guard key ';' — MK-feel Stage 1c moved block off Down) → static guard pose ──
  console.log("── Susanoo BLOCKING (hold ';' guard) ──");
  await page.keyboard.down(";"); await wf(6);
  const bl = await sample(10);
  check("blocking → resolves to the GUARD action (distinct from idle)", bl.acts.length === 1 && bl.acts[0] === "guard", `actions=[${bl.acts.join(",")}]`);
  check("guard pose is STATIC (single held frame — not a looping overlay)", bl.fis.length === 1, `frameIndex seen=[${bl.fis.join(",")}]`);
  await shot("susanoo_blocking.png");
  await page.keyboard.up(";");

  // ── Release → back to idle (guard tied to real input, not stuck) ──
  await wf(8);
  const rel = await sample(6);
  check("releasing block reverts to idle (guard responds to actual input)", rel.acts.length === 1 && rel.acts[0] === "idle", `actions=[${rel.acts.join(",")}]`);
} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════ SUSANOO BLOCK: ${pass} passed, ${fail} failed ════════`);
  process.exit(fail ? 1 : 0);
}
