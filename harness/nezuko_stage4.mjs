// harness/nezuko_stage4.mjs — Stage 4 evidence: Nezuko's 4 core extended specials.
//   Combo Kick  — neutral Special (l): rekka opener (nezukoCombo1) → re-press Special on a clean hit →
//                 finisher (nezukoCombo2). Cancel-on-hit chain. Both stages share combo_1.png (sourceX split).
//   Super Kick  — Fwd+Special (d+l): lunging super kick (nezukoSuperKick).
//   Air Special — Special while airborne (l): diving kick (nezukoAirSpecial).
//   Run&Scratch — CHARGE hold-release (hold p, release): forward claw rush (nezukoRunScratch).
// Also asserts inputs DON'T collide: neutral-L = combo (not super kick); Fwd-L = super kick (not combo).
// NOTE: special inputs use explicit down/up (not press()) so each keydown lands a clean edge on a game frame.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 48) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function waitMove(name, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && mv.currentMove !== name; f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `nezuko_s4_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=nezuko&p2=nezuko`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── COMBO KICK REKKA (neutral Special → re-press on hit → finisher) ──
  section("Combo Kick rekka (cancel-on-hit chain)");
  await reset(44);
  { const hp0 = (await p2()).health;
    const stages = [];
    // NO screenshots inside this loop — a screenshot advances real game frames and desyncs the tight
    // rekka re-press window. Re-press ONCE on the first recovery frame (mirrors manual play).
    await tap("l");   // opener
    let repressed = false;
    for (let i = 0; i < 60; i++) {
      const c = await p1();
      if (c.currentMove && c.currentMove.startsWith("nezukoCombo") && !stages.includes(c.currentMove)) stages.push(c.currentMove);
      if (!c.attacking && stages.length) break;
      if (!repressed && c.attackPhase === "recovery") { await tap("l", 1); repressed = true; }
      else await waitFrames(1);
    }
    await waitFrames(10);
    await shot("combo");   // after the sequence — timing no longer matters
    const dmg = hp0 - (await p2()).health;
    check("opener fires nezukoCombo1", stages.includes("nezukoCombo1"), `stages=${stages.join("→")}`);
    check("re-press CHAINS to nezukoCombo2 (cancel-on-hit)", stages.includes("nezukoCombo2"), `stages=${stages.join("→")}`);
    check("combo connects (both stages damage, incl. combo-scaling)", dmg > 30, `dmg=${dmg}`);
  }

  // ── SUPER KICK (Fwd+Special) ──
  section("Super Kick (Fwd+Special)");
  await reset(64);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("d"); await waitFrames(3);
    await tap("l");
    const mv = await waitMove("nezukoSuperKick");
    await waitFrames(2); const mv2 = await p1();
    await shot("superkick");
    check("Fwd+Special → nezukoSuperKick + sheet", mv.currentMove === "nezukoSuperKick" && has(mv2, "nezuko_super_kick"), `move=${mv.currentMove} sheet=${mv2.spriteSheet}`);
    await waitFrames(16); await page.keyboard.up("d");
    const dmg = hp0 - (await p2()).health;
    check("Super Kick connects", dmg > 0, `dmg=${dmg}`);
  }

  // ── AIR SPECIAL (Special while airborne) ──
  section("Air Special (airborne Special)");
  await reset(40);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(52));
    await tap("l");
    const mv = await waitMove("nezukoAirSpecial");
    await waitFrames(2); const mv2 = await p1();
    await shot("airspecial");
    check("airborne Special → nezukoAirSpecial + sheet", mv.currentMove === "nezukoAirSpecial" && has(mv2, "nezuko_specail_air_to_kick_attack"), `move=${mv.currentMove} sheet=${mv2.spriteSheet}`);
    await waitFrames(16);
    const dmg = hp0 - (await p2()).health;
    check("Air Special connects", dmg > 0, `dmg=${dmg}`);
  }

  // ── RUN & SCRATCH (CHARGE hold-release) ──
  section("Run & Scratch (charge hold → release)");
  await reset(80);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("p"); await waitFrames(10);   // hold to charge
    await page.keyboard.up("p");                            // release → claw rush
    const mv = await waitMove("nezukoRunScratch");
    await waitFrames(3); const mv2 = await p1();            // let isCharging clear + spriteHandler settle
    await shot("runscratch");
    check("charge-release → nezukoRunScratch + sheet", mv.currentMove === "nezukoRunScratch" && has(mv2, "nezuko_run_and_scratch"), `move=${mv.currentMove} sheet=${mv2.spriteSheet}`);
    await waitFrames(18);
    const dmg = hp0 - (await p2()).health;
    check("Run & Scratch connects (charges & releases)", dmg > 0, `dmg=${dmg}`);
  }

  // ── INPUT COLLISION GUARD ──
  section("input distinctness (no collision)");
  await reset(64);
  { await tap("l");
    const mv = await waitMove("nezukoCombo1");
    check("neutral-L = Combo (not Super Kick)", mv.currentMove === "nezukoCombo1", `move=${mv.currentMove}`);
    await waitFrames(30);
  }
  await reset(64);
  { await page.keyboard.down("d"); await waitFrames(3);
    await tap("l");
    const mv = await waitMove("nezukoSuperKick");
    check("Fwd-L = Super Kick (not Combo)", mv.currentMove === "nezukoSuperKick", `move=${mv.currentMove}`);
    await page.keyboard.up("d"); await waitFrames(20);
  }

  section("stability");
  check("no JS errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
