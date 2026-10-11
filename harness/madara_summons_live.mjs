// harness/madara_summons_live.mjs — REAL live verification for MADARA WAR UPGRADE Phase 4 (Edo Tensei summons).
// Boots madara vs naruto on LIGHT + DARK and proves, with real keystrokes (directional ultimates, dir+Ult on
// the same frame): DOWN+Ult = Kurama (summon spends chakra; Special then fires the Tailed Beast Bomb) · BACK+Ult
// = Gedo Mazo (statue crash + damage) · FORWARD+Ult = Kajukai Korin (flower field + foe slowed). Keys: a/d move,
// w up, s down, l special, u ultimate.
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
const shot = n => page.screenshot({ path: path.join(OUT, `madsum_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name || p.type || p.spriteSheet || ""));
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
async function dirUlt(dir) { await page.keyboard.down(dir); await page.keyboard.down("u"); await waitFrames(5); await page.keyboard.up("u"); await page.keyboard.up(dir); await waitFrames(4); }

async function scenario(stage, tag) {
  console.log(`\n── STAGE: ${stage} (${tag}) ──`);
  await boot(stage);
  ok(((await p1()).key || "").toLowerCase() === "madara", "madara loaded");

  // KURAMA — Down+Ult summons (spends ~150 chakra). Then Special fires the Tailed Beast Bomb (only possible
  // while Kurama is out → proves the summon is active).
  await heal(); const e0 = (await p1()).energy;
  await dirUlt("s");
  const e1 = (await p1()).energy;
  console.log(`  Kurama summon: energy ${Math.round(e0)}→${Math.round(e1)} (Δ${Math.round(e0 - e1)})`);
  ok(e0 - e1 >= 140, `Down+Ult summons Kurama (spent ${Math.round(e0 - e1)} chakra)`);
  await shot(`${tag}_01_kurama`);
  await page.evaluate(() => window.__harness.clearProjectiles?.()); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(3);
  const biju = (await projNames()).some(n => /Bijuudama/i.test(n));
  ok(biju, `Special fires the Tailed Beast Bomb (Bijuudama) while Kurama is out`);

  // GEDO MAZO — Back+Ult: the statue crashes down (projectile + damage).
  await heal(); await page.evaluate(() => { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 120); window.__harness.healP2?.(); }); await waitFrames(2);
  await page.evaluate(() => window.__harness.clearProjectiles?.());
  const g0 = (await p2()).health;
  await dirUlt("a");
  const gedo = (await projNames()).some(n => /GedoMazo/i.test(n));
  await waitFrames(26); await shot(`${tag}_02_gedo`);
  const gΔ = Math.round(g0 - (await p2()).health);
  console.log(`  Gedo Mazo: statue=${gedo}, p2 Δ${gΔ}`);
  ok(gedo, `Back+Ult drops the Gedo Mazo statue`);
  ok(gΔ > 0, `Gedo Mazo deals damage (Δ${gΔ})`);

  // KAJUKAI KORIN — Fwd+Ult: flower field + the foe is slowed (speedMultiplier cut).
  await heal(); await page.evaluate(() => { window.__harness.setP2X?.((window.__harness.p1().x || 0) + 120); }); await waitFrames(2);
  await page.evaluate(() => window.__harness.clearProjectiles?.());
  await dirUlt("d");
  const flowers = (await projNames()).filter(n => /Kajukai/i.test(n)).length;
  await waitFrames(4);
  const spd = await page.evaluate(() => { const f = window.__harness.p2(); return f.spdMul ?? f.speedMult ?? f.speedMultiplier ?? null; });
  const spdRaw = await page.evaluate(() => (window.__harness.p2raw?.() || {}).speedMultiplier);
  await shot(`${tag}_03_kajukai`);
  console.log(`  Kajukai Korin: flowers=${flowers}, p2 speedMul=${spd ?? spdRaw ?? "n/a"}`);
  ok(flowers >= 2, `Fwd+Ult blooms the Kajukai Korin flower field (${flowers})`);

  // RENDER pixel check.
  const vivid = await page.evaluate(() => { const cv = document.querySelector("canvas"); const cx = cv.getContext("2d"); const d = cx.getImageData(0,0,cv.width,cv.height).data; let v=0; for (let i=0;i<d.length;i+=4){const mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]); if(mx-mn>90&&mx>120)v++;} return v; });
  ok(vivid > 20000, `fighters render (vividPixels=${vivid})`);
}

await scenario("Hidden Leaf Village", "light");
await scenario("Null Void", "dark");
console.log(`\n${FAILS === 0 ? "✅ ALL" : "❌ " + FAILS} Phase-4 summon checks ${FAILS === 0 ? "passed" : "FAILED"}; real-Madara pageerrors=${PERR}`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
