// harness/frieza_stage5.mjs
// STAGE 5 evidence: Frieza's TRANSFORMATION LADDER — base → GOLDEN → BLACK (Vegeta / Goku Black model:
// threshold-gated, NO up-front cost, continuous per-frame Ki DRAIN, instant auto-revert at 0).
// (1) base→Golden: enters at ≥100 Ki with NO up-front spend; all-around boost (dmg/spd/def).
// (2) Golden→Black: chains off Golden at ≥150 Ki; bigger boost; Black supersedes Golden.
// (3) Black CANNOT be entered from base (requiresForm golden).
// (4) DRAIN: transforming drains Ki over time (Black faster than Golden).
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `frieza_stage5_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function reset() { await waitGrounded(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1FriezaRevert?.(); window.__harness.fillEnergy?.(); }); await waitFrames(2); }
const enterGolden = () => page.evaluate(() => window.__harness.p1GoldenFriezaEnter());
const enterBlack  = () => page.evaluate(() => window.__harness.p1BlackFriezaEnter());
const revert      = () => page.evaluate(() => window.__harness.p1FriezaRevert());
const setKi       = (v) => page.evaluate(x => window.__harness.p1FriezaSetEnergy(x), v);

try {
  await page.goto(`${base}/index.html?harness=1&p1=frieza`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── wiring: transformation ladder declared like the DB pack ──");
  const ad = await page.evaluate(() => { const c = window.__harness.charDef("frieza"); return { order: c.transformationOrder, g: c.transformations?.golden, b: c.transformations?.black }; });
  check("transformationOrder = base→golden→black", JSON.stringify(ad.order) === JSON.stringify(["base", "golden", "black"]), JSON.stringify(ad.order));
  check("golden form drains Ki + reverts on empty (like Vegeta)", ad.g?.energyDrainPerFrame > 0 && ad.g?.revertOnEmpty === true, `drain=${ad.g?.energyDrainPerFrame} revert=${ad.g?.revertOnEmpty}`);
  check("black form drains Ki + requiresForm golden", ad.b?.energyDrainPerFrame > 0 && ad.b?.revertOnEmpty === true && ad.b?.requiresForm === "golden", `drain=${ad.b?.energyDrainPerFrame} req=${ad.b?.requiresForm}`);

  console.log("\n── (1) base → GOLDEN: threshold-gated, NO up-front cost, all-around boost ──");
  await reset();
  const ki0 = (await p1()).energy;
  const ok = await enterGolden();
  const g = await p1();
  check("charge-release enters Golden Frieza", g.goldenFrieza === true && g.friezaForm === "golden", `active=${g.goldenFrieza} form=${g.friezaForm} ok=${ok}`);
  check("NO up-front energy cost (only per-frame drain)", ki0 - g.energy < 5, `ki ${ki0}→${g.energy.toFixed(0)} Δ=${(ki0 - g.energy).toFixed(1)}`);
  check("Golden boosts damage (×1.25)", Math.abs(g.damageMult - 1.25) < 0.02, `dmg=${g.damageMult}`);
  check("Golden boosts speed (×1.18)", Math.abs(g.speedMult - 1.18) < 0.02, `spd=${g.speedMult}`);
  check("Golden boosts defense (×1.08)", Math.abs((g.defMult ?? 1) - 1.08) < 0.02, `def=${g.defMult}`);
  await shot("golden");

  console.log("\n── (2) Golden → BLACK: chains off Golden (≥150 Ki), bigger boost, supersedes Golden ──");
  await page.evaluate(() => window.__harness.fillEnergy?.());
  const okB = await enterBlack();
  const b = await p1();
  check("charge-release escalates Golden → Black", b.blackFrieza === true && b.goldenFrieza === false && b.friezaForm === "black", `black=${b.blackFrieza} golden=${b.goldenFrieza} form=${b.friezaForm} ok=${okB}`);
  check("Black boosts damage (×1.50)", Math.abs(b.damageMult - 1.50) < 0.02, `dmg=${b.damageMult}`);
  check("Black boosts speed (×1.32)", Math.abs(b.speedMult - 1.32) < 0.02, `spd=${b.speedMult}`);
  await shot("black");

  console.log("\n── (3) Black CANNOT be entered from base (requiresForm golden) ──");
  await reset();
  const noBlack = await enterBlack();
  check("base → Black is rejected", noBlack === false && (await p1()).blackFrieza === false, `ok=${noBlack} black=${(await p1()).blackFrieza}`);

  console.log("\n── (4) DRAIN: transforming drains Ki over time (Black faster than Golden) ──");
  await reset(); await enterGolden();
  const gk0 = (await p1()).energy; await waitFrames(30); const gk1 = (await p1()).energy;
  const goldRate = (gk0 - gk1) / 30;
  check(`Golden drains Ki over time (${gk0.toFixed(0)}→${gk1.toFixed(0)}, ~${goldRate.toFixed(2)}/f)`, gk1 < gk0, `Δ=${(gk0 - gk1).toFixed(1)}`);
  await reset(); await enterGolden(); await page.evaluate(() => window.__harness.fillEnergy?.()); await enterBlack();
  const bk0 = (await p1()).energy; await waitFrames(30); const bk1 = (await p1()).energy;
  const blackRate = (bk0 - bk1) / 30;
  check(`Black drains FASTER than Golden (${blackRate.toFixed(2)} > ${goldRate.toFixed(2)}/f)`, blackRate > goldRate, `black=${blackRate.toFixed(2)} gold=${goldRate.toFixed(2)}`);

  console.log("\n── (5) AUTO-REVERT at 0 Ki, and charge-TAP reverts to base ──");
  await reset(); await enterGolden();
  await setKi(0); await waitFrames(3);
  const drained = await p1();
  check("Ki-empty auto-reverts Golden → base", drained.goldenFrieza === false && Math.abs(drained.damageMult - 1) < 0.01 && drained.friezaForm === "base", `golden=${drained.goldenFrieza} dmg=${drained.damageMult} form=${drained.friezaForm}`);
  await reset(); await enterGolden(); await waitFrames(3);
  await revert(); await waitFrames(2);
  const tr = await p1();
  check("charge-tap reverts Golden → base (buffs cleared)", tr.goldenFrieza === false && Math.abs(tr.damageMult - 1) < 0.01 && Math.abs(tr.speedMult - 1) < 0.01, `golden=${tr.goldenFrieza} dmg=${tr.damageMult} spd=${tr.speedMult}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
