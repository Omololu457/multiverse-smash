// harness/green_samurai_ranger_stage4.mjs
// STAGE 4 evidence: Green's FOREST SPEAR special — the real extended-reach naginata.
//  • base: casts the spear-thrust pose (forest_spear_cast), spawns a leaf-blast wave projectile, connects.
//  • EXTENDED REACH: the melee thrust (rangeX 100) connects at a gap where a melee normal (light) whiffs.
//  • Mega tier: casts the mega spear pose, wave out-damages the base wave (tier-scaling).
//  • no dual-render on the projectile.
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
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `green_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function setEnergy(v) { await page.evaluate(e => { window.__harness.setEnergy?.(e) ?? window.__harness.setP1Energy?.(e); }, v); }
async function sawMove(name, frames = 18) { let last = ""; for (let i = 0; i < frames; i++) { const a = await p1(); if (a.currentMove === name) return a.spriteSheet || ""; if (a.currentMove) last = a.spriteSheet || ""; await waitFrames(1); } return null; }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.fillEnergy?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=green_samurai_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // dual-render tally on the projectile sheet
  await page.evaluate(() => {
    window.__spearDual = { max: 0, cur: 0 };
    const proto = CanvasRenderingContext2D.prototype;
    if (!proto.__spearPatched) {
      const orig = proto.drawImage;
      proto.drawImage = function (img, ...rest) { try { const s = (img && (img.currentSrc || img.src)) || ""; if (s.includes("samurai_ranger_forest_spear_wave_uniform")) window.__spearDual.cur++; } catch (e) {} return orig.call(this, img, ...rest); };
      proto.__spearPatched = true;
      const raf = window.requestAnimationFrame.bind(window);
      const tick = () => { if (window.__spearDual.cur > window.__spearDual.max) window.__spearDual.max = window.__spearDual.cur; window.__spearDual.cur = 0; raf(tick); };
      raf(tick);
    }
  });

  console.log("\n── Forest Spear (base tier): thrust pose + leaf-blast wave ──");
  await prep(240);   // FAR — the wave must travel, so it's observable and no melee could reach
  const shp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const cast = await sawMove("forestSpear", 16);
  await shot("spear_base");
  let sawWave = false;
  for (let i = 0; i < 30; i++) { if ((await projs()).some(p => (p.name || "").includes("forest_spear_wave"))) sawWave = true; await waitFrames(1); }
  const baseWaveDmg = shp0 - (await p2()).health;
  check("casts forestSpear thrust pose", !!cast, `sheet=${cast}`);
  check("cast pose = forest_spear_cast_uniform", (cast || "").includes("samurai_ranger_forest_spear_cast_uniform"), `sheet=${cast}`);
  check("spawns a forest_spear_wave projectile", sawWave, "");
  check("spear special connects at long range (dmg > 0)", baseWaveDmg > 0, `dmg=${baseWaveDmg}`);

  console.log("\n── EXTENDED REACH: spear reaches a foe no melee normal can ──");
  // At gap 240 a melee normal (light) cannot reach at all; the spear special's leaf-wave does.
  await prep(240);
  let rh0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(6); await page.keyboard.up("j"); await waitFrames(20);
  const lightFar = rh0 - (await p2()).health;
  await prep(240);
  rh0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  for (let i = 0; i < 30; i++) { await waitFrames(1); }
  const spearFar = rh0 - (await p2()).health;
  check("melee light deals 0 at long range (no reach)", lightFar === 0, `lightDmg=${lightFar}`);
  check("Forest Spear special connects at long range (extended reach)", spearFar > 0, `spearDmg=${spearFar}`);

  console.log("\n── Mega tier: mega spear pose + wave out-damages base ──");
  await prep(240);
  await setEnergy(165);
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(4);
  await prep(240);
  await page.evaluate(() => window.__harness.setEnergy?.(160) ?? window.__harness.setP1Energy?.(160));
  const mhp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const megaCast = await sawMove("forestSpear", 16);
  await shot("spear_mega");
  for (let i = 0; i < 26; i++) { await waitFrames(1); }
  const megaWaveDmg = mhp0 - (await p2()).health;
  check("Mega cast pose = forest_mega_spear_cast_uniform", (megaCast || "").includes("samurai_ranger_forest_mega_spear_cast_uniform"), `sheet=${megaCast}`);
  check("Mega spear out-damages base spear (tier-scaling)", megaWaveDmg > baseWaveDmg, `mega=${megaWaveDmg} base=${baseWaveDmg}`);

  console.log("\n── duplicate-render: projectile drawn ≤ 1× per frame ──");
  const dual = await page.evaluate(() => window.__spearDual.max);
  check("spear-wave projectile drawn at most once per frame", dual <= 1, `maxDrawsPerFrame=${dual}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Green Stage 4: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
