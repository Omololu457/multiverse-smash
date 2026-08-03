// harness/gold_samurai_ranger_stage3.mjs
// STAGE 3 evidence: Gold Mega Mode = full Vegeta-style TIER-SWAP + LIGHT-SYMBOL transformation cinematic.
//  • charge-release into Mega Mode (below-threshold guard), 光 light-symbol morph → RESOLVE (art+dmg swap).
//  • ≥3 moves confirmed on the Mega tier (idle / light / up / guard) + Mega light out-damages base.
//  • DUPLICATE-RENDER test: per-frame drawImage tally of the Mega body sheet ≤ 1 (no "two instances").
//  • tap-revert + auto-revert-on-empty. Reuses Red's proven tier-swap machinery with Gold's own art.
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
const sheet = (a) => (a.spriteSheet || "");
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `gold_stage3_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function setEnergy(v) { await page.evaluate(e => { window.__harness.setEnergy?.(e) ?? window.__harness.setP1Energy?.(e); }, v); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=gold_samurai_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // per-rAF drawImage tally of the Mega body sheet ("two instances" detector)
  await page.evaluate(() => {
    window.__samDual = { max: 0, cur: 0 };
    const proto = CanvasRenderingContext2D.prototype;
    if (!proto.__goldPatched) {
      const orig = proto.drawImage;
      proto.drawImage = function (img, ...rest) { try { const s = (img && (img.currentSrc || img.src)) || ""; if (s.includes("samurai_ranger_gold_mega_mode_idle_uniform")) window.__samDual.cur++; } catch (e) {} return orig.call(this, img, ...rest); };
      proto.__goldPatched = true;
      const raf = window.requestAnimationFrame.bind(window);
      const tick = () => { if (window.__samDual.cur > window.__samDual.max) window.__samDual.max = window.__samDual.cur; window.__samDual.cur = 0; raf(tick); };
      raf(tick);
    }
  });

  // Measure ACTUAL base-tier light damage first (defense-adjusted) so the Mega comparison is real.
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 60); } await waitFrames(2);
  let bh0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(20);
  const baseLightDmg = bh0 - (await p2()).health;

  console.log("\n── Mega Mode gate: below-threshold release does nothing ──");
  await waitGrounded();
  await setEnergy(40);
  await page.keyboard.down("p"); await waitFrames(3); await page.keyboard.up("p"); await waitFrames(3);
  check("release below threshold does NOT transform", (await p1()).currentForm !== "megaMode", `form=${(await p1()).currentForm} energy=${(await p1()).energy?.toFixed?.(0)}`);

  console.log("\n── LIGHT-SYMBOL transformation cinematic (光 glow → resolve) ──");
  await setEnergy(165);
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  const started = await page.waitForFunction(() => window.__harness.p1().currentForm === "megaMode", null, { timeout: 4000, polling: 16 }).then(() => true).catch(() => false);
  check("charge-release enters Mega Mode (morph begins)", started, `form=${(await p1()).currentForm}`);

  const morphShot = await page.waitForFunction(() => { const p = window.__harness.p1(); return p.currentForm === "megaMode" && !p.hasSkinAnim; }, null, { timeout: 2000, polling: 16 }).then(() => true).catch(() => false);
  await waitFrames(8); await shot("transform_morph");   // mid-morph: light symbol materialising over golden glow
  check("morph has a pre-resolve build phase (base art, not yet Mega)", morphShot, "");

  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(4);
  const mega = await p1(); await shot("mega_idle");
  check("RESOLVED into Mega Mode (form + _skinAnim swapped)", mega.currentForm === "megaMode" && mega.hasSkinAnim, `form=${mega.currentForm} skinAnim=${mega.hasSkinAnim}`);
  check("Mega tier damage multiplier active (1.35)", Math.abs((mega.damageMultiplier ?? 1) - 1.35) < 0.02, `mult=${mega.damageMultiplier}`);

  console.log("\n── tier-swap: ≥3 moves render Mega art ──");
  check("MOVE 1 — idle = gold_mega_mode_idle_uniform", sheet(mega).includes("samurai_ranger_gold_mega_mode_idle_uniform"), `sheet=${sheet(mega)}`);

  // light → mega slash + out-damages base
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 60); } await waitFrames(2);
  const hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); const lightMega = await p1(); await shot("mega_light"); await page.keyboard.up("j"); await waitFrames(20);
  const lightDmg = hp0 - (await p2()).health;
  check("MOVE 2 — light = gold_mega_slash_uniform", sheet(lightMega).includes("samurai_ranger_gold_mega_slash_uniform"), `sheet=${sheet(lightMega)}`);
  check("Mega light out-damages base light (tier-scaling)", lightDmg > baseLightDmg, `mega=${lightDmg} base=${baseLightDmg}`);

  // up → mega rising
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); }); await waitGrounded();
  await page.keyboard.down("i"); await waitFrames(4); const upMega = await p1(); await shot("mega_up"); await page.keyboard.up("i"); await waitFrames(18);
  check("MOVE 3 — up = gold_mega_rising_uniform", sheet(upMega).includes("samurai_ranger_gold_mega_rising_uniform"), `sheet=${sheet(upMega)}`);

  // guard → mega guard
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(6); const guardMega = await p1(); await shot("mega_guard"); await page.keyboard.up("s"); await waitFrames(3);
  check("MOVE 4 — guard = gold_mega_guard_uniform", sheet(guardMega).includes("samurai_ranger_gold_mega_guard_uniform"), `sheet=${sheet(guardMega)} isBlocking=${guardMega.isBlocking}`);

  console.log("\n── duplicate-render: Mega body sheet drawn ≤ 1× per frame ──");
  await page.evaluate(() => { window.__samDual.max = 0; });
  await waitFrames(30);
  const dual = await page.evaluate(() => window.__samDual.max);
  check("Mega body sheet drawn at most once per frame (no dual-render)", dual <= 1, `maxDrawsPerFrame=${dual}`);

  console.log("\n── revert paths ──");
  await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p"); await waitFrames(4);
  const rev = await p1();
  check("quick tap reverts to base (art + form)", rev.currentForm !== "megaMode" && !rev.hasSkinAnim && sheet(rev).includes("samurai_ranger_gold_idle_uniform"), `form=${rev.currentForm} skinAnim=${rev.hasSkinAnim} sheet=${sheet(rev)}`);

  await setEnergy(95);
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.setEnergy?.(1) ?? window.__harness.setP1Energy?.(1));
  const dropped = await page.waitForFunction(() => window.__harness.p1().currentForm !== "megaMode", null, { timeout: 4000, polling: 16 }).then(() => true).catch(() => false);
  check("Mega Mode auto-reverts when Symbol Power empties", dropped, `form=${(await p1()).currentForm}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Gold Stage 3: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
