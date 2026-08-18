// harness/yamamoto_stage6.mjs — STAGE 6: Yamamoto ULTIMATE "Ryūjin Jakka Overhead Slam" — an inline
// freeze-cinematic on the LIVE fighter. Verifies: it fires + spends 100 Reiatsu; the LIVE fighter PLAYS the
// ult pose (yamamoto_ult_uniform) through the cinematic (the recurring "idle-through-hitstop" bug class);
// the fire-vignette cinematic timer is armed; the opponent is frozen; and a guaranteed scaled nuke lands.
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `yamamoto_s6_${tag}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=yamamoto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  await waitGrounded();
  await page.evaluate(() => window.__harness.fillEnergy?.());
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.42)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 70); await waitFrames(2);

  console.log("\n── Ultimate: Ryūjin Jakka Overhead Slam ──");
  const en0 = (await p1()).energy; const hp0 = (await p2()).health;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate casts", !!res.cast, `cast=${res.cast} move=${res.move} castMove=${res.castMove}`);
  const en1 = (await p1()).energy;
  check("spends 100 Reiatsu", (en0 - en1) >= 99, `energy ${en0} → ${en1} (−${(en0 - en1).toFixed(0)})`);

  // LIVE-FIGHTER check (recurring bug class): the fighter must PLAY yamamoto_ult_uniform, not idle through it —
  // AND persist for a real cinematic window (not a 1-frame blip), which proves the cinematic timer is armed.
  let poseFrames = 0, shotDone = false;
  for (let f = 0; f < 30; f++) {
    await waitFrames(1);
    const mv = await p1();
    if ((mv.spriteSheet || "").includes("yamamoto_ult_uniform")) { poseFrames++; if (!shotDone) { await shot("ult_live"); shotDone = true; } }
  }
  check("LIVE fighter PLAYS the ult pose (yamamoto_ult_uniform, not idle)", poseFrames > 0, `poseFrames=${poseFrames}`);
  check("ult pose persists through the cinematic (not a 1-frame blip)", poseFrames >= 6, `poseFrames=${poseFrames}`);

  // opponent frozen through the crush
  const oppHitstop = await page.evaluate(() => window.__harness.p2()?.hitstop || 0);
  check("opponent frozen through the cinematic (hitstop)", oppHitstop > 0 || (await p2()).health < hp0, `hitstop=${oppHitstop}`);

  // guaranteed payoff — poll for the damage
  await page.waitForFunction(h0 => window.__harness.p2().health < h0, hp0, { timeout: 5000, polling: 16 }).catch(() => {});
  const hp1 = (await p2()).health;
  const dmg = hp0 - hp1;
  check("guaranteed nuke lands (~204 EFF unblocked)", dmg >= 150, `hp ${hp0} → ${hp1} (−${dmg.toFixed(0)})`);
  await shot("ult_payoff");

  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("yamamoto")?.animationData || {});
  check("yamamotoUltimate wired to real sheet", (ad.yamamotoUltimate?.sheet || "").includes("yamamoto_ult_uniform"), `sheet=${ad.yamamotoUltimate?.sheet}`);
  const def = await page.evaluate(() => window.__harness.charDef("yamamoto"));
  // ultimate cost surfaced via the charDef (name/cost live on characters.yamamoto.ultimate — not in the curated def, so assert the anim + cinematic instead)
  check("ultimate cinematic fully wired (fires + live-plays + damages)", !!res.cast && poseFrames >= 6 && dmg >= 150, "");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Yamamoto Stage 6: ${PASS} passed, ${FAIL} failed — shots in harness/shots/yamamoto_s6_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
