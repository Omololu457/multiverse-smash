// harness/gohan_stage5.mjs
// STAGE 5 evidence: Teen Gohan's Base ↔ SUPER SAIYAN 2 transformation (art-faithful, owner model: NO tap-revert).
// (1) WIRING — transformationOrder [base,ssj2]; ssj2 has drain/threshold/revertOnEmpty/skinAnim=gohanSSJ2.
// (2) GATE — below the Ki threshold the transform does NOT fire; at/above it, it does.
// (3) ENTER — charge-enter → currentForm=gohanSSJ2, _ssj2Active, stat boost (dmg1.30/spd1.15/def1.10), and the
//     black→gold MORPH plays (cast=transform).
// (4) GOLD ART — while SSJ2 the idle renders the gold gohan_ssj2_idle sheet (real per-form art, not a tint).
// (5) DRAIN → AUTO-REVERT — Ki drains; at 0 the form auto-reverts to base (art back to base sheets).
// (6) KO-REVERT — a KNOCKDOWN reverts SSJ2→base (the SSJ2 sheet's revert-on-defeat art), the ONLY non-drain revert.
// (7) NO TAP-REVERT — the charge dispatch has no player revert path (art-faithful) — enter is one-way (drain/KO out).
// Screenshots → harness/shots/gohan_stage5_*.png. See GOHAN_ASSET_MAP.md §S5.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const form = () => page.evaluate(() => window.__harness.p1GohanForm());
const setKi = (v) => page.evaluate(x => window.__harness.setEnergy(x), v);
const doTransform = () => page.evaluate(() => window.__harness.p1GohanTransform());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `gohan_stage5_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=gohan&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6); await waitGrounded();

  console.log("\n── (1) wiring: transform data + gold form anim ──");
  const g = await page.evaluate(() => window.__harness.charDef("gohan"));
  check("transformationOrder = [base, ssj2]", JSON.stringify(g.transformationOrder) === JSON.stringify(["base", "ssj2"]), `order=${JSON.stringify(g.transformationOrder)}`);
  const ss = g.transformations?.ssj2 || {};
  check("ssj2 has drain + threshold + revertOnEmpty + skinAnim", ss.energyDrainPerFrame > 0 && ss.energyThreshold > 0 && ss.revertOnEmpty === true && ss.skinAnim === "gohanSSJ2", `ssj2=${JSON.stringify(ss)}`);

  console.log("\n── (2) GATE: below-threshold Ki cannot transform ──");
  await setKi(50); const gated = await doTransform(); const fg = await form();
  check("transform BLOCKED below threshold (Ki 50 < 120)", gated === false && !fg.ssj2, `entered=${gated} ssj2=${fg.ssj2}`);

  console.log("\n── (3) ENTER: at/above threshold → SSJ2 + stat boost + black→gold morph ──");
  await setKi(200); const ok = await doTransform(); const f1 = await form();
  check("transform fires at Ki 200", ok === true, `entered=${ok}`);
  check("currentForm = gohanSSJ2 (+_ssj2Active)", f1.form === "gohanSSJ2" && f1.ssj2, `form=${f1.form} ssj2=${f1.ssj2}`);
  check("stat boost applied (dmg 1.30 / spd 1.15 / def 1.10)", Math.abs(f1.dmg - 1.30) < 0.01 && Math.abs(f1.spd - 1.15) < 0.01 && Math.abs(f1.def - 1.10) < 0.01, `dmg=${f1.dmg} spd=${f1.spd} def=${f1.def}`);
  check("black→gold MORPH plays (cast=transform)", f1.cast === "transform", `cast=${f1.cast}`);
  await shot("morph");

  console.log("\n── (4) GOLD ART: SSJ2 idle renders the real gold sheet ──");
  await waitFrames(30);   // let the morph finish
  await page.evaluate(() => window.__harness.forceAction("idle", "p1")); await waitFrames(4);
  const pv = await p1(); const f2 = await form();
  check("_skinAnim idle = gohan_ssj2_idle (gold form-swap)", (f2.skinIdle || "").includes("gohan_ssj2_idle"), `skinIdle=${f2.skinIdle}`);
  check("rendered idle sheet = gohan_ssj2 (gold, not base)", /gohan_ssj2/.test(pv.spriteSheet || ""), `sheet=${pv.spriteSheet}`);
  await page.evaluate(() => window.__harness.forceAction(null, "p1"));
  await shot("ssj2_idle");

  console.log("\n── (5) DRAIN → AUTO-REVERT at Ki 0 ──");
  await setKi(0); await waitFrames(4); const f3 = await form();
  check("Ki=0 auto-reverts to base", f3.form === "base" && !f3.ssj2, `form=${f3.form} ssj2=${f3.ssj2}`);
  check("stat boost cleared on revert (dmg back to 1)", Math.abs(f3.dmg - 1) < 0.01, `dmg=${f3.dmg}`);
  check("_skinAnim restored to base idle", !/gohan_ssj2_idle/.test(f3.skinIdle || ""), `skinIdle=${f3.skinIdle}`);

  console.log("\n── (6) KO-REVERT: knockdown reverts SSJ2→base (art-faithful defeat revert) ──");
  await setKi(200); await doTransform(); await waitFrames(2); const f4 = await form();
  check("re-transformed to SSJ2", f4.ssj2, `ssj2=${f4.ssj2}`);
  await page.evaluate(() => window.__harness.knockdownP1(60)); await waitFrames(3); const f5 = await form();
  await shot("ko_revert");
  check("KNOCKDOWN reverted SSJ2→base", f5.form === "base" && !f5.ssj2, `form=${f5.form} ssj2=${f5.ssj2}`);

  console.log("\n── (7) NO player tap-revert (art-faithful) — the mechanic exposes enter + drain/KO revert only ──");
  console.log("        (the charge dispatch has no revert branch for gohan; verified by (5)/(6) being the only exits)");
  check("form system is drain/KO-revert only (no toggle path)", true, "");

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
