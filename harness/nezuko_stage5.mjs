// harness/nezuko_stage5.mjs — Stage 5 evidence: Nezuko's 3 defensive/utility specials.
//   Bite         — Back+Special (a+l): close-range command GRAB (unblockable, point-blank). Whiffs at range.
//   Counter      — Down+Special (s+l = Block+Special): reactive parry — an incoming hit is NEGATED + riposted.
//   Blood Demon Slumber — Up+Special (w+l): self-cast SLEEP that HEALS over a VULNERABLE window (no i-frames,
//                 takes BONUS damage). Confirms real HP recovery AND that she's hittable-for-extra while asleep.
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
  // wait for P2 to settle grounded too (prior Bite throw can leave the dummy airborne → p2Attack whiffs)
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitMove(name, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && mv.currentMove !== name; f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `nezuko_s5_${name}.png`) }); }
// Up+Special is frame-tight in the harness (up alone for one frame → jump → air special). Retry until she
// slumbers grounded. Real play (hold up, tap special) is not frame-perfect; this only papers over harness jitter.
async function castSlumber(maxTries = 10) {
  for (let t = 0; t < maxTries; t++) {
    // fully settle before the frame-tight up+special (grounded, idle, no hitstun, off cooldown)
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5 && !p.attacking && (p.hitstun || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
    await waitFrames(1);
    await page.keyboard.down("w"); await page.keyboard.down("l");
    await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("w");
    const mv = await p1();
    if (mv.castMove === "nezukoSlumber" && mv.grounded) return mv;
    await waitFrames(6);
  }
  return await p1();
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=nezuko&p2=nezuko`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── BITE (Back+Special, command grab) ──
  section("Bite (Back+Special — command grab)");
  await reset(14);   // point-blank
  { const hp0 = (await p2()).health;
    await page.keyboard.down("a"); await page.keyboard.down("l");   // back+special SAME frame → dir "B", grab at fire (pre-retreat)
    await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("a");
    const mv = await p1();
    await shot("bite");
    await waitFrames(40);   // grab hold → throw
    const dmg = hp0 - (await p2()).health;
    check("Back+Special → nezukoBite sprite", mv.castMove === "nezukoBite", `cast=${mv.castMove}`);
    check("Bite grabs point-blank (unblockable damage dealt)", dmg > 0, `dmg=${dmg}`);
  }

  // ── COUNTER STANCE (Down+Special, guard-reversal) ──
  section("Counter Stance (Down+Special — negate + riposte)");
  // ROUTING: real keyboard Down+Special enters the counter stance (sets the window + cast).
  await reset(52);
  { await page.keyboard.down("s"); await waitFrames(2);
    await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await page.keyboard.up("s");
    const cmv = await p1();
    await shot("counter");
    check("Down+Special → nezukoCounter stance (routing)", cmv.castMove === "nezukoCounter" && cmv.nzCountering > 0, `cast=${cmv.castMove} window=${cmv.nzCountering}`);
  }
  // MECHANIC: fire a clean counter (no block-crouch confound), then an incoming hit → negate + riposte.
  await reset(52);
  { const set = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
    await waitFrames(1);
    const before = await page.evaluate(() => ({ p1: window.__harness.p1().health, p2: window.__harness.p2().health, w: window.__harness.p1().nzCountering }));
    await page.evaluate(() => window.__harness.p2Attack());
    await waitFrames(16);
    const after = await page.evaluate(() => ({ p1: window.__harness.p1().health, p2: window.__harness.p2().health }));
    check("counter armed (window active)", set.cast === "nezukoCounter" && before.w > 0, `cast=${set.cast} window=${before.w}`);
    check("counter NEGATES the incoming hit (0 dmg taken)", after.p1 === before.p1, `p1 ${before.p1}→${after.p1}`);
    check("counter RIPOSTES (attacker damaged)", after.p2 < before.p2, `p2 ${before.p2}→${after.p2}`);
  }

  // ── BLOOD DEMON SLUMBER (Up+Special, heal + vulnerability) ──
  section("Blood Demon Slumber (Up+Special — heal over a vulnerable window)");
  // (A) HEAL: at reduced HP, far from P2, confirm HP recovers.
  await reset(320);
  { await page.evaluate(() => window.__harness.setP1Health(600));
    await waitFrames(2);
    const hp0 = (await p1()).health;
    const mv = await castSlumber();
    await shot("slumber");
    check("Up+Special → nezukoSlumber sprite (grounded, no jump)", mv.castMove === "nezukoSlumber" && mv.grounded, `cast=${mv.castMove} grounded=${mv.grounded}`);
    await waitFrames(74);   // sleep out the window
    const hp1 = (await p1()).health;
    check("Blood Demon Slumber HEALS (HP recovered)", hp1 > hp0 + 100, `hp ${hp0}→${hp1} (+${hp1 - hp0})`);
  }
  // (B) VULNERABILITY: baseline hit vs hit-while-sleeping (must take MORE, and must be hittable at all).
  // Use FULL HP for both so slumber's concurrent heal is capped (no net gain) → isolates the raw hit damage.
  await reset(40);
  { // baseline: hit an idle Nezuko at full HP
    await page.evaluate(() => window.__harness.healP1());
    const b0 = (await p1()).health;
    await page.evaluate(() => window.__harness.p2Attack());
    await waitFrames(16);
    const baseDmg = b0 - (await p1()).health;
    // while sleeping (full HP → heal is a no-op, so only the amped hit changes health)
    await reset(40);
    await page.evaluate(() => window.__harness.healP1());
    await page.evaluate(() => window.__harness.p1SpecialDir("U"));   // Slumber (helper avoids the up→jump race)
    await waitFrames(2);
    const pre = await p1();
    check("slumber active (vuln flag on) before the hit", pre.castMove === "nezukoSlumber" && pre.nzSlumberVuln, `cast=${pre.castMove} vuln=${pre.nzSlumberVuln}`);
    const s0 = (await p1()).health;
    await page.evaluate(() => window.__harness.p2Attack());
    await waitFrames(16);
    const sleepDmg = s0 - (await p1()).health;
    check("hittable while asleep (NOT invulnerable)", sleepDmg > 0, `sleepDmg=${sleepDmg}`);
    check("takes BONUS damage while asleep (> baseline)", sleepDmg > baseDmg * 1.3, `base=${baseDmg} sleep=${sleepDmg}`);
  }

  section("stability");
  check("no JS errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
