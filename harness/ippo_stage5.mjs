// harness/ippo_stage5.mjs — STAGE 5: Ippo's ULTIMATE "Dempsey Roll" (executeIppoUltimate).
// The sheet's confirmed signature finisher. INLINE freeze-cinematic on the LIVE fighter (no duplicate),
// ★MELEE (no projectiles): side-to-side WEAVING bob (ippoDempseyWeave) → continuous FLURRY of alternating
// hooks (ippoDempseyFlurry) — weave-then-barrage, exactly the canon technique (arrow-marker transition).
// Asserts: (1) casts + spends 100 meter, (2) cast pose = weave then swaps to the flurry sheet (no box),
// (3) NO projectile spawns (boxer = melee-only), (4) lands GUARANTEED ~198 EFF (330 raw) OUT of melee
// range (sure-hit), (5) foe frozen.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `ippo_stage5_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=ippo&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());   // boot() fills p1.energy to max
  await waitFrames(5);
  await waitGrounded();

  // Position the dummy OUT of melee range → proves the ult is a guaranteed sure-hit (range-independent).
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 170); await waitFrames(2);

  console.log("\n── ULTIMATE: Dempsey Roll (weave → flurry) ──");
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  const snap = await page.evaluate(() => {
    const res = window.__harness.p1Ultimate();
    const a = window.__harness.p1(), b = window.__harness.p2();
    return { cast: !!res?.cast, castMove: res?.castMove || null, sheet: a.spriteSheet || null, en: a.energy, oppHitstop: b.hitstop || 0 };
  });
  check("ult casts", snap.cast === true, `cast=${snap.cast}`);
  check("cast pose = ippoDempseyWeave (weaving bob FIRST)", snap.castMove === "ippoDempseyWeave", `castMove=${snap.castMove}`);
  check("spends ~100 meter", Math.round(en0 - snap.en) >= 98, `energy ${Math.round(en0)} → ${Math.round(snap.en)}`);
  check("target frozen at cast (hitstop > 0)", snap.oppHitstop > 0, `hitstop=${snap.oppHitstop}`);
  await waitFrames(3); await shot("weave");

  // Collect render sheets + projectiles across the cinematic — assert the flurry pose appears + NO projectiles.
  const sheets = new Set(); let sawProjectile = false;
  for (let f = 0; f < 40; f++) {
    const mv = await p1(); if (mv.spriteSheet) sheets.add(mv.spriteSheet);
    if ((await projectiles()).length > 0) sawProjectile = true;
    if (f === 22) await shot("flurry");
    await waitFrames(1);
  }
  const S = [...sheets].join(" ");
  check("weave sheet rendered (ippo_dempsey_weave)", /ippo_dempsey_weave_uniform/.test(S), `sheets=${S}`);
  check("sprite swaps → ippo_dempsey_flurry (barrage pose)", /ippo_dempsey_flurry_uniform/.test(S), `sheets=${S}`);
  check("MELEE ult: NO projectile spawns (boxer)", !sawProjectile, `sawProjectile=${sawProjectile}`);

  // let the guaranteed beats resolve
  await waitFrames(40);
  const hp1 = (await p2()).health;
  const dealt = hp0 - hp1;
  check("guaranteed damage lands from out of melee range (sure-hit)", dealt > 0, `hp ${hp0} → ${hp1} (−${dealt.toFixed(0)})`);
  check("payoff in top-ult band (~198 EFF; 150–240)", dealt >= 150 && dealt <= 240, `dealt=${dealt.toFixed(0)}`);

  console.log("\n── data contract ──");
  const def = await page.evaluate(() => window.__harness.charDef("ippo"));
  check("ippoDempseyWeave wired to real ippo sheet", (def?.animationData?.ippoDempseyWeave?.sheet || "").includes("ippo_dempsey_weave_uniform"), `sheet=${def?.animationData?.ippoDempseyWeave?.sheet}`);
  check("ippoDempseyFlurry wired to real ippo sheet", (def?.animationData?.ippoDempseyFlurry?.sheet || "").includes("ippo_dempsey_flurry_uniform"), `sheet=${def?.animationData?.ippoDempseyFlurry?.sheet}`);
  check("ultimate = 'Dempsey Roll', cost 100", def?.ultimate?.name === "Dempsey Roll" && def?.ultimate?.cost === 100, `ult=${JSON.stringify(def?.ultimate)}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Ippo Stage 5: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
