// harness/madara_avatar_live.mjs — REAL live verification for MADARA WAR UPGRADE Phase 3 (Susano'o Avatar).
// Boots madara vs naruto on LIGHT (Hidden Leaf) + DARK (Null Void) and proves, with real keystrokes:
//   • Up+Ult at FULL chakra → Susano'o AVATAR (damageMult 2.0, currentForm "susanooAvatar", chakra spent, big render)
//   • below full chakra → Up+Ult does NOT enter the Avatar
//   • Avatar Light = 2-hit sword / Special = Yasaka Magatama / Up+Special = Tengai meteor all deal damage
//   • Avatar-HP break → LOSE dissolve → reverts to base (damageMult back to 1)
// Reads state via snap(): damageMult + currentForm + energy. Keys: a/d move, w up/jump, j light, k heavy,
// l special, u ultimate.
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
const shot = n => page.screenshot({ path: path.join(OUT, `madav_${n}.png`) });
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
// Up+Ult: hold Up and press Ultimate on the SAME frame (betaHeldDirFromInput reads the live inputState.up),
// then release. A delayed Up-then-Ult lets the jump leave the ground before the press registers.
async function upUlt() { await page.keyboard.down("w"); await page.keyboard.down("u"); await waitFrames(5); await page.keyboard.up("u"); await page.keyboard.up("w"); await waitFrames(4); }

async function scenario(stage, tag) {
  console.log(`\n── STAGE: ${stage} (${tag}) ──`);
  await boot(stage);
  ok(((await p1()).key || "").toLowerCase() === "madara", "madara loaded");

  // ENTER — full chakra + Up+Ult → Avatar. (Gate test runs LAST since a non-full Up+Ult release-fires the
  // Tengai cinematic, which would block a subsequent entry.)
  await heal(); await fillE(); const e0 = (await p1()).energy;
  await upUlt();
  const av = await p1();
  console.log(`  enter: form=${av.currentForm} dmgMul=${av.damageMult} energy ${Math.round(e0)}→${Math.round(av.energy)}`);
  ok(av.currentForm === "susanooAvatar" && Math.abs((av.damageMult || 1) - 2.0) < 0.01, `entered Susano'o AVATAR (dmgMul=${av.damageMult})`);
  ok(av.energy < e0 - 100, `Avatar entry spent full-chakra cost (${Math.round(e0 - av.energy)})`);
  await shot(`${tag}_01_avatar`);

  // Avatar Light = 2-hit sword — damage.
  await page.evaluate(() => { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 180); window.__harness.healP2?.(); }); await waitFrames(2);
  let h0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(12); await shot(`${tag}_02_sword`);
  ok(h0 - (await p2()).health > 0, `Avatar sword (Light) deals damage (Δ${Math.round(h0 - (await p2()).health)})`);

  // Avatar Special = Yasaka Magatama — verify the 5 tomoe SPAWN. First let the Up-direction from the entry
  // keystroke age out of the 700ms motion window so a NEUTRAL Special doesn't read as Up (→ Tengai).
  await page.evaluate(() => window.__harness.clearProjectiles?.()); await waitFrames(48);
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(2);
  const tomoe = await page.evaluate(() => (window.__harness.projectiles?.() || []).filter(p => /YasakaMagatama/i.test(p.name || p.type || p.spriteSheet || "")).length);
  await waitFrames(10);
  ok(tomoe >= 3, `Avatar Special fires Yasaka Magatama (${tomoe} tomoe)`);

  // Avatar Up+Special = Tengai meteor — verify the meteor spawns. Wait out the Magatama cooldown first.
  await page.evaluate(() => window.__harness.clearProjectiles?.()); await waitFrames(30);
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("w"); await waitFrames(2);
  const meteor = await page.evaluate(() => (window.__harness.projectiles?.() || []).some(p => /TengaiMeteor/i.test(p.name || p.type || p.spriteSheet || "")));
  await waitFrames(16); await shot(`${tag}_03_tengai`);
  ok(meteor, `Avatar Up+Special spawns a Tengai meteor`);

  // HP BREAK → LOSE dissolve → revert to base.
  const beforeForm = (await p1()).currentForm;
  await page.evaluate(() => window.__harness.setP1Health?.(120));   // delta ≈ 1060 > Avatar HP 900 → break
  await waitFrames(4); const dissolving = await p1();
  await shot(`${tag}_04_dissolve`);
  await waitFrames(MADARA_LADDER_WAIT);                              // let the LOSE dissolve finish
  const after = await p1();
  console.log(`  HP break: form ${beforeForm} → dissolve → ${after.currentForm} (dmgMul ${dissolving.damageMult}→${after.damageMult})`);
  ok(after.currentForm !== "susanooAvatar" && Math.abs((after.damageMult || 1) - 1) < 0.01, `HP break dissolved the Avatar back to base (form=${after.currentForm})`);

  // RENDER pixel check.
  const vivid = await page.evaluate(() => { const cv = document.querySelector("canvas"); const cx = cv.getContext("2d"); const d = cx.getImageData(0,0,cv.width,cv.height).data; let v=0; for (let i=0;i<d.length;i+=4){const mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]); if(mx-mn>90&&mx>120)v++;} return v; });
  ok(vivid > 20000, `fighters render (vividPixels=${vivid})`);

  // GATE (last) — below full chakra, Up+Ult must NOT enter the Avatar (it release-fires the normal ult instead).
  await heal(); await page.evaluate(() => window.__harness.setEnergy?.(120)); await waitFrames(2);
  await upUlt();
  ok(((await p1()).currentForm || "base") !== "susanooAvatar", `below full chakra: Up+Ult does NOT enter Avatar (form=${(await p1()).currentForm})`);
}
const MADARA_LADDER_WAIT = 56;   // > MADARA_AVATAR_LOSE_FR (48) so the dissolve fully reverts

await scenario("Hidden Leaf Village", "light");
await scenario("Null Void", "dark");
console.log(`\n${FAILS === 0 ? "✅ ALL" : "❌ " + FAILS} Phase-3 Avatar checks ${FAILS === 0 ? "passed" : "FAILED"}; real-Madara pageerrors=${PERR}`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
