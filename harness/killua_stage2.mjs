// harness/killua_stage2.mjs — Stage 2: 5 basic normals connect + the Barrage command-normal
// chain (Down+Heavy rekka, cancel-on-hit) chains through 4 parts, and a mid-chain interrupt
// (whiff → chain stops). Screenshots for each. Mirrors netero_stage2.mjs + toji_blade rekka test.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const seenActions = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
const shot = name => page.screenshot({ path: path.join(OUT, `killua_s2_${name}.png`) });
async function tapKey(key) { await page.keyboard.down(key); await waitFrames(2); await page.keyboard.up(key); await waitFrames(1); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  // let the dummy settle back to the ground (a prior down_air/launcher can leave it airborne, which
  // makes a later grounded string's tail whiff on a target that's floated up out of the hitbox).
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=killua`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── 5 grounded/air normals connect + right sheet ──
  section("grounded normals — connect + damage + sheet");
  for (const [name, key, gap, frag] of [["light", "j", 46, "killua_light"], ["heavy", "k", 52, "killua_heavy"], ["up", "i", 48, "killua_up_uniform"]]) {
    await prep(gap); const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); const mid = await record(); await shot(name); await page.keyboard.up(key); await waitFrames(20);
    const after = await p2();
    check(`${name} connects`, hp0 - after.health > 0, `−${(hp0 - after.health).toFixed(0)} action=${mid.action} sheet=${(mid.spriteSheet || "").split("/").pop()}`);
    check(`${name} uses ${frag}`, (mid.spriteSheet || "").includes(frag), `sheet=${mid.spriteSheet}`);
    if (key === "i") check("up-attack launches P2", after.grounded === false || after.vy < 0, `vy=${after.vy.toFixed(1)} grounded=${after.grounded}`);
    await waitFrames(16);
  }

  section("aerial normals — air + down_air");
  await prep(44);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(42)); await page.keyboard.down("j"); await waitFrames(3); const mid = await record(); await shot("air"); await page.keyboard.up("j"); await waitFrames(14);
    check("air connects", hp0 - (await p2()).health > 0, `−${(hp0 - (await p2()).health).toFixed(0)} action=${mid.action}`);
    check("air uses killua_air", (mid.spriteSheet || "").includes("killua_air_uniform"), `sheet=${mid.spriteSheet}`); }
  await waitGrounded(); await waitFrames(8);
  await prep(30);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); const mid = await record(); await shot("down_air"); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
    check("down_air connects", hp0 - (await p2()).health > 0, `−${(hp0 - (await p2()).health).toFixed(0)} action=${mid.action}`);
    check("down_air uses killua_downair", (mid.spriteSheet || "").includes("killua_downair_uniform"), `sheet=${mid.spriteSheet}`); }
  await waitGrounded();

  // ── Barrage command chain — full 4-part cancel-on-hit ──
  section("Barrage command chain (Down+Heavy) — full 4-part rekka on hit");
  await prep(40);
  const hpChain0 = (await p2()).health;
  // OPENER: Down+Heavy
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
  const seq = [];
  { const m = (await p1()).currentMove; if (m) seq.push(m); }
  await shot("barrage_open");
  check("Down+Heavy opens barrage1", seq[0] === "barrage1", `currentMove=${seq[0]}`);
  // CONTINUE: for each part, wait until it reaches its RECOVERY phase (buffer expired) then tap ONE
  // clean Heavy edge → cancel-on-hit into the next part. (Buffered input lingers 10f, so a single
  // rhythmic tap in recovery is the reliable edge — same as the Toji blade rekka test.)
  for (const want of ["barrage2", "barrage3", "barrage4"]) {
    let inRecovery = false;
    for (let i = 0; i < 40; i++) {
      const p = await record();
      if (!p.attacking) break;
      if (p.attackPhase === "recovery") { inRecovery = true; break; }
      await waitFrames(1);
    }
    if (!inRecovery) break;
    await tapKey("k");
    await record();
    const m = (await p1()).currentMove;
    if (m && seq[seq.length - 1] !== m) seq.push(m);
    if (m !== want) break;
  }
  await waitFrames(22);   // let barrage4's active window resolve before measuring cumulative damage
  await shot("barrage_finish");
  const chainStr = seq.join("→");
  check("chain routes barrage1→2→3→4", chainStr === "barrage1→barrage2→barrage3→barrage4", `seq=${chainStr}`);
  // cumulative combo-scaled damage (the engine prorates consecutive hits, so 4 parts total ~2.4× a
  // single light's ~22, not the naïve raw sum). >45 proves the whole string connects and stacks.
  const dmg = hpChain0 - (await p2()).health;
  check("full barrage deals cumulative multi-hit damage", dmg > 45, `−${dmg.toFixed(0)} over ${seq.length} parts (combo-scaled)`);

  // ── Mid-chain interrupt — whiff the opener → chain must NOT advance (cancel-on-hit gate) ──
  section("mid-chain interrupt — whiff opener → chain stops (no barrage2)");
  await prep(260);   // dummy far → barrage1 whiffs
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s");
  check("whiffed opener still starts barrage1", (await p1()).currentMove === "barrage1", `currentMove=${(await p1()).currentMove}`);
  // Clean recovery-timed Heavy tap that WOULD cancel into barrage2 if a hit had landed — proves the gate.
  let advanced = false;
  for (let i = 0; i < 40; i++) {
    const p = await p1();
    if (!p.attacking) break;
    if (p.attackPhase === "recovery") { await tapKey("k"); if ((await p1()).currentMove === "barrage2") advanced = true; break; }
    await waitFrames(1);
  }
  await shot("barrage_interrupt");
  check("whiff does NOT cancel into barrage2 (chain interrupted)", advanced === false, advanced ? "chain advanced on a whiff!" : "stayed on barrage1 → ended");

  // ── fallback-box sweep ──
  section("fallback-box sweep — every exercised action resolves to a killua sheet");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("killua"));
  check(`all ${seenActions.size} exercised actions use a killua sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  KILLUA Stage 2: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
