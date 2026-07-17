// harness/sharingan.test.mjs
// ---------------------------------------------------------------------------
// Live verification of the Sharingan-awakening cinematic on Susanoo Lv1→Lv2:
//   (a) combat visibly FREEZES while it plays (input→movement gated, same as Kurama)
//   (b) the eye sequence steps rows 0→1→2→3 top-to-bottom
//   (c) gameplay resumes into Susanoo Level 2 immediately after it resolves
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADED = process.env.HEADED === "1";
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml", ".csv": "text/csv" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

let PASS = 0, FAIL = 0;
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`static server → ${base}`);

const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

async function waitFrames(n) {
  const s = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 });
}
async function tapKey(k, hold = 3) { await page.keyboard.down(k); await waitFrames(hold); await page.keyboard.up(k); await waitFrames(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  section("SHARINGAN CINEMATIC on Susanoo Lv1 → Lv2");

  // Stage 1
  await tapKey("u");
  await waitFrames(4);
  const s1 = await page.evaluate(() => window.__harness.p1());
  check("entered Susanoo Stage 1", s1.susanooStage === 1, `stage=${s1.susanooStage}`);
  check("cinematic NOT active yet", (await page.evaluate(() => window.__harness.sasukeCine())).active === false);
  await waitFrames(20);   // clear the Stage-1 recovery

  // record position pre-escalation for the freeze test
  const beforeX = (await page.evaluate(() => window.__harness.p1())).x;

  // Press ultimate again → should launch the cinematic (NOT instantly escalate)
  await tapKey("u");
  await waitFrames(3);
  const cine1 = await page.evaluate(() => window.__harness.sasukeCine());
  const midStage = (await page.evaluate(() => window.__harness.p1())).susanooStage;
  check("2nd ultimate press LAUNCHES the cinematic", cine1.active === true, `active=${cine1.active} phase=${cine1.phase}`);
  check("escalation NOT applied yet (still Stage 1 during cinematic)", midStage === 1, `stage=${midStage}`);
  await page.screenshot({ path: path.join(OUT, "S_cine_flash.png") });

  // (a) FREEZE: hold RIGHT during the cinematic — x must NOT change (movement gated)
  await page.keyboard.down("d");
  await waitFrames(10);
  const duringX = (await page.evaluate(() => window.__harness.p1())).x;
  check("combat FROZEN — holding right doesn't move Sasuke during the cinematic", Math.abs(duringX - beforeX) < 1.0, `x ${beforeX.toFixed(0)} → ${duringX.toFixed(0)}`);
  await page.keyboard.up("d");

  // (b) EYE SEQUENCE order: sample the row index across the sequence; must be 0→1→2→3 nondecreasing, all four seen.
  const rows = [];
  let shotSharingan = false;
  for (let i = 0; i < 60; i++) {
    const c = await page.evaluate(() => window.__harness.sasukeCine());
    if (c.active && c.phase === "eyes" && c.row != null) rows.push(c.row);
    if (c.active && c.row === 2 && !shotSharingan) { shotSharingan = true; await page.screenshot({ path: path.join(OUT, "S_cine_sharingan.png") }); }
    if (!c.active) break;
    await waitFrames(2);
  }
  const seen = [...new Set(rows)];
  const nonDecreasing = rows.every((r, i) => i === 0 || r >= rows[i - 1]);
  check("eye rows step in TOP-TO-BOTTOM order (0→1→2→3, non-decreasing)", nonDecreasing, `seq=${JSON.stringify(rows)}`);
  check("all four eye states appear (0,1,2,3)", [0, 1, 2, 3].every(r => seen.includes(r)), `seen=${JSON.stringify(seen)}`);
  await page.screenshot({ path: path.join(OUT, "S_cine_eyes.png") });

  // (c) RESUME into Lv2: wait for the cinematic to end, then confirm escalation landed
  await page.waitForFunction(() => window.__harness.sasukeCine().active === false, null, { timeout: 8000, polling: 16 });
  await waitFrames(3);
  const after = await page.evaluate(() => window.__harness.p1());
  check("cinematic ended", (await page.evaluate(() => window.__harness.sasukeCine())).active === false);
  check("escalated to Susanoo Stage 2 after the cinematic", after.susanooStage === 2, `stage=${after.susanooStage}`);
  check("Stage 2 giant sizing applied (frac 1.20)", after.canvasHeightFrac === 1.20, `frac=${after.canvasHeightFrac}`);
  check("Stage 2 drained energy to ~0", after.energy < 2, `energy=${after.energy.toFixed(2)}`);

  // combat resumes: movement works again
  const rx0 = after.x;
  await page.keyboard.down("d"); await waitFrames(12); await page.keyboard.up("d");
  const rx1 = (await page.evaluate(() => window.__harness.p1())).x;
  check("combat RESUMED — Sasuke can move again after the cinematic", Math.abs(rx1 - rx0) > 2 || after.arenaHalfLock === "left", `x ${rx0.toFixed(0)} → ${rx1.toFixed(0)}`);
  await page.screenshot({ path: path.join(OUT, "S_after_lv2.png") });

  section("page errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "S_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
