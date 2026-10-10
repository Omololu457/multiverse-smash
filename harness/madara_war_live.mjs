// harness/madara_war_live.mjs — REAL live verification for MADARA WAR UPGRADE Phase 1.
// Boots real matches (?p1=madara&p2=naruto) on a LIGHT (Hidden Leaf Village) and a DARK (Null Void) stage,
// confirms Madara LOADS (real sprites), and drives the 3 NEW canon specials with REAL motion inputs +
// screenshots: Gōka Mekkyaku (qcf, D,F), Shinra Tensei (qcb, D,B), Goryūka (B,F). Also captures the new
// Partial-Susanoo ribcage GUARD visual (hold block), and proves two PRE-EXISTING specials still fire
// (neutral Fireball, Fwd+Special Gunbai swing). P1 keys: a/d move, w jump, s crouch, j light, k heavy,
// i upAttack, l special, p charge, u ultimate, ; block.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
// The pre-existing, non-Madara `drawSasukeAdultStance is not defined` pageerror is expected (committed HEAD
// bug, not this work) — count it separately so it does not mask a REAL Madara error.
let PERR = 0, SASUKE_PERR = 0;
page.on("pageerror", e => { if (/drawSasukeAdultStance/.test(e.message)) { SASUKE_PERR++; return; } console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `madwar1_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle(stage) {
  if (stage) { try { await page.evaluate(n => window.__harness.selectStageByName?.(n), stage); } catch (_) {} }
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await reset();
}
async function reset() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(8); }
async function closeP2(gap = 150) { await page.evaluate(g => { try { window.__harness.setP2X?.((window.__harness.p1().x || 0) + g); } catch (_) {} }, gap); await waitFrames(2); }
// Motion special: press each direction (hold ~3f), keep the LAST held, tap special while it's held.
async function motion(seq) {
  for (let i = 0; i < seq.length; i++) { await page.keyboard.down(seq[i]); await waitFrames(3); if (i < seq.length - 1) await page.keyboard.up(seq[i]); }
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  await page.keyboard.up(seq[seq.length - 1]);
}

async function scenario(stage, tag) {
  console.log(`\n── STAGE: ${stage} (${tag}) ──`);
  await boot(`${base}/index.html?harness=1&p1=madara&p2=naruto`);
  await toBattle(stage);

  const f0 = await p1();
  ok(!!f0 && (f0.key || "").toLowerCase() === "madara", `P1 is madara (key=${f0 && f0.key})`);
  ok(!!f0 && f0.maxHealth === 1180, `stats loaded (maxHealth=${f0 && f0.maxHealth}, expect 1180)`);
  const ready = await page.evaluate(() => { try { return !!window.__harness.spritesReady?.(); } catch (_) { return null; } });
  console.log(`  spritesReady=${ready} hp=${f0 && Math.round(f0.health)}/${f0 && f0.maxHealth}`);
  await shot(`${tag}_01_idle`);

  // Ribcage GUARD visual — hold block, let the ribcage grow, screenshot.
  await reset(); await page.keyboard.down(";"); await waitFrames(34); await shot(`${tag}_02_ribcage_guard`); await page.keyboard.up(";");

  // NEW #1 — Gōka Mekkyaku (qcf D,F): wide flame wall, big damage.
  await reset(); await closeP2(130); const g0 = (await p2()).health;
  await motion(["s", "d"]); await waitFrames(16); await shot(`${tag}_03_goka_mekkyaku`);
  const g1 = (await p2()).health; const gΔ = Math.round(g0 - g1);
  console.log(`  Gōka Mekkyaku: p2 ${Math.round(g0)}→${Math.round(g1)} (Δ${gΔ})`);
  ok(gΔ > 0, `Gōka Mekkyaku deals damage (Δ=${gΔ})`);

  // NEW #2 — Shinra Tensei (qcb D,B): low chip + BIG repulsion. The shove sets the foe's velocity (exactly
  // like Pain's Almighty Push: target.vx = ±knock). Measuring POSITION is unreliable (the foe is often at a
  // stage wall + AI drift), so we assert the PHYSICS directly: p2.vx spikes AWAY from Madara the frame after
  // the push, and the chip damage lands. (A screenshot still captures the swirl FX.)
  await reset(); await closeP2(140);
  const s0 = await p2(); const pDir = s0.x >= (await p1()).x ? 1 : -1;   // expected shove direction (away from Madara)
  await page.keyboard.down("s"); await waitFrames(3); await page.keyboard.up("s");    // Down
  await page.keyboard.down("a"); await waitFrames(3);                                  // Back (held)
  await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await page.keyboard.up("a");   // Special → Shinra Tensei
  let peakVx = 0;
  for (let i = 0; i < 4; i++) { const q = await p2(); if (Math.abs(q.vx) > Math.abs(peakVx)) peakVx = q.vx; await waitFrames(1); }
  await shot(`${tag}_04_shinra_tensei`);
  const s1 = await p2(); const sΔhp = Math.round(s0.health - s1.health);
  console.log(`  Shinra Tensei: peak p2.vx=${peakVx.toFixed(1)} (expected sign ${pDir>0?"+":"-"}), chip Δhp=${sΔhp}`);
  ok(Math.abs(peakVx) > 8 && Math.sign(peakVx) === pDir && sΔhp > 0, `Shinra Tensei repels the foe away (vx=${peakVx.toFixed(1)}) + chips (Δ${sΔhp})`);

  // NEW #3 — Goryūka (B,F): fast fire-dragon-head projectile.
  await reset(); await closeP2(220); const r0 = (await p2()).health;
  await motion(["a", "d"]); await waitFrames(22); await shot(`${tag}_05_goryuka`);
  const r1 = (await p2()).health; const rΔ = Math.round(r0 - r1);
  console.log(`  Goryūka: p2 ${Math.round(r0)}→${Math.round(r1)} (Δ${rΔ})`);
  ok(rΔ > 0, `Goryūka projectile deals damage (Δ=${rΔ})`);

  // REGRESSION — existing neutral Fireball still fires + deals damage.
  await reset(); await closeP2(200); const fb0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(24); await shot(`${tag}_06_fireball`);
  const fb1 = (await p2()).health; const fbΔ = Math.round(fb0 - fb1);
  console.log(`  Fireball (existing): Δ${fbΔ}`);
  ok(fbΔ > 0, `existing neutral Fireball still deals damage (Δ=${fbΔ})`);

  // REGRESSION — existing Fwd+Special Gunbai Fan-Swing still fires (melee; close range).
  await reset(); await closeP2(70); const gs0 = (await p2()).health;
  await page.keyboard.down("d"); await waitFrames(3); await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l"); await page.keyboard.up("d");
  await waitFrames(8); await shot(`${tag}_07_gunbai_swing`);
  const gs1 = (await p2()).health; const gsΔ = Math.round(gs0 - gs1);
  console.log(`  Gunbai Swing (existing, Fwd+Special): Δ${gsΔ}`);
  ok(gsΔ > 0, `existing Gunbai Fan-Swing still deals damage (Δ=${gsΔ})`);
}

await scenario("Hidden Leaf Village", "light");
await scenario("Null Void", "dark");

console.log(`\n  (pre-existing non-Madara drawSasukeAdultStance pageerrors seen: ${SASUKE_PERR} — expected, not this work)`);
console.log(`\n${FAILS === 0 ? "✅ ALL" : "❌ " + FAILS} MADARA WAR Phase-1 live checks ${FAILS === 0 ? "passed" : "FAILED"}; real-Madara pageerrors=${PERR}`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
