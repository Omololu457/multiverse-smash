// harness/maki_heavenly_vow.mjs — "HEAVENLY VOW" REBALANCE — live in-engine evidence + screenshots:
//   A. SPEED: Maki (98) traverses noticeably farther than a roster-AVERAGE character (Sukuna, 86 ≈ mean)
//      over the same number of frames — she reads as superhuman-fast.
//   B. TIGHT COMBO LANDS: the "Cursed Tool Flurry" chain (makiG1→makiG2→makiG3) links cleanly when Heavy
//      is re-pressed INSIDE the tightened cancel window (first 5 frames of recovery).
//   C. MISTIMED FAILS: the SAME chain, with a Heavy re-press placed LATE (recovery frame 6+, past the
//      5-frame window) — the link is REJECTED and the string DROPS. Proves the tightened window is real
//      and enforced in the live engine, not just a number.
// Saves screenshots to harness/shots/maki_hv_*.png.
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
const cmd = () => page.evaluate(() => window.__harness.makiCmd());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function boot(p1key, p2key) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1key}&p2=${p2key}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);
}
const shot = name => page.screenshot({ path: path.join(SHOTS, `maki_hv_${name}.png`) });

// Measure how far p1 walks (holding "d"=forward) over `frames`, from a standstill.
async function walkDistance(frames) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.setP2X?.(1100); });
  await waitFrames(2);
  const x0 = (await p1()).x;
  await page.keyboard.down("d");
  await waitFrames(frames);
  const x1 = (await p1()).x;
  await page.keyboard.up("d");
  return Math.abs(x1 - x0);
}

try {
  // ── A. SPEED — Maki vs a roster-average character (Sukuna, speed 86 ≈ roster mean 85.8) ──
  section("A. movement speed — Maki (98) vs roster-average Sukuna (86)");
  await boot("maki", "sukuna");
  const makiDist = await walkDistance(40);
  await shot("speed_maki");

  await boot("sukuna", "maki");
  const sukDist = await walkDistance(40);
  await shot("speed_sukuna");

  // Stats (from characters.js, confirmed at the data layer): Maki speed 98 vs Sukuna 86 (ratio 1.14);
  // roster mean 85.8. The live walk-distance ratio should track that stat advantage.
  const ratio = makiDist / sukDist;
  console.log(`     Maki walked ${makiDist.toFixed(0)}px vs Sukuna ${sukDist.toFixed(0)}px over 40 frames (ratio ${ratio.toFixed(3)}; speed stats 98 vs 86 = 1.140)`);
  check("Maki traverses noticeably farther than the roster-average char", makiDist > sukDist * 1.05, `maki=${makiDist.toFixed(0)}px sukuna=${sukDist.toFixed(0)}px`);
  check("live speed gap tracks the 98-vs-86 stat advantage (ratio > 1.08)", ratio > 1.08, `ratio=${ratio.toFixed(3)}`);

  // ── B + C: the tight cancel window, live ──
  await boot("maki", "maki");
  async function reset(gap = 52) {
    await idleReady();
    await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
    const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
  }
  async function fireOpener() {
    await page.keyboard.down("d");                                                   // hold forward
    await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");  // Fwd+Heavy → makiG1
  }

  // ── B. TIGHT COMBO LANDS — press Heavy INSIDE the window (window.open===true) ──
  section("B. tight combo LANDS — Heavy re-pressed inside the 5-frame window");
  let landedDamage = 0;
  await reset();
  { const chain = []; let windowFrames = null, recovery = null;
    const hp0 = (await p2()).health;
    await fireOpener();
    for (let i = 0; i < 60; i++) {
      const c = await cmd();
      if (c?.move && !chain.includes(c.move)) chain.push(c.move);
      if (c?.window) { windowFrames = c.window.windowFrames; recovery = c.window.recovery; }
      if (chain.includes("makiG3")) break;
      // press ONLY while the tightened window is OPEN + connected (the correct, precise timing)
      if (c?.rekkaNext && c?.connected && c?.window?.open) {
        await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1);
      } else { await waitFrames(1); }
    }
    await page.keyboard.up("d"); await waitFrames(14);
    landedDamage = hp0 - (await p2()).health;
    await shot("combo_lands");
    console.log(`     effective cancel window = ${windowFrames}f of a ${recovery}f recovery (≈${Math.round(windowFrames / 60 * 1000)}ms); full string dealt ${landedDamage}`);
    check("tight window is 5 frames (narrower than the 10f/~167ms roster default)", windowFrames === 5, `windowFrames=${windowFrames}`);
    check("in-window presses link the full chain (makiG1→makiG2→makiG3)", chain.includes("makiG2") && chain.includes("makiG3"), `chain=[${chain.join(" → ")}]`);
  }

  // ── C. MISTIMED FAILS — press Heavy LATE (window.open flipped back to false, still in makiG1 recovery) ──
  section("C. mistimed combo FAILS — Heavy re-pressed AFTER the window closes");
  await reset();
  await waitFrames(70);   // let the on-screen combo counter from section B fully decay so the shot is clean
  { const chain = []; let sawOpen = false, pressedLate = false, connectedAtPress = false;
    const hp0 = (await p2()).health;
    await fireOpener();
    for (let i = 0; i < 70; i++) {
      const c = await cmd();
      if (c?.move && !chain.includes(c.move)) chain.push(c.move);
      if (c?.window?.open && c?.move === "makiG1") sawOpen = true;
      // Wait until the window has OPENED and then CLOSED again while still in makiG1's recovery, and the
      // opener has connected — then deliberately press LATE. This is a mistimed link: correct button, too slow.
      if (!pressedLate && sawOpen && c?.move === "makiG1" && c?.attacking && c?.rekkaNext &&
          c?.window && c.window.phase === "recovery" && c.window.open === false) {
        connectedAtPress = !!c.connected;
        await shot("mistimed_press");                                                 // capture the moment of the late press
        await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");
        pressedLate = true;
        await waitFrames(2);
        await shot("mistimed_result");   // right as the string drops (makiG1 ends, no makiG2) — before any loose follow-up
        await waitFrames(10);
        continue;
      }
      if (chain.includes("makiG2") || (pressedLate && !c?.attacking)) break;
      await waitFrames(1);
    }
    await page.keyboard.up("d"); await waitFrames(14);
    const mistimedDamage = hp0 - (await p2()).health;
    console.log(`     mistimed attempt dealt ${mistimedDamage} vs the clean chain's ${landedDamage} (chain=[${chain.join(" → ")}])`);
    check("opener HAD connected (so only TIMING, not the hit-gate, could fail the link)", connectedAtPress, `connected=${connectedAtPress}`);
    check("late press was actually placed after the window closed", pressedLate, `pressedLate=${pressedLate}`);
    check("mistimed link REJECTED — chain did NOT advance to makiG2", !chain.includes("makiG2"), `chain=[${chain.join(" → ")}]`);
    check("mistimed attempt dealt far LESS than the clean chain (string dropped)", mistimedDamage < landedDamage * 0.7, `mistimed=${mistimedDamage} clean=${landedDamage}`);
  }

  section("stability");
  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
