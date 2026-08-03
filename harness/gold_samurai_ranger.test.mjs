// harness/gold_samurai_ranger.test.mjs
// CANONICAL full-kit test for the Gold Samurai Ranger (Light) — the single authoritative suite.
// Covers: registration/portrait/stats · 5 normals + single up-attack + Toji-Rekka chain + interrupt (base) ·
// Light Slash slash-wave PROJECTILE (both tiers, tier-scaling) · Mega Mode LIGHT-SYMBOL transformation
// (build→resolve tier-swap) + dual-render "two instances" guard · ≥3 moves on the Mega tier ·
// Ultimate TIER-SCALING (base art+dmg vs Mega art+dmg). Run: node harness/gold_samurai_ranger.test.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const section = (t) => console.log(`\n── ${t} ──`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const cine = () => page.evaluate(() => window.__harness.samuraiUltCine());
const sh = (a) => (a.spriteSheet || "");
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function setEnergy(v) { await page.evaluate(e => { window.__harness.setEnergy?.(e) ?? window.__harness.setP1Energy?.(e); }, v); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  await setEnergy(160);
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function sawMove(name, frames = 22) { for (let i = 0; i < frames; i++) { const a = await p1(); if (a.currentMove === name) return a.spriteSheet || true; await waitFrames(1); } return false; }
async function toMega() {
  await waitGrounded(); await setEnergy(165);
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(4);
}
async function fireUlt() {
  await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetFighterInput?.("p1"); });
  const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 120); await waitFrames(2);
  await setEnergy(160);
  const hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const active = await page.waitForFunction(() => window.__harness.samuraiUltCine().active === true, null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  let sheet = "", mega = null;
  for (let i = 0; i < 30 && active; i++) { const c = await cine(); const a = await p1(); if ((a.spriteSheet || "").includes("launcher_uniform")) sheet = a.spriteSheet; if (c.mega != null) mega = c.mega; if (c.frame > 20) break; await new Promise(r => setTimeout(r, 40)); }
  await page.waitForFunction(() => window.__harness.samuraiUltCine().active === false, null, { timeout: 6000, polling: 32 }).catch(() => {});
  await waitFrames(4);
  return { active, sheet, mega, dmg: hp0 - (await p2()).health };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=gold_samurai_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  // dual-render tally for the Mega body sheet
  await page.evaluate(() => {
    window.__samDual = { max: 0, cur: 0 };
    const proto = CanvasRenderingContext2D.prototype;
    if (!proto.__goldPatched) {
      const orig = proto.drawImage;
      proto.drawImage = function (img, ...r) { try { const s = (img && (img.currentSrc || img.src)) || ""; if (s.includes("samurai_ranger_gold_mega_mode_idle_uniform")) window.__samDual.cur++; } catch (e) {} return orig.call(this, img, ...r); };
      proto.__goldPatched = true;
      const raf = window.requestAnimationFrame.bind(window);
      const tick = () => { if (window.__samDual.cur > window.__samDual.max) window.__samDual.max = window.__samDual.cur; window.__samDual.cur = 0; raf(tick); };
      raf(tick);
    }
  });
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("registration + stats + portrait");
  const g = await p1();
  check("P1 = gold_samurai_ranger", g.key === "gold_samurai_ranger", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("HP 1160 / EN 165 / scale 2.0", g.maxHealth === 1160 && g.maxEnergy === 165 && Math.abs(g.spriteScale - 2.0) < 0.01, `HP=${g.maxHealth} EN=${g.maxEnergy} scale=${g.spriteScale}`);
  check("portrait file exists on disk", fs.existsSync(path.join(ROOT, "samurai_ranger_gold_portrait.png")), "");

  section("base normals connect + correct sheets");
  for (const [name, key, gap, tag, dmgMin] of [["light", "j", 46, "gold_slash_uniform", 15], ["heavy", "k", 46, "gold_lunge_uniform", 28]]) {
    await prep(gap);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); const a = await p1(); await page.keyboard.up(key); await waitFrames(22);
    check(`${name} connects + ${tag}`, (hp0 - (await p2()).health) >= dmgMin && sh(a).includes(tag), `dmg=${hp0 - (await p2()).health} sheet=${sh(a)}`);
  }
  await prep(42);
  await page.keyboard.down("i"); await waitFrames(4); const up = await p1(); await page.keyboard.up("i"); await waitFrames(4);
  check("up-attack (single) = gold_rising_uniform + launches", sh(up).includes("gold_rising_uniform") && (!(await p2()).grounded || (await p2()).vy < -1), `sheet=${sh(up)}`);
  await prep(44); await page.evaluate(() => window.__harness.liftP1(40));
  await page.keyboard.down("j"); await waitFrames(4); const air = await p1(); await page.keyboard.up("j"); await waitFrames(12);
  check("air = gold_aerial_uniform", sh(air).includes("gold_aerial_uniform"), `sheet=${sh(air)}`);
  await prep(30); await page.evaluate(() => window.__harness.liftP1(46));
  await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4); const da = await p1(); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(12);
  check("down_air = gold_aerial_uniform", sh(da).includes("gold_aerial_uniform"), `sheet=${sh(da)}`);

  section("Toji-Rekka command chain + interrupt (base)");
  await prep(50);
  const stages = new Set(), nexts = new Set();
  // Track BOTH the live stage (currentMove) and the wired next-stage (rekkaNext). Hold FORWARD (opener is
  // Fwd+Heavy); re-tap Heavy during each recovery. The live samRekka1→2 advance proves the connect-gated
  // cancel works; rekkaNext reaching "samRekkaFin" proves the chain is wired THROUGH to the finisher. The
  // live finisher landing (94 cumulative dmg) is proven end-to-end by test:gold-samurai-stage2.
  const sample = async (n) => { for (let i = 0; i < n; i++) { const a = await p1(); if (a.currentMove) stages.add(a.currentMove); if (a.rekkaNext) nexts.add(a.rekkaNext); await waitFrames(1); } };
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await sample(6);
  for (let i = 0; i < 2; i++) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await sample(8); }
  await waitFrames(8); await page.keyboard.up("d");
  const chainOk = stages.has("samRekka1") && stages.has("samRekka2") && (stages.has("samRekkaFin") || nexts.has("samRekkaFin"));
  check("chain advances samRekka1→2 (cancel-on-hit) + wired through to samRekkaFin", chainOk, `stages=[${[...stages]}] nexts=[${[...nexts]}]`);
  await prep(360);
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const w1 = await sawMove("samRekka1", 10); await waitFrames(6);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const w2 = await sawMove("samRekka2", 14); await page.keyboard.up("d");
  check("whiff breaks chain (samRekka1 yes, samRekka2 no)", w1 && !w2, "");

  section("Light Slash special — slash-wave projectile (base)");
  await prep(240);
  const shp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const cast = await sawMove("lightSlash", 16);
  let sawWave = false;
  for (let i = 0; i < 24; i++) { if ((await projs()).some(p => (p.name || "").includes("gold_light_slashwave"))) sawWave = true; await waitFrames(1); }
  const baseWaveDmg = shp0 - (await p2()).health;
  check("Light Slash casts (gold_launcher pose) + spawns wave + connects", !!cast && sawWave && baseWaveDmg > 0, `cast=${!!cast} wave=${sawWave} dmg=${baseWaveDmg}`);

  section("Mega Mode LIGHT-SYMBOL transformation + tier-swap");
  await setEnergy(40);
  await page.keyboard.down("p"); await waitFrames(3); await page.keyboard.up("p"); await waitFrames(3);
  check("below-threshold release does NOT transform", (await p1()).currentForm !== "megaMode", `form=${(await p1()).currentForm}`);
  await toMega();
  const mega = await p1();
  check("resolved into Mega (form + _skinAnim + 1.35× dmg)", mega.currentForm === "megaMode" && mega.hasSkinAnim && Math.abs((mega.damageMultiplier ?? 1) - 1.35) < 0.02, `form=${mega.currentForm} mult=${mega.damageMultiplier}`);
  check("MEGA move 1 — idle = gold_mega_mode_idle_uniform", sh(mega).includes("gold_mega_mode_idle_uniform"), `sheet=${sh(mega)}`);
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 60); } await waitFrames(2);
  await page.keyboard.down("j"); await waitFrames(4); const ml = await p1(); await page.keyboard.up("j"); await waitFrames(18);
  check("MEGA move 2 — light = gold_mega_slash_uniform", sh(ml).includes("gold_mega_slash_uniform"), `sheet=${sh(ml)}`);
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(6); const mg = await p1(); await page.keyboard.up("s"); await waitFrames(3);
  check("MEGA move 3 — guard = gold_mega_guard_uniform", sh(mg).includes("gold_mega_guard_uniform"), `sheet=${sh(mg)}`);

  section("DUPLICATE-RENDER guard (transformation cinematic + Mega body)");
  // fresh transform, sample the WHOLE morph + settle window for a dual-draw of the Mega body sheet
  await page.evaluate(() => window.__harness.boot()); await waitFrames(6);
  await page.evaluate(() => { window.__samDual.max = 0; });
  await toMega(); await waitFrames(30);
  const dual = await page.evaluate(() => window.__samDual.max);
  check("Mega body sheet drawn ≤ 1×/frame through transform+idle (no two-instances)", dual <= 1, `maxDrawsPerFrame=${dual}`);

  section("Light Slash tier-scaling (Mega wave out-damages base)");
  await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  await setEnergy(160);
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 240); } await waitFrames(2);
  const mshp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const megaCast = await sawMove("lightSlash", 16);
  for (let i = 0; i < 24; i++) { await waitFrames(1); }
  const megaWaveDmg = mshp0 - (await p2()).health;
  check("Mega Light Slash = gold_mega_launcher pose + out-damages base wave", (megaCast || "").includes("gold_mega_launcher_uniform") && megaWaveDmg > baseWaveDmg, `mega=${megaWaveDmg} base=${baseWaveDmg} cast=${megaCast}`);

  section("Ultimate TIER-SCALING (base art+dmg vs Mega art+dmg)");
  await page.evaluate(() => window.__harness.boot()); await waitFrames(6);
  const bu = await fireUlt();
  check("BASE ult: activates + base launcher art + damage", bu.active && bu.sheet.includes("gold_launcher_uniform") && bu.mega === false && bu.dmg > 0, `sheet=${bu.sheet} mega=${bu.mega} dmg=${bu.dmg}`);
  await page.evaluate(() => window.__harness.boot()); await waitFrames(6);
  await toMega();
  const mu = await fireUlt();
  check("MEGA ult: activates + mega launcher art + higher damage", mu.active && mu.sheet.includes("gold_mega_launcher_uniform") && mu.mega === true && mu.dmg > bu.dmg, `sheet=${mu.sheet} mega=${mu.mega} dmg=${mu.dmg} (base ${bu.dmg})`);

  section("integrity");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} GOLD SAMURAI RANGER full-kit: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
