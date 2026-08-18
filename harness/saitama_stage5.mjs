// harness/saitama_stage5.mjs
// STAGE 5 evidence: Saitama's "Death Punch" ULTIMATE — an INLINE freeze/camera-focus cinematic.
// Verifies: (1) the two ult poses are wired to real sheets; (2) pressing Ultimate at full meter fires it;
// (3) the LIVE fighter (p1) performs it — holds the charge pose then swaps to the impact pose — i.e. NO
// duplicate-fighter instance; (4) the hi-res backdrop renders as a FULLSCREEN screen-space overlay (the
// cinematic draw runs, the backdrop image LOADS, and the overlay envelope peaks on the impact beat);
// (5) it lands a big GUARANTEED payoff on the opponent. Screenshots → harness/shots/saitama_stage5_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.saitamaDeathCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `saitama_stage5_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=saitama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("saitama").animationData);

  console.log("\n── (1) ult poses wired to real sheets ──");
  check("saitamaDeathCharge wired → saitama_death1_uniform", (ad.saitamaDeathCharge?.sheet || "").includes("saitama_death1_uniform"), `sheet=${ad.saitamaDeathCharge?.sheet}`);
  check("saitamaDeathImpact wired → saitama_death2_uniform", (ad.saitamaDeathImpact?.sheet || "").includes("saitama_death2_uniform"), `sheet=${ad.saitamaDeathImpact?.sheet}`);

  // Pre-warm the hi-res backdrop into the browser cache so the game's Image() completes promptly and the
  // graded run captures the overlay's peak (avoids a fragile double-cast).
  await page.evaluate(async () => { const i = new Image(); i.src = "./saitama_death_punch_backround_effect.png"; try { await i.decode() } catch (_) {} });

  console.log("\n── (2)-(5) fire Death Punch at full meter, graded ──");
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.p1ClearCooldowns?.(); window.__harness.setDummyBehavior?.("stand"); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 150 * (a.facing || 1)); });
  await waitFrames(2);
  const h0 = (await p2()).health;
  const e0 = (await p1()).energy;
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");

  let sawTimer = false, sawCharge = false, sawImpact = false, sawRender = false, peakEnv = 0, sawLiveCaster = false;
  let shotCharge = false, shotImpact = false, minEnergy = e0;
  for (let i = 0; i < 82; i++) {
    const a = await p1(); const c = await cine();
    minEnergy = Math.min(minEnergy, a.energy);   // captures the post-fire spend before passive regen refills it
    if ((a._saitamaDeathTimer || c.timer || 0) > 0) sawTimer = true;
    const sh = a.spriteSheet || "";
    if (/saitama_death1_uniform/.test(sh)) { sawCharge = true; if (!shotCharge) { await shot("charge"); shotCharge = true } }
    if (/saitama_death2_uniform/.test(sh)) { sawImpact = true; if (!shotImpact) { await shot("impact"); shotImpact = true } }
    // LIVE-fighter check: the caster (p1) itself is the one showing the death pose (no phantom duplicate).
    if (c.timer > 0 && /saitama_death[12]_uniform/.test(sh)) sawLiveCaster = true;
    if (c.renders > 0) sawRender = true;
    peakEnv = Math.max(peakEnv, c.maxEnv || 0);
    await waitFrames(1);
  }
  const dmg = h0 - (await p2()).health;
  const eSpent = e0 - minEnergy;   // peak spend right after firing (passive regen refills it afterward)
  await shot("after");
  const cEnd = await cine();

  check("Ultimate fired (spent ~100 meter)", eSpent >= 95, `spent=${eSpent}`);
  check("cinematic countdown ran (_saitamaDeathTimer)", sawTimer, "");
  check("LIVE fighter holds the CHARGE pose (saitama_death1_uniform)", sawCharge, "");
  check("LIVE fighter swaps to the IMPACT pose (saitama_death2_uniform)", sawImpact, "");
  check("the caster ITSELF performs it — no duplicate instance", sawLiveCaster, "");
  check("fullscreen cinematic overlay ran (drawSaitamaDeathPunchCinematic)", sawRender, `renders=${cEnd.renders}`);
  check("hi-res backdrop image LOADED", cEnd.bgLoaded, `bgLoaded=${cEnd.bgLoaded}`);
  check(`backdrop overlay peaked on the impact beat (maxEnv ${peakEnv.toFixed(2)})`, peakEnv > 0.6, `peakEnv=${peakEnv}`);
  check(`Death Punch lands a big guaranteed payoff (${dmg.toFixed(0)})`, dmg > 120, `dmg=${dmg}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
