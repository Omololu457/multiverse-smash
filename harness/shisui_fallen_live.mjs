// harness/shisui_fallen_live.mjs — REAL render gate for SHISUI (FALLEN) Phase 1.
// Boots ?p1=shisui_fallen&p2=naruto, confirms the fighter LOADS (real Fallen sprites, not a box),
// stats (maxHealth 960, speed band), zero NEW page errors, and drives the Body-Flicker system:
// a Flicker-Step dash (teleport jump) that drops an afterimage, and the afterimage ABSORBING one hit
// (health-watch restore). P1 keys: a/d move, w jump, s crouch, j light, k heavy, l special, u ult, ; block.
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
const shot = n => page.screenshot({ path: path.join(OUT, `shisui_fallen_${n}.png`) });
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
// Count non-background pixels in the P1 half of the canvas → proves a real sprite is drawn (not a box/blank).
async function vividPixels() {
  return page.evaluate(() => {
    const cv = document.querySelector("canvas"); if (!cv) return -1;
    const g = cv.getContext("2d"); const w = cv.width, h = cv.height;
    const d = g.getImageData(0, Math.floor(h*0.25), Math.floor(w*0.6), Math.floor(h*0.6)).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) { const r=d[i],gg=d[i+1],b=d[i+2],a=d[i+3]; if (a>40 && (Math.abs(r-gg)>18||Math.abs(gg-b)>18||r>90)) n++; }
    return n;
  });
}

console.log("\n── SHISUI (FALLEN) — Phase-1 render gate ──");
await boot(`${base}/index.html?harness=1&p1=shisui_fallen&p2=naruto`);
await toBattle("Hidden Leaf Village");

const f0 = await p1();
ok(!!f0 && (f0.key || "").toLowerCase() === "shisui_fallen", `P1 is shisui_fallen (key=${f0 && f0.key})`);
ok(!!f0 && f0.maxHealth === 960, `stats loaded (maxHealth=${f0 && f0.maxHealth}, expect 960)`);
const ready = await page.evaluate(() => { try { return !!window.__harness.spritesReady?.(); } catch (_) { return null; } });
console.log(`  spritesReady=${ready} hp=${f0 && Math.round(f0.health)}/${f0 && f0.maxHealth}`);
await waitFrames(4);
const vp = await vividPixels();
console.log(`  vivid (non-bg) pixels in P1 region = ${vp}`);
ok(vp > 2000, `renders a real sprite, not a box/blank (px=${vp})`);
await shot(`01_idle`);

// Flicker Step — dash should TELEPORT (speed-tier teleport) and drop an afterimage.
await reset();
const bx = (await p1()).x;
await page.keyboard.down("d"); await page.keyboard.down("d"); await waitFrames(2); // ensure facing
await page.keyboard.up("d");
// double-tap dash forward
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(2);
await page.keyboard.down("d"); await waitFrames(3);
const ax = (await p1()).x; await shot(`02_flicker_dash`); await page.keyboard.up("d");
console.log(`  Flicker dash dx = ${Math.round(ax - bx)}`);
ok(Math.abs(ax - bx) >= 60, `Flicker Step traverses distance (dx=${Math.round(ax - bx)})`);

// Afterimage ABSORBS a hit — trigger a REAL Flicker-Step teleport (double-tap dash, the same blink that
// gave dx~462 above → spawns a ghost that lives ~32f), then deal damage WHILE the ghost is live.
// Body-Flicker should restore that HP the next tick and pop the ghost.
await reset();
// the earlier Flicker-dash test left the teleport on its ~48f dash cooldown — wait it out so THIS dash blinks.
await page.waitForFunction(() => (window.__harness.p1().dashCooldown || 0) === 0, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(4);
// reposition BOTH to mid-stage (the earlier dash pinned P1 near the wall → teleportBehindTarget had no room).
await page.evaluate(() => { const h = window.__harness; if (h.setP1X) h.setP1X(600); if (h.setP2X) h.setP2X(860); });
await waitFrames(2);
// double-tap forward dash → teleport blink → ghost spawned (ghost lives ~20f, so act TIGHTLY)
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(2);
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d");
// ONE tight burst: read ghost+hp AND apply the hit while the afterimage is still live.
const burst = await page.evaluate(() => {
  const f = window.__harness.p1(); const ghosts = f.flickGhosts, hp = f.health;
  window.__harness.damageP1?.(120);
  return { ghosts, hp };
});
console.log(`  live afterimages at hit = ${burst.ghosts}`);
ok(burst.ghosts >= 1, `Flicker Step spawns an afterimage (ghosts=${burst.ghosts})`);
await waitFrames(2);
const hpAfter = (await p1()).health;
console.log(`  hit-absorb: hp ${Math.round(burst.hp)} → (−120) → ${Math.round(hpAfter)} (ghost should restore)`);
await shot(`03_afterimage`);
ok(hpAfter >= burst.hp - 1, `afterimage absorbs the hit (hp restored ${Math.round(burst.hp)}→${Math.round(hpAfter)})`);

console.log(`\n  known/expected pageerrors (non-shisui): ${KNOWN}`);
ok(PERR === 0, `zero NEW page errors (PERR=${PERR})`);
console.log(`\n${FAILS === 0 ? "✅ PASS" : "❌ "+FAILS+" FAIL"} — shisui_fallen Phase-1 render gate`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
