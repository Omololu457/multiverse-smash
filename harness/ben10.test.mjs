// harness/ben10.test.mjs
// BEN 10 — CANONICAL full-kit test. Ben 10 is ONE selectable fighter that transforms between
// aliens (Omnitrix). Covers: sprite gate + stats + portrait; per-form (Ben-human / XLR8 /
// Diamondhead) a 128²-fallback-box sweep across EVERY action (movement, 5 normals, command-chain
// stages, specials, ultimate poses) — proving each resolves to real art, never the box.
// Behaviour (chains/specials/ults connecting) is covered by ben10_stage2/3/4.
//   node harness/ben10.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]);
    const f = path.join(ROOT, u === "/" ? "/index.html" : u);
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const setForm = (k) => page.evaluate(key => window.__harness.benForm(key), k);

// Force an action, hold it a few real frames so its sheet decodes, crop, release.
async function poseShot(action) {
  await page.evaluate(a => window.__harness.benPose(a), action);
  await page.waitForTimeout(180);
  const r = await page.evaluate(() => {
    const c = window.__harness.spriteCrop("p1"); const i = window.__harness.renderInfo("p1");
    window.__harness.benPose(null);
    return { w: c?.contentW || 0, h: c?.contentH || 0, action: i?.action || null, sheet: c ? true : false };
  });
  return r;
}

const FORMS = [
  { key: "human", label: "Ben (human)", actions: ["idle", "walk", "run", "jump", "fall", "hurt", "light", "heavy", "up", "air", "down_air", "grab", "benJab1", "benJab2", "benHover", "transform"] },
  { key: "xlr8", label: "XLR8", actions: ["idle", "walk", "run", "jump", "fall", "hurt", "light", "heavy", "up", "air", "down_air", "grab", "xlCombo1", "xlCombo2", "xlCombo3", "xlDash", "xlRush", "xlUlt"] },
  { key: "diamondhead", label: "Diamondhead", actions: ["idle", "walk", "run", "jump", "fall", "hurt", "light", "heavy", "up", "air", "down_air", "grab", "dhSwing1", "dhSwing2", "dhShoot", "dhRising", "dhUlt"] },
];

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  // ── SPRITE GATE + STATS + PORTRAIT ──────────────────────────────────
  // Ben boots transformed into the first loadout alien, so revert to human first to check the
  // BASE (Ben-human) idle sheet that gates spritesReady.
  section("sprite gate + stats + portrait");
  await setForm("human"); await waitFrames(2);
  const g = await p1();
  check("P1 is ben10", g.key === "ben10", `key=${g.key}`);
  check("renders as sprites (spriteHandler + ready)", !!g.hasSpriteHandler && !!g.spriteReady, `handler=${g.hasSpriteHandler} ready=${g.spriteReady}`);
  check("idle sheet = ben10_idle_uniform", (g.spriteSheet || "").includes("ben10_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `scale=${g.spriteScale}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait?.("ben10"));
  check("portrait wired to ben10_portrait", (portrait || "").includes("ben10_portrait"), `portrait=${portrait}`);

  // ── PER-FORM FALLBACK-BOX SWEEP ─────────────────────────────────────
  const statLines = [];
  for (const form of FORMS) {
    section(`${form.label} — every action resolves to real art (no 128² box)`);
    const fi = await setForm(form.key);
    await waitFrames(2);
    const st = await p1();
    statLines.push(`  ${form.label.padEnd(13)} HP=${Math.round(st.maxHealth)}  hasSkinAnim=${fi.hasSkinAnim}`);
    for (const action of form.actions) {
      const r = await poseShot(action);
      // A 128² fallback box renders ~128×spriteScale (≈256px) and is square. Real cells are ≤ ~150px.
      const boxlike = r.w >= 200 || r.h >= 200;
      check(`${form.key}:${action} → real art`, r.sheet && r.w > 0 && r.h > 0 && !boxlike && r.action === action, `body=${r.w}x${r.h} action=${r.action}`);
    }
  }

  section("summary");
  check("no JS errors during sweep", jsErrors.length === 0, jsErrors[0] || "");
  console.log("  form stats:"); statLines.forEach(l => console.log(l));

} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BEN 10 CANONICAL: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}
