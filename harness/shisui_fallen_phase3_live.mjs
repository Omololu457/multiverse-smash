// harness/shisui_fallen_phase3_live.mjs — REAL live verification of SHISUI (FALLEN) Phase 3: EMERALD SUSANOO.
// Enters via Down+Ult (hook stamps _ultVariant="emeraldSusanoo"), confirms the giant is live + renders, drives
// its rawControls kit (Light=punch / Heavy=sword / Special=Yasaka Magatama volley / Ultimate=Totsuka Seal),
// proves the HP-absorb (damage redirected to the shell, Shisui refunded), and the HP-break exit → revert.
// P1 keys: a/d move, j light, k heavy, l special, u ultimate.
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
const shot = n => page.screenshot({ path: path.join(OUT, `shisui_fallen_p3_${n}.png`) });
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
async function setup() {
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP1X?.(560); window.__harness.setP2X?.(720); });
  await waitFrames(6);
}
async function enter() { return page.evaluate(() => window.__harness.shisuiFallenUlt("emeraldSusanoo")); }
async function tap(key, hold = 3) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
// vivid emerald pixels in the P1 region (giant Susanoo is emerald green, drawn behind)
async function emeraldPixels() {
  return page.evaluate(() => {
    const cv = document.querySelector("canvas"); if (!cv) return -1;
    const g = cv.getContext("2d"); const w = cv.width, h = cv.height;
    const d = g.getImageData(0, 0, Math.floor(w * 0.7), h).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i+1], b = d[i+2], a = d[i+3]; if (a > 40 && gg > 90 && gg > r + 25 && gg > b + 20) n++; }
    return n;
  });
}

console.log("\n── SHISUI (FALLEN) — Phase 3: EMERALD SUSANOO ──");
await boot(`${base}/index.html?harness=1&p1=shisui_fallen&p2=naruto`);
await toBattle("Hidden Leaf Village");

// ENTER via Down+Ult.
{ await setup(); const e0 = (await p1()).energy;
  const r = await enter(); await waitFrames(4);
  const S = await sus();
  console.log(`  enter: cast=${r.cast}, active=${S.active}, hp=${S.hp}/${S.max}, pose=${S.pose}, energy ${Math.round(e0)}→${S.energy}`);
  ok(r.cast && S.active, `Down+Ult enters Emerald Susanoo`);
  ok(S.hp === S.max && S.max >= 400, `Susanoo spawns with full shell HP (${S.hp}/${S.max})`);
  ok(S.energy <= 25, `entering consumed the meter (energy=${S.energy})`);
  const px = await emeraldPixels();
  console.log(`  emerald pixels behind P1 = ${px}`);
  ok(px > 3000, `the giant emerald avatar renders (px=${px})`);
  await shot("01_enter");
}
// LIGHT = winged punch → damages the foe.
{ const h0 = (await p2()).health; await tap("j", 3); await waitFrames(24);
  const dmg = Math.round(h0 - (await p2()).health);
  console.log(`  Light (punch): foe Δ${dmg}`);
  ok(dmg > 0, `Susanoo Light (punch) hits (Δ=${dmg})`);
}
// HEAVY = sword slash → bigger damage.
{ await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2X?.(720); }); await waitFrames(2);
  const h0 = (await p2()).health; await tap("k", 3); await waitFrames(36);
  const dmg = Math.round(h0 - (await p2()).health);
  console.log(`  Heavy (sword): foe Δ${dmg}`);
  ok(dmg > 0, `Susanoo Heavy (sword) hits (Δ=${dmg})`);
  await shot("02_sword");
}
// neutral SPECIAL = Yasaka Magatama volley → projectiles damage the foe.
{ await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2X?.(760); }); await waitFrames(2);
  const h0 = (await p2()).health; await tap("l", 3); await waitFrames(60);
  const dmg = Math.round(h0 - (await p2()).health);
  console.log(`  Special (Yasaka Magatama volley): foe Δ${dmg}`);
  ok(dmg > 0, `Magatama volley hits (Δ=${dmg})`);
}
// ULTIMATE (Susanoo) = Totsuka Seal → one big guaranteed hit.
{ await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2X?.(720); }); await waitFrames(2);
  const h0 = (await p2()).health; await tap("u", 3); await waitFrames(60);
  const dmg = Math.round(h0 - (await p2()).health);
  console.log(`  Ultimate (Totsuka Seal): foe Δ${dmg}`);
  ok(dmg >= 100, `Totsuka Seal lands a big guaranteed hit (Δ=${dmg})`);
  await shot("03_totsuka");
}
// HP-ABSORB: damage Shisui → redirected to the shell (Shisui refunded, shell HP drops).
{ const S0 = await sus(); const hp0 = (await p1()).health;
  await page.evaluate(() => window.__harness.damageP1?.(140)); await waitFrames(3);
  const S1 = await sus(); const hp1 = (await p1()).health;
  console.log(`  HP-absorb: Shisui ${Math.round(hp0)}→${Math.round(hp1)}, shell ${S0.hp}→${S1.hp}`);
  ok(Math.abs(hp1 - hp0) <= 4, `incoming damage refunded to Shisui (HP held ${Math.round(hp0)}→${Math.round(hp1)})`);
  ok(S1.hp < S0.hp, `the shell absorbed it instead (shell ${S0.hp}→${S1.hp})`);
}
// HP-BREAK exit: drain the shell → Susanoo reverts, Shisui survives.
{ for (let i = 0; i < 6; i++) { await page.evaluate(() => window.__harness.damageP1?.(120)); await waitFrames(2); }
  await waitFrames(4);
  const S = await sus(); const hp = (await p1()).health;
  console.log(`  HP-break: active=${S.active}, Shisui health=${Math.round(hp)}`);
  ok(!S.active, `shell break reverts the Susanoo`);
  ok(hp > 1, `Shisui survives the revert (health=${Math.round(hp)})`);
}

console.log(`\n  known/expected pageerrors (non-shisui): ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — shisui_fallen Phase 3`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
