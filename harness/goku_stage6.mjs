// harness/goku_stage6.mjs
// STAGE 6 evidence: Goku's per-form delta — KAIOKEN (Base-form-only stacking buff on the freed Ultimate input).
// (1) TOGGLE — Ultimate cycles Kaioken 0→1→2→0; tiers boost dmg/spd (×1.3/1.2 then ×1.55/1.4).
// (2) PERSIST — the buff survives the per-frame transformation-state re-apply (currentFormData trick).
// (3) HP-STRAIN — Kaioken drains HP over time (its cost is health, NOT Ki — distinct from the transform ladder).
// (4) BASE-ONLY — Kaioken is rejected while transformed (SSJ/SSG/SSB lack the Kaioken palette tiers), and
//     transforming CLEARS an active Kaioken.
// See GOKU_ASSET_MAP.md.
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const kai = () => page.evaluate(() => window.__harness.p1GokuKaiokenState());
const toggle = () => page.evaluate(() => window.__harness.p1GokuKaioken());
const setKi = (v) => page.evaluate(x => window.__harness.p1GokuSetEnergy(x), v);
const step = () => page.evaluate(() => window.__harness.p1GokuStepForm());
const revert = () => page.evaluate(() => window.__harness.p1GokuRevert());
async function resetK() { await page.evaluate(() => { window.__harness.p1GokuRevert?.(); }); while ((await kai()).level !== 0) await toggle(); await waitFrames(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── (1) Ultimate cycles Kaioken 0→1→2→0, tiers boost dmg/spd ──");
  await resetK();
  await toggle(); const k1 = await kai();
  check("toggle → Kaioken tier 1 (dmg ×1.3 / spd ×1.2)", k1.level === 1 && Math.abs(k1.dmg - 1.3) < 0.02 && Math.abs(k1.spd - 1.2) < 0.02, `lvl=${k1.level} dmg=${k1.dmg} spd=${k1.spd}`);
  await toggle(); const k2 = await kai();
  check("toggle → Kaioken tier 2 (dmg ×1.55 / spd ×1.4)", k2.level === 2 && Math.abs(k2.dmg - 1.55) < 0.02 && Math.abs(k2.spd - 1.4) < 0.02, `lvl=${k2.level} dmg=${k2.dmg} spd=${k2.spd}`);
  await toggle(); const k0 = await kai();
  check("toggle → Kaioken OFF (dmg back to ×1)", k0.level === 0 && Math.abs(k0.dmg - 1) < 0.02, `lvl=${k0.level} dmg=${k0.dmg}`);

  console.log("\n── (2) the buff PERSISTS across per-frame transformation-state re-apply ──");
  await resetK();
  await toggle(); await waitFrames(30); const kp = await kai();
  check("Kaioken dmg still ×1.3 after 30 frames (not stomped)", kp.level === 1 && Math.abs(kp.dmg - 1.3) < 0.02, `lvl=${kp.level} dmg=${kp.dmg}`);

  console.log("\n── (3) Kaioken STRAINS the body — HP drains over time ──");
  await resetK();
  const hp0 = (await kai()).hp;
  await toggle(); await waitFrames(40); const hp1 = (await kai()).hp;
  check(`Kaioken drains HP over time (${hp0.toFixed(0)}→${hp1.toFixed(0)})`, hp0 - hp1 > 1, `Δ=${(hp0 - hp1).toFixed(1)}`);
  await resetK();

  console.log("\n── (4) BASE-ONLY: rejected while transformed + transforming clears Kaioken ──");
  await resetK(); await setKi(200); await step();   // → SSJ
  const inForm = await kai();
  const rej = await toggle();
  const afterRej = await kai();
  check("in SSJ, Kaioken toggle is rejected (stays level 0)", inForm.idx === 1 && rej === false && afterRej.level === 0, `idx=${inForm.idx} rej=${rej} lvl=${afterRej.level}`);
  await revert(); await waitFrames(2);
  await toggle(); const preT = await kai();   // Kaioken L1 in base
  await setKi(200); await step(); const postT = await kai();   // step to SSJ
  check("transforming CLEARS an active Kaioken", preT.level === 1 && postT.idx === 1 && postT.level === 0, `pre=${preT.level} postIdx=${postT.idx} postKai=${postT.level}`);
  await revert(); await resetK();

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 6", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
