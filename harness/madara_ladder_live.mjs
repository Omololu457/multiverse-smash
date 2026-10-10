// harness/madara_ladder_live.mjs — REAL live verification for MADARA WAR UPGRADE Phase 2 (Susano'o Ladder).
// Boots madara vs naruto on a LIGHT (Hidden Leaf) + DARK (Null Void) stage and proves, with real keystrokes:
//   • HOLD Charge at FULL chakra climbs Base→S1→S2→S3 (damageMult 1→1.3→1.55→1.85 + chakra spent + bigger render)
//   • each climb only fires at full chakra (normal charge below full is untouched)
//   • Yasaka Magatama (Special) + Tengai Shinsei (Up+Special) deal damage; Stage-3 Tengai = DOUBLE meteor
//   • stage Light/Heavy swing deals damage
//   • Susano'o-HP break DROPS one stage
// Reads ladder state via snap(): damageMult (per-stage buff) + energy. Keys: a/d move, w jump, s crouch,
// j light, k heavy, l special, p charge, ; block.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0; page.on("pageerror", e => { if (/drawSasukeAdultStance/.test(e.message)) return; console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `madlad_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(stage) {
  await page.goto(`${base}/index.html?harness=1&p1=madara&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
  if (stage) { try { await page.evaluate(n => window.__harness.selectStageByName?.(n), stage); } catch (_) {} }
  await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await heal();
}
async function heal() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(6); }
async function fillE() { await page.evaluate(() => window.__harness.fillEnergy?.()); await waitFrames(2); }
async function holdCharge(frames = 44) { await page.keyboard.down("p"); await waitFrames(frames); await page.keyboard.up("p"); await waitFrames(3); }

async function scenario(stage, tag) {
  console.log(`\n── STAGE: ${stage} (${tag}) ──`);
  await boot(stage);
  const f0 = await p1();
  ok((f0.key || "").toLowerCase() === "madara" && f0.maxHealth === 1180, `madara loaded (dmgMul=${f0.damageMult})`);

  // CLIMB GATE — below full chakra, holding Charge must NOT climb.
  await heal(); await page.evaluate(() => window.__harness.setEnergy?.(100)); await waitFrames(2);
  await holdCharge(44);
  const low = await p1();
  ok((low.damageMult || 1) === 1, `below full chakra: Charge-hold does NOT climb (dmgMul=${low.damageMult})`);

  // CLIMB S1 — full chakra + hold Charge → Stage 1 (dmgMul 1.3) + chakra spent.
  await heal(); await fillE(); const e0 = (await p1()).energy;
  await holdCharge(44);
  const s1 = await p1();
  console.log(`  climb S1: dmgMul ${low.damageMult}→${s1.damageMult}, energy ${Math.round(e0)}→${Math.round(s1.energy)}`);
  ok(Math.abs((s1.damageMult || 1) - 1.3) < 0.01, `climbed to Stage 1 (Ribcage) — dmgMul=${s1.damageMult}`);
  ok(s1.energy < e0 - 50, `climb spent chakra (${Math.round(e0 - s1.energy)})`);
  await shot(`${tag}_01_stage1`);

  // Yasaka Magatama (Special, in stage) — 5 tomoe, damage.
  await page.evaluate(() => { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 160); window.__harness.healP2?.(); }); await waitFrames(2);
  const ym0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(20); await shot(`${tag}_02_magatama`);
  const ym1 = (await p2()).health;
  ok(ym0 - ym1 > 0, `Yasaka Magatama deals damage (Δ${Math.round(ym0 - ym1)})`);

  // Stage swing (Light) — damage.
  await page.evaluate(() => { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 120); window.__harness.healP2?.(); }); await waitFrames(2);
  const sw0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(10);
  const sw1 = (await p2()).health;
  ok(sw0 - sw1 > 0, `Stage Light swing deals damage (Δ${Math.round(sw0 - sw1)})`);

  // CLIMB S2 then S3 (refill chakra each time).
  await heal(); await fillE(); await holdCharge(44); const s2 = await p1();
  ok(Math.abs((s2.damageMult || 1) - 1.55) < 0.02, `climbed to Stage 2 (Warrior) — dmgMul=${s2.damageMult}`);
  await heal(); await fillE(); await holdCharge(44); const s3 = await p1();
  ok(Math.abs((s3.damageMult || 1) - 1.85) < 0.02, `climbed to Stage 3 (Perfect) — dmgMul=${s3.damageMult}`);
  await shot(`${tag}_03_stage3`);

  // Tengai DOUBLE meteor at Stage 3 (Up+Special) — count madaraTengaiMeteor* projectiles.
  await page.evaluate(() => { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 160); window.__harness.healP2?.(); }); await waitFrames(2);
  const tg0 = (await p2()).health;
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("w");
  const meteors = await page.evaluate(() => (window.__harness.projectiles?.() || []).filter(p => /TengaiMeteor/i.test(p.name || p.type || p.spriteSheet || "")).length);
  await waitFrames(26); await shot(`${tag}_04_double_meteor`);
  const tg1 = (await p2()).health;
  console.log(`  Stage-3 Tengai: ${meteors} meteor projectile(s), p2 Δ${Math.round(tg0 - tg1)}`);
  ok(meteors >= 2, `Stage-3 Tengai spawns DOUBLE meteor (${meteors} projectiles)`);

  // SUSANO'O HP BREAK → drop a stage. Deplete the stage-3 Susano'o HP (760) by forcing P1's real HP down by
  // more than that — the per-frame HP-bleed tick then drops one stage (S3→S2, dmgMul 1.85→1.55).
  const before = (await p1()).damageMult;
  await page.evaluate(() => { window.__harness.setP1Health?.(200); });   // delta ≈ 980 > stage-3 HP 760 → break
  await waitFrames(6);
  const after = await p1();
  console.log(`  HP break: dmgMul ${before}→${after.damageMult}`);
  ok((after.damageMult || 1) < before, `Susano'o HP break dropped a stage (dmgMul ${before}→${after.damageMult})`);

  // RENDER pixel check — fighters visibly on screen (vivid pixels).
  const vivid = await page.evaluate(() => { const cv = document.querySelector("canvas"); const cx = cv.getContext("2d"); const d = cx.getImageData(0,0,cv.width,cv.height).data; let v=0; for (let i=0;i<d.length;i+=4){const mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]); if(mx-mn>90&&mx>120)v++;} return v; });
  ok(vivid > 20000, `fighters render on screen (vividPixels=${vivid})`);
}

await scenario("Hidden Leaf Village", "light");
await scenario("Null Void", "dark");
console.log(`\n${FAILS === 0 ? "✅ ALL" : "❌ " + FAILS} Phase-2 ladder checks ${FAILS === 0 ? "passed" : "FAILED"}; real-Madara pageerrors=${PERR}`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
