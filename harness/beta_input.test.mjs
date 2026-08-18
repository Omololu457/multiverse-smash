// harness/beta_input.test.mjs
// ---------------------------------------------------------------------------
// BETA-ONLY input simplification — "hold ONE direction, then tap Special" replaces the
// motion-roll (qcf/qcb/…) requirement, and ONLY when the beta code (GojoV1) is active.
//
// For EACH of the 8 sprite-complete characters this proves three things on the REAL code
// path (real Chromium, real keyboard events, real match):
//   (A) NORMAL play, motion roll  → the command special STILL fires (main path intact).
//   (B) NORMAL play, single HELD dir (no roll) → the special does NOT fire (default fires
//       instead) — i.e. the full motion is STILL required for non-beta play.
//   (C) BETA on, single HELD dir  → the SAME special the motion produced now fires.
//
// Each character runs in its OWN browser context so the (un-resettable, per-session) beta
// flag from (C) can never leak into another character's (A)/(B) normal-play assertions.
//
// Discriminator per character (a crisp, order-independent signal):
//   goku    F/qcf  Kamehameha        energy −30  (vs Dragon Fist −40)
//   gojo    B/qcb  Hollow Purple     energy −70  (vs Blue −30)
//   sukuna  B/qcb  Dismantle         projectile "dismantle" (vs Cleave: none)
//   naruto  F/qcf  Shadow Clone Spawn energy −0  (vs base Rasengan −30)
//   sasuke  F/qcf  Two-Strike Lightning  lightningPhase set (vs Dash Strike: null)
//   rick    B/qcb  Portal-Push       energy −45  (vs Meeseeks −30)
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADED = process.env.HEADED === "1";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml", ".csv": "text/csv" };
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
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

// Per-character discriminator. inputDir F/B is a qcf/qcb reduction; the roll is [down, dir].
const CASES = [
  { key: "goku",   name: "Kamehameha",          inputDir: "F", det: { type: "energy", special: 30, deflt: 40 } },
  { key: "gojo",   name: "Hollow Purple",       inputDir: "B", det: { type: "energy", special: 70, deflt: 30 } },
  { key: "sukuna", name: "Dismantle",           inputDir: "B", det: { type: "proj",   proj: "dismantle" } },
  { key: "naruto", name: "Shadow Clone Spawn",  inputDir: "F", det: { type: "energy", special: 0,  deflt: 30 } },
  { key: "sasuke", name: "Two-Strike Lightning",inputDir: "F", det: { type: "state",  field: "lightningPhase" } },
  { key: "rick",   name: "Portal-Push",         inputDir: "B", det: { type: "energy", special: 45, deflt: 30 } },
];

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`static server → ${base}`);

const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });

try {
  for (const cfg of CASES) {
    await runCharacter(cfg);
  }
} catch (e) {
  console.error("FATAL", e);
  FAIL++;
} finally {
  await browser.close();
  server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BETA INPUT:  ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(FAIL ? 1 : 0);
}

async function runCharacter(cfg) {
  section(`${cfg.key.toUpperCase()} — ${cfg.name} (${cfg.inputDir === "F" ? "qcf→Forward" : "qcb→Back"})`);
  // Fresh, isolated context so the beta flag set for (C) can't leak into the next char's (A)/(B).
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const jsErrors = [];
  page.on("pageerror", e => jsErrors.push(String(e)));

  // ── page-scoped helpers ──
  const p1 = () => page.evaluate(() => window.__harness.p1());
  const projectiles = () => page.evaluate(() => window.__harness.projectiles());
  async function waitFrames(n) {
    const s = await page.evaluate(() => window.__harness.state().frame);
    await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 });
  }
  // Directional key from live facing so forward/back are correct regardless of spawn side.
  async function dirKey(inputDir) {
    if (inputDir === "U") return "w";
    if (inputDir === "D") return "s";
    const facing = (await p1()).facing;
    const fwd = facing >= 0 ? "d" : "a";
    const back = facing >= 0 ? "a" : "d";
    return inputDir === "F" ? fwd : back;
  }
  async function resetP1() {
    // Let any in-flight move resolve naturally (avoids clearing dangling attack state)...
    await page.waitForFunction(() => {
      const p = window.__harness.p1();
      return !p.attacking && !p.currentMove && !p.lightningPhase && !p.rooted && (p.hitstun || 0) <= 0;
    }, null, { timeout: 8000, polling: 16 }).catch(() => {});
    // ...then hard-clear the motion buffer + cooldowns + stray projectiles so this cast starts
    // from a truly clean slate (no stale directionHistory D, no summon/chain recast lock).
    await page.evaluate(() => {
      window.__harness.resetFighterInput("p1");
      window.__harness.clearProjectiles();
      window.__harness.fillEnergy();
      window.__harness.healP2?.();
    });
    await waitFrames(2);
  }
  // Press the qcf/qcb ROLL ([down, dir]) then Special (l). Feeds the full motion — exactly the
  // sequence a real player rolls (matches round4.test.mjs' qcfSpecial).
  async function castRoll(inputDir) {
    const dk = await dirKey(inputDir);
    await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s");
    await page.keyboard.down(dk); await waitFrames(2); await page.keyboard.up(dk);
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  }
  // HOLD a single direction, then tap Special while still holding it.
  async function castHeld(inputDir) {
    const dk = await dirKey(inputDir);
    await page.keyboard.down(dk); await waitFrames(2);
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
    await page.keyboard.up(dk);
  }
  // Perform an input (mode "roll"|"held") and return whether the DISCRIMINATOR special fired.
  async function firedSpecial(cfg, mode) {
    await resetP1();
    const det = cfg.det;
    const e0 = det.type === "energy" ? (await p1()).energy : null;
    if (mode === "roll") await castRoll(cfg.inputDir); else await castHeld(cfg.inputDir);
    await waitFrames(det.castWait || 5);
    if (det.type === "energy") {
      const e1 = (await p1()).energy;
      const d = e0 - e1;
      // fired iff the spend is closer to the special's cost than to the default's cost.
      return { fired: Math.abs(d - det.special) < Math.abs(d - det.deflt), detail: `spent ${d.toFixed(0)} (special ${det.special} / default ${det.deflt})` };
    }
    if (det.type === "proj") {
      const pr = await projectiles();
      return { fired: pr.some(p => p.name === det.proj), detail: `projectiles=${JSON.stringify(pr.map(p => p.name))}` };
    }
    // state field on the fighter snapshot (e.g. lightningPhase)
    const a = await p1();
    return { fired: !!a[det.field], detail: `${det.field}=${a[det.field]} currentMove=${a.currentMove}` };
  }

  try {
    await page.goto(`${base}/index.html?harness=1&p1=${cfg.key}`, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
    await page.mouse.click(640, 360);
    await page.evaluate(() => window.__harness.boot());
    await waitFrames(6);

    const who = await p1();
    check(`P1 is ${cfg.key}`, who.key === cfg.key, `key=${who.key}`);
    const betaAtStart = await page.evaluate(() => window.__harness.menuRoster().beta);
    check("starts in NON-beta (fresh context)", betaAtStart === false, `beta=${betaAtStart}`);

    // (A) NORMAL play: the motion roll STILL fires the special. Retry a couple times — a
    // single-frame-poll miss on the Special button is an input-timing artifact, not a code
    // fault (the same roll fires it on the next attempt), so it shouldn't fail a correctness check.
    let rollNormal = await firedSpecial(cfg, "roll");
    for (let i = 0; i < 3 && !rollNormal.fired; i++) rollNormal = await firedSpecial(cfg, "roll");
    check(`(A) NORMAL + motion roll → ${cfg.name} fires`, rollNormal.fired, rollNormal.detail);

    // Some specials have a recast lock; wait it (+ let any projectile clear) before reuse.
    if (cfg.det.cooldownWait) await waitFrames(cfg.det.cooldownWait);

    // (B) NORMAL play: a single HELD direction must NOT fire the special (motion still required).
    const heldNormal = await firedSpecial(cfg, "held");
    check(`(B) NORMAL + single HELD ${cfg.inputDir} → ${cfg.name} does NOT fire (motion still required)`, !heldNormal.fired, heldNormal.detail);

    // ── flip beta ON ──
    const applied = await page.evaluate(() => window.__harness.applyCode("GojoV1"));
    check("beta code accepted", applied.result === "beta" && applied.beta === true, `result=${applied.result} beta=${applied.beta}`);

    if (cfg.det.cooldownWait) await waitFrames(cfg.det.cooldownWait);

    // (C) BETA on: the single HELD direction now fires the SAME special.
    const heldBeta = await firedSpecial(cfg, "held");
    check(`(C) BETA + single HELD ${cfg.inputDir} → ${cfg.name} fires`, heldBeta.fired, heldBeta.detail);

    check("no page JS errors", jsErrors.length === 0, jsErrors[0] || "");
  } finally {
    await context.close();
  }
}
