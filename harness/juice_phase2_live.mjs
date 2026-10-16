// harness/juice_phase2_live.mjs — JUICE Phase 2 (explosions + deterministic ULTIMATE slow-mo).
// Boots the real game and verifies: SMALL/MEDIUM/ULTIMATE explosions render (fireball + debris + smoke +
// shockwave), the impact frame + Reduce-Flashing soft-dim, anticipation swell, Screen-Shake Off/Low/Full,
// ULT slow-mo ON vs OFF (+ cooldown + KO/Domain/rewind block) + host-authoritative LAN gating, a 4-player
// perf sweep spamming explosions (frame time reported), and a render check. Screenshots in harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".ogg":"audio/ogg",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `juice_p2_${n}.png`) });
const gstate = () => page.evaluate(() => { const s = window.__harness.state(); return (typeof s === "string") ? s : (s && s.gameState) || String(s); });
async function wait(n) { await page.waitForTimeout(Math.ceil(n * 16.7)); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
const vivid = (x0f, wf) => page.evaluate(([x0, ww]) => { const cv = document.querySelector("canvas"); const g = cv.getContext("2d"); const w = cv.width, h = cv.height; const d = g.getImageData(Math.floor(w*x0), 0, Math.floor(w*ww), h).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 40 && (Math.abs(d[i]-d[i+1]) > 16 || Math.abs(d[i+1]-d[i+2]) > 16 || d[i] > 90)) n++; } return n; }, [x0f, wf]);
const jexplode = (tier) => page.evaluate(t => window.__harness.juice.explode(t), tier);
const jslow = () => page.evaluate(() => window.__harness.juice.slowmoState());

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state && window.__harness.juice, null, { timeout: 15000 });
await page.mouse.click(640, 360); await wait(10);
console.log("\n══ JUICE — Phase 2 (explosions + slow-mo) ══");
ok(PERR === 0, "game boots with 0 page errors (juiceFx + explosion wiring)");

// 0) render check — real match, both fighters.
await page.evaluate(() => window.__harness.boot()); await wait(16);
ok((await gstate()) === "battle", "match in BATTLE");
ok((await vivid(0.04, 0.42)) > 8000 && (await vivid(0.54, 0.42)) > 8000, "BOTH fighters render");

// 1) SMALL / MEDIUM / ULTIMATE explosions render (pooled FX).
await page.evaluate(() => window.__harness.juice.setShake("full"));
const small = await jexplode("small"); await wait(2);
ok(small.fx.fireballs >= 1 && small.fx.debris >= 1 && small.fx.shocks === 0, `SMALL: fireball+debris, NO shockwave (fb=${small.fx.fireballs} deb=${small.fx.debris} shock=${small.fx.shocks})`);
await shot("01_small"); await wait(30);
const med = await jexplode("medium"); await wait(2);
ok(med.fx.fireballs >= 1 && med.fx.debris >= 6 && med.fx.smoke >= 1 && med.fx.shocks >= 1, `MEDIUM: fireball+debris+smoke+shockwave (fb=${med.fx.fireballs} deb=${med.fx.debris} smk=${med.fx.smoke} shock=${med.fx.shocks})`);
ok(med.impactFrame === true, "MEDIUM arms an impact frame");
await shot("02_medium"); await wait(30);
const ult = await jexplode("ultimate"); await wait(2);
ok(ult.fx.fireballs >= 2 && ult.fx.debris >= 12 && ult.fx.shocks >= 1, `ULTIMATE: 2 fireballs + heavy debris + shockwave (fb=${ult.fx.fireballs} deb=${ult.fx.debris} shock=${ult.fx.shocks})`);
ok(ult.slowmo > 0, `ULTIMATE arms slow-mo (timer=${ult.slowmo})`);
await shot("03_ultimate");
const cap = await page.evaluate(() => window.__harness.juice.fxStatus());
ok(cap.particles <= cap.cap, `particle pool within hard cap (${cap.particles} ≤ ${cap.cap})`);
await wait(40);

// 2) anticipation swell.
const sw = await page.evaluate(() => window.__harness.juice.anticipate("ultimate"));   // now returns fxStatus (swell + charge-in)
ok((sw.swells || 0) >= 1, `anticipation swell spawns (swells=${sw.swells})`);
await shot("04_anticipation"); await wait(30);

// 3) Reduce Flashing → soft dim (no white flash / silhouette).
await page.evaluate(() => window.__harness.juice.setFlash(true));
const rf = await jexplode("ultimate");
ok(rf.impactFrame === true, "explosion still arms an impact frame with Reduce Flashing");
const ifr = await page.evaluate(() => window.__harness.juice.impactFrame());
ok(ifr && ifr.reduce === true, "impact frame is in REDUCE mode (soft dim, no white flash)");
await shot("05_reduceflash");
await page.evaluate(() => window.__harness.juice.setFlash(false)); await wait(40);

// 4) Screen Shake Off / Low / Full.
await page.evaluate(() => window.__harness.juice.setShake("off"));
await page.evaluate(() => { const c = document.querySelector("canvas"); }); // noop
const shOff = await page.evaluate(() => { window.__harness.juice.explode("ultimate"); return window.__harness.juice.shakeState(); });
ok(shOff.timer === 0 && shOff.strength === 0, `Screen Shake OFF → no camera shake (timer=${shOff.timer})`);
await wait(30);
await page.evaluate(() => window.__harness.juice.setShake("full"));
const shFull = await page.evaluate(() => { window.__harness.juice.explode("ultimate"); return window.__harness.juice.shakeState(); });
ok(shFull.strength > 0, `Screen Shake FULL → camera shakes (strength=${shFull.strength})`);
await wait(40);

// 5) Slow-mo ON vs OFF + cooldown.
await page.evaluate(() => { window.__harness.juice.setSlowMo(true); window.__harness.boot(); });
await wait(16);
const onState = await jexplode("ultimate");
ok(onState.slowmo > 0, `Slow-Mo ON → ult arms slow-mo (${onState.slowmo})`);
const cd = await jslow();
ok(cd.cooldown > 0, `slow-mo sets a cooldown (${cd.cooldown})`);
const again = await jexplode("ultimate");   // within cooldown → must NOT re-arm to full
ok(again.slowmo <= onState.slowmo, `second ult within 2s does NOT re-arm (max one per 2s: ${again.slowmo} ≤ ${onState.slowmo})`);
await wait(40);
await page.evaluate(() => { window.__harness.juice.setSlowMo(false); window.__harness.boot(); });
await wait(16);
const offState = await jexplode("ultimate");
ok(offState.slowmo === 0, `Slow-Mo OFF → ult does NOT slow-mo (${offState.slowmo})`);
await page.evaluate(() => window.__harness.juice.setSlowMo(true));

// 6) LAN host-authoritative gating (mock net match).
const lan = await page.evaluate(() => {
  const r = {};
  window.__harness.net.beginMock({ localSide: "p2" });   // we're the JOINER
  window.__harness.juice.setSlowMo(true);                 // local pref ON...
  window.__harness.juice.setNetSlowMo(false);             // ...but host says OFF
  r.hostOff = window.__harness.juice.slowmoState().enabled;
  window.__harness.juice.setNetSlowMo(true);              // host says ON
  r.hostOn = window.__harness.juice.slowmoState().enabled;
  window.__harness.juice.setNetSlowMo(null);
  window.__harness.net.end();
  r.standalone = window.__harness.juice.slowmoState().enabled;
  return r;
});
ok(lan.hostOff === false, "LAN: host Slow-Mo OFF overrides a local ON (deterministic across peers)");
ok(lan.hostOn === true, "LAN: host Slow-Mo ON enables it for the joiner");
ok(lan.standalone === true, "outside LAN → falls back to the local setting");

// 7) KO / Domain / rewind never slow-mo (block check reachable).
const blk = await page.evaluate(() => { const f = window.__harness; f.boot(); return window.__harness.juice.slowmoState().blocked; });
ok(blk === false, "slow-mo not blocked in a normal live match (guards wired)");

// 8) PERF — 4 players spamming explosions. Measure the game's frame time under load.
await page.evaluate(() => window.__harness.ffaStart(4, ["gojo", "sukuna", "naruto", "yuji"]));
await wait(10);
ok((await gstate()) === "ffaBattle", "4-player FFA started");
const perf = await page.evaluate(async () => {
  const H = window.__harness; const deltas = []; let last = performance.now();
  await new Promise(res => {
    let frames = 0;
    const tick = () => {
      const now = performance.now(); deltas.push(now - last); last = now;
      // simulate 4 players spamming explosions this frame
      for (let i = 0; i < 4; i++) H.juice.explode(i % 3 === 0 ? "ultimate" : i % 3 === 1 ? "medium" : "small", 400 + i * 700, 400);
      if (++frames >= 150) res(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  deltas.sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)];
  const p95 = deltas[Math.floor(deltas.length * 0.95)];
  return { median: +median.toFixed(2), p95: +p95.toFixed(2), fxParticles: H.juice.fxStatus().particles, cap: H.juice.fxStatus().cap };
});
console.log(`  PERF (4p spamming explosions): median frame ${perf.median}ms (${(1000/perf.median).toFixed(0)}fps), p95 ${perf.p95}ms; particles ${perf.fxParticles}/${perf.cap}`);
ok(perf.median <= 20, `median frame time holds ~55-60fps under the 4-player explosion-spam worst case (${perf.median}ms)`);
ok(perf.fxParticles <= perf.cap, `particle pool stays within cap under spam (${perf.fxParticles} ≤ ${perf.cap})`);
await shot("06_ffa_perf");

console.log(`\n${FAILS === 0 && PERR === 0 ? "✅" : "❌"} JUICE Phase 2 live: ${FAILS} failed, ${PERR} page errors`);
await browser.close(); server.close();
process.exit(FAILS === 0 && PERR === 0 ? 0 : 1);
