// harness/zoldyck_phase3_live.mjs
// PHASE 3 verification for Killua (Godspeed) `zoldyck`: GODSPEED (Down+Ult) — activation, Volts drain,
// drained stagger at 0, Charge mode-toggle (Whirlwind ↔ Speed of Lightning), Speed-of-Lightning auto-react
// counter (vs a combo dummy), + the 3 recolor skins. Real key input (?p1=zoldyck&p2=gon). Keys: l=special
// u=ultimate p=charge ;=block, w/a/s/d.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const ok = (c, n) => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}`); };

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const zs = () => page.evaluate(() => window.__harness.zoldyckState("p1"));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() {
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await waitFrames(4);
}
const setE = v => page.evaluate(vv => window.__harness.setEnergy(vv), v);
const fill = () => page.evaluate(() => window.__harness.fillEnergy());
const shot = n => page.screenshot({ path: path.join(OUT, `zoldyck_p3_${n}.png`) });
// enter Godspeed via Down+Ultimate (clears cooldowns first)
async function enterGodspeed() {
  await fill(); await waitFrames(2);
  await page.keyboard.down("s"); await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
  await waitFrames(4); await page.keyboard.up("s"); await waitFrames(3);
  return zs();
}

try {
  await boot(`${base}/index.html?harness=1&p1=zoldyck&p2=gon`);
  await toBattle();
  ok((await zs())?.key === "zoldyck", "p1 is zoldyck");

  // ── 1) GODSPEED activation (Down+Ult) ──
  let s = await enterGodspeed();
  console.log(`  activation: gsActive=${s.gsActive} form=${s.form} mode=${s.gsMode} dmgMult=${s.dmgMult} energy=${s.energy}`);
  ok(s.gsActive === true, `Godspeed active after Down+Ult`);
  ok(s.form === "godspeed", `currentForm = godspeed`);
  ok(s.gsMode === "whirlwind", `default mode = Whirlwind (got ${s.gsMode})`);
  ok(s.dmgMult >= 1.19, `damage buff applied (${s.dmgMult})`);
  await shot("01_godspeed_whirlwind");

  // ── 2) Volts DRAIN while active ──
  const d0 = (await zs()).energy; await waitFrames(30); const d1 = (await zs()).energy;
  console.log(`  drain: energy ${d0} → ${d1} over 30 frames`);
  ok(d1 < d0 - 4, `Volts drain steadily during Godspeed (${d0}→${d1})`);

  // ── 3) MODE TOGGLE (tap Charge p) → Speed of Lightning, and back ──
  await page.keyboard.down("p"); await waitFrames(3); await page.keyboard.up("p"); await waitFrames(3);
  const m1 = (await zs()).gsMode;
  await page.keyboard.down("p"); await waitFrames(3); await page.keyboard.up("p"); await waitFrames(3);
  const m2 = (await zs()).gsMode;
  console.log(`  toggle: whirlwind → ${m1} → ${m2}`);
  ok(m1 === "speedOfLightning", `Charge toggles to Speed of Lightning (got ${m1})`);
  ok(m2 === "whirlwind", `Charge toggles back to Whirlwind (got ${m2})`);

  // ── 4) Charge does NOT recharge Volts during Godspeed ──
  const rc0 = (await zs()).energy; await page.keyboard.down("p"); await waitFrames(18); await page.keyboard.up("p"); const rc1 = (await zs()).energy;
  console.log(`  no-recharge-in-GS: energy ${rc0} → ${rc1} while holding Charge`);
  ok(rc1 <= rc0, `holding Charge in Godspeed does NOT refill Volts (${rc0}→${rc1})`);
  await shot("02_godspeed_speedoflightning");

  // ── 5) SPEED OF LIGHTNING auto-react counter (fresh boot → combo dummy walks into the line) ──
  await boot(`${base}/index.html?harness=1&p1=zoldyck&p2=gon`); await toBattle();
  await enterGodspeed();
  await page.keyboard.down("p"); await waitFrames(3); await page.keyboard.up("p");   // → speedOfLightning
  await page.evaluate(() => window.__harness.setDummyBehavior?.("combo"));
  const oh0 = (await zs()).oppHealth; const c0 = (await zs()).gsCounters;
  await waitFrames(90);   // give the combo dummy time to walk from spawn distance into the 185px line
  const sAR = await zs(); await shot("03_autoreact");
  await page.evaluate(() => window.__harness.setDummyBehavior?.("stand"));
  console.log(`  auto-react: counters ${c0} → ${sAR.gsCounters}, oppHealth ${oh0} → ${sAR.oppHealth}`);
  ok(sAR.gsCounters < c0 || sAR.oppHealth < oh0, `Speed-of-Lightning auto-counter fired (counters ${c0}→${sAR.gsCounters}, opp ${oh0}→${sAR.oppHealth})`);

  // ── 6) DRAINED STAGGER at 0 Volts ──
  await page.evaluate(() => window.__harness.state());   // sync
  await setE(34); await waitFrames(2);                    // just above entry cost (30)
  await enterGodspeed();                                  // fill() inside would top up — so set AFTER entering instead
  await setE(4);                                          // force near-empty while active
  await waitFrames(40);
  const sStag = await zs(); await shot("04_drained");
  console.log(`  drained: gsActive=${sStag.gsActive} drained=${sStag.drained} hitstun=${sStag.hitstun} energy=${sStag.energy}`);
  ok(sStag.gsActive === false, `Godspeed ended when Volts hit 0`);
  ok(sStag.drained > 0 || sStag.hitstun > 0, `drained stagger applied (drained=${sStag.drained}, hitstun=${sStag.hitstun})`);
  await page.evaluate(() => window.__harness.healP1?.());

  // ── 7) SKINS — 3 palettes; Anime Old body retagged, Godspeed stays blue ──
  const skinList = await page.evaluate(() => window.__harness.showSkinSelect?.("zoldyck", "p1"));
  const ids = (skinList?.skins || []).map(x => x.id);
  console.log(`  skins: ${JSON.stringify(ids)}`);
  ok(ids.includes("default") && ids.includes("animeold") && ids.includes("manga"), `3 skins registered (${ids.join(",")})`);
  await boot(`${base}/index.html?harness=1&p1=zoldyck&p2=gon`);
  await page.evaluate(() => window.__harness.bootSkin?.("animeold", "default"));
  await waitFrames(6);
  const skinSheet = await page.evaluate(() => window.__harness.p1().spriteSheet || window.__harness.p1().sheet || null);
  console.log(`  animeold idle sheet: ${skinSheet}`);
  ok(/__animeold/.test(skinSheet || ""), `Anime Old skin retags the body sheet (${skinSheet})`);
  await shot("05_skin_animeold");

  // ── 8) NO PAGE ERRORS ──
  ok(jsErrors.length === 0, `no page errors (${jsErrors.length}${jsErrors.length ? ": " + jsErrors[0] : ""})`);
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++;
} finally {
  console.log(`\n── zoldyck Phase 3 live: ${PASS} passed, ${FAIL} failed ──`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
