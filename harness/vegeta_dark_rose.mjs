// harness/vegeta_dark_rose.mjs
// Dark Vegeta — SUPER SAIYAN ROSE (3rd-tier transform) + Task 2 (charge animation for general charging).
// ★CREATIVE addition (Rose = Goku Black's transform, not Vegeta's — original choice). STANDALONE char.
// (1) WIRING — 3-tier ladder base→darkAura→rose; rose declares a skinAnim + drain + requiresForm darkAura.
// (2) LADDER — base→darkAura→Rose (Rose chains off dark-aura, higher stats ×1.50/1.22/1.10).
// (3) ART SWAP — in Rose, actions render the PINK vegeta_dark_rose_* sheets (full form-swap via _skinAnim).
// (4) KI BLAST — Rose fires the AMPLIFIED (purple) tier, like dark-aura.
// (5) DRAIN — Rose drains Ki + auto-reverts at 0; charge-tap reverts to base.
// (6) TASK 2 — the general CHARGE state uses the aura-buildup art (base = purple aura, Rose = pink aura).
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
const p2 = () => page.evaluate(() => window.__harness.p2());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function reset() { await waitGrounded(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1VegetaDarkRevert?.(); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); await waitFrames(2); }
const enterRose = () => page.evaluate(() => window.__harness.p1VegetaDarkRoseEnter());
const enterDark = () => page.evaluate(() => window.__harness.p1VegetaDarkEnter());
const setKi = (v) => page.evaluate(x => window.__harness.p1VegetaDarkSetEnergy(x), v);

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegeta_dark&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── (1) wiring: 3-tier ladder base→darkAura→rose ──");
  const cd = await page.evaluate(() => window.__harness.charDef("vegeta_dark"));
  check("transformationOrder = base→darkAura→rose", JSON.stringify(cd.transformationOrder) === JSON.stringify(["base", "darkAura", "rose"]), JSON.stringify(cd.transformationOrder));
  const rose = cd.transformations?.rose;
  check("rose chains off dark-aura (requiresForm)", rose?.requiresForm === "darkAura", `req=${rose?.requiresForm}`);
  check("rose drains + reverts on empty", rose?.energyDrainPerFrame > 0 && rose?.revertOnEmpty === true, `drain=${rose?.energyDrainPerFrame}`);
  check("rose declares a skinAnim (art form-swap)", rose?.skinAnim === "vegetaDarkRose", `skinAnim=${rose?.skinAnim}`);
  check("rose stronger than dark-aura (dmg 1.50 > 1.35)", rose?.damageMultiplier > cd.transformations?.darkAura?.damageMultiplier, `rose=${rose?.damageMultiplier}`);
  check("Task 2: base has a CHARGE action (general charging)", (cd.animationData?.charge?.sheet || "").includes("vegeta_dark_aura_uniform"), `charge=${cd.animationData?.charge?.sheet}`);

  console.log("\n── (2) ladder: base → dark-aura → ROSE ──");
  await reset();
  await enterDark(); const d = await p1();
  check("base → dark-aura (dmg ×1.35)", d.currentForm === "vegetaDarkAura" && Math.abs(d.damageMult - 1.35) < 0.02, `form=${d.currentForm} dmg=${d.damageMult}`);
  await enterRose(); const r = await p1();
  check("dark-aura → ROSE (dmg ×1.50)", r.currentForm === "vegetaDarkRose" && Math.abs(r.damageMult - 1.50) < 0.02, `form=${r.currentForm} dmg=${r.damageMult}`);
  check("ROSE boosts speed ×1.22 / def ×1.10", Math.abs(r.speedMult - 1.22) < 0.02 && Math.abs((r.defMult ?? 1) - 1.10) < 0.02, `spd=${r.speedMult} def=${r.defMult}`);

  console.log("\n── (3) ART SWAP: Rose actions render the PINK vegeta_dark_rose_* sheets ──");
  await force("idle"); await waitFrames(3); const ri = await p1();
  check("Rose idle → vegeta_dark_rose_idle_uniform", (ri.spriteSheet || "").includes("vegeta_dark_rose_idle_uniform"), `sheet=${ri.spriteSheet}`);
  await force("light"); await waitFrames(2); const rl = await p1(); await force(null);
  check("Rose light → vegeta_dark_rose_light_uniform (pink art)", (rl.spriteSheet || "").includes("vegeta_dark_rose_light_uniform"), `sheet=${rl.spriteSheet}`);
  await page.screenshot({ path: path.join(OUT, "vegeta_dark_rose_idle.png") });

  console.log("\n── (4) KI BLAST amplified in Rose ──");
  await page.evaluate(() => { const a = window.__harness.p1(); }); // no-op
  const h0 = (await p2()).health;
  await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 150));
  await waitFrames(2);
  const kb = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  let ampW = 0; for (let i = 0; i < 18; i++) { const a = (await projectiles()).filter(p => (p.name || "").includes("vdKiBlastAmped")); if (a.length) ampW = Math.max(ampW, ...a.map(p => p.w || 0)); await waitFrames(1); }
  check("Rose fires the AMPLIFIED ki blast (w≥70)", kb?.cast === "vdKiCast" && ampW >= 70, `cast=${kb?.cast} w=${ampW}`);

  console.log("\n── (5) DRAIN + auto-revert at 0; tap-revert ──");
  await reset(); await enterRose();
  const gk0 = (await p1()).energy; await waitFrames(30); const gk1 = (await p1()).energy;
  check(`Rose drains Ki over time (${gk0.toFixed(0)}→${gk1.toFixed(0)})`, gk1 < gk0, `Δ=${(gk0 - gk1).toFixed(1)}`);
  await setKi(0); await waitFrames(3);
  check("Ki-empty auto-reverts Rose → base", (await p1()).currentForm === "base", "");
  await reset(); await enterRose(); await waitFrames(2);
  await page.evaluate(() => window.__harness.p1VegetaDarkRevert());
  await waitFrames(2);
  const tr = await p1();
  check("charge-tap reverts Rose → base (buffs cleared + art restored)", tr.currentForm === "base" && Math.abs(tr.damageMult - 1) < 0.01 && !(tr.spriteSheet || "").includes("rose"), `form=${tr.currentForm} dmg=${tr.damageMult}`);

  console.log("\n── (6) TASK 2: charge animation for general charging (base purple / Rose pink) ──");
  await reset();
  await force("charge"); await waitFrames(3); const bc = await p1(); await force(null);
  check("base charge → aura-buildup art (vegeta_dark_aura_uniform)", (bc.spriteSheet || "").includes("vegeta_dark_aura_uniform"), `sheet=${bc.spriteSheet}`);
  await reset(); await enterRose();
  await force("charge"); await waitFrames(3); const rc = await p1(); await force(null);
  check("Rose charge → PINK aura art (vegeta_dark_rose_aura_uniform)", (rc.spriteSheet || "").includes("vegeta_dark_rose_aura_uniform"), `sheet=${rc.spriteSheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
