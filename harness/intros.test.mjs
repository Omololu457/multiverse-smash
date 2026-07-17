// harness/intros.test.mjs
// ---------------------------------------------------------------------------
// Intro-rotation coverage: confirm the two POOLED Sasuke intros now render from
// the RE-SLICED uniform sheets (sasuke_intro_{2,3}_anim.png), step through all 6
// poses, and hold a clean final stance (no torn frames). Captures screenshots of
// the tricky wide cloak-throw pose + the held final pose for visual confirmation.
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
const missing = [];
page.on("response", r => { if (r.status() === 404) missing.push(r.url().replace(base, "")); });

async function waitFrames(n) {
  const s = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 });
}

const VARIANTS = [
  { variant: "introAkatsuki", sheet: "./sasuke_intro_2_anim.png", frames: 6, tag: "akatsuki" },
  { variant: "introCloakAlt", sheet: "./sasuke_intro_3_anim.png", frames: 6, tag: "cloakalt" }
];

try {
  await page.goto(`${base}/index.html?harness=1&p1=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(3);

  for (const V of VARIANTS) {
    section(`INTRO: ${V.variant}`);
    await page.evaluate(v => window.__harness.forceIntro(v), V.variant);
    await waitFrames(3);   // let draw() resolve the intro action + load the sheet
    const s = await page.evaluate(() => window.__harness.p1());
    check("intro variant applied", s.introVariant === V.variant, `variant=${s.introVariant}`);
    check("renders from the RE-SLICED anim sheet", s.spriteSheet === V.sheet, `sheet=${s.spriteSheet}`);
    check("6 uniform frames declared", s.spriteFrames === V.frames, `frames=${s.spriteFrames}`);
    check("state is INTRO (playing)", (await page.evaluate(() => window.__harness.state())).gameState === "intro");

    // Step through the sequence, tracking the frame index across all 6 poses.
    const seenFrames = new Set();
    let wideShot = false;
    for (let i = 0; i < 30; i++) {
      const fi = await page.evaluate(() => window.__harness.p1().frameIndex);
      if (fi != null) seenFrames.add(fi);
      // pose 4 (index 4) is the wide cloak-throw — screenshot it
      if (fi === 4 && !wideShot) { wideShot = true; await page.screenshot({ path: path.join(OUT, `INTRO_${V.tag}_cloakthrow.png`) }); }
      await waitFrames(2);
    }
    check("stepped through multiple poses (≥5 of 6 frames seen)", seenFrames.size >= 5, `frames seen=${[...seenFrames].sort((a, b) => a - b).join(",")}`);
    check("captured the wide cloak-throw pose (frame 4)", wideShot);

    // Hold: after the sequence, frame index locks on the last pose (lockLastFrame)
    await waitFrames(20);
    const held = await page.evaluate(() => window.__harness.p1());
    check("holds the final pose (frame index at last = 5)", held.frameIndex === V.frames - 1, `frameIndex=${held.frameIndex}`);
    await page.screenshot({ path: path.join(OUT, `INTRO_${V.tag}_final.png`) });
  }

  section("asset load / errors");
  const introMissing = [...new Set(missing)].filter(u => /intro.*_anim\.png/.test(u));
  check("no 404 on the re-sliced intro sheets", introMissing.length === 0, introMissing.join(", "));
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));

} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "INTRO_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
