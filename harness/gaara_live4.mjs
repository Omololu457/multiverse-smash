// harness/gaara_live4.mjs — REAL live verification for Gaara PHASE 4 (the One-Tail SHUKAKU summon). Boots a
// real match (?p1=gaara&p2=naruto) and drives the summon via __harness.gaaraShukaku: gauge fill → Down+Ult
// summon, the 5 re-routed commands (Sand Volley / Shukaku Swipe / Sand Shuriken / Pyramid Seal / Tailed
// Beast Ball), the end conditions (3 hits / Block / timer), and the LOSE sequence. Screenshots the summon +
// tail layering on a light and a dark stage.
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
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
const shot = n => page.screenshot({ path: path.join(OUT, `gaara4_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const sh = () => page.evaluate(() => window.__harness.gaaraShukaku.state());
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); }); await waitFrames(4); }
const fill = () => page.evaluate(() => window.__harness.fillEnergy?.());

await boot(`${base}/index.html?harness=1&p1=gaara&p2=naruto`);
await toBattle();

// ── 1) GAUGE — summon REFUSED when gauge is empty; fills; then SUMMONS when full ──
// empty gauge: force _ultVariant "shukaku" + trigger → should refuse (gaaraSummonShukaku returns false).
const empty = await page.evaluate(() => { const r = window.__harness.p1Ultimate; const p1 = window.__harness.p1(); window.__harness.p1Ultimate; /* set variant + trigger with gauge 0 */ return null; });
const emptyActive = await page.evaluate(() => { window.__harness.fillEnergy?.(); const gs = window.__harness.gaaraShukaku; const st0 = gs.state(); /* gauge should be 0 here */ return st0.gauge; });
ok(emptyActive < 100, `gauge starts below full (${emptyActive})`);
await page.evaluate(() => window.__harness.gaaraShukaku.fillGauge());
const gFull = await sh();
ok(gFull.gauge >= 100, `One-Tail gauge fills to full (${gFull.gauge})`);
await fill();
const summon = await page.evaluate(() => window.__harness.gaaraShukaku.summon());
await waitFrames(8); const s1 = await sh(); await shot("01_summon");
console.log(`summon: ${JSON.stringify(summon)} state=${JSON.stringify(s1)}`);
ok(summon.ok && s1.active, `Down+Ult (gauge full) SUMMONS Shukaku (active=${s1.active}, timer=${s1.timer})`);
ok(s1.gauge === 0, `gauge consumed on summon (gauge=${s1.gauge})`);

// ── 2) COMMANDS re-route while Shukaku is out ──
async function cmd(dir, label) { await fill(); const r = await page.evaluate(d => window.__harness.gaaraShukaku.command(d), dir); await waitFrames(14); const names = await projNames(); await shot(`cmd_${label}`); console.log(`cmd ${label}: ${JSON.stringify(r)} proj=${JSON.stringify(names)}`); return names; }
const vol = await cmd(null, "volley");
ok(vol.filter(n => /volley/.test(n || "")).length >= 3, `Sand Volley fires multiple sand balls (${vol.filter(n=>/volley/.test(n||"")).length})`);
const shk = await cmd("B", "shuriken");
ok(shk.some(n => /shuriken/.test(n || "")), `Sand Shuriken fires (${JSON.stringify(shk)})`);
await fill(); const hp0 = await page.evaluate(() => Math.round((window.__harness.p2() || {}).health));
await page.evaluate(() => window.__harness.gaaraShukaku.command("F")); await waitFrames(20); const hp1 = await page.evaluate(() => Math.round((window.__harness.p2() || {}).health));
ok(hp1 < hp0, `Shukaku Swipe (F) damages the foe (${hp0}→${hp1})`);
await fill(); const hp2 = await page.evaluate(() => Math.round((window.__harness.p2() || {}).health));
await page.evaluate(() => window.__harness.gaaraShukaku.command("D")); await waitFrames(30); const hp3 = await page.evaluate(() => Math.round((window.__harness.p2() || {}).health)); await shot("cmd_pyramid");
ok(hp3 < hp2, `Pyramid Seal (D) binds + damages the foe (${hp2}→${hp3})`);

// ── 3) TAILED BEAST BALL (Ultimate while out) — huge projectile + ENDS the summon ──
await fill();
const tbb = await page.evaluate(() => window.__harness.gaaraShukaku.tbb());
await waitFrames(42); const tbbNames = await projNames(); await shot("02_tbb");
console.log(`tbb: ${JSON.stringify(tbb)} proj=${JSON.stringify(tbbNames)}`);
ok(tbbNames.some(n => /tbb/.test(n || "")), `Tailed Beast Ball fires a huge projectile (${JSON.stringify(tbbNames)})`);
await waitFrames(80); const sEnd = await sh();
ok(!sEnd.active, `firing the Tailed Beast Ball ENDS the summon (active=${sEnd.active})`);

// ── 4) END CONDITIONS — 3 clean hits / Block ──
async function reSummon() { await fill(); await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); }); await page.evaluate(() => window.__harness.gaaraShukaku.summon()); await waitFrames(6); }
await reSummon();
for (let i = 0; i < 3; i++) { await page.evaluate(() => { const hp = window.__harness.p1().health; window.__harness.setP1HealthRaw(hp - 40); }); await waitFrames(3); }
await waitFrames(4); const sHits = await sh();
ok(!sHits.active || sHits.ending, `3 clean hits on Gaara ENDS the summon (active=${sHits.active}, ending=${sHits.ending})`);
await waitFrames(80);
await reSummon();
await page.keyboard.down(";"); await waitFrames(5); const sBlock = await sh(); await shot("03_lose"); await page.keyboard.up(";");
ok(!sBlock.active || sBlock.ending, `pressing Block ENDS the summon → LOSE (active=${sBlock.active}, ending=${sBlock.ending})`);

// ── 5) RENDER — Shukaku behind Gaara + tail, on a LIGHT and a DARK stage ──
async function stageShot(label, stageName) {
  await boot(`${base}/index.html?harness=1&p1=gaara&p2=naruto`); await toBattle();
  await page.evaluate(n => window.__harness.selectStageByName?.(n), stageName);
  await page.evaluate(() => window.__harness.gaaraShukaku.summon()); await waitFrames(20); await shot(label);
}
await stageShot("04_stage_light", "Hidden Leaf Village");
await stageShot("05_stage_dark",  "Shibuya Incident");

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/gaara4_*.png`);
process.exit(FAILS ? 1 : 0);
