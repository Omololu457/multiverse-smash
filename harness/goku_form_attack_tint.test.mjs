// harness/goku_form_attack_tint.test.mjs
// ITEM 3 (2026-09-02): Goku's transform must recolour his ATTACK art, not just locomotion. No per-form
// attack sheets exist, so a per-form canvas palette-TINT (sprite.js GOKU_FORM_TINTS, Piccolo precedent) is
// applied to attack actions ONLY, gated on transformIndex. This test reads the last-drawn sprite filter
// (harness spriteFilter() diagnostic) to prove:
//   - BASE Goku attack        → filter "none"
//   - transformed IDLE         → filter "none"  (locomotion uses real recoloured sheets — NOT double-tinted)
//   - SSJ / SSG / SSBlue attack → the matching per-form tint string
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const spriteAction = () => page.evaluate(() => window.__harness.spriteAction("p1"));
const spriteFilter = () => page.evaluate(() => window.__harness.spriteFilter("p1"));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

// exact expected tint strings (must match sprite.js GOKU_*_TINT)
const SSJ = "sepia(0.85) saturate(3.0) hue-rotate(-14deg) brightness(1.14) contrast(1.05)";
const SSG = "sepia(0.55) saturate(3.2) hue-rotate(-48deg) brightness(1.04) contrast(1.08)";
const SSB = "saturate(2.6) hue-rotate(165deg) brightness(1.10) contrast(1.05)";

// fire Dragon Fist (neutral special — an attack action in GOKU_TINTED_ACTIONS) and sample the filter mid-swing
async function dragonFistFilter() {
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); });
  await page.evaluate(() => window.__harness.p1SpecialDir(null));
  let seenAction = null, filter = "none";
  for (let i = 0; i < 20; i++) { const a = await spriteAction(); if (a === "dragonFist") { seenAction = a; filter = await spriteFilter(); break; } await waitFrames(1); }
  return { seenAction, filter };
}
async function stepForm() { await page.evaluate(() => window.__harness.p1GokuSetEnergy(200)); await waitFrames(1); const ok = await page.evaluate(() => window.__harness.p1GokuStepForm()); await waitFrames(14); return ok; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await page.evaluate(() => window.__harness.p1GokuSetEnergy(200));

  // BASE
  const b = await dragonFistFilter();
  check("base: Dragon Fist is an attack action", b.seenAction === "dragonFist", `action=${b.seenAction}`);
  check("base: attack has NO tint (filter none)", b.filter === "none", `filter=${b.filter}`);

  // SSJ
  await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
  const okSsj = await stepForm();
  const form1 = await page.evaluate(() => window.__harness.p1GokuForm());
  check("stepped to SSJ (transformIndex 1)", okSsj && form1.idx === 1, `idx=${form1.idx}`);
  await waitFrames(4);
  const idleFilter = await spriteFilter();
  check("SSJ IDLE/locomotion is NOT tinted (real recoloured sheet, no double-tint)", idleFilter === "none", `idleFilter=${idleFilter}`);
  const s1 = await dragonFistFilter();
  check("SSJ: attack IS tinted gold (GOKU_SSJ_TINT)", s1.filter === SSJ, `filter=${s1.filter}`);

  // SSG
  const okSsg = await stepForm();
  const form2 = await page.evaluate(() => window.__harness.p1GokuForm());
  check("stepped to SSG (transformIndex 2)", okSsg && form2.idx === 2, `idx=${form2.idx}`);
  const s2 = await dragonFistFilter();
  check("SSG: attack tint changes to red (GOKU_SSG_TINT)", s2.filter === SSG, `filter=${s2.filter}`);

  // SSBlue
  const okSsb = await stepForm();
  const form3 = await page.evaluate(() => window.__harness.p1GokuForm());
  check("stepped to SSBlue (transformIndex 3)", okSsb && form3.idx === 3, `idx=${form3.idx}`);
  const s3 = await dragonFistFilter();
  check("SSBlue: attack tint changes to blue (GOKU_SSBLUE_TINT)", s3.filter === SSB, `filter=${s3.filter}`);

  check("no JS errors", jsErrors.length === 0, jsErrors[0] || "");
} catch (e) { check("harness ran", false, String(e)); }

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
