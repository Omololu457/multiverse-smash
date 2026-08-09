// harness/nezuko_stage6.mjs — Stage 6 evidence: Ally Call assists + Nut Kick taunt (GRAB button family).
//   Fwd+Grab (d+o) → Tanjiro Assist (Water Breathing slash cameo — direction selects the sibling)
//   Back+Grab (a+o) → Zenitsu Assist (Thunderclap cameo)
//   neutral Grab (o) → Nut Kick: a taunt-flavoured kick that is a REAL move (active-window hitbox, low
//                      damage, punishable on whiff — connects in range, whiffs + recovers out of range).
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
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); window.__harness.p1ClearCooldowns?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitMove(name, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && mv.currentMove !== name; f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `nezuko_s6_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=nezuko&p2=nezuko`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── ALLY CALL: Forward → Tanjiro ──
  section("Ally Call — Fwd+Grab → Tanjiro (direction selects sibling)");
  await reset(80);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("d"); await waitFrames(3);
    await page.keyboard.down("o"); await waitFrames(2); await page.keyboard.up("o");
    await waitFrames(2); await shot("tanjiro");
    const sib = (await p1()).nzLastSibling;
    await page.keyboard.up("d");
    await waitFrames(44);   // cameo rush → hit → despawn
    const dmg = hp0 - (await p2()).health;
    check("Fwd+Grab selects Tanjiro", sib === "tanjiro", `sibling=${sib}`);
    check("Tanjiro assist connects (cameo hit)", dmg > 0, `dmg=${dmg}`);
  }

  // ── ALLY CALL: Back → Zenitsu ──
  section("Ally Call — Back+Grab → Zenitsu (direction selects sibling)");
  await reset(80);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("a"); await waitFrames(3);
    await page.keyboard.down("o"); await waitFrames(2); await page.keyboard.up("o");
    await waitFrames(2); await shot("zenitsu");
    const sib = (await p1()).nzLastSibling;
    await page.keyboard.up("a");
    await waitFrames(44);
    const dmg = hp0 - (await p2()).health;
    check("Back+Grab selects Zenitsu", sib === "zenitsu", `sibling=${sib}`);
    check("Zenitsu assist connects (cameo hit)", dmg > 0, `dmg=${dmg}`);
  }

  // ── NUT KICK (neutral Grab) — taunt/hit move, real active-window hitbox ──
  section("Nut Kick — neutral Grab (taunt with a real hitbox)");
  // (A) IN RANGE → connects during the active window
  await reset(40);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("o"); await waitFrames(2); await page.keyboard.up("o");
    const mv = await waitMove("nezukoNutKick", 10);
    await shot("nutkick");
    // observe the move pass through its ACTIVE window then RECOVERY (a real windowed hitbox, not a free taunt)
    const phases = new Set([mv.attackPhase]);
    for (let i = 0; i < 30; i++) { const c = await p1(); if (c.currentMove === "nezukoNutKick") phases.add(c.attackPhase); if (!c.attacking) break; await waitFrames(1); }
    const dmg = hp0 - (await p2()).health;
    check("neutral Grab → nezukoNutKick move", has(mv, "nezuko_nut_kick") && mv.currentMove === "nezukoNutKick", `sheet=${mv.spriteSheet} move=${mv.currentMove}`);
    check("hitbox connects during the ACTIVE window (in range)", dmg > 0, `dmg=${dmg}`);
    check("windowed hitbox: active → recovery (bounded, punishable)", phases.has("active") && phases.has("recovery"), `phases=${[...phases].join(",")}`);
  }
  // (B) OUT OF RANGE → whiffs (no hit) but still commits to recovery (punishable, not a free taunt)
  await reset(320);
  { const hp0 = (await p2()).health;
    await page.keyboard.down("o"); await waitFrames(2); await page.keyboard.up("o");
    await waitMove("nezukoNutKick", 10);
    let sawRecovery = false;
    for (let i = 0; i < 30; i++) { const c = await p1(); if (c.currentMove === "nezukoNutKick" && c.attackPhase === "recovery") sawRecovery = true; if (!c.attacking) break; await waitFrames(1); }
    const dmg = hp0 - (await p2()).health;
    check("whiffs out of range (0 dmg) but commits to recovery (punishable)", dmg === 0 && sawRecovery, `dmg=${dmg} recovery=${sawRecovery}`);
  }

  section("stability");
  check("no JS errors during Stage 6", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
