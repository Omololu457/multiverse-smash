// harness/piccolo_stage5.mjs
// STAGE 5 evidence: Piccolo's TRANSFORMATION LADDER — base → POTENTIAL UNLEASHED (T1) → ORANGE PICCOLO (T2)
// (Frieza / Vegeta / Goku Black model: threshold-gated, NO up-front cost, continuous per-frame Ki DRAIN,
// instant auto-revert at 0). ★ART = palette-tint placeholder (prototype); this test proves the MECHANIC.
// (1) base→Potential: enters at ≥90 Ki with NO up-front spend; all-around boost (dmg/spd/def).
// (2) Potential→Orange: chains off Potential at ≥140 Ki; bigger boost; Orange supersedes Potential.
// (3) Orange CANNOT be entered from base (requiresForm potential).
// (4) DRAIN: transforming drains Ki over time (Orange faster than Potential — escalating drain).
// (5) AUTO-REVERT at 0 Ki; and charge-TAP reverts to base.
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `piccolo_stage5_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function reset() { await waitGrounded(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1PiccoloRevert?.(); window.__harness.fillEnergy?.(); }); await waitFrames(2); }
const enterT1 = () => page.evaluate(() => window.__harness.p1PiccoloPotentialEnter());
const enterT2 = () => page.evaluate(() => window.__harness.p1PiccoloOrangeEnter());
const revert  = () => page.evaluate(() => window.__harness.p1PiccoloRevert());
const setKi   = (v) => page.evaluate(x => window.__harness.p1PiccoloSetEnergy(x), v);

try {
  await page.goto(`${base}/index.html?harness=1&p1=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── wiring: transformation ladder declared like the DB pack ──");
  const ad = await page.evaluate(() => { const c = window.__harness.charDef("piccolo"); return { order: c.transformationOrder, t1: c.transformations?.potential, t2: c.transformations?.orange, ult: c.ultimate }; });
  check("transformationOrder = base→potential→orange", JSON.stringify(ad.order) === JSON.stringify(["base", "potential", "orange"]), JSON.stringify(ad.order));
  check("Potential (T1) drains Ki + reverts on empty (like Vegeta)", ad.t1?.energyDrainPerFrame > 0 && ad.t1?.revertOnEmpty === true, `drain=${ad.t1?.energyDrainPerFrame} revert=${ad.t1?.revertOnEmpty}`);
  check("Orange (T2) drains Ki + requiresForm potential", ad.t2?.energyDrainPerFrame > 0 && ad.t2?.revertOnEmpty === true && ad.t2?.requiresForm === "potential", `drain=${ad.t2?.energyDrainPerFrame} req=${ad.t2?.requiresForm}`);
  check("escalating drain: Orange drains FASTER than Potential (data)", ad.t2?.energyDrainPerFrame > ad.t1?.energyDrainPerFrame, `t2=${ad.t2?.energyDrainPerFrame} t1=${ad.t1?.energyDrainPerFrame}`);
  check("escalating multiplier: Orange dmg > Potential dmg (data)", ad.t2?.damageMultiplier > ad.t1?.damageMultiplier, `t2=${ad.t2?.damageMultiplier} t1=${ad.t1?.damageMultiplier}`);
  check("★ART flagged palette-tint placeholder (not final)", /placeholder|palette-tint/i.test(ad.ult?.description || ""), `ult=${ad.ult?.name}`);

  console.log("\n── (1) base → POTENTIAL UNLEASHED: threshold-gated, NO up-front cost, all-around boost ──");
  await reset();
  const ki0 = (await p1()).energy;
  const ok = await enterT1();
  const t1 = await p1();
  check("charge-release enters Potential Unleashed", t1.piccoloPotential === true && t1.piccoloForm === "potential", `active=${t1.piccoloPotential} form=${t1.piccoloForm} ok=${ok}`);
  check("NO up-front energy cost (only per-frame drain)", ki0 - t1.energy < 5, `ki ${ki0}→${t1.energy.toFixed(0)} Δ=${(ki0 - t1.energy).toFixed(1)}`);
  check("Potential boosts damage (×1.20)", Math.abs(t1.damageMult - 1.20) < 0.02, `dmg=${t1.damageMult}`);
  check("Potential boosts speed (×1.12)", Math.abs(t1.speedMult - 1.12) < 0.02, `spd=${t1.speedMult}`);
  check("Potential boosts defense (×1.06)", Math.abs((t1.defMult ?? 1) - 1.06) < 0.02, `def=${t1.defMult}`);
  await shot("potential");

  console.log("\n── (2) Potential → ORANGE PICCOLO: chains off Potential (≥140 Ki), bigger boost, supersedes T1 ──");
  await page.evaluate(() => window.__harness.fillEnergy?.());
  const okB = await enterT2();
  const t2 = await p1();
  check("charge-release escalates Potential → Orange", t2.piccoloOrange === true && t2.piccoloPotential === false && t2.piccoloForm === "orange", `orange=${t2.piccoloOrange} potential=${t2.piccoloPotential} form=${t2.piccoloForm} ok=${okB}`);
  check("Orange boosts damage (×1.42)", Math.abs(t2.damageMult - 1.42) < 0.02, `dmg=${t2.damageMult}`);
  check("Orange boosts speed (×1.24)", Math.abs(t2.speedMult - 1.24) < 0.02, `spd=${t2.speedMult}`);
  await shot("orange");

  console.log("\n── (3) Orange CANNOT be entered from base (requiresForm potential) ──");
  await reset();
  const noOrange = await enterT2();
  check("base → Orange is rejected", noOrange === false && (await p1()).piccoloOrange === false, `ok=${noOrange} orange=${(await p1()).piccoloOrange}`);

  console.log("\n── (4) DRAIN: transforming drains Ki over time (Orange faster than Potential) ──");
  await reset(); await enterT1();
  const gk0 = (await p1()).energy; await waitFrames(30); const gk1 = (await p1()).energy;
  const t1Rate = (gk0 - gk1) / 30;
  check(`Potential drains Ki over time (${gk0.toFixed(0)}→${gk1.toFixed(0)}, ~${t1Rate.toFixed(2)}/f)`, gk1 < gk0, `Δ=${(gk0 - gk1).toFixed(1)}`);
  await reset(); await enterT1(); await page.evaluate(() => window.__harness.fillEnergy?.()); await enterT2();
  const bk0 = (await p1()).energy; await waitFrames(30); const bk1 = (await p1()).energy;
  const t2Rate = (bk0 - bk1) / 30;
  check(`Orange drains FASTER than Potential (${t2Rate.toFixed(2)} > ${t1Rate.toFixed(2)}/f)`, t2Rate > t1Rate, `orange=${t2Rate.toFixed(2)} potential=${t1Rate.toFixed(2)}`);

  console.log("\n── (5) AUTO-REVERT at 0 Ki, and charge-TAP reverts to base ──");
  await reset(); await enterT1();
  await setKi(0); await waitFrames(3);
  const drained = await p1();
  check("Ki-empty auto-reverts Potential → base", drained.piccoloPotential === false && Math.abs(drained.damageMult - 1) < 0.01 && drained.piccoloForm === "base", `potential=${drained.piccoloPotential} dmg=${drained.damageMult} form=${drained.piccoloForm}`);
  await reset(); await enterT1(); await waitFrames(3);
  await revert(); await waitFrames(2);
  const tr = await p1();
  check("charge-tap reverts Potential → base (buffs cleared)", tr.piccoloPotential === false && Math.abs(tr.damageMult - 1) < 0.01 && Math.abs(tr.speedMult - 1) < 0.01, `potential=${tr.piccoloPotential} dmg=${tr.damageMult} spd=${tr.speedMult}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
