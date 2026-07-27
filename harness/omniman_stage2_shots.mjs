// harness/omniman_stage2_shots.mjs — STAGE 2 visual + logic evidence for Omni-Man.
// Captures the 5 normals + grab, then the "Viltrumite Beatdown" command chain: opener, a
// cancel-on-HIT advance (omCombo1 → omCombo2), and a WHIFF interrupt (no advance).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function waitIdle() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && !p.attacking && (p.attackCooldown === undefined || true); }, null, { timeout: 6000, polling: 16 }).catch(() => {}); }
async function settle() { await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.topUpP1Health?.(); }); await waitGrounded(); await waitFrames(8); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `omniman_s2_${name}.png`) }); }
const has = (a, s) => (a.spriteSheet || "").includes(s);

await page.goto(`${base}/index.html?harness=1&p1=omniman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(4); await waitGrounded();

// ── NORMALS: press, wait `startup` frames to reach the active pose, capture, then wait out recovery ──
async function normal(name, keys, sheet, startup, { air = false } = {}) {
  await settle();
  if (air) {
    await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
    await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 3000, polling: 16 }).catch(() => {});
    await waitFrames(2);
  }
  for (const k of keys) await page.keyboard.down(k);
  await waitFrames(startup + 1);
  const a = await p1();
  check(`${name} → ${sheet}`, has(a, sheet), `action=${a.action} move=${a.currentMove} sheet=${a.spriteSheet}`);
  await shot(name);
  for (const k of keys) await page.keyboard.up(k);
  await waitIdle();
}
await normal("light",    ["j"], "omni_man_ground_punch_uniform",    6);
await normal("heavy",    ["k"], "omni_man_ground_punch_1_uniform",  14);
await normal("up",       ["i"], "omni_man_ground_up_attack_uniform", 11);
await normal("air",      ["j"], "omni_man_air_forward_punch_uniform", 7, { air: true });
await normal("down_air", ["s", "j"], "omni_man_air_down_attack_2_uniform", 9, { air: true });

// ── FREE POKE: Fwd+Light Push (clean neutral state) ──
await settle();
await page.keyboard.down("d"); await waitFrames(2);
await page.keyboard.down("j"); await waitFrames(4);
let a = await p1();
check("Fwd+Light → omPush poke", a.currentMove === "omPush" && has(a, "omni_man_push_uniform"), `move=${a.currentMove} sheet=${a.spriteSheet}`);
await shot("omPush");
await page.keyboard.up("j"); await page.keyboard.up("d"); await waitIdle();

// Walk p1 into melee range of the dummy (p2 on the right).
async function closeIn(gap = 74) {
  await settle();
  await page.keyboard.down("d");
  await page.waitForFunction(g => { const a = window.__harness.p1(), b = window.__harness.p2(); return a && b && Math.abs(a.x - b.x) < g; }, gap, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.keyboard.up("d"); await waitFrames(2);
}

// NOTE: grab (key O) sprite is wired (omni_man_grab_uniform) but the throw only animates on a
// clean connect via the shared resolveGrab path, so it's not asserted as a standalone pose here.

// ── BEATDOWN opener (Fwd+Heavy) + cancel-on-HIT advance omCombo1 → omCombo2 → omComboFin ──
// The CONTINUE needs only a Heavy re-tap during recovery after a CONNECT (no forward), so we release
// forward after the opener to keep p1 planted next to the dummy (avoids walking past / facing flip).
await closeIn(62);
await page.keyboard.down("d");
await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // Fwd+Heavy = omCombo1
await page.keyboard.up("d");
await waitFrames(3);
a = await p1();
check("beatdown opener → omCombo1", a.currentMove === "omCombo1" && has(a, "omni_man_ground_air_kick_uniform"), `move=${a.currentMove} sheet=${a.spriteSheet}`);
await shot("omCombo1");
// Advance ONLY inside the recovery window of a CONNECTED hit — never taps from neutral (which would
// fire a neutral heavy and break the string). Precisely models the cancel-on-hit rule.
async function advanceRecovery(nextMove, maxFrames = 48) {
  for (let i = 0; i < maxFrames; i++) {
    const s = await p1();
    if (s.currentMove === nextMove) return true;
    if (s.attacking && s.attackPhase === "recovery" && s.cmdHitLanded === true) {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1);
    } else {
      await waitFrames(1);
    }
  }
  return (await p1()).currentMove === nextMove;
}
const toC2 = await advanceRecovery("omCombo2");
a = await p1();
check("cancel-on-HIT advance → omCombo2", toC2 && has(a, "omni_man_ground_down_attack_uniform"), `move=${a.currentMove} sheet=${a.spriteSheet}`);
await shot("omCombo2");
const toFin = await advanceRecovery("omComboFin");
a = await p1();
check("advance → omComboFin launcher", toFin && has(a, "omni_man_combo_launch_uniform"), `move=${a.currentMove} sheet=${a.spriteSheet}`);
await shot("omComboFin");
await waitIdle();

// ── WHIFF INTERRUPT: omCombo1 at range (no connect) → re-tap Heavy must NOT advance ──
await settle();
await page.keyboard.down("a"); await waitFrames(26); await page.keyboard.up("a"); await waitFrames(2);  // back off out of range
const far = await p1(), dref = await p2();
const dist = Math.abs(far.x - dref.x);
await page.keyboard.down("d");                       // face toward dummy, still out of range
await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
await waitFrames(3);
a = await p1();
const openedWhiff = a.currentMove === "omCombo1";
const whiffNoHit = a.cmdHitLanded !== true;
await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");   // re-tap during recovery
await waitFrames(4);
a = await p1();
check("WHIFF interrupt: re-tap does NOT advance (chain ends)", openedWhiff && whiffNoHit && a.currentMove !== "omCombo2", `dist=${dist | 0} opened=${openedWhiff} noHit=${whiffNoHit} moveAfter=${a.currentMove}`);
await page.keyboard.up("d");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/omniman_s2_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
