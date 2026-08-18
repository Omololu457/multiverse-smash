// harness/hiruzen_stage4_shots.mjs — Stage 4: Reaper Death Seal ULTIMATE. Verifies the inline freeze
// cinematic on the LIVE fighter (no duplicate instance), the self-HP life-cost, the guaranteed soul-rip
// payoff, and the opponent freeze; captures the dark spectral overlay. PNGs → /tmp/hiruzen_s4/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/hiruzen_s4"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
const shot = (name) => page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") });
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=hiruzen&p2=hiruzen`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  console.log(`\n── Reaper Death Seal (Ultimate) — inline freeze cinematic ──`);
  await ready();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 90 * (a.facing || 1)); await wf(2);
  const uHpP1_0 = (await p1()).health, uHpP2_0 = (await p2()).health, uEn0 = (await p1()).energy;

  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u");
  const ultSpent = uEn0 - (await p1()).energy;   // deducted synchronously on cast — read before regen over the 66f cinematic
  // sample the cinematic for assertions (frame-stepped)
  let castSeen = null, sealActive = false, oppFrozen = false, minP2 = uHpP2_0;
  for (let i = 0; i < 80; i++) {
    const pf = await p1(); const of = await p2();
    if (pf.castMove === "hiruzenReaperCast" || pf.spriteAction === "hiruzenReaperCast") castSeen = pf.spriteSheet;
    if (pf.reaperSeal > 0) sealActive = true;
    if ((of.hitstop || 0) > 0 || (of.hitstun || 0) > 0) oppFrozen = true;
    minP2 = Math.min(minP2, of.health);
    await wf(1);
  }
  const cine = await page.evaluate(() => window.__harness.hiruzenReaperCine());
  await wf(10);
  const p1After = await p1(), p2After = await p2();   // measured after the FIRST (assertion) cast only

  // ── VISUAL capture — SECOND cast with real-time settles (frame-stepped screenshots catch stale frames;
  //    letting rAF paint between fire and capture reliably grabs the live overlay). ──
  await ready();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  // Headless rAF runs uncapped (~220fps → the 66f cinematic lasts ~300ms), so a single per-cast real-time
  // delay lands a clean capture. Fire 3 independent casts, one screenshot each at an increasing delay to
  // catch the early / mid / payoff beats. (Programmatic proof of full-strength render is the counter above.)
  const beats = [[55, "reaper_1_vignette"], [130, "reaper_2_shinigami"], [205, "reaper_3_soulrip"]];
  for (const [delay, name] of beats) {
    await ready();
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
    const bb = await p1(); await page.evaluate(x => window.__harness.setP2X(x), bb.x + 90 * (bb.facing || 1)); await wf(2);
    await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u");
    await page.waitForTimeout(delay); await shot(name);
    await wf(30);
  }

  check("Ultimate spends 100 chakra", ultSpent >= 98, `spent=${ultSpent.toFixed(0)}`);
  check("LIVE fighter holds hiruzenReaperCast (no dup instance)", (castSeen || "").includes("hiruzen_punches_uniform"), `sheet=${castSeen}`);
  check("Reaper Seal cinematic ran (timer active)", sealActive, "");
  check("dark spectral overlay actually rendered (full strength)", cine.renders > 10 && cine.maxEnv > 0.9, `renders=${cine.renders} maxEnv=${cine.maxEnv.toFixed(2)}`);
  check("GREAT PERSONAL COST — Hiruzen loses ~15% own HP (~177)", Math.abs((uHpP1_0 - p1After.health) - 177) <= 25, `selfLoss=${(uHpP1_0 - p1After.health).toFixed(0)}`);
  check("opponent frozen through the seal", oppFrozen, "");
  check("guaranteed soul-rip payoff (dmg ≥ 180 eff)", (uHpP2_0 - minP2) >= 180, `dmg=${(uHpP2_0 - minP2).toFixed(0)}`);
  check("Hiruzen survives his own ult (HP ≥ 1)", p1After.health >= 1, `hp=${p1After.health.toFixed(0)}`);
  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════ HIRUZEN Stage 4: ${PASS} passed, ${FAIL} failed → ${OUT} ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
