// harness/shisui_fallen_phase5b_live.mjs — SHISUI (FALLEN) Phase 5b: SUSANOO ARM GRAB (Forward+Grab).
// Verifies a spectral emerald Susanoo arm snatches the foe (resolveGrab) and slams them for damage, renders,
// and that a PLAIN grab (no forward) does not fire it. P1 keys: a/d move, o grab, ; block.
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
const arm = () => page.evaluate(() => window.__harness.shisuiFallenArm("p1"));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle(stage) {
  if (stage) { try { await page.evaluate(n => window.__harness.selectStageByName?.(n), stage); } catch (_) {} }
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await setup();
}
async function setup(p1x = 560, p2x = 672) {
  await page.evaluate(([a, b]) => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP1X?.(a); window.__harness.setP2X?.(b); }, [p1x, p2x]);
  await page.waitForFunction(() => { const f = window.__harness.p1(); return (f.dashCooldown || 0) === 0 && (f.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(6);
}

console.log("\n══ SHISUI (FALLEN) — PHASE 5b: SUSANOO ARM GRAB ══");
await boot(`${base}/index.html?harness=1&p1=shisui_fallen&p2=naruto`);
await toBattle("Hidden Leaf Village");

// FORWARD + GRAB → the Susanoo arm fires, snatches the foe, slams for damage.
{ await setup(560, 672);
  const h0 = (await p2()).health;
  await page.keyboard.down("d"); await waitFrames(2);
  await page.keyboard.down("o"); await waitFrames(2); await page.keyboard.up("o");
  await waitFrames(3);
  const a1 = await arm();
  console.log(`  arm fired: active=${a1.active}, grabbed=${a1.grabbed}, throwDmg=${a1.throwDmg}`);
  ok(a1.active, `Forward+Grab fires the Susanoo Arm`);
  // emerald arm renders
  const px = await page.evaluate(() => {
    const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height;
    const d = g.getImageData(0, Math.floor(h * 0.3), Math.floor(w * 0.7), Math.floor(h * 0.5)).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i+1], b = d[i+2], aa = d[i+3]; if (aa > 40 && gg > 110 && gg > r + 30 && gg > b + 20) n++; }
    return n;
  });
  await page.screenshot({ path: path.join(OUT, "shisui_fallen_p5b_grab.png") });
  ok(px > 300, `the emerald Susanoo arm renders (px=${px})`);
  await page.keyboard.up("d");
  // the slam deals damage
  await waitFrames(50);
  const dmg = Math.round(h0 - (await p2()).health);
  console.log(`  grab + slam: foe Δ${dmg}`);
  ok(dmg > 0, `the grab snatches + slams the foe for damage (Δ=${dmg})`);
}
// PLAIN grab (no forward) must NOT fire the Susanoo arm (stays a normal throw).
{ await setup(560, 672);
  await page.keyboard.down("o"); await waitFrames(3); await page.keyboard.up("o");
  const a = await arm();
  console.log(`  plain Grab (no forward): arm active=${a.active}`);
  ok(!a.active, `a plain Grab does NOT fire the Susanoo Arm (normal throw preserved)`);
}

console.log(`\n  known/expected pageerrors (non-shisui): ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ " + FAILS + " FAIL"} — shisui_fallen Phase 5b`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
