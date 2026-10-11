// harness/shisui_fallen_phase5a_live.mjs — SHISUI (FALLEN) Phase 5a: dash-through cross-up + Mangekyō Sharingan
// + ribcage guard. Verifies: Fwd+Special flickers THROUGH the foe to the far side (dealing damage); the
// Mangekyō charge-tap toggle lights/drains/fatigues + buffs damage; the emerald Susanoo ribcage renders while
// blocking. P1 keys: a/d move, j light, k heavy, l special, u ult, ; block, p charge.
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
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle(stage) {
  if (stage) { try { await page.evaluate(n => window.__harness.selectStageByName?.(n), stage); } catch (_) {} }
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await setup();
}
async function setup(p1x = 560, p2x = 720) {
  await page.evaluate(([a, b]) => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP1X?.(a); window.__harness.setP2X?.(b); }, [p1x, p2x]);
  await page.waitForFunction(() => { const f = window.__harness.p1(); return (f.dashCooldown || 0) === 0 && (f.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(6);
}
const spec = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

console.log("\n══ SHISUI (FALLEN) — PHASE 5a ══");
await boot(`${base}/index.html?harness=1&p1=shisui_fallen&p2=naruto`);
await toBattle("Hidden Leaf Village");

// DASH-THROUGH cross-up — P1 starts LEFT of the foe, flickers THROUGH to the RIGHT side + deals damage.
{ await setup(560, 720);
  const px0 = (await p1()).x, qx = (await p2()).x, h0 = (await p2()).health;
  await spec("F"); await waitFrames(10);
  const px1 = (await p1()).x, h1 = (await p2()).health;
  const crossed = (px0 < qx) && (px1 > qx);   // was left of foe, now right of foe
  console.log(`  dash-through: P1 ${Math.round(px0)}→${Math.round(px1)} (foe at ${Math.round(qx)}), foe Δ${Math.round(h0 - h1)}`);
  ok(crossed, `Fwd+Special flickers THROUGH to the far side (${Math.round(px0)}→${Math.round(px1)}, foe ${Math.round(qx)})`);
  ok(h1 < h0, `dash-through cuts the foe on the way past (Δ=${Math.round(h0 - h1)})`);
}
// MANGEKYŌ SHARINGAN — charge-tap toggle lights it, drains Chakra, toggles off; +8% damage while lit.
{ await setup();
  const on = await page.evaluate(() => window.__harness.shisuiFallenSharingan("p1"));
  console.log(`  Sharingan toggle ON: active=${on.active}, energy=${on.energy}`);
  ok(on.active, `Mangekyō Sharingan lights on a charge-tap`);
  const e0 = (await p1()).energy; await waitFrames(40); const e1 = (await p1()).energy;
  console.log(`  Sharingan drain: energy ${Math.round(e0)}→${Math.round(e1)}`);
  ok(e1 < e0, `the Mangekyō drains Chakra while lit (${Math.round(e0)}→${Math.round(e1)})`);
  ok((await p1()).sharingan, `telemetry reports it lit`);
  const off = await page.evaluate(() => window.__harness.shisuiFallenSharingan("p1"));
  ok(!off.active, `a second charge-tap turns it off`);
  // fatigue: re-light, force Chakra to near-0 → the upkeep shuts it off + sets a fatigue lockout
  await page.evaluate(() => window.__harness.shisuiFallenSharingan("p1"));   // light again
  await page.evaluate(() => window.__harness.setP1Energy(1));
  await waitFrames(16);
  const fat = await p1();
  console.log(`  Sharingan @0 chakra: active=${fat.sharingan}, fatigue=${fat.sharinganFatigue}`);
  ok(!fat.sharingan && fat.sharinganFatigue > 0, `the Mangekyō shuts off + fatigues when Chakra runs out (fatigue=${fat.sharinganFatigue})`);
}
// RIBCAGE GUARD — hold block; the emerald Susanoo ribcage shell grows in front of the body.
{ await setup(640, 980);   // foe far away so the shell isn't confused with the foe
  await page.keyboard.down(";"); await waitFrames(16);
  const px = await page.evaluate(() => {
    const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height;
    const d = g.getImageData(0, Math.floor(h * 0.45), Math.floor(w * 0.6), Math.floor(h * 0.4)).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i+1], b = d[i+2], a = d[i+3]; if (a > 40 && gg > 90 && gg > r + 25 && gg > b + 15) n++; }
    return n;
  });
  await page.screenshot({ path: path.join(OUT, "shisui_fallen_p5a_ribcage.png") });
  await page.keyboard.up(";");
  console.log(`  ribcage emerald pixels while blocking = ${px}`);
  ok(px > 400, `the emerald Susanoo ribcage shell renders while guarding (px=${px})`);
}

console.log(`\n  known/expected pageerrors (non-shisui): ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — shisui_fallen Phase 5a`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
