// harness/yuta_stage3.mjs — STAGE 3: Yuta's Fwd+Heavy 3-stage SWORD COMBO command chain.
// Fwd+Heavy opens yutaCombo1 (Attack 1 swing); a fresh Heavy during recovery cancels into yutaCombo2
// (Attack 2) and again into yutaCombo3 (Attack 3 lunging thrust), each ONLY if the prior stage connected
// (cancel-on-hit). A whiff/block ends the string. Verifies: each stage fires+connects+renders its sheet,
// whiff does NOT chain, neutral Heavy stays the `heavy` swing normal, finisher deals hard knockback.
// combo1 REUSES the heavy=Attack 1 sheet (honest reuse). PHASE-REACTIVE driver (blind spam latches prevHeavy).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function sample(n) { const acts = new Set(); const sheets = {}; for (let i = 0; i < n; i++) { const a = await p1(); if (a.action) { acts.add(a.action); if (a.spriteSheet) sheets[a.action] = a.spriteSheet; } await waitFrames(1); } return { acts, sheets }; }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); });
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
const shot = n => page.screenshot({ path: path.join(OUT, `yuta_s3_${n}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=yuta`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("sword combo — Fwd+Heavy: Attack 1 → Attack 2 → Attack 3 thrust (cancel-on-hit)");
  // ONE combined probe per iteration (cmd + sprite + p2.vx) so there is NO await drift between detecting
  // recovery and tapping Heavy — extra round-trips push the tap past the short cancel window.
  const probe = () => page.evaluate(() => {
    const c = window.__harness.yutaCmd();
    const a = window.__harness.p1();
    const o = window.__harness.p2();
    return { ...c, sheet: a?.spriteSheet || "", p2vx: o?.vx || 0 };
  });
  await prep(46);
  const hp0 = (await p2()).health;
  const seenMoves = {};
  let pushed = false;
  await page.keyboard.down("d");                          // hold forward
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // Heavy edge → yutaCombo1
  let pressedFor = null;
  for (let i = 0; i < 90; i++) {
    const c = await probe();
    if (c?.move && /^yutaCombo[123]$/.test(c.move)) { if (!seenMoves[c.move]) { seenMoves[c.move] = c.sheet; await shot(c.move.replace("yutaCombo", "combo")); } }
    if (Math.abs(c?.p2vx || 0) > 2) pushed = true;
    if (c?.attacking && c.phase === "recovery" && c.rekkaNext && c.connected && pressedFor !== c.move) {
      pressedFor = c.move;                                // one clean edge per stage
      await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    } else {
      await waitFrames(1);
    }
    if (seenMoves.yutaCombo3 && !c?.attacking) break;
  }
  await page.keyboard.up("d");
  const hpC = (await p2()).health;
  check("opener yutaCombo1 (Attack 1) fires", !!seenMoves.yutaCombo1, `sheet=${seenMoves.yutaCombo1}`);
  check("opener renders yuta_heavy sheet (Attack 1 reuse)", (seenMoves.yutaCombo1 || "").includes("yuta_heavy_uniform"), `sheet=${seenMoves.yutaCombo1}`);
  check("cancels into yutaCombo2 (Attack 2)", !!seenMoves.yutaCombo2, `sheet=${seenMoves.yutaCombo2}`);
  check("mid renders yuta_combo2 sheet", (seenMoves.yutaCombo2 || "").includes("yuta_combo2_uniform"), `sheet=${seenMoves.yutaCombo2}`);
  check("cancels into yutaCombo3 (Attack 3 thrust)", !!seenMoves.yutaCombo3, `sheet=${seenMoves.yutaCombo3}`);
  check("finisher renders yuta_combo3 sheet", (seenMoves.yutaCombo3 || "").includes("yuta_combo3_uniform"), `sheet=${seenMoves.yutaCombo3}`);
  check("finisher knocks opponent back (hard knockback)", pushed, `p2.vx exceeded 2: ${pushed}`);
  // Real 3-stage chain (combo1 34 + combo2 40 + combo3 58 ≈ 132) clearly exceeds 3 fresh openers (≈101).
  check("full chain damage exceeds 3× opener (real cancels, not fresh openers)", hp0 - hpC > 112, `total −${(hp0 - hpC).toFixed(0)}`);

  section("whiff ends the string (no cancel without a hit)");
  await waitGrounded(); await waitFrames(8);
  await prep(320);                                        // dummy far away → opener whiffs
  const wp0 = (await p2()).health;
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // opener whiffs
  await waitFrames(4);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // re-press — should be ignored (no hit)
  const w = await sample(8);
  await page.keyboard.up("d");
  check("no cancel into yutaCombo2 after a whiff", !w.acts.has("yutaCombo2"), `acts=[${[...w.acts]}]`);
  check("opponent took no damage on the whiffed string", Math.abs(wp0 - (await p2()).health) < 1, `Δ=${(wp0 - (await p2()).health).toFixed(0)}`);

  section("neutral Heavy stays the `heavy` swing normal (not the string)");
  await waitGrounded(); await waitFrames(6);
  await prep(46);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // neutral Heavy (no forward)
  const nh = await sample(6);
  check("neutral Heavy → heavy (not yutaCombo1)", nh.acts.has("heavy") && !nh.acts.has("yutaCombo1"), `acts=[${[...nh.acts]}]`);

  section("data contract");
  const ad = await page.evaluate(() => window.__harness.charDef("yuta")?.animationData || {});
  for (const [k, sub] of [["yutaCombo1", "yuta_heavy_uniform"], ["yutaCombo2", "yuta_combo2_uniform"], ["yutaCombo3", "yuta_combo3_uniform"]]) {
    check(`animationData.${k} → ${sub} sheet`, (ad[k]?.sheet || "").includes(sub), `sheet=${ad[k]?.sheet}`);
  }

  section("no JS errors");
  check("no page errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
