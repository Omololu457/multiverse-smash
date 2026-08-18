// harness/aoi_todo_stage3.mjs — STAGE 3: Aoi Todo's Fwd+Heavy 3-stage command chain.
// Fwd+Heavy opens todoCombo1 (ELBOW); a fresh Heavy during recovery cancels into todoCombo2 (hook/uppercut)
// and again into todoCombo3 (spinning ROUNDHOUSE launcher), each ONLY if the prior stage connected
// (cancel-on-hit). A whiff/block ends the string. Verifies: each stage fires+connects+renders its sheet,
// whiff does NOT chain, neutral Heavy stays the `heavy` cross normal, finisher launches (knockup).
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
const shot = n => page.screenshot({ path: path.join(OUT, `aoi_todo_s3_${n}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=aoi_todo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("command chain — Fwd+Heavy: elbow → hook/uppercut → roundhouse (cancel-on-hit)");
  // PHASE-REACTIVE driver: the game runs in real time, so a fixed-frame re-press drifts past the short
  // recovery window (→ fresh openers, not cancels). Instead we poll todoCmd each frame and tap Heavy ONLY
  // when the current stage is genuinely in recovery with a queued rekkaNext that has connected.
  const todoCmd = () => page.evaluate(() => window.__harness.todoCmd());
  await prep(48);
  const hp0 = (await p2()).health;
  const seenMoves = {};   // move → sheet observed
  let launched = false;
  await page.keyboard.down("d");                          // hold forward
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // Heavy edge → todoCombo1 (ELBOW)
  let pressedFor = null;
  for (let i = 0; i < 90; i++) {
    const c = await todoCmd();
    const sh = (await p1()).spriteSheet || "";
    if (c?.move && /^todoCombo[123]$/.test(c.move)) { if (!seenMoves[c.move]) { seenMoves[c.move] = sh; await shot(c.move.replace("todoCombo", "combo")); } }
    if ((await p2()).vy < -1) launched = true;
    if (c?.attacking && c.phase === "recovery" && c.rekkaNext && c.connected && pressedFor !== c.move) {
      pressedFor = c.move;                                // one clean edge per stage
      await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    } else {
      await waitFrames(1);
    }
    if (seenMoves.todoCombo3 && !c?.attacking) break;
  }
  await page.keyboard.up("d");
  const hpC = (await p2()).health;
  check("opener todoCombo1 (ELBOW) fires", !!seenMoves.todoCombo1, `sheet=${seenMoves.todoCombo1}`);
  check("opener renders aoi_todo_combo1 sheet", (seenMoves.todoCombo1 || "").includes("aoi_todo_combo1"), `sheet=${seenMoves.todoCombo1}`);
  check("cancels into todoCombo2 (hook/uppercut)", !!seenMoves.todoCombo2, `sheet=${seenMoves.todoCombo2}`);
  check("mid renders aoi_todo_combo2 sheet", (seenMoves.todoCombo2 || "").includes("aoi_todo_combo2"), `sheet=${seenMoves.todoCombo2}`);
  check("cancels into todoCombo3 (roundhouse launcher)", !!seenMoves.todoCombo3, `sheet=${seenMoves.todoCombo3}`);
  check("finisher renders aoi_todo_combo3 sheet", (seenMoves.todoCombo3 || "").includes("aoi_todo_combo3"), `sheet=${seenMoves.todoCombo3}`);
  check("finisher launches opponent (knockup)", launched, `p2.vy went < -1: ${launched}`);
  // A genuine 3-stage chain (elbow 31 + hook 37 + roundhouse 59 ≈ 127) is clearly > 3 fresh elbow openers (≈93).
  check("full chain damage exceeds 3× opener (real cancels, not fresh openers)", hp0 - hpC > 110, `total −${(hp0 - hpC).toFixed(0)}`);

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
  check("no cancel into todoCombo2 after a whiff", !w.acts.has("todoCombo2"), `acts=[${[...w.acts]}]`);
  check("opponent took no damage on the whiffed string", Math.abs(wp0 - (await p2()).health) < 1, `Δ=${(wp0 - (await p2()).health).toFixed(0)}`);

  section("neutral Heavy stays the `heavy` cross normal (not the string)");
  await waitGrounded(); await waitFrames(6);
  await prep(48);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // neutral Heavy (no forward)
  const nh = await sample(6);
  check("neutral Heavy → heavy (not todoCombo1)", nh.acts.has("heavy") && !nh.acts.has("todoCombo1"), `acts=[${[...nh.acts]}]`);

  section("data contract");
  const ad = await page.evaluate(() => window.__harness.charDef("aoi_todo")?.animationData || {});
  for (const [k, sub] of [["todoCombo1", "aoi_todo_combo1"], ["todoCombo2", "aoi_todo_combo2"], ["todoCombo3", "aoi_todo_combo3"]]) {
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
