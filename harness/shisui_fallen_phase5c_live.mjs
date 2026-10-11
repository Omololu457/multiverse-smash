// harness/shisui_fallen_phase5c_live.mjs — SHISUI (FALLEN) Phase 5c: SECOND SUSANOO TIER (Complete Avatar).
// Enter the Emerald Susanoo (Tier 1), then re-press Down+Ult at full meter to CLIMB to Tier 2 (the larger Altair
// "Storm" avatar): bigger shell HP, +40% kit damage, its own sprites. Verifies the climb, the HP bump, the
// stronger hit, and the bigger render. Driven via the shisuiFallenUlt hook (Down+Ult) + rawControls kit.
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
let PERR = 0, KNOWN = 0;
page.on("pageerror", e => { if (/drawSasukeAdultStance/.test(e.message)) { KNOWN++; return; } console.log("  PAGEERROR:", e.message); PERR++; });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sus = () => page.evaluate(() => window.__harness.shisuiFallenSusano("p1"));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle(stage) {
  if (stage) { try { await page.evaluate(n => window.__harness.selectStageByName?.(n), stage); } catch (_) {} }
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await setup();
}
async function setup() { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP1X?.(560); window.__harness.setP2X?.(720); }); await waitFrames(6); }
async function tap(key, hold = 3) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function emerald() {
  return page.evaluate(() => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(0, 0, Math.floor(w * 0.7), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i+1], b = d[i+2], a = d[i+3]; if (a > 40 && gg > 90 && gg > r + 25 && gg > b + 20) n++; } return n; });
}

console.log("\n══ SHISUI (FALLEN) — PHASE 5c: SECOND SUSANOO TIER ══");
await boot(`${base}/index.html?harness=1&p1=shisui_fallen&p2=naruto`);
await toBattle("Hidden Leaf Village");

// ENTER Tier 1.
await setup();
const enter = await page.evaluate(() => window.__harness.shisuiFallenUlt("emeraldSusanoo"));
await waitFrames(4);
const t1 = await sus(); const px1 = await emerald();
console.log(`  Tier 1: active=${t1.active}, tier=${t1.tier}, hp=${t1.hp}/${t1.max}, emerald px=${px1}`);
ok(t1.active && t1.tier === 1, `enters at Tier 1`);
ok(px1 > 3000, `Tier-1 avatar renders (px=${px1})`);
await page.screenshot({ path: path.join(OUT, "shisui_fallen_p5c_t1.png") });

// measure a Tier-1 Heavy hit.
await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2X?.(720); }); await waitFrames(2);
const h1a = (await p2()).health; await tap("k", 3); await waitFrames(36);
const t1dmg = Math.round(h1a - (await p2()).health);
console.log(`  Tier-1 Heavy Δ${t1dmg}`);

// CLIMB to Tier 2 — re-press Down+Ult at full meter.
await page.evaluate(() => window.__harness.fillEnergy?.()); await waitFrames(2);
const climb = await page.evaluate(() => window.__harness.shisuiFallenUlt("emeraldSusanoo"));
await waitFrames(6);
const t2 = await sus(); const px2 = await emerald();
console.log(`  Tier 2: cast=${climb.cast}, tier=${t2.tier}, hp=${t2.hp}/${t2.max}, emerald px=${px2}`);
ok(climb.cast && t2.tier === 2, `Down+Ult again CLIMBS to Tier 2`);
ok(t2.max >= 700, `Tier-2 shell HP bumps up (max=${t2.max})`);
ok(px2 > px1 * 1.15, `Tier-2 avatar renders BIGGER (px ${px1}→${px2})`);
await page.screenshot({ path: path.join(OUT, "shisui_fallen_p5c_t2.png") });

// measure a Tier-2 Heavy hit — should hit harder (+40%).
await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2X?.(720); }); await waitFrames(2);
const h2a = (await p2()).health; await tap("k", 3); await waitFrames(36);
const t2dmg = Math.round(h2a - (await p2()).health);
console.log(`  Tier-2 Heavy Δ${t2dmg} (vs Tier-1 Δ${t1dmg})`);
ok(t2dmg > t1dmg, `Tier-2 hits harder than Tier-1 (${t1dmg} → ${t2dmg})`);

// a 3rd press at Tier 2 → no-op (already maxed, meter kept).
await page.evaluate(() => window.__harness.fillEnergy?.()); await waitFrames(2);
const maxed = await page.evaluate(() => window.__harness.shisuiFallenUlt("emeraldSusanoo"));
ok(!maxed.cast && maxed.energy >= 115, `Tier 2 is the cap — a further climb no-ops (meter kept)`);

console.log(`\n  known/expected pageerrors (non-shisui): ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — shisui_fallen Phase 5c`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
