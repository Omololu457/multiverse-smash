// harness/goku_stage5.mjs
// STAGE 5 evidence: Goku's TRANSFORMATION SYSTEM re-scoped to the 4 real EB forms — base → Super Saiyan →
// Super Saiyan God → Super Saiyan Blue. Same charge-hold-release / threshold-gate / Ki-drain / auto-revert
// mechanic as Vegeta/Frieza, now driving a per-form SPRITE swap (fighter._skinAnim → the form's recolored
// sheets). Replaces the old numeric 6-tier box ladder. Verifies: the 3-form ladder wiring, per-tier
// multipliers, threshold gates, drain + auto-revert, tap-revert, and — the new part — that transforming
// ART-SWAPS the idle to goku_<form>_idle_uniform and reverting restores goku_base_idle_uniform.
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
const p1 = () => page.evaluate(() => window.__harness.p1());
const form = () => page.evaluate(() => window.__harness.p1GokuForm());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const setKi = (v) => page.evaluate(x => window.__harness.p1GokuSetEnergy(x), v);
const step  = () => page.evaluate(() => window.__harness.p1GokuStepForm());
const revert = () => page.evaluate(() => window.__harness.p1GokuRevert());
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1GokuRevert?.(); }); await setKi(200); await waitFrames(2); }
const idleSheet = async () => { await page.evaluate(() => window.__harness.resetFighterInput?.("p1")); await waitFrames(16); return (await p1()).spriteSheet || ""; };

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── wiring: 3-form ladder base→ssj→ssg→ssblue, drain + revert-on-empty ──");
  const cd = await page.evaluate(() => window.__harness.charDef("goku"));
  check("P1 is Goku (SPRITE: hasSprites true)", (await p1()).key === "goku" && cd.hasSprites === true, `hasSprites=${cd.hasSprites}`);
  check("transformationOrder = base→ssj→ssg→ssblue", JSON.stringify(cd.transformationOrder) === JSON.stringify(["base", "ssj", "ssg", "ssblue"]), JSON.stringify(cd.transformationOrder));
  check("no legacy tiers (ssj1/ssj2/ssj3/ultraInstinct removed)", !cd.transformations.ssj1 && !cd.transformations.ssj2 && !cd.transformations.ultraInstinct, Object.keys(cd.transformations).join(","));
  check("every form drains Ki + reverts on empty", ["ssj", "ssg", "ssblue"].every(k => cd.transformations[k].energyDrainPerFrame > 0 && cd.transformations[k].revertOnEmpty === true), "");
  check("drains ESCALATE (ssj < ssg < ssblue)", cd.transformations.ssj.energyDrainPerFrame < cd.transformations.ssg.energyDrainPerFrame && cd.transformations.ssg.energyDrainPerFrame < cd.transformations.ssblue.energyDrainPerFrame, `${cd.transformations.ssj.energyDrainPerFrame}/${cd.transformations.ssg.energyDrainPerFrame}/${cd.transformations.ssblue.energyDrainPerFrame}`);
  check("thresholds ESCALATE (ssj 40 … ssblue 150)", cd.transformations.ssj.energyThreshold === 40 && cd.transformations.ssblue.energyThreshold === 150, `ssj=${cd.transformations.ssj.energyThreshold} ssblue=${cd.transformations.ssblue.energyThreshold}`);

  console.log("\n── base → SSJ: charge-release, threshold-gated, NO up-front cost, all-around boost + GOLD art ──");
  await reset();
  const baseIdle = await idleSheet();
  check("base idle renders goku_base_idle_uniform", baseIdle.includes("goku_base_idle_uniform"), `sheet=${baseIdle}`);
  await reset();
  const ki0 = (await form()).energy;
  const ok = await step();
  const f1 = await form();
  check("charge-release enters SSJ (idx 1)", ok && f1.idx === 1, `idx=${f1.idx} ok=${ok}`);
  check("NO up-front energy cost (only per-frame drain)", ki0 - f1.energy < 5, `ki ${ki0}→${f1.energy.toFixed(0)}`);
  check("SSJ boosts dmg ×1.2 / spd ×1.1 / def ×1.05", Math.abs(f1.dmg - 1.2) < 0.02 && Math.abs(f1.spd - 1.1) < 0.02 && Math.abs(f1.def - 1.05) < 0.02, `dmg=${f1.dmg} spd=${f1.spd} def=${f1.def}`);
  const ssjIdle = await idleSheet();
  check("SSJ art-swap → idle renders goku_ssj_idle_uniform (GOLD)", ssjIdle.includes("goku_ssj_idle_uniform"), `sheet=${ssjIdle}`);

  console.log("\n── step UP → SSG (red) then SSB (blue): own multipliers + own art ──");
  await setKi(200); await step(); const f2 = await form();
  check("step → SSG (idx 2): dmg ×1.5 / spd ×1.25 / def ×1.15", f2.idx === 2 && Math.abs(f2.dmg - 1.5) < 0.02 && Math.abs(f2.spd - 1.25) < 0.02 && Math.abs(f2.def - 1.15) < 0.02, `idx=${f2.idx} dmg=${f2.dmg} spd=${f2.spd} def=${f2.def}`);
  const ssgIdle = await idleSheet();
  check("SSG art-swap → idle renders goku_ssg_idle_uniform (RED)", ssgIdle.includes("goku_ssg_idle_uniform"), `sheet=${ssgIdle}`);
  await setKi(200); await step(); const f3 = await form();
  check("step → SSB (idx 3): dmg ×2 / spd ×1.4 / def ×1.2", f3.idx === 3 && Math.abs(f3.dmg - 2) < 0.02 && Math.abs(f3.spd - 1.4) < 0.02 && Math.abs(f3.def - 1.2) < 0.02, `idx=${f3.idx} dmg=${f3.dmg} spd=${f3.spd} def=${f3.def}`);
  const ssbIdle = await idleSheet();
  check("SSB art-swap → idle renders goku_ssb_idle_uniform (BLUE)", ssbIdle.includes("goku_ssb_idle_uniform"), `sheet=${ssbIdle}`);
  check("cannot step past the top (SSB)", (await step()) === false && (await form()).idx === 3, "");

  console.log("\n── threshold gate + drain/auto-revert + tap-revert restore base art ──");
  await reset(); await setKi(30);
  check("Ki below SSJ threshold (40) → step rejected (stays base)", (await step()) === false && (await form()).idx === 0, "");
  await reset(); await step(); const before = (await form()).energy; await waitFrames(30); const after = (await form()).energy;
  check("transformed drains Ki over time", before - after > 0.5, `Δ=${(before - after).toFixed(1)}`);
  await setKi(0); await waitFrames(4);
  check("Ki-empty auto-reverts to base (buffs cleared)", (await form()).idx === 0 && Math.abs((await form()).dmg - 1) < 0.02, "");
  await reset(); await step(); await step(); await revert(); const rIdle = await idleSheet();
  check("tap-revert restores base art (goku_base_idle_uniform)", (await form()).idx === 0 && rIdle.includes("goku_base_idle_uniform"), `idx=${(await form()).idx} sheet=${rIdle}`);

  console.log("\n── no JS errors ──");
  check("no page errors across the transform ladder", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
