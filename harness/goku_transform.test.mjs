// harness/goku_transform.test.mjs
// Goku's transformation ladder ALIGNED to the Vegeta / Goku Black / Frieza model (2026-08-22):
// CHARGE-triggered, threshold-gated, NO up-front cost, continuous Ki DRAIN, instant auto-revert at 0.
// Replaces the old ultimate-button / 100-energy-spend entry. Goku is procedural (hasSprites:false) → the
// transformed state shows via drawGokuFormAura (verified: renders without error while a box).
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
const p1 = () => page.evaluate(() => window.__harness.p1());
const form = () => page.evaluate(() => window.__harness.p1GokuForm());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const setKi = (v) => page.evaluate(x => window.__harness.p1GokuSetEnergy(x), v);
const step  = () => page.evaluate(() => window.__harness.p1GokuStepForm());
const revert = () => page.evaluate(() => window.__harness.p1GokuRevert());
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1GokuRevert?.(); }); await setKi(200); await waitFrames(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── wiring: 6-form ladder, drain + revert-on-empty like the DB pack ──");
  const cd = await page.evaluate(() => window.__harness.charDef("goku"));
  check("P1 is Goku (procedural box: hasSprites false)", (await p1()).key === "goku" && cd.hasSprites === false, `hasSprites=${cd.hasSprites}`);
  check("transformationOrder = base→ssj1→ssj2→ssj3→ssblue→ultraInstinct", JSON.stringify(cd.transformationOrder) === JSON.stringify(["base", "ssj1", "ssj2", "ssj3", "ssblue", "ultraInstinct"]), JSON.stringify(cd.transformationOrder));
  check("every form drains Ki + reverts on empty", ["ssj1", "ssj2", "ssj3", "ssblue", "ultraInstinct"].every(k => cd.transformations[k].energyDrainPerFrame > 0 && cd.transformations[k].revertOnEmpty === true), "");
  check("drains ESCALATE by tier (ssj1 < ssj3 < UI) — Goku-specific, not flat", cd.transformations.ssj1.energyDrainPerFrame < cd.transformations.ssj3.energyDrainPerFrame && cd.transformations.ssj3.energyDrainPerFrame < cd.transformations.ultraInstinct.energyDrainPerFrame, `${cd.transformations.ssj1.energyDrainPerFrame}/${cd.transformations.ssj3.energyDrainPerFrame}/${cd.transformations.ultraInstinct.energyDrainPerFrame}`);
  check("thresholds ESCALATE (SSJ 40 … UI 185)", cd.transformations.ssj1.energyThreshold === 40 && cd.transformations.ultraInstinct.energyThreshold === 185, `ssj1=${cd.transformations.ssj1.energyThreshold} UI=${cd.transformations.ultraInstinct.energyThreshold}`);

  console.log("\n── base → SSJ: charge-release, threshold-gated, NO up-front cost, all-around boost ──");
  await reset();
  const ki0 = (await form()).energy;
  const ok = await step();
  const f1 = await form();
  check("charge-release enters SSJ (idx 1)", ok && f1.idx === 1, `idx=${f1.idx} ok=${ok}`);
  check("NO up-front energy cost (only per-frame drain)", ki0 - f1.energy < 5, `ki ${ki0}→${f1.energy.toFixed(0)} Δ=${(ki0 - f1.energy).toFixed(1)}`);
  check("SSJ boosts dmg ×1.2 / spd ×1.1 / def ×1.05", Math.abs(f1.dmg - 1.2) < 0.02 && Math.abs(f1.spd - 1.1) < 0.02 && Math.abs(f1.def - 1.05) < 0.02, `dmg=${f1.dmg} spd=${f1.spd} def=${f1.def}`);

  console.log("\n── step UP the ladder → each tier's own multipliers (Goku-specific, escalating) ──");
  const tiers = [[2, 1.3, 1.15, 1.1], [3, 1.5, 1.2, 1.05], [4, 2, 1.4, 1.2], [5, 2.5, 2, 1.5]];
  for (const [idx, dmg, spd, def] of tiers) { await setKi(200); await step(); const fx = await form();
    check(`step → tier ${idx}: dmg ×${dmg} / spd ×${spd} / def ×${def}`, fx.idx === idx && Math.abs(fx.dmg - dmg) < 0.02 && Math.abs(fx.spd - spd) < 0.02 && Math.abs(fx.def - def) < 0.02, `idx=${fx.idx} dmg=${fx.dmg} spd=${fx.spd} def=${fx.def}`); }
  check("Ultra Instinct (tier 5) grants autoDodge", (await form()).autoDodge === true, `autoDodge=${(await form()).autoDodge}`);
  check("cannot step past the top (Ultra Instinct)", (await step()) === false && (await form()).idx === 5, "");

  console.log("\n── threshold gate: not enough Ki blocks the step ──");
  await reset(); await setKi(30);   // below ssj1's 40
  const gated = await step();
  check("Ki below threshold → step rejected (stays base)", gated === false && (await form()).idx === 0, `ok=${gated} idx=${(await form()).idx}`);

  console.log("\n── DRAIN over time + AUTO-REVERT at 0 Ki ──");
  await reset(); await step();   // SSJ
  const d0 = (await form()).energy; await waitFrames(30); const d1 = (await form()).energy;
  check(`transformed drains Ki over time (${d0.toFixed(0)}→${d1.toFixed(0)})`, d1 < d0, `Δ=${(d0 - d1).toFixed(1)}`);
  await setKi(0); await waitFrames(3);
  const rev = await form();
  check("Ki-empty auto-reverts to base (buffs cleared)", rev.idx === 0 && Math.abs(rev.dmg - 1) < 0.01 && rev.form === "base", `idx=${rev.idx} dmg=${rev.dmg} form=${rev.form}`);

  console.log("\n── charge-TAP reverts to base ──");
  await reset(); await step(); await setKi(200); await step();   // up to SSJ2
  await revert(); await waitFrames(2);
  const tr = await form();
  check("tap reverts to base (dmg/spd/def cleared)", tr.idx === 0 && Math.abs(tr.dmg - 1) < 0.01 && Math.abs(tr.spd - 1) < 0.01 && Math.abs(tr.def - 1) < 0.01, `idx=${tr.idx} dmg=${tr.dmg}`);

  console.log("\n── OLD ultimate-button binding is GONE (no longer transforms) ──");
  await reset();
  await page.evaluate(() => window.__harness.p1Ultimate?.());
  await waitFrames(3);
  const uf = await form();
  check("Ultimate button no longer transforms Goku (input freed)", uf.idx === 0 && uf.form === "base", `idx=${uf.idx} form=${uf.form}`);

  console.log("\n── procedural aura renders without error (box indicator) ──");
  await reset(); await step(); await waitFrames(4);
  check("in-form render produces no JS errors (drawGokuFormAura ok on the box)", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors across the transform ladder", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
